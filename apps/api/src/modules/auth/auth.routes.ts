import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import argon2 from 'argon2';
import { Role, VerificationStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { ah, badRequest, conflict, forbidden, notFound, unauthorized } from '../../lib/http.js';
import {
  REFRESH_COOKIE,
  clearRefreshCookie,
  currentUser,
  issueAccessToken,
  issueRefreshToken,
  requireAuth,
  requireRole,
  setRefreshCookie,
  verifyRefreshToken,
  type AuthRequest,
} from '../../middleware/auth.js';
import { fileUrlFor, requireFile, uploader } from '../../middleware/upload.js';
import { recomputeTrustScoreSafe } from '../trust-score/trust-score.service.js';

/**
 * Modul 1 — Autentikasi & Verifikasi (FR-01, FR-02).
 * ARCHITECTURE.md §4.1: registrasi, login, refresh token, validasi KYC
 * (KTP kedua peran, NIB khusus Pengusaha), plus middleware otorisasi terpusat.
 */

export const authRouter = Router();
export const adminVerificationRouter = Router();

/**
 * Pembatas percobaan masuk. Handler-nya ditulis sendiri supaya balasan 429
 * tetap berbentuk JSON `{ error }` seperti endpoint lain — bawaan
 * express-rate-limit mengirim teks polos, yang di sisi frontend berubah jadi
 * pesan teknis mentah dan melanggar NFR Reliability (ARCHITECTURE.md §8).
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  // Hanya percobaan GAGAL yang dihitung. Tebakan penyerang selalu gagal, jadi
  // perlindungan brute-force tetap utuh; sementara pengguna sah yang berhasil
  // masuk berkali-kali (dan tim saat merekam demo dari satu IP) tidak ikut
  // terkunci.
  skipSuccessfulRequests: true,
  handler: (_req, res) => {
    res.status(429).json({
      error: 'Terlalu banyak percobaan masuk yang gagal. Coba lagi dalam 15 menit.',
    });
  },
});

const registerSchema = z.object({
  email: z.string().email('Format email belum benar').max(254),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter').max(128),
  role: z.nativeEnum(Role),
  fullName: z.string().trim().min(2, 'Nama minimal 2 huruf').max(120),
});
const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});

const publicUser = { id: true, email: true, role: true } as const;

// ---------------------------------------------------------------------------
// FR-01 — registrasi, login, sesi
// ---------------------------------------------------------------------------

authRouter.post(
  '/register',
  authLimiter,
  ah(async (req, res) => {
    const input = registerSchema.parse(req.body);
    // Peran ADMIN hanya lewat seeder, tidak pernah lewat pendaftaran mandiri.
    if (input.role === Role.ADMIN) throw forbidden('Peran ini tidak bisa didaftarkan sendiri.');

    const email = input.email.toLowerCase();
    if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
      // Pesan sengaja tidak membocorkan bahwa email sudah terdaftar.
      throw conflict('Tidak bisa membuat akun dengan data ini. Coba email lain atau masuk.');
    }

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await argon2.hash(input.password),
        role: input.role,
        profile: { create: { fullName: input.fullName } },
      },
      select: publicUser,
    });

    recomputeTrustScoreSafe(user.id);
    setRefreshCookie(res, issueRefreshToken(user.id));
    res.status(201).json({ user, accessToken: issueAccessToken(user) });
  }),
);

authRouter.post(
  '/login',
  authLimiter,
  ah(async (req, res) => {
    const input = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      select: { ...publicUser, passwordHash: true },
    });
    // Tetap jalankan verify pada hash dummy kalau user tidak ada, supaya waktu
    // respons tidak membocorkan email mana yang terdaftar.
    const ok = user
      ? await argon2.verify(user.passwordHash, input.password).catch(() => false)
      : false;
    if (!user || !ok) throw unauthorized('Email atau kata sandi salah.');

    const safe = { id: user.id, email: user.email, role: user.role };
    setRefreshCookie(res, issueRefreshToken(safe.id));
    res.json({ user: safe, accessToken: issueAccessToken(safe) });
  }),
);

authRouter.post(
  '/refresh',
  ah(async (req, res) => {
    const token = (req as AuthRequest).cookies?.[REFRESH_COOKIE];
    if (typeof token !== 'string') throw unauthorized('Sesi tidak ditemukan. Silakan masuk lagi.');
    let userId: string;
    try {
      userId = verifyRefreshToken(token);
    } catch {
      clearRefreshCookie(res);
      throw unauthorized();
    }
    const user = await prisma.user.findUnique({ where: { id: userId }, select: publicUser });
    if (!user) {
      clearRefreshCookie(res);
      throw unauthorized();
    }
    res.json({ user, accessToken: issueAccessToken(user) });
  }),
);

authRouter.post('/logout', (_req, res) => {
  clearRefreshCookie(res);
  res.json({ ok: true });
});

authRouter.get(
  '/me',
  requireAuth,
  ah(async (req: AuthRequest, res) => {
    const me = currentUser(req);
    const user = await prisma.user.findUnique({
      where: { id: me.id },
      select: { ...publicUser, profile: true },
    });
    if (!user) throw notFound('Akun tidak ditemukan.');
    res.json(user);
  }),
);

// ---------------------------------------------------------------------------
// FR-02 — unggah dokumen KYC
// ---------------------------------------------------------------------------

/**
 * KTP wajib untuk kedua peran, NIB hanya untuk Pengusaha (ARCHITECTURE.md §4.1).
 * Begitu syarat sesuai peran terpenuhi, status otomatis pindah ke PENDING dan
 * kycSubmittedAt diisi — kolom itulah yang mengurutkan antrean admin.
 */
async function afterKycUpload(userId: string, role: Role) {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { ktpUrl: true, nibUrl: true, verificationStatus: true },
  });
  if (!profile) throw notFound('Profil tidak ditemukan.');

  const complete = Boolean(profile.ktpUrl) && (role !== Role.UMKM || Boolean(profile.nibUrl));
  if (complete && profile.verificationStatus !== VerificationStatus.VERIFIED) {
    await prisma.profile.update({
      where: { userId },
      data: {
        verificationStatus: VerificationStatus.PENDING,
        kycSubmittedAt: new Date(),
        // Unggah ulang setelah ditolak menghapus alasan penolakan lama.
        rejectReason: null,
      },
    });
  }
  recomputeTrustScoreSafe(userId);
}

