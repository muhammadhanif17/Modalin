# Implementation Map

Audit coverage 28 mockup ke route + page TSX. Status per September 2026.

## Onboarding (Publik)

| # | Mockup | Route | Halaman | Status |
|---|---|---|---|---|
| 1 | Welcome Screen Modalin | `/` | `Home.tsx` | ✅ |
| 2 | Pilih Peran Akun & Masuk | `/` | `Home.tsx` | ✅ |
| 3 | Form Login Akun Terdaftar | `/login` | `Auth.tsx` | ✅ |
| 4 | Form Registrasi Dasar | `/register` | `Auth.tsx` | ✅ |
| 5 | Verifikasi Identitas & NIB (KYC) | `/app/verifikasi` | `Verification.tsx` | ✅ |
| 6 | Verifikasi Selesai & Review Status | `/app/verifikasi` | `Verification.tsx` | ✅ |

## UMKM (`a*`)

| # | Mockup | Route | Halaman | Status |
|---|---|---|---|---|
| a1 | Dashboard Pengusaha UMKM - Beranda | `/app/beranda` | `Dashboard.tsx` (role-aware) | ✅ |
| a2 | Tab Profil Pengusaha UMKM | `/app/profile` | `Profile.tsx` | ✅ |
| a3 | Edit Profil Usaha - Data Dasar | `/app/profile/edit` step 1 | `features/profile-edit-umkm/` | 🆕 wizard |
| a4 | Edit Profil Usaha - Kebutuhan Dana | `/app/profile/edit` step 2 | wizard | 🆕 |
| a5 | Edit Profil Usaha - Pilihan Jenis Kerja Sama (default) | `/app/profile/edit` step 3 | wizard | 🆕 |
| a6 | Edit Profil Usaha - Jenis Kerja Sama | `/app/profile/edit` step 3 | wizard | 🆕 |
| a7 | Edit Profil Usaha - Portofolio & Berkas | `/app/profile/edit` step 4 | wizard | 🆕 |
| a8 | Eksplorasi Investor - Cari Pemodal | `/app/explore` | `Explore.tsx` | ✅ |
| a9 | Detail Profil Investor | `/app/mitra/:id` | `Partner.tsx` | ✅ |
| a10 | Ruang Negosiasi & Chat | `/app/chat/:id` | `Chat.tsx` | ✅ |
| a11 | Form Kesepakatan & Tanda Tangan Digital | `/app/agreements` | `Agreements.tsx` | ✅ |
| a12 | Ulasan & Rating Kemitraan Selesai | `/app/rating` | `Rating.tsx` | ✅ |

## Investor (`b*`)

| # | Mockup | Route | Halaman | Status |
|---|---|---|---|---|
| b1 | Dashboard Investor - Beranda Pemodal | `/app/beranda` | `Dashboard.tsx` (role-aware) | ✅ |
| b2 | Tab Profil Investor - Kelola Portofolio | `/app/rekam-jejak` | `Portfolio.tsx` | ✅ |
| b3 | Edit Profil Investor - Data Pemodal | `/app/preferensi/edit` step 1 | `features/investor-edit/` | 🆕 wizard |
| b4 | Edit Profil Investor - Preferensi Modal | `/app/preferensi/edit` step 2 | wizard | 🆕 |
| b5 | Edit Profil Investor - Skema Kemitraan | `/app/preferensi/edit` step 3 | wizard | 🆕 |
| b6 | Eksplorasi UMKM - Cari Mitra Bisnis | `/app/explore` | `Explore.tsx` | ✅ |
| b7 | Detail Profil UMKM - Due Diligence | `/app/mitra/:id` | `Partner.tsx` | ✅ |
| b8 | Ruang Negosiasi & Chat (Investor) | `/app/chat/:id` | `Chat.tsx` | ✅ |
| b9 | Form Kesepakatan & Tanda Tangan SPK | `/app/agreements` | `Agreements.tsx` | ✅ |
| b10 | Ulasan & Rating Kemitraan Selesai (Investor) | `/app/rating` | `Rating.tsx` | ✅ |

## Lainnya

| Fitur | Route | Halaman | Status |
|---|---|---|---|
| Pembayaran (Modalin Pro / service fee) | `/app/pembayaran` | `Checkout.tsx` | ✅ |
| Admin - Antrean Verifikasi | `/app/admin` | `Admin.tsx` | ✅ |
| Matches (dua arah) | `/app/matches` | `Matches.tsx` | ✅ |
| Landing (publik, sudah login ditolak) | `/` | `Home.tsx` | ✅ |

## Catatan

- Halaman yang role-aware (`Dashboard`, `Explore`, `Partner`, `Chat`, `Agreements`, `Rating`) menggunakan komponen yang sama, data berbeda — sesuai keputusan desain (1.A).
- Multi-step form (a3-a7, b3-b5) menggunakan `useDraft` hook generik dengan localStorage auto-save.
- Setiap step form validasi Zod di client; submit akhir juga divalidasi ulang di server.
