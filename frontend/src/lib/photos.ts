/**
 * Foto sementara untuk landing dan daftar peluang.
 *
 * Sebelumnya memakai picsum, yang mengembalikan gambar ACAK — kartu "Dapur
 * Bunda Sambal Nusantara" bisa kebagian foto gunung. Di halaman yang dinilai,
 * foto yang tidak nyambung lebih merusak daripada tidak ada foto sama sekali.
 *
 * Sekarang sumbernya Wikimedia Commons: foto UMKM Indonesia sungguhan, dari
 * tempat yang benar-benar ada (Kebumen, Imogiri, Sukapura, Trusmi, Purbalingga,
 * Kedonganan), berlisensi bebas, dan URL-nya stabil. Tiap sektor punya
 * kumpulan fotonya sendiri; pilihannya ditentukan dari id usaha supaya tetap
 * sama antar-muat dan dua usaha di sektor yang sama tidak kembar.
 *
 * GANTI SELURUH ISI BERKAS INI saat aset foto asli sudah ada. Tidak ada URL
 * gambar yang tersebar di komponen mana pun — semuanya lewat sini.
 *
 * Catatan lebar: Wikimedia hanya melayani lebar thumbnail tertentu. 960px
 * dilayani, 900px ditolak 400. Jangan ubah angkanya tanpa diuji dulu.
 */

const W = 'https://upload.wikimedia.org/wikipedia/commons/thumb';
const f = (path: string, name: string) => `${W}/${path}/${name}/960px-${name}`;

const WARUNG_AMBAL = f('e/e2', 'Kios_Warung_Makan_Di_Ambal_Kebumen.jpg');
const WARUNG_KLITIKAN = f('c/c9', 'Pedagang_Warung_Makan_Di_Pasar_Klitikan_Di_Kebumen.jpg');
const WARUNG_ARUMBINANG = f(
  '3/3c',
  'Sisi_Selatan_Warung_Makan_Di_Jl.Arumbinang_Kebumen_Jateng_Indonesia.jpg',
);
const BATIK_IMOGIRI = f('e/e9', 'Maestro_Batik_Tulis_di_Imogiri.jpg');
const BATIK_SUKAPURA = f('6/65', 'Pengrajin_Batik_Sukapura.jpg');
const BATIK_TRUSMI = f('3/34', 'Pengrajin_batik_Trusmi_00.jpg');
const PENJAHIT_PEMUDA = f('c/c4', 'Jasa_Penjahit_Di_Jl.Pemuda_Kebumen.jpg');
const PENJAHIT_TUMENGGUNGAN = f('8/8b', 'Jasa_Penjahit_Di_Pasar_Tumenggungan_Kebumen.jpg');
const BENGKEL_CAKRA = f('8/89', 'Bengkel_Cakra_Motor_11.jpg');
const BENGKEL_JOK = f('5/52', 'Bengkel_Jok_Sepeda_Motor_Di_Kebumen_Jateng_Indonesia.jpg');
const PASAR_PURBALINGGA = f('f/f3', 'PKL_Pasar_Purbalingga.jpg');
const PASAR_REMPAH = f('8/84', 'Rempah_tradisional_di_pasar.jpg');
const PASAR_IKAN = f('7/78', 'Pasar_Ikan_Tradisional_Kedonganan.jpg');
const PASAR_TERAPUNG = f('3/36', 'Jukung_Pasar_Terapung.jpg');

/** Nama sektor mengikuti seeder database. */
const PER_SEKTOR: Record<string, string[]> = {
  Kuliner: [WARUNG_AMBAL, WARUNG_KLITIKAN, WARUNG_ARUMBINANG],
  'Kriya & Kerajinan': [BATIK_IMOGIRI, BATIK_SUKAPURA, BATIK_TRUSMI],
  Fesyen: [PENJAHIT_PEMUDA, PENJAHIT_TUMENGGUNGAN, BATIK_SUKAPURA],
  Jasa: [BENGKEL_CAKRA, BENGKEL_JOK],
  Perdagangan: [PASAR_PURBALINGGA, PASAR_REMPAH, PASAR_TERAPUNG],
  Perikanan: [PASAR_IKAN, PASAR_TERAPUNG],
  // Belum ada foto khusus; hasil bumi di pasar adalah padanan terdekat.
  Agrikultur: [PASAR_REMPAH, PASAR_PURBALINGGA],
  // Idem — dipetakan ke usaha kecil bermodal alat, bukan foto kantor generik.
  Teknologi: [BENGKEL_CAKRA, WARUNG_KLITIKAN],
};

const CADANGAN = [WARUNG_ARUMBINANG, PASAR_PURBALINGGA, BENGKEL_CAKRA];

/** Penjumlah sederhana — memilih foto secara tetap dari sebuah id. */
function pilih(daftar: string[], kunci: string): string {
  let n = 0;
  for (let i = 0; i < kunci.length; i += 1) n = (n * 31 + kunci.charCodeAt(i)) >>> 0;
  return daftar[n % daftar.length];
}

/** Foto bingkai hero landing — etalase warung makan di Kebumen. */
export const PHOTO_HERO = WARUNG_ARUMBINANG;

/** Sisi pengusaha, untuk bagian yang menampilkan kedua peran berdampingan. */
export const PHOTO_PENGUSAHA = BATIK_IMOGIRI;

/** Sisi pemodal — belum ada foto yang pas, sementara memakai suasana pasar. */
export const PHOTO_PEMODAL = PASAR_PURBALINGGA;

/**
 * Foto sampul baris peluang, dipilih menurut sektor usahanya.
 * `seed` cukup diisi id peluang supaya pilihannya tetap antar-muat.
 */
export const coverFor = (seed?: string | null, sektor?: string | null) =>
  pilih((sektor && PER_SEKTOR[sektor]) || CADANGAN, seed ?? 'usaha');
