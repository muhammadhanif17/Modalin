# Modalin

Platform web yang mempertemukan UMKM pencari modal dengan investor secara langsung: pencocokan otomatis berbasis skor kepercayaan, pencarian manual berfilter, chat langsung, otomatisasi dokumen perjanjian, dan rating pasca kerja sama.

Dibangun untuk HOLOGY 9.0 HoloDev oleh tim **El Yapping** (Universitas Diponegoro).

## Tumpukan teknologi

React + TypeScript (SPA/PWA) · Node.js + Express (modular monolith, 10 modul domain) · MySQL via **Prisma ORM** · **Socket.io** khusus chat · JWT stateless + refresh token · **Argon2id** untuk hashing kata sandi · Bahasa Indonesia, Rupiah, format tanggal Indonesia.

## Menjalankan secara lokal

Lihat `RUN.md` untuk setup end-to-end (backend, frontend, database, seed, akun demo).

```bash
# 1. Siapkan environment
cp .env.example backend/.env          # isi DATABASE_URL dan JWT_SECRET (minimal 32 karakter)
echo "VITE_API_URL=http://localhost:4000" > frontend/.env

# 2. Siapkan MySQL — pakai Docker, atau arahkan DATABASE_URL ke MySQL terkelola
docker compose up -d db

# 3. Pasang dependensi dan siapkan basis data
npm install
npm --workspace backend run db:generate
npm --workspace backend exec prisma migrate deploy
npm --workspace backend run db:seed

# 4. Jalankan
npm run dev:backend    # http://localhost:4000
npm run dev:frontend   # http://localhost:5173
```

### Akun demo

Seluruh akun hasil seeder memakai kata sandi **`Modalin2026!`**

| Email | Peran | Untuk mendemokan |
|---|---|---|
| `sari.investor@modalin.id` | Investor | Alur utama: rekomendasi → ketertarikan → chat → SPK → checkout |
| `dapur.bunda@modalin.id` | UMKM | Lawan bicara Sari dalam alur di atas |
| `admin@modalin.id` | Admin | Antrean verifikasi KYC |
| `batik.pekalongan@modalin.id` | UMKM | Status verifikasi `PENDING`, ada di antrean admin |
| `budidaya.nila@modalin.id` | UMKM | Status verifikasi `REJECTED` beserta alasannya |

Seeder membuat 8 UMKM, 5 investor, dan koneksi di **semua** status (menunggu, ditolak, ditutup, diterima, sampai selesai dengan rating), supaya perbedaan tiap status terlihat saat demo.

## Verifikasi

```bash
npm run typecheck                    # kedua workspace
npm --workspace backend run test    # 39 unit test
npm run build                        # kedua workspace
```

Cakupan unit test: perhitungan Trust Score, hard filter dan weighted scoring matchmaking, serta penerbitan dokumen PDF termasuk keutuhan disclaimer hukum.

## Aturan bisnis yang ditegakkan di server

Aturan berikut diperiksa di Application Layer, bukan sekadar disembunyikan di UI:

- Badge Terverifikasi hanya muncul setelah admin menyetujui. Antrean admin urut waktu unggah; penolakan wajib menyertakan alasan.
- Trust Score 0–100 dihitung ulang tiap ada perubahan verifikasi, kelengkapan profil, atau rating baru. Akun baru mulai dari 0 tanpa perlakuan khusus — belum adanya rating dihitung 0, bukan nilai netral.
- Unggahan dibatasi PDF/JPG/PNG/WebP maksimal 10 MB. Nama berkas selalu diacak ulang, nama dari klien tidak pernah dipakai.
- Hard filter irisan jenis kerja sama berjalan **sebelum** skoring matchmaking. Irisan kosong berarti pasangan itu tidak pernah masuk rekomendasi, berapa pun skor komponen lainnya.
- Bobot skoring matchmaking: sektor 40% / modal 30% / lokasi 10% / Trust Score 20%. Bobot lokasi hanya dihitung kalau investor mengisi preferensi lokasi.
- Penerbitan PDF **ditolak** selama salah satu pihak belum menandatangani.
- Rating hanya bisa diberikan setelah kerja sama berstatus selesai, dan dijaga unik per pemberi per kesepakatan di level basis data.
- Hanya penerima yang bisa menerima/menolak ketertarikan. Status ditolak berarti tidak pernah diterima; status ditutup berarti pernah diterima lalu diakhiri salah satu pihak. Keduanya terminal.

