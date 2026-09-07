# Quick Reference

Cheatsheet untuk hal-hal yang sering dicek saat kerja harian.

## 14 Tabel

### Identitas
- `User` — email, passwordHash, role (UMKM/INVESTOR/ADMIN). Admin cuma nilai role.
- `Profile` — 1:1 User. `bio` generik, dipakai deskripsi fokus investasi untuk Investor.
- `Session` — refresh token, expiry.

### Data Bisnis & Investasi
- `Sector` — daftar sektor bisnis, dirujuk Business + InvestorPreference.
- `Business` — 1:1 User (UMKM), FK ke Sector.
- `FundingRequest` — N:1 Business. `targetAmount` tunggal (bukan rentang). Status: draft/aktif/negosiasi/terdanai/selesai/dibatalkan.
- `InvestorPreference` — 1:1 User (Investor). min/max amount, preferredLocation, preferredSectorId (nullable), cooperationType.
- `Portfolio` — N:1 User, generik untuk UMKM (proposal) dan Investor (rekam jejak).

### Interaksi & Kesepakatan
- `Connection` — mekanisme "menunjukkan ketertarikan" (FR-14). sender + receiver. Status: PENDING/ACCEPTED/REJECTED/CLOSED.
- `Conversation`, `Message` — terbuka setelah Connection ACCEPTED. Pesan dikelompokkan per percakapan.
- `Agreement`, `AgreementSignature` — FK ke Connection. PDF baru terbit setelah dua tanda tangan lengkap.
- `Rating` — FK ke User (reviewer/reviewed) + Agreement. Unik per kerja sama per pemberi.
- `Transaction` — payment gateway (FR-13). Hanya biaya layanan Modalin, bukan transfer modal.
- `FileAsset` — metadata berkas (KTP/NIB/portofolio/tanda tangan/PDF perjanjian).

## 8 Enum

| Enum | Nilai | Dipakai di |
|---|---|---|
| `UserRole` | UMKM / INVESTOR / ADMIN | `User.role` |
| `VerificationStatus` | PENDING / VERIFIED / REJECTED | `Profile.verificationStatus` |
| `CooperationType` | PROFIT_SHARING / EQUITY / LOAN | `Business.cooperationTypes` (JSON array), `InvestorPreference.cooperationType`, `Agreement.cooperationType` |
| `ConnectionStatus` | PENDING / ACCEPTED / REJECTED / CLOSED | `Connection.status` |
| `AgreementStatus` | DRAFT / SIGNED / COMPLETED / CANCELLED | `Agreement.status` |
| `TransactionType` | SUBSCRIPTION / SERVICE_FEE | `Transaction.type` |
| `TransactionStatus` | PENDING / PAID / FAILED / REFUNDED | `Transaction.status` |
| `FundingRequestStatus` | DRAFT / ACTIVE / NEGOTIATING / FUNDED / COMPLETED / CANCELLED | `FundingRequest.status` |

## 8 Modul Domain (Backend)

| # | Modul | FR |
|---|---|---|
| 1 | `auth` — registrasi, login, refresh token, JWT, KYC upload | FR-01, FR-02 |
| 2 | `profile` — get/update profil UMKM & Investor, unggah KTP/NIB | FR-05, FR-04 |
| 3 | `matchmaking` — hard filter + weighted scoring, daftar Connection | FR-05, FR-06, FR-07, FR-14 |
| 4 | `chat` — Socket.io gateway, Conversation + Message | FR-08, FR-09 |
| 5 | `agreement` — buat SPK, tanda tangan digital, PDF generator | FR-10, FR-11 |
| 6 | `rating` — submit + list rating per Agreement | FR-12 |
| 7 | `payment` — Transaction (simulasi UI, bukan transfer modal) | FR-13 |
| 8 | `files` — upload, signedUrl, validasi format/ukuran | FR-04 |
| 9 | `admin` — antrean verifikasi KYC, approve/reject | FR-02 |
| 10 | `trust-score` — hitung ulang Trust Score < 5 detik | FR-03 |

(Ada 10 modul di kode; yang tertulis "8 modul domain" di proposal mengelompokkan `files` & `admin` ke `auth`, dan `trust-score` ke pemicu `matchmaking`.)

## Bobot Scoring (FR-07)

```
Sektor:        40%   (Investor preferensi sectorId atau Business sectorId)
Modal:         30%   (kecocokan range dana)
Lokasi:        10%   (hanya dihitung jika Investor isi preferredLocation)
Trust Score:   20%
```

Total = 100%. Hard filter irisan jenis kerja sama (FR-06) **sebelum** scoring. Pasangan yang tidak beririsan tidak pernah masuk rekomendasi.

## Bobot Trust Score (FR-03)

```
Verifikasi:           40%
Rating:                30%
Kelengkapan profil:   30%
```

Akun baru = 0 (bukan 3/5 supaya akun baru tidak tampak lebih kredibel dari yang sudah terbukti). File sumber: `backend/src/config/scoring.ts`, divalidasi berjumlah 100 saat boot.

## Status Connection (FR-14)

```
PENDING  → ACCEPTED   (hanya receiver)
        → REJECTED    (terminal, tidak pernah diterima)
        → CLOSED      (pernah diterima, diakhiri salah satu pihak — terminal)
ACCEPTED → COMPLETED  (setelah Agreement.status = COMPLETED)
```

`REJECTED` dan `CLOSED` keduanya terminal. `COMPLETED` adalah status turunan (bukan enum `Connection.status` tapi `Agreement.status`).

## 39 Unit Test

Cakupan:
- Trust Score calculation (FR-03).
- Hard filter + weighted scoring (FR-06/FR-07).
- Penerbitan PDF + keutuhan disclaimer hukum (FR-10/FR-11).

Jalankan: `npm --workspace backend run test`.
