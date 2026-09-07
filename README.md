# Modalin

Platform web yang mempertemukan UMKM pencari modal dengan investor secara langsung: pencocokan otomatis berbasis skor kepercayaan, pencarian manual berfilter, chat langsung, otomatisasi dokumen perjanjian, dan rating pasca kerja sama.

Dibangun untuk HOLOGY 9.0 HoloDev oleh tim **El Yapping** (Universitas Diponegoro).

## Dokumen acuan

Ketiganya mengikat, dengan prioritas menurun saat terjadi konflik:

| Dokumen | Peran |
|---|---|
| `specs/El Yapping_HoloDev_HOLOGY9.0_Muhammad Hanif_Universitas Diponegoro.md` | Proposal yang dinilai juri. Mengikat untuk keperluan submission. |
| `specs/ARCHITECTURE.md` | Acuan teknis: 8 modul domain, alur, state machine, batasan yang disengaja. |
| `specs/modalin-erd.dbml` | Satu-satunya sumber kebenaran skema database. `schema.prisma` diturunkan dari sini. |
| `stitch_modalin_onboarding_flow_pwa/` | Acuan tampilan: `modalin_design_system/DESIGN.md` + 17 layar `code.html`. |

## Tumpukan teknologi

React + TypeScript (SPA/PWA) · Node.js + Express (Modular Monolith, 8 modul domain) · MySQL via **Prisma ORM** · **Socket.io** khusus chat · JWT stateless + refresh token · **Argon2id** untuk hashing kata sandi · Bahasa Indonesia, Rupiah, format tanggal Indonesia.

## Menjalankan secara lokal

Lihat `RUN.md` untuk setup end-to-end (backend, frontend, database, seed, demo accounts).

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

Seeder membuat 8 UMKM, 5 investor, dan koneksi di **semua** status FR-14 (menunggu, ditolak, ditutup, diterima, sampai selesai dengan rating), supaya perbedaan tiap status terlihat saat demo.

## Verifikasi

```bash
npm run typecheck                    # kedua workspace
npm --workspace backend run test    # 39 unit test
npm run build                        # kedua workspace
```

Cakupan unit test: perhitungan Trust Score (FR-03), hard filter dan weighted scoring (FR-06/FR-07), serta penerbitan dokumen PDF termasuk keutuhan disclaimer hukum (FR-10/FR-11).

## Aturan bisnis yang ditegakkan di server

Aturan berikut diperiksa di Application Layer, bukan sekadar disembunyikan di UI:

- **FR-02** Badge Terverifikasi hanya muncul setelah admin menyetujui. Antrean admin urut waktu unggah; penolakan wajib menyertakan alasan.
- **FR-03** Trust Score 0–100 dihitung ulang tiap ada perubahan verifikasi, kelengkapan profil, atau rating baru.
- **FR-04** Unggahan dibatasi PDF/JPG/PNG/WebP maksimal 10 MB. Nama berkas selalu diacak ulang, nama dari klien tidak pernah dipakai.
- **FR-06** Hard filter irisan jenis kerja sama berjalan **sebelum** skoring. Irisan kosong berarti pasangan itu tidak pernah masuk rekomendasi, berapa pun skor komponen lainnya.
- **FR-07** Bobot sektor 40% / modal 30% / lokasi 10% / Trust Score 20%. Bobot lokasi hanya dihitung kalau investor mengisi preferensi lokasi.
- **FR-10** Penerbitan PDF **ditolak** selama salah satu pihak belum menandatangani.
- **FR-12** Rating hanya bisa diberikan setelah kerja sama berstatus selesai, dan dijaga unik per pemberi per kesepakatan di level basis data.
- **FR-14** Hanya penerima yang bisa menerima/menolak. `REJECTED` berarti tidak pernah diterima; `CLOSED` berarti pernah diterima lalu diakhiri salah satu pihak. Keduanya terminal.

Dokumen sensitif (KTP, NIB, tanda tangan, PDF perjanjian) tidak pernah dilayani sebagai berkas statis publik; aksesnya lewat `/api/files` yang memeriksa kepemilikan per scope.

## Penyimpangan yang dicatat

Perubahan berikut menyimpang dari dokumen acuan dan dicatat di sini serta di dokumen asalnya, sesuai aturan "jangan menyimpang diam-diam" di kepala `ARCHITECTURE.md`.

