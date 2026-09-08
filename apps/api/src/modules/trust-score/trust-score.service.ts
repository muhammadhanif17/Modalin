import { Role } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { calculateTrustScore, type TrustScoreBreakdown, type TrustScoreInput } from './trust-score.calc.js';

/**
 * FR-03 — Trust Score Engine.
 *
 * Dipicu oleh Modul 1 (verifikasi), Modul 3 (kelengkapan profil), dan Modul 7
 * (rating baru) — ARCHITECTURE.md §4.1. Modul-modul itu memanggil
 * `recomputeTrustScore(userId)`, bukan menulis kolom trustScore langsung.
 *
 * Target <5 detik dipenuhi dengan satu query agregat, bukan memuat seluruh
 * riwayat rating ke memori.
 */

async function loadInput(userId: string): Promise<TrustScoreInput | null> {
  const [user, ratingAgg, portfolioCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        profile: {
          select: {
            fullName: true,
            phone: true,
            avatarUrl: true,
            bio: true,
            location: true,
            ktpUrl: true,
            nibUrl: true,
            verificationStatus: true,
          },
        },
        business: { select: { id: true, fundingRequests: { select: { id: true }, take: 1 } } },
        investorPreference: { select: { id: true } },
      },
    }),
    prisma.rating.aggregate({
      where: { reviewedUserId: userId },
      _avg: { score: true },
      _count: { _all: true },
    }),
    prisma.portfolio.count({ where: { ownerId: userId } }),
  ]);

  if (!user?.profile) return null;
  const p = user.profile;

  return {
    role: user.role,
    verificationStatus: p.verificationStatus,
    profile: {
      fullName: Boolean(p.fullName?.trim()),
      phone: Boolean(p.phone?.trim()),
      avatarUrl: Boolean(p.avatarUrl),
      bio: Boolean(p.bio?.trim()),
      location: Boolean(p.location?.trim()),
      ktpUrl: Boolean(p.ktpUrl),
      nibUrl: Boolean(p.nibUrl),
    },
    hasBusiness: Boolean(user.business),
    hasFundingRequest: (user.business?.fundingRequests.length ?? 0) > 0,
    hasInvestorPreference: Boolean(user.investorPreference),
    portfolioCount,
    averageRating: ratingAgg._avg.score ?? null,
    ratingCount: ratingAgg._count._all,
  };
}

/** Hitung ulang lalu simpan. Mengembalikan rincian supaya UI bisa menampilkan "apa yang kurang". */
export async function recomputeTrustScore(userId: string): Promise<TrustScoreBreakdown | null> {
  const input = await loadInput(userId);
  if (!input) return null;

  const breakdown = calculateTrustScore(input);
  await prisma.profile.update({
    where: { userId },
    data: { trustScore: breakdown.total, trustScoreUpdatedAt: new Date() },
  });
  return breakdown;
}

/** Hitung tanpa menyimpan — untuk menampilkan rincian di halaman profil. */
export async function previewTrustScore(userId: string): Promise<TrustScoreBreakdown | null> {
  const input = await loadInput(userId);
  return input ? calculateTrustScore(input) : null;
}

/**
 * Dipanggil setelah operasi tulis yang mempengaruhi skor. Sengaja tidak
 * di-await oleh pemanggilnya pada jalur yang tidak kritis, supaya response API
 * tidak menunggu. Kegagalan dicatat, tidak dilempar — skor bukan alasan untuk
 * menggagalkan aksi utama pengguna.
 */
export function recomputeTrustScoreSafe(userId: string): void {
  recomputeTrustScore(userId).catch((error: unknown) => {
    console.error('trust_score_recompute_failed', userId, error instanceof Error ? error.message : error);
  });
}

/** Peran ADMIN tidak punya Trust Score yang bermakna. */
export const scorableRoles: Role[] = [Role.UMKM, Role.INVESTOR];
