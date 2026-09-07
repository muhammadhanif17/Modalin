import { Router } from 'express';
import { FundingStatus, Prisma, Role, VerificationStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { ah, badRequest, forbidden, notFound } from '../../lib/http.js';
import { currentUser, requireAuth, requireRole, type AuthRequest } from '../../middleware/auth.js';
import { fileUrlFor, requireFile, uploader } from '../../middleware/upload.js';
import { cooperationTypesSchema, parseCooperationTypes } from '../../lib/cooperation.js';
import { previewTrustScore, recomputeTrustScoreSafe } from '../trust-score/trust-score.service.js';

/**
 * Modul 3 — Profil & Portofolio (FR-01 pengisian profil, FR-04 unggahan).
 * ARCHITECTURE.md §4.1: data deskriptif bisnis/investor dan referensi berkas.
 *
 * Form sengaja dipecah per langkah (NFR Usability: step-by-step, bukan satu
 * formulir panjang), jadi tiap endpoint menerima potongan kecil dan bisa
 * disimpan sendiri-sendiri meski koneksi putus di tengah jalan.
 */

export const profileRouter = Router();
profileRouter.use(requireAuth);

const money = z.coerce.number().nonnegative().max(100_000_000_000);

// ---------------------------------------------------------------------------
// Profil dasar
// ---------------------------------------------------------------------------

const profileSchema = z.object({
  fullName: z.string().trim().min(2, 'Nama minimal 2 huruf').max(120).optional(),
  phone: z.string().trim().max(30).optional(),
  bio: z.string().trim().max(2000).optional(),
  location: z.string().trim().max(120).optional(),
});

profileRouter.get(
  '/me',
  ah(async (req: AuthRequest, res) => {
    const me = currentUser(req);
    const [profile, breakdown] = await Promise.all([
      prisma.profile.findUnique({
        where: { userId: me.id },
        include: { user: { select: { email: true, role: true } } },
      }),
      previewTrustScore(me.id),
    ]);
    if (!profile) throw notFound('Profil tidak ditemukan.');
    res.json({
      ...profile,
      isVerified: profile.verificationStatus === VerificationStatus.VERIFIED,
      trustScoreBreakdown: breakdown,
    });
  }),
);

profileRouter.patch(
  '/me',
  ah(async (req: AuthRequest, res) => {
    const me = currentUser(req);
    const input = profileSchema.parse(req.body);
    const profile = await prisma.profile.update({ where: { userId: me.id }, data: input });
    // Modul 3 memicu Modul 2 (ARCHITECTURE.md §4.1).
    recomputeTrustScoreSafe(me.id);
    res.json(profile);
  }),
);

profileRouter.post(
  '/me/avatar',
  uploader('avatar', 'file'),
  ah(async (req: AuthRequest, res) => {
    const me = currentUser(req);
    const file = requireFile(req);
    const profile = await prisma.profile.update({
      where: { userId: me.id },
      data: { avatarUrl: fileUrlFor('avatar', file.filename) },
    });
    recomputeTrustScoreSafe(me.id);
    res.status(201).json(profile);
  }),
);

// ---------------------------------------------------------------------------
// Sektor (dipakai kedua peran)
// ---------------------------------------------------------------------------

profileRouter.get(
  '/sectors',
  ah(async (_req, res) => {
    res.json(await prisma.sector.findMany({ orderBy: { name: 'asc' } }));
  }),
);

// ---------------------------------------------------------------------------
// Data usaha — khusus UMKM (langkah 1 form profil usaha)
// ---------------------------------------------------------------------------

const businessSchema = z.object({
  name: z.string().trim().min(2, 'Nama usaha minimal 2 huruf').max(150),
  description: z.string().trim().min(20, 'Ceritakan usahamu minimal 20 karakter').max(5000),
  sectorId: z.string().min(1, 'Pilih sektor usaha'),
  location: z.string().trim().min(2, 'Isi lokasi usaha').max(120),
  establishedYear: z.coerce.number().int().min(1900).max(new Date().getFullYear()).optional(),
  employeeCount: z.coerce.number().int().min(0).max(100_000).optional(),
  monthlyRevenue: money.optional(),
});

profileRouter.get(
  '/business',
  requireRole(Role.UMKM),
  ah(async (req: AuthRequest, res) => {
    const me = currentUser(req);
    res.json(
      await prisma.business.findUnique({
        where: { ownerId: me.id },
        include: { sector: true, fundingRequests: { orderBy: { createdAt: 'desc' } } },
      }),
    );
  }),
);

profileRouter.put(
  '/business',
  requireRole(Role.UMKM),
  ah(async (req: AuthRequest, res) => {
    const me = currentUser(req);
    const input = businessSchema.parse(req.body);
    if (!(await prisma.sector.findUnique({ where: { id: input.sectorId }, select: { id: true } }))) {
      throw badRequest('Sektor usaha yang dipilih tidak dikenal.');
    }
    const business = await prisma.business.upsert({
      where: { ownerId: me.id },
      update: input,
      create: { ownerId: me.id, ...input },
      include: { sector: true },
    });
    recomputeTrustScoreSafe(me.id);
    res.json(business);
  }),
);

// ---------------------------------------------------------------------------
// Permintaan pendanaan — khusus UMKM (langkah 2 + jenis kerja sama)
// ---------------------------------------------------------------------------

const fundingSchema = z.object({
  title: z.string().trim().min(4, 'Judul minimal 4 huruf').max(150),
  targetAmount: money.refine((v) => v > 0, 'Kebutuhan dana harus lebih dari 0'),
  purpose: z.string().trim().min(20, 'Jelaskan penggunaan dana minimal 20 karakter').max(2000),
  cooperationTypes: cooperationTypesSchema,
  tenorMonths: z.coerce.number().int().min(1).max(240).optional(),
  estimatedRoi: z.coerce.number().min(0).max(999).optional(),
  deadline: z.coerce.date().optional(),
  status: z.enum(['DRAFT', 'ACTIVE']).default('ACTIVE'),
});

async function myBusinessId(userId: string): Promise<string> {
  const business = await prisma.business.findUnique({ where: { ownerId: userId }, select: { id: true } });
  if (!business) throw badRequest('Lengkapi data usaha dulu sebelum membuat permintaan pendanaan.');
  return business.id;
}

profileRouter.post(
  '/funding-requests',
  requireRole(Role.UMKM),
  ah(async (req: AuthRequest, res) => {
    const me = currentUser(req);
    const input = fundingSchema.parse(req.body);
    const businessId = await myBusinessId(me.id);

    const created = await prisma.fundingRequest.create({
      data: {
        businessId,
        title: input.title,
        targetAmount: new Prisma.Decimal(input.targetAmount),
        purpose: input.purpose,
        cooperationTypes: input.cooperationTypes,
        tenorMonths: input.tenorMonths ?? null,
        estimatedRoi: input.estimatedRoi !== undefined ? new Prisma.Decimal(input.estimatedRoi) : null,
        deadline: input.deadline ?? null,
        status: input.status === 'DRAFT' ? FundingStatus.DRAFT : FundingStatus.ACTIVE,
      },
      include: { business: { include: { sector: true } } },
    });
    recomputeTrustScoreSafe(me.id);
    res.status(201).json(created);
  }),
);

profileRouter.patch(
  '/funding-requests/:id',
  requireRole(Role.UMKM),
  ah(async (req: AuthRequest, res) => {
    const me = currentUser(req);
    const input = fundingSchema.partial().parse(req.body);
    const businessId = await myBusinessId(me.id);
    const existing = await prisma.fundingRequest.findFirst({
      where: { id: String(req.params.id), businessId },
      select: { id: true },
    });
    if (!existing) throw notFound('Permintaan pendanaan tidak ditemukan.');

    const updated = await prisma.fundingRequest.update({
      where: { id: existing.id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.targetAmount !== undefined ? { targetAmount: new Prisma.Decimal(input.targetAmount) } : {}),
        ...(input.purpose !== undefined ? { purpose: input.purpose } : {}),
        ...(input.cooperationTypes !== undefined ? { cooperationTypes: input.cooperationTypes } : {}),
        ...(input.tenorMonths !== undefined ? { tenorMonths: input.tenorMonths } : {}),
        ...(input.estimatedRoi !== undefined ? { estimatedRoi: new Prisma.Decimal(input.estimatedRoi) } : {}),
        ...(input.deadline !== undefined ? { deadline: input.deadline } : {}),
        ...(input.status !== undefined
          ? { status: input.status === 'DRAFT' ? FundingStatus.DRAFT : FundingStatus.ACTIVE }
          : {}),
      },
    });
    res.json(updated);
  }),
);