Dokumen sensitif (KTP, NIB, tanda tangan, PDF perjanjian) tidak pernah dilayani sebagai berkas statis publik; aksesnya lewat `/api/files` yang memeriksa kepemilikan per scope.

## Catatan desain

- **Satu palet warna:** kanvas bone `#F3EEE3`, primary forest `#0F2419`, aksen pine `#2D6A4F`. Warna status (sukses/peringatan/gagal) terpisah dari warna brand.
- **14 tabel database**, termasuk `Transaction` untuk pembayaran biaya layanan.
- **`cooperationTypes` disimpan sebagai JSON array** (bukan kolom tunggal) karena matchmaking mensyaratkan irisan dan UI memakai checkbox multi-pilih. Isinya divalidasi Zod di Application Layer.
- **Tidak ada tabel `Notification`.** Indikator notifikasi diturunkan dari status pesan belum dibaca dan status koneksi.
- **`Agreement` punya kolom skema-spesifik** (`profitSharingRatio`, `equityPercentage`, `interestRate`) untuk ketiga jenis kerja sama.

## Batasan yang disengaja

- **Dana investasi UMKM–investor tidak pernah diproses lewat platform.** Payment gateway hanya untuk biaya layanan dan langganan Modalin Pro. Alasannya perizinan: pemrosesan langsung berpotensi masuk ranah Securities Crowdfunding atau P2P lending yang diawasi OJK.
- **Pembayaran murni simulasi UI.** Tidak ada SDK Midtrans/Xendit dan tidak ada panggilan keluar.
- **Tanda tangan digital belum tersertifikasi PSrE.** Dokumen tetap sah menurut Pasal 11 UU ITE dan Pasal 59 ayat (3) PP No. 71/2019, tetapi kekuatan pembuktiannya di bawah dokumen bersertifikat dan **tidak setara akta notaris**. Disclaimer ini wajib ikut tercetak di setiap PDF yang diterbitkan.
- **Bahasa Indonesia saja.** Tidak ada dukungan multibahasa untuk MVP.

## Deployment

Produksi saat ini: frontend di **Vercel**, backend di **Railway**. Keduanya auto-deploy
dari GitHub branch `main` — bukan dari folder lokal. Perubahan lokal baru live
setelah `git push origin main`.

- **Frontend (Vercel):** project root diarahkan ke `frontend/`; set `VITE_API_URL`
  ke URL publik Railway. Karena Vite menanam env saat build, tiap ganti URL
  wajib redeploy frontend.
- **Backend (Railway):** service memakai `backend/Dockerfile`; `render.yaml` sudah
  dihapus karena hanya dipakai Render.

1. Siapkan MySQL terkelola, salin connection string ke `DATABASE_URL`.
2. Set `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`, `WEB_ORIGIN`, `PUBLIC_BASE_URL`, dan `API_PORT=4000`.
3. Jalankan `prisma migrate deploy` sekali terhadap basis data produksi.
4. Pastikan `GET /health` mengembalikan `{ "status": "ok" }`.
5. Setelah domain Vercel final, perbarui `WEB_ORIGIN` lalu restart API.

Unggahan saat ini disimpan di disk lokal (`UPLOAD_DIR`). Untuk produksi, arahkan ke Cloud Storage — host dengan disk sementara akan kehilangan berkas saat restart.

## Keamanan

Jangan pernah commit berkas `.env`. Input divalidasi Zod, kata sandi di-hash Argon2id, header diperketat Helmet, CORS dibatasi ke satu origin, dan percobaan masuk dibatasi rate limiter yang **hanya menghitung percobaan gagal** sehingga pengguna sah tidak ikut terkunci.
