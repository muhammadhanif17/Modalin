# Cara Menjalankan Modalin

Setup pengembangan lokal end-to-end. Backend, frontend, dan database MySQL.

## 1. Prasyarat

- Node.js 20+
- Docker (untuk MySQL lokal) — atau MySQL 8.4 terkelola
- Python 3 (opsional, untuk preview mockup)

## 2. Clone & install

```bash
git clone <repo>
cd Project-Hology-9.0---El-Yapping
npm install
```

## 3. Setup environment

```bash
cp .env.example backend/.env
# edit backend/.env, isi DATABASE_URL dan JWT_SECRET (minimal 32 karakter)

echo "VITE_API_URL=http://localhost:4000" > frontend/.env
```

## 4. Siapkan database

Opsi A: pakai Docker

```bash
docker compose up -d db
```

Opsi B: pakai MySQL sendiri — set `DATABASE_URL` di `backend/.env`.

Opsi C: Windows tanpa Docker — MySQL 8.4 via winget, jalan sebagai proses biasa:

```powershell
winget install --id Oracle.MySQL -e --silent --accept-package-agreements --accept-source-agreements
$dataDir = "$env:LOCALAPPDATA\Modalin\mysql-data"
New-Item -ItemType Directory -Path $dataDir -Force
& "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe" --initialize-insecure --datadir="$dataDir"
Start-Process -FilePath "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe" -ArgumentList "--datadir=$dataDir","--port=3306","--bind-address=127.0.0.1" -WindowStyle Hidden
& "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" -h 127.0.0.1 -u root -e "CREATE DATABASE IF NOT EXISTS modalin; CREATE USER IF NOT EXISTS 'modalin'@'localhost' IDENTIFIED BY 'modalin'; CREATE USER IF NOT EXISTS 'modalin'@'127.0.0.1' IDENTIFIED BY 'modalin'; GRANT ALL PRIVILEGES ON modalin.* TO 'modalin'@'localhost'; GRANT ALL PRIVILEGES ON modalin.* TO 'modalin'@'127.0.0.1'; FLUSH PRIVILEGES;"
```

Ulangi baris `Start-Process` itu setiap habis restart PC (data tersimpan di `%LOCALAPPDATA%\Modalin\mysql-data`).

Jalankan migrasi dan seed:

```bash
npm --workspace backend run db:generate
npm --workspace backend exec prisma migrate deploy
npm --workspace backend run db:seed
```

## 5. Jalankan

Buka dua terminal:

```bash
# Terminal 1 — backend
npm run dev:backend      # http://localhost:4000

# Terminal 2 — frontend
npm run dev:frontend     # http://localhost:5173
```

## 6. Akun demo

Password semua akun seed: `Modalin2026!`

| Email | Peran | Untuk mendemokan |
|---|---|---|
| `sari.investor@modalin.id` | Investor | Alur utama |
| `dapur.bunda@modalin.id` | UMKM | Lawan bicara Sari |
| `admin@modalin.id` | Admin | Antrean KYC |
| `batik.pekalongan@modalin.id` | UMKM | Verifikasi PENDING |
| `budidaya.nila@modalin.id` | UMKM | Verifikasi REJECTED |

## 7. Preview mockup HTML (opsional)

Untuk membuka file mockup di browser tanpa menjalankan app:

```bash
npm run mock             # http://localhost:5500 — buka Mockup/INDEX.md dulu
```

## 8. Verifikasi

```bash
npm run typecheck        # typecheck semua workspace
npm --workspace backend run test    # 39 unit test
npm run build            # build produksi
```

## Struktur Project

```
.
├── Mockup/              # 28 mockup HTML + logo (sumber kebenaran visual)
├── specs/               # Dokumen acuan (proposal, ARCHITECTURE, ERD, ringkasan, design token)
├── frontend/            # SPA/PWA Vite + React + TypeScript
│   ├── src/
│   │   ├── pages/       # Halaman publik + ter-autentikasi (lazy)
│   │   ├── features/    # Sub-app per domain: dashboard, profile-edit-umkm, investor-edit
│   │   ├── components/  # Komponen bersama (Layout, UI primitives)
│   │   ├── lib/         # API client, session, format, draft hook
│   │   ├── styles/      # tokens, base, components, layout, pages, responsive
│   │   └── main.tsx     # Routing & lazy load
│   └── public/          # Ikon PWA, manifest
├── backend/             # Express + TypeScript + Prisma (modular monolith, 10 modul)
│   ├── src/modules/     # auth, profile, matchmaking, chat, agreement, rating, payment, files, admin, trust-score
│   ├── prisma/          # Schema, migrasi, seed
│   └── Dockerfile
├── docker-compose.yml   # MySQL 8.4 lokal
├── package.json         # workspaces: frontend, backend
├── vercel.json          # Konfig deploy frontend
├── render.yaml          # Konfig deploy backend
└── RUN.md               # File ini
```

## Mockup → Route

Lihat `Mockup/INDEX.md` untuk pemetaan lengkap 28 mockup ke route dan halaman TSX.
Lihat `specs/IMPLEMENTATION_MAP.md` untuk status implementasi.
