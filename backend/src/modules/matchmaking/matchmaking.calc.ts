import type { CooperationType } from '@prisma/client';
import { MATCH_MIN_SCORE, effectiveWeights } from '../../config/scoring.js';
import { COOPERATION_LABEL, hasOverlap, intersection } from '../../lib/cooperation.js';

/**
 * FR-06 dan FR-07 — mesin pencocokan, bagian perhitungan murni.
 *
 * Dua tahap, urutannya mengikat:
 *   1. HARD FILTER (FR-06): irisan jenis kerja sama. Irisan kosong = pasangan
 *      itu TIDAK PERNAH masuk daftar, berapa pun skor komponen lain.
 *   2. WEIGHTED SCORING (FR-07): sektor 40, modal 30, lokasi 10, trust 20.
 *
 * Tidak ada akses database di sini supaya bisa diuji tanpa MySQL, dan supaya
 * bobotnya bisa diverifikasi angka per angka.
 */

export type InvestorSide = {
  minimumAmount: number;
  maximumAmount: number;
  preferredLocation: string | null;
  preferredSectorId: string | null;
  cooperationTypes: CooperationType[];
};

export type UmkmSide = {
  fundingRequestId: string;
  sectorId: string;
  location: string;
  targetAmount: number;
  cooperationTypes: CooperationType[];
  /** Trust Score pemilik usaha, 0-100 (FR-03). */
  trustScore: number;
};

export type MatchComponent = {
  ratio: number;
  weight: number;
  points: number;
};

export type MatchResult = {
  fundingRequestId: string;
  /** 0-100, dibulatkan. */
  score: number;
  /** Skema yang beririsan — dasar lolosnya hard filter. */
  matchedCooperationTypes: CooperationType[];
  components: {
    sector: MatchComponent;
    amount: MatchComponent;
    location: MatchComponent;
    trustScore: MatchComponent;
  };
  /** Kalimat siap tampil, menjelaskan kenapa pasangan ini muncul. */
  reasons: string[];
  /** true kalau skor >= ambang minimum. Di bawahnya = alternatif informatif. */
  isRecommended: boolean;
};

/**
 * Sektor (bobot 40).
 * Investor yang tidak menetapkan sektor mendapat nilai netral 0.5 untuk SEMUA
 * kandidat. Konstanta yang sama di setiap kandidat tidak mengubah urutan
 * peringkat, jadi efeknya sektor cuma tidak ikut membedakan — bukan menghukum.
 */
function sectorRatio(investor: InvestorSide, umkm: UmkmSide): number {
  if (!investor.preferredSectorId) return 0.5;
  return investor.preferredSectorId === umkm.sectorId ? 1 : 0;
}

/**
 * Modal (bobot 30).
 * Di dalam rentang = penuh. Di luar rentang meluruh proporsional terhadap
 * seberapa jauh melesetnya, bukan langsung nol — investor yang menetapkan
 * plafon 100 juta tetap wajar melihat peluang 110 juta.
 */
function amountRatio(investor: InvestorSide, umkm: UmkmSide): number {
  const { minimumAmount: min, maximumAmount: max } = investor;
  const target = umkm.targetAmount;

  if (target <= 0) return 0;
  // Investor belum mengisi plafon: netral, tidak mengubah urutan.
  if (max <= 0) return 0.5;

  if (target >= min && target <= max) return 1;
  if (target < min) return min <= 0 ? 1 : Math.max(0, target / min);
  return Math.max(0, max / target);
}

/**
 * Lokasi (bobot 10) — HANYA dihitung kalau investor mengisi preferredLocation.
 * Kalau kosong, bobotnya dibagi ulang ke komponen lain (lihat effectiveWeights).
 * Perbandingan longgar supaya "Bandung" cocok dengan "Bandung, Jawa Barat".
 */
function locationRatio(investor: InvestorSide, umkm: UmkmSide): number {
  const pref = investor.preferredLocation?.trim().toLowerCase();
  if (!pref) return 0;
  const actual = umkm.location.trim().toLowerCase();
  if (!actual) return 0;
  if (actual === pref) return 1;
  return actual.includes(pref) || pref.includes(actual) ? 1 : 0;
}