// ---------------------------------------------------------------------------
// Preferensi investasi — khusus Investor
// ---------------------------------------------------------------------------

const preferenceSchema = z
  .object({
    minimumAmount: money.default(0),
    maximumAmount: money.default(0),
    preferredLocation: z.string().trim().max(120).nullable().optional(),
    preferredSectorId: z.string().nullable().optional(),
    cooperationTypes: cooperationTypesSchema,
  })
  .refine((v) => v.maximumAmount === 0 || v.minimumAmount <= v.maximumAmount, {
    message: 'Anggaran minimum tidak boleh melebihi maksimum',
    path: ['minimumAmount'],
  });

profileRouter.get(
  '/investor-preference',
  requireRole(Role.INVESTOR),
  ah(async (req: AuthRequest, res) => {
    const me = currentUser(req);
    const pref = await prisma.investorPreference.findUnique({
      where: { userId: me.id },
      include: { preferredSector: true },
    });
    res.json(pref ? { ...pref, cooperationTypes: parseCooperationTypes(pref.cooperationTypes) } : null);
  }),
);

profileRouter.put(
  '/investor-preference',
  requireRole(Role.INVESTOR),
  ah(async (req: AuthRequest, res) => {
    const me = currentUser(req);
    const input = preferenceSchema.parse(req.body);
    if (
      input.preferredSectorId &&
      !(await prisma.sector.findUnique({ where: { id: input.preferredSectorId }, select: { id: true } }))
    ) {
      throw badRequest('Sektor yang dipilih tidak dikenal.');
    }

    const data = {
      minimumAmount: new Prisma.Decimal(input.minimumAmount),
      maximumAmount: new Prisma.Decimal(input.maximumAmount),
      preferredLocation: input.preferredLocation ?? null,
      preferredSectorId: input.preferredSectorId ?? null,
      cooperationTypes: input.cooperationTypes,
    };
    const pref = await prisma.investorPreference.upsert({
      where: { userId: me.id },
      update: data,
      create: { userId: me.id, ...data },
      include: { preferredSector: true },
    });
    recomputeTrustScoreSafe(me.id);
    res.json({ ...pref, cooperationTypes: parseCooperationTypes(pref.cooperationTypes) });
  }),
);

