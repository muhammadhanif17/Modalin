import { CooperationType } from '@prisma/client';
import { z } from 'zod';

/**
 * Prisma/MySQL tidak punya tipe array-of-enum, jadi `cooperationTypes` disimpan
 * sebagai kolom Json. Semua baca/tulis harus lewat helper di sini supaya isinya tetap terjaga.
 */

export const cooperationTypeSchema = z.nativeEnum(CooperationType);

/** Minimal satu skema harus dipilih — tanpa itu FR-06 tidak punya apa-apa untuk diiris. */
export const cooperationTypesSchema = z
  .array(cooperationTypeSchema)
  .min(1, 'Pilih minimal satu jenis kerja sama')
  .max(3)
  .transform((list) => [...new Set(list)]);

/** Baca kolom Json jadi array enum yang bersih. Baris rusak diperlakukan sebagai kosong. */
export function parseCooperationTypes(value: unknown): CooperationType[] {
  if (!Array.isArray(value)) return [];
  const valid = new Set<string>(Object.values(CooperationType));
  return [...new Set(value.filter((v): v is CooperationType => typeof v === 'string' && valid.has(v)))];
}

/**
 * FR-06 — hard filter. Dua pihak baru boleh masuk tahap skoring kalau skema
 * kerja samanya BERIRISAN. Irisan kosong berarti pasangan itu tidak pernah
 * muncul di rekomendasi, apa pun skor komponen lainnya.
 */
export function hasOverlap(a: CooperationType[], b: CooperationType[]): boolean {
  if (a.length === 0 || b.length === 0) return false;
  const set = new Set(a);
  return b.some((item) => set.has(item));
}

/** Irisan sebenarnya — dipakai untuk menjelaskan ke pengguna kenapa cocok. */
export function intersection(a: CooperationType[], b: CooperationType[]): CooperationType[] {
  const set = new Set(a);
  return b.filter((item) => set.has(item));
}

export const COOPERATION_LABEL: Record<CooperationType, string> = {
  BAGI_HASIL: 'Bagi Hasil',
  PENYERTAAN_MODAL: 'Penyertaan Modal',
  PINJAMAN: 'Pinjaman',
};

/** Penjelasan awam untuk ikon info di form (NFR Usability: istilah keuangan disertai penjelasan). */
export const COOPERATION_HELP: Record<CooperationType, string> = {
  BAGI_HASIL:
    'Pemodal ikut menanggung untung-rugi usaha. Keuntungan dibagi sesuai porsi yang disepakati, tidak ada bunga tetap.',
  PENYERTAAN_MODAL:
    'Pemodal menjadi pemilik sebagian usaha Anda. Ia berhak atas persentase kepemilikan dan ikut menanggung risiko jangka panjang.',
  PINJAMAN:
    'Dana dikembalikan bertahap dalam jangka waktu tertentu beserta imbal hasil yang sudah disepakati di awal.',
};
