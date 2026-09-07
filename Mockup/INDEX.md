# Mockup Index

Peta 28 mockup HTML ke route + page TSX. Sumber kebenaran visual di folder ini; lihat juga `../specs/IMPLEMENTATION_MAP.md` untuk status implementasi.

## Onboarding

| # | File | Route | Halaman TSX |
|---|---|---|---|
| 1 | `1. Welcome Screen Modalin (Mobile).html` | `/` | `Home.tsx` |
| 2 | `2. Pilih Peran Akun & Masuk (Mobile).html` | `/` | `Home.tsx` |
| 3 | `3. Form Login Akun Terdaftar (Mobile).html` | `/login` | `Auth.tsx` |
| 4 | `4. Form Registrasi Dasar.html` | `/register` | `Auth.tsx` |
| 5 | `5. Verifikasi Identitas & NIB (KYC).html` | `/app/verifikasi` | `Verification.tsx` |
| 6 | `6. Verifikasi Selesai & Review Status (Langkah 3 dari 3).html` | `/app/verifikasi` | `Verification.tsx` |

## UMKM (`a*`)

| # | File | Route | Halaman TSX |
|---|---|---|---|
| a1 | `a1. Dashboard Pengusaha UMKM - Beranda.html` | `/app/beranda` | `Dashboard.tsx` (role-aware) |
| a2 | `a2. Tab Profil Pengusaha UMKM (Menu Edit Profil).html` | `/app/profile` | `Profile.tsx` |
| a3 | `a3. Edit Profil Usaha-Data Dasar.html` | `/app/profile/edit` step 1 | `features/profile-edit-umkm/` |
| a4 | `a4. Edit Profil Usaha - Kebutuhan Dana.html` | `/app/profile/edit` step 2 | wizard |
| a5 | `a5. Edit Profil Usaha - Pilihan Jenis Kerja Sama (Kondisi Default).html` | `/app/profile/edit` step 3 | wizard |
| a6 | `a6. Edit Profil Usaha - Jenis Kerja Sama.html` | `/app/profile/edit` step 3 | wizard |
| a7 | `a7. Edit Profil Usaha - Portofolio & Berkas.html` | `/app/profile/edit` step 4 | wizard |
| a8 | `a8. Eksplorasi Investor - Cari Pemodal (Mobile UMKM).html` | `/app/explore` | `Explore.tsx` |
| a9 | `a9. Detail Profil Investor - Rekam Jejak Pemodal (Mobile UMKM).html` | `/app/mitra/:id` | `Partner.tsx` |
| a10 | `a10. Ruang Negosiasi & Chat Kesepakatan.html` | `/app/chat/:id` | `Chat.tsx` |
| a11 | `a11. Form Kesepakatan & Tanda Tangan Digital.html` | `/app/agreements` | `Agreements.tsx` |
| a12 | `a12. Ulasan & Rating Kemitraan Selesai.html` | `/app/rating` | `Rating.tsx` |

## Investor (`b*`)

| # | File | Route | Halaman TSX |
|---|---|---|---|
| b1 | `b1. Dashboard Investor - Beranda Pemodal (Mobile).html` | `/app/beranda` | `Dashboard.tsx` (role-aware) |
| b2 | `b2. Tab Profil Investor - Kelola Portofolio (Mobile).html` | `/app/rekam-jejak` | `Portfolio.tsx` |
| b3 | `b3. Edit Profil Investor - Data Pemodal.html` | `/app/preferensi/edit` step 1 | `features/investor-edit/` |
| b4 | `b4. Edit Profil Investor - Preferensi Modal.html` | `/app/preferensi/edit` step 2 | wizard |
| b5 | `b5. Edit Profil Investor - Skema Kemitraan (Mobile).html` | `/app/preferensi/edit` step 3 | wizard |
| b6 | `b6. Eksplorasi UMKM - Cari Mitra Bisnis (Mobile Investor).html` | `/app/explore` | `Explore.tsx` |
| b7 | `b7. Detail Profil UMKM - Due Diligence Investor (Mobile).html` | `/app/mitra/:id` | `Partner.tsx` |
| b8 | `b8. Ruang Negosiasi & Chat Kesepakatan (Perspektif Investor).html` | `/app/chat/:id` | `Chat.tsx` |
| b9 | `b9. Form Kesepakatan & Tanda Tangan SPK (Perspektif Investor).html` | `/app/agreements` | `Agreements.tsx` |
| b10 | `b10. Ulasan & Rating Kemitraan Selesai (Perspektif Investor).html` | `/app/rating` | `Rating.tsx` |

## Aset Brand

- `Logo Modalin.png` — logo untuk header, footer, favicon, OG image.

## Catatan

- Mockup `a3`-`a7` adalah 5 layar terpisah untuk 1 wizard (4 langkah efektif karena a5 dan a6 = langkah 3 kondisi default vs. multi-pilih).
- Mockup `b3`-`b5` adalah 3 layar terpisah untuk 1 wizard (3 langkah).
- Sumber token: `../specs/DESIGN_TOKENS.md` (dipindahkan dari `stitch_modalin_onboarding_flow_pwa/`).
