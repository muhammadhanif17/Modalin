# PROMPT: Bangun "Modalin" — PWA Matchmaking UMKM x Investor

Kamu adalah senior fullstack engineer yang akan membangun MVP "Modalin" dari nol di dalam
repository yang sudah ada, mengikuti proposal HOLOGY 9.0 (HoloDev) berikut. Baca seluruh
spesifikasi di bawah sebelum menulis kode apa pun. Jangan menambah fitur di luar scope yang
disebutkan, dan jangan menyederhanakan aturan bisnis (hard filter, bobot skor, dsb) tanpa
menyebutkannya secara eksplisit ke saya.

## 0. Repo & Git Workflow (WAJIB diikuti dari awal)

- Remote: `https://github.com/muhammadhanif17/Project-Hology-9.0---El-Yapping.git`
- Kerja HANYA di branch `Farrel`. Jangan pernah commit/push langsung ke `main` atau branch
  anggota lain.
- Setup awal:
  ```bash
  git clone https://github.com/muhammadhanif17/Project-Hology-9.0---El-Yapping.git
  cd Project-Hology-9.0---El-Yapping
  git checkout Farrel 2>/dev/null || git checkout -b Farrel
  git push -u origin Farrel
  ```
- Commit **granular per sub-fitur**, bukan satu commit raksasa di akhir. Setiap commit harus
  bisa di-build/run sendiri kalau memungkinkan.