for (const doc of ['ktp', 'nib'] as const) {
  authRouter.post(
    `/kyc/${doc}`,
    requireAuth,
    uploader('kyc', 'file'),
    ah(async (req: AuthRequest, res) => {
      const me = currentUser(req);
      if (doc === 'nib' && me.role !== Role.UMKM) {
        throw forbidden('Dokumen NIB hanya untuk akun Pengusaha.');
      }
      const file = requireFile(req);
      const url = fileUrlFor('kyc', file.filename);

      await prisma.profile.update({
        where: { userId: me.id },
        data: doc === 'ktp' ? { ktpUrl: url } : { nibUrl: url },
      });
      await afterKycUpload(me.id, me.role);

      const profile = await prisma.profile.findUnique({ where: { userId: me.id } });
      res.status(201).json(profile);
    }),
  );
}

authRouter.get(
  '/kyc/status',
  requireAuth,
  ah(async (req: AuthRequest, res) => {
    const me = currentUser(req);
    const profile = await prisma.profile.findUnique({
      where: { userId: me.id },
      select: {
        verificationStatus: true,
        kycSubmittedAt: true,
        verifiedAt: true,
        rejectReason: true,
        ktpUrl: true,
        nibUrl: true,
      },
    });
    if (!profile) throw notFound('Profil tidak ditemukan.');
    res.json({
      ...profile,
      requiresNib: me.role === Role.UMKM,
      // Badge Terverifikasi HANYA saat VERIFIED.
      isVerified: profile.verificationStatus === VerificationStatus.VERIFIED,
    });
  }),
);

// ---------------------------------------------------------------------------
// FR-02 — antrean verifikasi admin
// ---------------------------------------------------------------------------

adminVerificationRouter.use(requireAuth, requireRole(Role.ADMIN));

/** Antrean urut waktu unggah (yang paling lama menunggu tampil lebih dulu). */
adminVerificationRouter.get(
  '/verifications',
  ah(async (req, res) => {
    const query = z
      .object({
        status: z.nativeEnum(VerificationStatus).default(VerificationStatus.PENDING),
        limit: z.coerce.number().int().min(1).max(100).default(50),
      })
      .parse(req.query);

    const rows = await prisma.profile.findMany({
      where: { verificationStatus: query.status },
      select: {
        userId: true,
        fullName: true,
        location: true,
        ktpUrl: true,
        nibUrl: true,
        verificationStatus: true,
        kycSubmittedAt: true,
        rejectReason: true,
        trustScore: true,
        user: { select: { email: true, role: true, createdAt: true } },
      },
      orderBy: { kycSubmittedAt: 'asc' },
      take: query.limit,
    });
    res.json(rows);
  }),
);

const decisionSchema = z.discriminatedUnion('decision', [
  z.object({ decision: z.literal('APPROVE') }),
  z.object({
    decision: z.literal('REJECT'),
    // Reject satu klik tetap wajib menyertakan alasan singkat (ARCHITECTURE.md §2.3).
    reason: z.string().trim().min(5, 'Alasan penolakan minimal 5 karakter').max(500),
  }),
]);

adminVerificationRouter.patch(
  '/verifications/:userId',
  ah(async (req: AuthRequest, res) => {
    const admin = currentUser(req);
    const input = decisionSchema.parse(req.body);
    const userId = String(req.params.userId);

    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { verificationStatus: true },
    });
    if (!profile) throw notFound('Profil tidak ditemukan.');
    if (profile.verificationStatus !== VerificationStatus.PENDING) {
      throw badRequest('Hanya profil yang sedang menunggu tinjauan yang bisa diputuskan.');
    }

    const updated = await prisma.profile.update({
      where: { userId },
      data:
        input.decision === 'APPROVE'
          ? {
              verificationStatus: VerificationStatus.VERIFIED,
              verifiedAt: new Date(),
              verifiedById: admin.id,
              rejectReason: null,
            }
          : {
              verificationStatus: VerificationStatus.REJECTED,
              verifiedAt: new Date(),
              verifiedById: admin.id,
              rejectReason: input.reason,
            },
    });

    // Modul 1 memicu Modul 2 (ARCHITECTURE.md §4.1).
    recomputeTrustScoreSafe(userId);
    res.json(updated);
  }),
);