1. **Design token memakai palet Stitch, bukan biru di ARCHITECTURE.md §9.1.**
   Sebelumnya repo punya tiga sistem warna sekaligus (teal di `styles.css`, biru di §9.1, forest di `DESIGN.md`). Sekarang satu: kanvas bone `#F3EEE3`, primary forest `#0F2419`, aksen pine `#2D6A4F`. Warna status tetap terpisah dari warna brand. §9.1 sudah diperbarui.

2. **14 tabel, bukan 13.** Tambahan `Transaction` untuk FR-13.

3. **8 enum, bukan 3.** Lima tambahan (`VerificationStatus`, `CooperationType`, `AgreementStatus`, `TransactionType`, `TransactionStatus`) dipakai karena aturannya berupa state machine yang harus dijaga di level basis data, bukan string bebas.

4. **`cooperationTypes` disimpan sebagai JSON array**, bukan kolom tunggal, karena FR-06 mensyaratkan irisan dan layar Stitch memakai checkbox multi-pilih. Isinya divalidasi Zod di Application Layer.

5. **Tidak ada tabel `Notification`.** Indikator FR-09 diturunkan dari `Message.readAt` dan `Connection.status`.

6. **Riwayat verifikasi disimpan sebagai keputusan terakhir** di `Profile`, bukan log multi-baris. Log penuh ditunda pasca-penyisihan.

7. **Keputusan Terbuka ARCHITECTURE.md §12 poin 1 ditutup:** `Agreement` kini punya kolom skema-spesifik (`profitSharingRatio`, `equityPercentage`, `interestRate`), menggantikan field generik untuk ketiga jenis kerja sama.

8. **Asumsi cold-start Trust Score (§12 poin 2):** akun baru mulai dari 0 tanpa perlakuan khusus, dan belum adanya rating dihitung 0 — bukan nilai netral 3/5 — supaya akun baru tidak tampak lebih kredibel daripada yang sudah terbukti. Bobot 40/30/30 ada di satu berkas, `backend/src/config/scoring.ts`.

9. **FR-10/FR-11 dan FR-12 dibangun sekarang**, meski proposal §4.1 menempatkannya pasca-penyisihan. Membangun lebih dari yang dijanjikan tidak melanggar proposal.

## Batasan yang disengaja

- **Dana investasi UMKM–investor tidak pernah diproses lewat platform.** Payment gateway hanya untuk biaya layanan dan langganan Modalin Pro. Alasannya perizinan: pemrosesan langsung berpotensi masuk ranah Securities Crowdfunding (POJK No. 17/2025) atau P2P lending yang diawasi OJK.
- **FR-13 murni simulasi UI.** Tidak ada SDK Midtrans/Xendit dan tidak ada panggilan keluar.
- **Tanda tangan digital belum tersertifikasi PSrE.** Dokumen tetap sah menurut Pasal 11 UU ITE dan Pasal 59 ayat (3) PP No. 71/2019, tetapi kekuatan pembuktiannya di bawah dokumen bersertifikat dan **tidak setara akta notaris**. Disclaimer ini wajib ikut tercetak di setiap PDF yang diterbitkan.
- **Bahasa Indonesia saja.** Tidak ada dukungan multibahasa untuk MVP.

## Deployment

Frontend ke Vercel dengan root repositori sebagai project root; set `VITE_API_URL` ke URL API publik. API ke host yang mendukung Docker (Render, Railway, Fly.io, Cloud Run, atau VPS) memakai `backend/Dockerfile`; `render.yaml` tersedia sebagai titik awal.

1. Siapkan MySQL terkelola, salin connection string ke `DATABASE_URL`.
2. Set `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`, `WEB_ORIGIN`, `PUBLIC_BASE_URL`, dan `API_PORT=4000`.
3. Jalankan `prisma migrate deploy` sekali terhadap basis data produksi.
4. Pastikan `GET /health` mengembalikan `{ "status": "ok" }`.
5. Setelah domain Vercel final, perbarui `WEB_ORIGIN` lalu restart API.

Unggahan saat ini disimpan di disk lokal (`UPLOAD_DIR`). Untuk produksi, arahkan ke Cloud Storage sesuai ARCHITECTURE.md §3 — host dengan disk sementara akan kehilangan berkas saat restart.

## Keamanan

Jangan pernah commit berkas `.env`. Input divalidasi Zod, kata sandi di-hash Argon2id, header diperketat Helmet, CORS dibatasi ke satu origin, dan percobaan masuk dibatasi rate limiter yang **hanya menghitung percobaan gagal** sehingga pengguna sah tidak ikut terkunci.