- Format commit: [Conventional Commits](https://www.conventionalcommits.org/), dan setiap
  commit yang mengimplementasi kebutuhan fungsional wajib menyertakan ID FR di pesan commit,
  contoh:
  ```
  feat(auth): registrasi & login JWT untuk Pengusaha/Investor (FR01)
  feat(profile): form profil bertahap + upload portofolio (FR04)
  feat(trust-score): hitung ulang trust score saat verifikasi/rating berubah (FR03)
  feat(matchmaking): hard filter jenis kerja sama + weighted scoring (FR06, FR07)
  fix(chat): perbaiki race condition socket saat reconnect (FR08)
  chore(db): tambah migration & seeder awal
  docs: update README setup lokal
  ```
- Push ke `origin Farrel` setelah setiap milestone sprint selesai (lihat bagian 5), bukan
  setelah tiap commit kecil — supaya riwayat tetap rapi tapi tidak spam remote.
- Di akhir, JANGAN membuat pull request/merge ke `main` sendiri — biarkan saya yang review dan
  merge manual.

## 1. Konteks Produk

Modalin adalah platform web (Progressive Web App) yang mempertemukan UMKM pencari modal
dengan investor secara langsung: profil terstruktur, skor kepercayaan (trust score),
matchmaking otomatis, chat, otomatisasi dokumen perjanjian, rating, dan transaksi biaya
layanan platform (bukan dana investasi — dana investasi antar pihak TIDAK diproses lewat
sistem).

Dua peran pengguna: **Pengusaha (UMKM)** dan **Investor**. Mayoritas Pengusaha diasumsikan
mengakses lewat smartphone kelas menengah-bawah dengan koneksi tidak stabil — desain harus
mobile-first dan ringan.

## 2. Tech Stack (wajib, sesuai proposal — jangan ganti)

| Layer | Teknologi |
|---|---|
| Presentation | React.js + TypeScript, SPA, PWA (manifest + service worker) |
| Application | Node.js + Express.js, arsitektur **modular monolith** (8 modul domain) |
| Data | MySQL + Sequelize ORM (relational, ACID) |
| Realtime | Socket.io (chat) |
| Auth | JWT (access + refresh token), password hashing bcrypt |
| Storage | Cloud Storage Service (S3-compatible, bisa pakai MinIO untuk dev lokal) |
| Payment | Midtrans/Xendit — **mode sandbox**, hanya untuk biaya layanan platform |
| Dokumen | Generator PDF (mis. pdf-lib/puppeteer) untuk dokumen perjanjian |

Struktur folder monorepo yang diharapkan:
```
Project-Hology-9.0---El-Yapping/
├── client/                 # React + TS PWA
│   ├── public/
│   │   ├── manifest.json
│   │   └── icons/
│   └── src/
├── server/                 # Node + Express modular monolith
│   └── src/
│       ├── modules/
│       │   ├── auth/
│       │   ├── profile/
│       │   ├── trust-score/
│       │   ├── search-matchmaking/
│       │   ├── chat/
│       │   ├── agreement/
│       │   ├── rating/
│       │   └── payment/
│       ├── config/
│       ├── database/       # migrations, seeders, models (Sequelize)
│       └── middleware/
├── docs/
├── .env.example
├── .gitignore
└── README.md
```

## 3. Skema Database (ikuti persis — ERD sudah final di proposal)

**User**: id, nama, email, password, role(enum: pengusaha/investor), kontak, foto_profil,
ktp_url, status_verifikasi(enum), created_at

**Profile** (1-1 ke User): id, user_id(FK), deskripsi, sektor, kisaran_dana_min,
kisaran_dana_max, lokasi, lama_usaha, nib_url, jenis_kerja_sama(enum), trust_score(int),
updated_at

**Portofolio** (1-N ke User): id, user_id(FK), tipe(enum), judul, file_url, uploaded_at

**Chat** (N-N via User): id, sender_id(FK User), receiver_id(FK User), pesan, sent_at,
status_baca(bool)

**Agreements**: id, pengusaha_id(FK User), investor_id(FK User), jenis_kerja_sama(enum),
nominal_dana, nama_usaha, alamat_perusahaan, perwakilan_perusahaan, tanggal_mulai,
tanggal_akhir, ttd_pengusaha, ttd_investor, dokumen_pdf_url, status(enum), created_at

**Rating**: id, agreement_id(FK Agreements), giver_id(FK User), receiver_id(FK User),
skor(1-5), ulasan, created_at

**Transaction**: id, user_id(FK), tipe(enum), jumlah(decimal), status(enum),
gateway_reference, created_at

Buat migration + seeder Sequelize untuk semua tabel di atas sebelum mulai modul lain.

## 4. Kebutuhan Fungsional per Modul (FR01–FR12)

Implementasikan persis sesuai tabel ini (jangan longgarkan validasinya):

- **FR01/FR02** — Registrasi, login JWT, edit profil sesuai role; validasi KYC (KTP untuk
  keduanya, NIB khusus Pengusaha), status berubah "Terverifikasi" hanya setelah validasi lolos.
- **FR03** — Trust Score (skala 0–100) dihitung ulang otomatis (target <5 detik) tiap kali
  kelengkapan profil, status verifikasi, atau rating berubah. Karena bobot pastinya tidak
  dirinci di proposal, gunakan default yang bisa dikonfigurasi, misalnya: 40% kelengkapan
  profil, 30% status verifikasi, 30% rata-rata rating (dinormalisasi ke 0–100) — taruh di
  satu file config agar mudah diubah.
- **FR04** — Upload dokumen (PDF/gambar, maks 10MB), kompresi otomatis tanpa merusak
  keterbacaan.
- **FR05** — Search & filter kombinasi (sektor, modal, lokasi, jenis kerja sama, trust score),
  response cepat, pesan jelas saat hasil kosong.
- **FR06/FR07** — Matchmaking dua tahap:
  1. **Hard filter**: buang pasangan yang preferensi jenis kerja samanya (Bagi Hasil,
     Penyertaan Modal, Pinjaman) sama sekali tidak beririsan.
  2. **Weighted scoring** untuk yang lolos: sektor 40%, irisan rentang modal 30%, lokasi 10%
     (hanya jika investor menetapkan preferensi lokasi), trust score 20%. Urutkan hasil
     descending, tampilkan pesan alternatif jika tidak ada yang lolos ambang minimum.
- **FR08/FR09** — Chat real-time via Socket.io, riwayat tersimpan permanen, notifikasi pesan
  masuk walau app tidak aktif (web push).
- **FR10/FR11** — Form kesepakatan terstruktur → setelah kedua pihak tanda tangan digital,
  generate PDF dari template sesuai jenis kerja sama, simpan ke rekam jejak kedua pihak. Tolak
  proses jika salah satu tanda tangan belum ada.
- **FR12** — Rating (1–5) + ulasan hanya boleh setelah status kerja sama = "selesai", satu
  rating per kerja sama per pemberi, lalu trigger update Trust Score.
- **Fasilitas Transaksi** — UI pilih metode bayar (transfer bank / e-wallet), integrasi
  Midtrans/Xendit sandbox, HANYA untuk biaya layanan platform (badge verifikasi, langganan),
  bukan dana investasi.

## 5. Rencana Sprint & Urutan Commit (ikuti urutan ini)

1. **Sprint 0 — Setup**: scaffold client+server, ESLint/Prettier, `.env.example`,
   `.gitignore`, konfigurasi DB, CI dasar (opsional). → commit `chore: initial project setup`.
2. **Sprint 1 — Modul Fondasi**: Auth+JWT, manajemen profil bertahap (step-by-step form, bukan
   satu form panjang), verifikasi KYC ringan, upload portofolio.
3. **Sprint 2 — Modul Inti & Diferensiasi**: Trust Score Engine, Search & Filter manual,
   Matchmaking Engine (hard filter + weighted scoring). Tambahkan unit test untuk algoritma
   scoring dan trust score karena ini fitur pembeda utama.
4. **Sprint 3 — Modul Kolaborasi**: Chat real-time (Socket.io), Otomatisasi Dokumen Perjanjian
   (form kesepakatan → generate PDF).
5. **Sprint 4 — Modul Pelengkap**: Rating & Ulasan, Fasilitas Transaksi (payment gateway
   sandbox).
6. **Sprint 5 — PWA polish**: manifest.json, service worker (cache aset statis, offline shell
   dasar), Add-to-Home-Screen, lazy-load gambar, cek performa <3s di koneksi 4G simulasi.
7. **Sprint 6 — Seed demo data & README**: seeder dengan data dummy realistis (beberapa
   Pengusaha, Investor, sudah ada match/chat/agreement contoh) supaya mudah didemokan ke juri;
   README lengkap cara run lokal.

Push ke `origin Farrel` di akhir tiap sprint.

## 6. Kebutuhan Non-Fungsional (harus terukur, bukan sekadar niat)

- Responsif dari lebar 360px sampai ≥1280px; target elemen sentuh ≥44x44px; font dasar ≥14px.
- Mobile-first, bottom navigation bar di layar kecil.
- Halaman utama <3 detik di simulasi 4G; lazy-load gambar; jaga bundle JS awal tetap kecil.
- Password hashing bcrypt, HTTPS/TLS (di deployment), dokumen sensitif terenkripsi, JWT dengan
  masa berlaku terbatas + refresh token.
- Bahasa antarmuka: Bahasa Indonesia, format Rupiah, format tanggal Indonesia. Tidak perlu
  multi-bahasa untuk MVP ini.
- Error message untuk user awam teknologi harus manusiawi, bukan stack trace mentah.

## 7. Yang Harus Kamu Lakukan Sekarang

1. Konfirmasi struktur repo saat ini (`git status`, lihat branch yang ada) sebelum mulai.
2. Checkout/buat branch `Farrel` seperti instruksi bagian 0.
3. Jalankan Sprint 0, lalu lanjut berurutan sesuai bagian 5 — jangan lompat sprint.
4. Setiap kali selesai satu FR, jalankan build/lint, baru commit dengan pesan sesuai format.
5. Kalau ada bagian proposal yang ambigu (misal bobot trust score), pilih default yang wajar,
   catat asumsimu di README, dan lanjutkan — jangan berhenti menunggu klarifikasi kecuali
   benar-benar blocking.
