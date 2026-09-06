import { Role, VerificationStatus } from '@prisma/client';
import { TRUST_SCORE_WEIGHTS } from '../../config/scoring.js';

/**
 * FR-03 — Trust Score Engine, bagian perhitungan murni.
 *
 * Sengaja dipisah dari akses database supaya bisa diuji tanpa MySQL dan supaya
 * batas <5 detik gampang dipenuhi: fungsi ini O(1) terhadap jumlah rating.
 */

export type TrustScoreInput = {
  role: Role;
  verificationStatus: VerificationStatus;
  /** Kolom profil yang sudah terisi. */
  profile: {
    fullName: boolean;
    phone: boolean;
    avatarUrl: boolean;
    bio: boolean;
    location: boolean;
    ktpUrl: boolean;
    nibUrl: boolean;
  };
  /** Data pelengkap sesuai peran. */
  hasBusiness: boolean;
  hasFundingRequest: boolean;
  hasInvestorPreference: boolean;
  portfolioCount: number;
  /** Rata-rata rating diterima (1-5). null kalau belum pernah dinilai. */
  averageRating: number | null;
  ratingCount: number;
};

export type TrustScoreBreakdown = {
  total: number;
  profileCompleteness: number;
  verification: number;
  rating: number;
  /** Alasan yang bisa ditampilkan ke pengguna: "apa lagi yang perlu dilengkapi". */
  missing: string[];
};

/**
 * Kelengkapan profil (bobot 40).
 * Daftar syarat berbeda per peran: NIB dan data usaha hanya relevan untuk UMKM,
 * preferensi investasi hanya relevan untuk Investor.
 */
function completeness(input: TrustScoreInput): { ratio: number; missing: string[] } {
  const checks: Array<{ ok: boolean; label: string }> = [
    { ok: input.profile.fullName, label: 'Nama lengkap' },
    { ok: input.profile.phone, label: 'Nomor telepon' },
    { ok: input.profile.bio, label: input.role === Role.INVESTOR ? 'Fokus investasi' : 'Deskripsi diri' },
    { ok: input.profile.location, label: 'Lokasi' },
    { ok: input.profile.avatarUrl, label: 'Foto profil' },
    { ok: input.profile.ktpUrl, label: 'Dokumen KTP' },
    { ok: input.portfolioCount > 0, label: 'Minimal satu berkas portofolio' },
  ];

  if (input.role === Role.UMKM) {
    checks.push(
      { ok: input.profile.nibUrl, label: 'Dokumen NIB' },
      { ok: input.hasBusiness, label: 'Data usaha' },
      { ok: input.hasFundingRequest, label: 'Permintaan pendanaan' },
    );
  } else if (input.role === Role.INVESTOR) {
    checks.push({ ok: input.hasInvestorPreference, label: 'Preferensi investasi' });
  }

  const done = checks.filter((c) => c.ok).length;
  return {
    ratio: checks.length === 0 ? 0 : done / checks.length,
    missing: checks.filter((c) => !c.ok).map((c) => c.label),
  };
}

/**
 * Status verifikasi (bobot 30).
 * PENDING dapat kredit sebagian supaya pengguna yang sudah mengunggah dokumen
 * tidak terlihat sama dengan yang belum mengunggah sama sekali — tapi badge
 * Terverifikasi tetap HANYA muncul saat VERIFIED (FR-02).
 */
function verificationRatio(status: VerificationStatus): number {
  switch (status) {
    case VerificationStatus.VERIFIED:
      return 1;
    case VerificationStatus.PENDING:
      return 0.25;
    case VerificationStatus.REJECTED:
    case VerificationStatus.UNVERIFIED:
    default:
      return 0;
  }
}

/**
 * Rating (bobot 30). Skala 1-5 dipetakan linear ke 0-1: rating 1 berarti 0,
 * rating 5 berarti penuh. Belum ada rating berarti komponen ini 0 — bukan
 * bonus netral, supaya akun baru tidak terlihat lebih kredibel dari yang sudah
 * terbukti (ARCHITECTURE.md §12: baseline cold-start dicatat sebagai asumsi).
 */
function ratingRatio(average: number | null, count: number): number {
  if (average === null || count <= 0) return 0;
  const clamped = Math.min(5, Math.max(1, average));
  return (clamped - 1) / 4;
}

export function calculateTrustScore(input: TrustScoreInput): TrustScoreBreakdown {
  const { ratio, missing } = completeness(input);

  const profileCompleteness = ratio * TRUST_SCORE_WEIGHTS.profileCompleteness;
  const verification = verificationRatio(input.verificationStatus) * TRUST_SCORE_WEIGHTS.verification;
  const rating = ratingRatio(input.averageRating, input.ratingCount) * TRUST_SCORE_WEIGHTS.rating;

  const total = Math.round(profileCompleteness + verification + rating);

  return {
    // Dijepit ke 0-100 sebagai jaring pengaman kalau bobot config diubah salah.
    total: Math.min(100, Math.max(0, total)),
    profileCompleteness: Math.round(profileCompleteness),
    verification: Math.round(verification),
    rating: Math.round(rating),
    missing,
  };
}
