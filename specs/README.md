# Specs

Peta dokumen acuan untuk proyek Modalin (HOLOGY 9.0 - El Yapping).

## Dokumen dan Perannya

| File | Peran | Dibaca saat |
|---|---|---|
| `PROPOSAL_SUMMARY.md` | Ringkasan proposal: tujuan, fitur FR-01..FR-14, hasil dijanjikan | planning, review scope |
| `ARCHITECTURE.md` | Acuan teknis: 8 modul domain, alur state machine, keputusan desain, batasan disengaja | implementasi, review arsitektur |
| `QUICK_REFERENCE.md` | Cheatsheet: 14 tabel, 8 enum, bobot scoring, FR rule | debugging, onboarding |
| `IMPLEMENTATION_MAP.md` | Audit coverage: 28 mockup → route → page TSX, status implementasi | tracking progress |
| `DESIGN_TOKENS.md` | Design token: warna, tipografi, spacing, shadow, radius | styling, komponen baru |
| `modalin-erd.dbml` | Skema database tunggal: 14 tabel + relasi | schema review, query writing |
| `El Yapping_HoloDev_HOLOGY9.0_Muhammad Hanif_Universitas Diponegoro.md` | Proposal lengkap (156KB) — submet untuk juri | submission, reference lengkap |

## Prioritas

Ketiganya mengikat, dengan prioritas menurun saat konflik:

1. Proposal (untuk keperluan submission juri)
2. `ARCHITECTURE.md` (acuan teknis)
3. `modalin-erd.dbml` (satu-satunya sumber kebenaran skema database)

`PROPOSAL_SUMMARY.md`, `QUICK_REFERENCE.md`, dan `IMPLEMENTATION_MAP.md` adalah ringkasan derivatif — tidak mengikat, tapi mempercepat kerja harian.

## Cara Baca

- **Mulai dari `PROPOSAL_SUMMARY.md`** untuk memahami apa yang dijanjikan.
- **Lihat `IMPLEMENTATION_MAP.md`** untuk tahu apa yang sudah/belum diimplementasi.
- **Buka `QUICK_REFERENCE.md`** saat butuh cek nama tabel, enum, atau bobot scoring.
- **Rujuk `ARCHITECTURE.md`** untuk keputusan arsitektur yang disengaja.
- **Styling → `DESIGN_TOKENS.md`** (sumber token CSS).
