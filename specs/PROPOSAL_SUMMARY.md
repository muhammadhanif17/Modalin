# Modalin — Ringkasan Proposal

**HOLOGY 9.0 HoloDev** · Tim El Yapping · Universitas Diponegoro · Penulis: Muhammad Hanif

## Tujuan

Platform web yang mempertemukan UMKM pencari modal dengan investor secara langsung. Berfokus pada tiga hal:

1. **Pencocokan otomatis** berbasis skor kepercayaan.
2. **Kolaborasi**: chat, negosiasi, dokumen perjanjian otomatis.
3. **Rating pasca kerja sama** untuk menjaga kualitas.

## Fitur Inti (FR)

| ID | Fitur | Catatan |
|---|---|---|
| FR-01 | Registrasi & login (JWT, refresh token) | Argon2id untuk hashing |
| FR-02 | Verifikasi identitas & NIB (KYC) | Antrean admin, badge setelah disetujui |
| FR-03 | Trust Score 0–100 | Komponen: 40% verifikasi + 30% rating + 30% kelengkapan profil (sudah disesuaikan dari bobot awal 40/30/30) |
| FR-04 | Unggahan berkas (PDF/JPG/PNG/WebP, maks 10MB) | Nama berkas diacak ulang |
| FR-05 | Profil UMKM & Investor | Multi-langkah |
| FR-06 | Pencocokan dua arah | Hard filter irisan jenis kerja sama dulu, baru scoring |
| FR-07 | Bobot skoring: 40% sektor / 30% modal / 10% lokasi / 20% Trust Score | Lokasi hanya dihitung jika investor isi preferensi |
| FR-08 | Eksplorasi & pencarian berfilter | |
| FR-09 | Chat real-time (Socket.io) | |
| FR-10 | Dokumen SPK otomatis (PDF) | Ditolak selama belum kedua pihak tanda tangan |
| FR-11 | Tanda tangan digital (canvas, Pasal 11 UU ITE) | Belum tersertifikasi PSrE |
| FR-12 | Rating setelah kerja sama selesai | Unik per pemberi per kesepakatan |
| FR-13 | Payment gateway (simulasi) | Hanya biaya layanan Modalin, bukan transfer modal |
| FR-14 | Status koneksi: PENDING / ACCEPTED / REJECTED / CLOSED / COMPLETED | Hanya penerima yang bisa menerima/menolak |

## Hasil yang Dijanjikan

- MVP PWA yang bisa dipakai demo: registrasi → verifikasi → match → chat → SPK → rating.
- 8 modul domain backend (modular monolith): auth, profile, matchmaking, chat, agreement, rating, payment, files, admin, trust-score.
- 39 unit test: Trust Score, hard filter + weighted scoring, penerbitan PDF + disclaimer hukum.
- Skema 14 tabel, 8 enum.

## Batasan Disengaja

- **Dana investasi tidak diproses lewat platform** — alasan perizinan (POJK 17/2025). Payment hanya untuk biaya layanan Modalin Pro.
- **FR-13 simulasi UI** — tidak ada integrasi Midtrans/Xendit.
- **Tanda tangan belum tersertifikasi PSrE** — sah menurut UU ITE tapi di bawah dokumen bersertifikat.
- **Bahasa Indonesia saja** — tidak ada multibahasa untuk MVP.

## Penyimpangan Tercatat dari Dokumen Asli

(Lihat `ARCHITECTURE.md` §akhir dan `README.md` untuk daftar lengkap.)

1. Design token: palet Stitch (bone + forest), bukan biru di §9.1.
2. 14 tabel, bukan 13 (tambahan `Transaction` untuk FR-13).
3. 8 enum, bukan 3 (5 tambahan untuk state machine yang dijaga di DB).
4. `cooperationTypes` disimpan JSON array, bukan kolom tunggal (FR-06 butuh irisan).
5. Tidak ada tabel `Notification` — indikator dari `Message.readAt` + `Connection.status`.

## Asumsi yang Dicatat

- **Cold-start Trust Score**: akun baru mulai dari 0, rating 0 (bukan 3/5) supaya akun baru tidak tampak lebih kredibel dari yang sudah terbukti.
- **Bobot 40/30/30 ada di satu file**: `backend/src/config/scoring.ts`, divalidasi berjumlah 100 saat boot.

## File Acuan Asli

`El Yapping_HoloDev_HOLOGY9.0_Muhammad Hanif_Universitas Diponegoro.md` (156KB) — proposal lengkap, submet untuk juri.