// ---------------------------------------------------------------------------
// FR-04 — Portofolio, generik untuk kedua peran
// ---------------------------------------------------------------------------

profileRouter.get(
  '/portfolio',
  ah(async (req: AuthRequest, res) => {
    const me = currentUser(req);
    res.json(await prisma.portfolio.findMany({ where: { ownerId: me.id }, orderBy: { createdAt: 'desc' } }));
  }),
);

profileRouter.post(
  '/portfolio',
  uploader('portfolio', 'file'),
  ah(async (req: AuthRequest, res) => {
    const me = currentUser(req);
    const file = requireFile(req);
    // Format dan ukuran sudah ditegakkan middleware upload (FR-04).
    const meta = z
      .object({
        title: z.string().trim().min(2, 'Judul berkas minimal 2 huruf').max(150),
        description: z.string().trim().max(2000).optional(),
      })
      .parse(req.body);

    const item = await prisma.portfolio.create({
      data: {
        ownerId: me.id,
        title: meta.title,
        description: meta.description ?? null,
        fileUrl: fileUrlFor('portfolio', file.filename),
        fileType: file.mimetype,
        fileSize: file.size,
      },
    });
    recomputeTrustScoreSafe(me.id);
    res.status(201).json(item);
  }),
);

profileRouter.delete(
  '/portfolio/:id',
  ah(async (req: AuthRequest, res) => {
    const me = currentUser(req);
    const item = await prisma.portfolio.findFirst({
      where: { id: String(req.params.id), ownerId: me.id },
      select: { id: true },
    });
    if (!item) throw notFound('Berkas portofolio tidak ditemukan.');
    await prisma.portfolio.delete({ where: { id: item.id } });
    recomputeTrustScoreSafe(me.id);
    res.json({ ok: true });
  }),
);

// ---------------------------------------------------------------------------
// Profil publik pihak lain (halaman detail mitra)
// ---------------------------------------------------------------------------

profileRouter.get(
  '/users/:id',
  ah(async (req: AuthRequest, res) => {
    const target = await prisma.user.findUnique({
      where: { id: String(req.params.id) },
      select: {
        id: true,
        role: true,
        createdAt: true,
        profile: {
          select: {
            fullName: true,
            avatarUrl: true,
            bio: true,
            location: true,
            trustScore: true,
            verificationStatus: true,
          },
        },
        business: { include: { sector: true, fundingRequests: { where: { status: FundingStatus.ACTIVE } } } },
        investorPreference: { include: { preferredSector: true } },
        portfolios: { orderBy: { createdAt: 'desc' } },
        ratingsReceived: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            score: true,
            review: true,
            createdAt: true,
            reviewer: { select: { profile: { select: { fullName: true, avatarUrl: true } } } },
          },
        },
      },
    });
    if (!target?.profile) throw notFound('Pengguna tidak ditemukan.');
    // Peran ADMIN tidak punya halaman publik.
    if (target.role === Role.ADMIN) throw forbidden();

    const agg = await prisma.rating.aggregate({
      where: { reviewedUserId: target.id },
      _avg: { score: true },
      _count: { _all: true },
    });

    res.json({
      ...target,
      isVerified: target.profile.verificationStatus === VerificationStatus.VERIFIED,
      averageRating: agg._avg.score,
      ratingCount: agg._count._all,
      investorPreference: target.investorPreference
        ? {
            ...target.investorPreference,
            cooperationTypes: parseCooperationTypes(target.investorPreference.cooperationTypes),
          }
        : null,
    });
  }),
);