/** Trust Score (bobot 20). Sudah 0-100, tinggal dinormalkan. */
function trustRatio(umkm: UmkmSide): number {
  return Math.min(1, Math.max(0, umkm.trustScore / 100));
}

const rupiah = (n: number) => `Rp${Math.round(n).toLocaleString('id-ID')}`;

/**
 * FR-06 — hard filter. Kembalikan null kalau skema kerja sama tidak beririsan
 * sama sekali. Pemanggil WAJIB membuang hasil null, bukan memberinya skor 0.
 */
export function scoreMatch(investor: InvestorSide, umkm: UmkmSide): MatchResult | null {
  if (!hasOverlap(investor.cooperationTypes, umkm.cooperationTypes)) return null;

  const matched = intersection(investor.cooperationTypes, umkm.cooperationTypes);
  const hasLocationPref = Boolean(investor.preferredLocation?.trim());
  const w = effectiveWeights(hasLocationPref);

  const ratios = {
    sector: sectorRatio(investor, umkm),
    amount: amountRatio(investor, umkm),
    location: locationRatio(investor, umkm),
    trustScore: trustRatio(umkm),
  };

  const components = {
    sector: { ratio: ratios.sector, weight: w.sector, points: ratios.sector * w.sector },
    amount: { ratio: ratios.amount, weight: w.amount, points: ratios.amount * w.amount },
    location: { ratio: ratios.location, weight: w.location, points: ratios.location * w.location },
    trustScore: { ratio: ratios.trustScore, weight: w.trustScore, points: ratios.trustScore * w.trustScore },
  };

  const raw =
    components.sector.points +
    components.amount.points +
    components.location.points +
    components.trustScore.points;
  const score = Math.min(100, Math.max(0, Math.round(raw)));

  const reasons: string[] = [
    `Skema ${matched.map((t) => COOPERATION_LABEL[t]).join(' / ')} cocok dengan preferensimu`,
  ];
  if (ratios.sector === 1) reasons.push('Sektor usaha sesuai fokus investasimu');
  if (ratios.amount === 1) reasons.push(`Kebutuhan dana ${rupiah(umkm.targetAmount)} masuk rentang anggaranmu`);
  else if (ratios.amount >= 0.7) reasons.push(`Kebutuhan dana ${rupiah(umkm.targetAmount)} mendekati rentang anggaranmu`);
  if (ratios.location === 1) reasons.push(`Berlokasi di ${umkm.location}`);
  if (umkm.trustScore >= 70) reasons.push(`Skor kepercayaan tinggi (${umkm.trustScore}/100)`);

  return {
    fundingRequestId: umkm.fundingRequestId,
    score,
    matchedCooperationTypes: matched,
    components,
    reasons,
    isRecommended: score >= MATCH_MIN_SCORE,
  };
}

/**
 * Jalankan hard filter + skoring untuk banyak kandidat, urut skor menurun.
 *
 * FR-07 mensyaratkan alternatif informatif ketika tidak ada yang melewati
 * ambang, jadi kandidat di bawah ambang tetap dikembalikan — terpisah, dan
 * ditandai — bukan dibuang menjadi layar kosong.
 */
export function rankMatches(
  investor: InvestorSide,
  candidates: UmkmSide[],
): { recommended: MatchResult[]; alternatives: MatchResult[]; rejectedByHardFilter: number } {
  let rejected = 0;
  const scored: MatchResult[] = [];

  for (const candidate of candidates) {
    const result = scoreMatch(investor, candidate);
    if (!result) {
      rejected += 1;
      continue;
    }
    scored.push(result);
  }

  scored.sort((a, b) => b.score - a.score || a.fundingRequestId.localeCompare(b.fundingRequestId));

  return {
    recommended: scored.filter((m) => m.isRecommended),
    alternatives: scored.filter((m) => !m.isRecommended),
    rejectedByHardFilter: rejected,
  };
}

export { MATCH_MIN_SCORE };
