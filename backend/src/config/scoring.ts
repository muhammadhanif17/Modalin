/**
 * Satu-satunya tempat bobot skoring didefinisikan (FR-03 dan FR-07).
 * Kalau angka di sini berubah, update juga README.
 */

// ---------------------------------------------------------------------------
// FR-03 — Trust Score (skala 0-100)
// ---------------------------------------------------------------------------
// ARCHITECTURE.md §12 mencatat baseline akun baru sebagai keputusan terbuka.
// ASUMSI YANG DIAMBIL: akun baru mulai dari 0, tanpa perlakuan cold-start
// khusus. Skor naik saat profil dilengkapi, KYC disetujui, dan rating masuk.
// Komponen rating memakai nilai netral 3/5 hanya sebagai *penyebut* ketika
// belum ada rating sama sekali — bukan bonus, komponennya tetap 0.
export const TRUST_SCORE_WEIGHTS = {
  /// Kelengkapan profil: makin lengkap data, makin tinggi.
  profileCompleteness: 40,
  /// Status verifikasi KYC oleh admin.
  verification: 30,
  /// Rata-rata rating yang diterima dari kerja sama selesai.
  rating: 30,
} as const;

/// Bobot wajib berjumlah 100 supaya skor akhir berada di skala 0-100.
const trustTotal =
  TRUST_SCORE_WEIGHTS.profileCompleteness +
  TRUST_SCORE_WEIGHTS.verification +
  TRUST_SCORE_WEIGHTS.rating;
if (trustTotal !== 100) {
  throw new Error(`TRUST_SCORE_WEIGHTS harus berjumlah 100, dapat ${trustTotal}`);
}

// ---------------------------------------------------------------------------
// FR-07 — Weighted scoring matchmaking
// ---------------------------------------------------------------------------
// Angka ini mengikat: proposal §3.1.2 FR-07 menyebutnya eksplisit.
export const MATCH_WEIGHTS = {
  sector: 40,
  amount: 30,
  location: 10,
  trustScore: 20,
} as const;

const matchTotal =
  MATCH_WEIGHTS.sector + MATCH_WEIGHTS.amount + MATCH_WEIGHTS.location + MATCH_WEIGHTS.trustScore;
if (matchTotal !== 100) {
  throw new Error(`MATCH_WEIGHTS harus berjumlah 100, dapat ${matchTotal}`);
}

/**
 * Ambang skor minimum agar sebuah pasangan disebut "rekomendasi".
 * Di bawah ini hasil tetap dikembalikan, tapi ditandai sebagai alternatif
 * informatif — FR-07 mensyaratkan alternatif, bukan layar kosong.
 */
export const MATCH_MIN_SCORE = 50;

/**
 * Bobot lokasi hanya dihitung kalau investor mengisi preferredLocation
 * (FR-07: "lokasi 10% hanya jika investor set preferensi"). Kalau kosong,
 * 10 poin itu dibagikan ulang secara proporsional ke tiga komponen sisanya
 * supaya skor tetap berada di skala 0-100 dan tidak menghukum investor yang
 * memang tidak peduli lokasi.
 */
export function effectiveWeights(hasLocationPreference: boolean) {
  if (hasLocationPreference) return { ...MATCH_WEIGHTS };
  const rest = MATCH_WEIGHTS.sector + MATCH_WEIGHTS.amount + MATCH_WEIGHTS.trustScore;
  const scale = 100 / rest;
  return {
    sector: MATCH_WEIGHTS.sector * scale,
    amount: MATCH_WEIGHTS.amount * scale,
    location: 0,
    trustScore: MATCH_WEIGHTS.trustScore * scale,
  };
}

// ---------------------------------------------------------------------------
// FR-04 — Batas unggahan
// ---------------------------------------------------------------------------
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_UPLOAD_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;
