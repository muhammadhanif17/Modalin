import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { endpoints, type Sector } from '../../lib/api';
import { Spinner } from '../../components/ui';
import { formatRupiahSingkat } from '../../lib/format';

/** Pilihan tiket mockup b4 dipetakan ke pasangan min–maks agar payload API tidak berubah. */
export const TICKET_OPTIONS = [
  {
    id: '10-25',
    min: '10000000',
    max: '25000000',
    label: 'Rp 10.000.000 – Rp 25.000.000 / UMKM (4 – 10 Portofolio)',
    short: 'Rp 10 - 25 Jt',
  },
  {
    id: '25-50',
    min: '25000000',
    max: '50000000',
    label: 'Rp 25.000.000 – Rp 50.000.000 / UMKM (2 – 4 Portofolio)',
    short: 'Rp 25 - 50 Jt',
  },
  {
    id: '50-100',
    min: '50000000',
    max: '100000000',
    label: 'Rp 50.000.000 – Rp 100.000.000 / UMKM (1 – 2 Portofolio)',
    short: 'Rp 50 - 100 Jt',
  },
  {
    id: '100',
    min: '100000000',
    max: '100000000',
    label: 'Rp 100.000.000 / Single Lead Investor (1 Portofolio)',
    short: 'Rp 100 Jt',
  },
] as const;

const QUICK_AMOUNTS = ['25000000', '50000000', '100000000', '250000000'] as const;

/* Alokasi sektor yang diatur sendiri oleh investor (sektor + porsi bisa
   diubah, baris bisa ditambah/dihapus). Sistem hanya menghitung nominal
   (= porsi × modal siaga) dan menjaga total porsi maksimal 100%. */
type SectorAlok = { sectorId: string; pct: number };

const SECTOR_COLORS = [
  'bg-primary-container',
  'bg-secondary',
  'bg-secondary-container',
  'bg-primary',
] as const;
const MAX_SECTORS = 6;

function sanitizeSectorAlok(raw: unknown): SectorAlok[] {
  if (!Array.isArray(raw)) return [];
  const list = (raw as Record<string, unknown>[])
    .filter((r) => r && typeof r.sectorId === 'string' && r.sectorId)
    .map((r) => ({
      sectorId: String(r.sectorId),
      pct: Math.max(0, Math.min(100, Math.round(Number(r.pct) || 0))),
    }));
  /* Kunci total maksimal 100% berurutan dari baris pertama. */
  let acc = 0;
  for (const r of list) {
    r.pct = Math.min(r.pct, 100 - acc);
    acc += r.pct;
  }
  return list;
}

function digits(raw: unknown): string {
  return String(raw ?? '').replace(/[^0-9]/g, '');
}

function group(raw: unknown): string {
  const d = digits(raw);
  if (!d) return '';
  return Number(d).toLocaleString('id-ID');
}

function jt(raw: string): string {
  if (!raw) return '';
  return formatRupiahSingkat(Number(raw));
}

/**
 * Port 1:1 dari Mockup/b4. Edit Profil Investor - Preferensi Modal.html.
 * Class, copy, ikon Material Symbols dipertahankan verbatim (emoji 💡
 * diganti ikon lightbulb mengikuti aturan tanpa-emoji).
 * Field terikat draf: alokasi siaga (= maximumAmount, pil cepat + input),
 * tiket per unit (= pasangan minimumAmount/maximumAmount). Alokasi sektor
 * diatur sendiri oleh investor (tersimpan di draf); imbal/tenor dan info
 * rata-rata adalah visual/estimasi — belum ada endpoint-nya. Estimasi arus
 * kas dihitung dari alokasi yang diisi.
 */
export function Step2PreferensiModal({
  values,
  set,
  errors,
}: {
  values: Record<string, unknown>;
  set: <K extends string>(k: K, v: unknown) => void;
  errors: Record<string, string>;
}) {
  const { data: sectors, isLoading } = useQuery({ queryKey: ['sectors'], queryFn: endpoints.sectors });
  if (isLoading) return <Spinner />;

  const minimumAmount = digits(values.minimumAmount);
  const maximumAmount = digits(values.maximumAmount);
  const preferredSectorId = String(values.preferredSectorId ?? '');
  const sectorList = (sectors ?? []) as Sector[];
  const sectorNameOf = (id: string) => sectorList.find((s) => s.id === id)?.name ?? 'Pilih sektor…';
  const maxNum = maximumAmount ? Number(maximumAmount) : 0;
  const ticketId = TICKET_OPTIONS.find((o) => o.min === minimumAmount && o.max === maximumAmount)?.id ?? '';

  const low = maximumAmount ? formatRupiahSingkat(Math.round(Number(maximumAmount) * 0.015)) : '';
  const high = maximumAmount ? formatRupiahSingkat(Math.round(Number(maximumAmount) * 0.022)) : '';

  /* Alokasi bikinan pengguna — tersimpan di draf agar tidak hilang saat
     pindah langkah. Total porsi dikunci maksimal 100%. */
  const [rows, setRows] = useState<SectorAlok[]>(() => sanitizeSectorAlok(values.sectorAllocations));
  function commitRows(next: SectorAlok[]) {
    setRows(next);
    set('sectorAllocations', next);
  }
  const totalPct = rows.reduce((s, r) => s + r.pct, 0);
  function setRowPct(i: number, raw: number) {
    const others = totalPct - rows[i]!.pct;
    const pct = Math.max(0, Math.min(100 - others, Math.round(raw || 0)));
    if (pct === rows[i]!.pct) return;
    commitRows(rows.map((r, j) => (j === i ? { ...r, pct } : r)));
  }
  function setRowSector(i: number, sectorId: string) {
    commitRows(rows.map((r, j) => (j === i ? { ...r, sectorId } : r)));
  }
  function removeRow(i: number) {
    commitRows(rows.filter((_, j) => j !== i));
  }
  const usedIds = new Set(rows.map((r) => r.sectorId));
  const addableSector =
    (preferredSectorId && !usedIds.has(preferredSectorId) ? preferredSectorId : '') ||
    sectorList.find((s) => !usedIds.has(s.id))?.id ||
    '';
  function addRow() {
    if (rows.length >= MAX_SECTORS) return;
    commitRows([...rows, { sectorId: addableSector, pct: 0 }]);
  }
  const rowNominals = rows.map((r) =>
    maxNum > 0 && r.pct > 0 ? Math.floor(((maxNum * r.pct) / 100 / 1000)) * 1000 : 0,
  );
  const mappedTotal = rowNominals.reduce((s, v) => s + v, 0);
  const remainder = maxNum > 0 ? maxNum - mappedTotal : 0;

  return (
    <>
      {/* Section 1: Total Dana Siap Salur */}
      <div className="flex flex-col gap-space-xs p-4 rounded-xl bg-surface-container-lowest shadow-sm">
        <label
          className="font-label-lg text-label-lg text-on-surface font-bold flex items-center justify-between"
          htmlFor="target-amount"
        >
          <span>Total Alokasi Modal Siaga</span>
          <span className="font-label-sm text-label-sm text-secondary">IDR Rupiah</span>
        </label>
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-surface-container-low text-on-surface focus-within:bg-surface-container-lowest focus-within:shadow-md transition-all">
          <span className="font-headline-sm text-headline-sm text-on-surface-variant font-bold">Rp</span>
          <input
            aria-label="Total alokasi modal siaga"
            className="w-full bg-transparent font-currency-display text-currency-display text-on-surface font-extrabold focus:outline-none tracking-tight"
            id="target-amount"
            type="text"
            inputMode="numeric"
            placeholder="100.000.000"
            value={group(maximumAmount)}
            onChange={(e) => set('maximumAmount', digits(e.target.value))}
          />
          <span className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant shrink-0">
            <span className="material-symbols-outlined text-[18px]">edit</span>
          </span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
          {QUICK_AMOUNTS.map((amt) => {
            const active = maximumAmount === amt;
            return (
              <button
                key={amt}
                className={
                  active
                    ? 'px-3.5 py-1.5 rounded-full bg-primary-container text-on-primary font-label-md text-label-md shadow-sm shrink-0'
                    : 'px-3.5 py-1.5 rounded-full bg-surface-container font-label-md text-label-md text-on-surface hover:bg-surface-container-high transition-all shrink-0'
                }
                type="button"
                onClick={() => set('maximumAmount', amt)}
              >
                {jt(amt)}
                {active ? ' ✓' : ''}
              </button>
            );
          })}
        </div>
        {(errors.minimumAmount || errors.maximumAmount) && (
          <span className="font-body-sm text-body-sm text-error" role="alert">
            {errors.maximumAmount || errors.minimumAmount}
          </span>
        )}
        <div className="flex items-start gap-2 p-3 mt-1 rounded-lg bg-surface-container text-on-surface-variant">
          <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">lightbulb</span>
          <p className="font-body-sm text-body-sm leading-snug">
            Rata-rata tiket permodalan angel investor di Modalin berkisar{' '}
            <strong className="text-on-surface">Rp 25 Jt – Rp 150 Jt</strong> untuk 2–5 mitra UMKM aktif.
          </p>
        </div>
      </div>

      {/* Section 2: Preferensi Tiket per Unit UMKM */}
      <div className="flex flex-col gap-space-xs p-4 rounded-xl bg-surface-container-lowest shadow-sm">
        <div className="flex flex-col">
          <label className="font-label-lg text-label-lg text-on-surface font-bold" htmlFor="ticket-size">
            Preferensi Tiket per Unit UMKM
          </label>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Besaran komitmen dana yang ingin Anda salurkan ke setiap pelaku usaha yang lolos kurasi.
          </p>
        </div>
        <div className="relative mt-1">
          <select
            className="w-full h-12 px-4 rounded-xl bg-surface-container-low font-title-md text-title-md text-on-surface appearance-none focus:outline-none focus:bg-surface-container-lowest focus:shadow-sm transition-all pr-10"
            id="ticket-size"
            value={ticketId}
            onChange={(e) => {
              const opt = TICKET_OPTIONS.find((o) => o.id === e.target.value);
              if (!opt) return;
              set('minimumAmount', opt.min);
              set('maximumAmount', opt.max);
            }}
          >
            <option value="">Pilih rentang tiket…</option>
            {TICKET_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-on-surface-variant">
            <span className="material-symbols-outlined text-[20px]">expand_more</span>
          </div>
        </div>
        <span className="font-body-sm text-body-sm text-on-surface-variant">
          Dengan tiket ini, Anda dapat mendiversifikasi risiko portofolio ke beberapa sektor UMKM berbeda.
        </span>
      </div>

      {/* Section 3: Target Alokasi Sektor Bisnis — sektor dan porsi diatur
          sendiri, nominal tiap baris dihitung dari modal siaga di atas. */}
      <div className="flex flex-col gap-space-sm p-4 rounded-xl bg-surface-container-lowest shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-label-lg text-label-lg text-on-surface font-bold">Target Alokasi Sektor Bisnis</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Total alokasi terpetakan:{' '}
              {maxNum > 0 ? `Rp ${group(String(mappedTotal))} (${totalPct}%)` : '– (isi modal siaga dulu)'}
            </p>
          </div>
          <span className="px-2 py-1 rounded-md bg-secondary/10 text-secondary font-label-sm text-label-sm font-bold">
            {totalPct === 100 ? '100% Terpetakan' : totalPct > 0 ? `${totalPct}% Terpetakan` : 'Belum Diatur'}
          </span>
        </div>
        <div className="w-full h-3 rounded-full overflow-hidden flex bg-surface-container">
          {rows.map((r, i) =>
            r.pct > 0 ? (
              <div
                key={i}
                className={`h-full ${SECTOR_COLORS[i % SECTOR_COLORS.length]}`}
                style={{ width: `${r.pct}%` }}
                title={`${sectorNameOf(r.sectorId)} (${r.pct}%)`}
              ></div>
            ) : null,
          )}
        </div>
        <div className="flex flex-col gap-2 pt-1">
          {rows.length === 0 && (
            <p className="font-body-sm text-body-sm text-on-surface-variant p-3 rounded-xl bg-surface-container-low">
              Belum ada alokasi — tambah sektor di bawah lalu atur porsinya sendiri (maksimal 100%).
            </p>
          )}
          {rows.map((r, i) => (
            <div key={i} className="flex items-start justify-between gap-2 p-3 rounded-xl bg-surface-container-low">
              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                <span
                  className={`w-3 h-3 rounded-full ${SECTOR_COLORS[i % SECTOR_COLORS.length]} mt-3.5 shrink-0`}
                ></span>
                <div className="relative flex-1 min-w-0">
                  <select
                    className="w-full h-11 pl-3 pr-9 rounded-lg bg-surface-container-lowest font-title-md text-title-md text-on-surface appearance-none focus:outline-none focus:ring-2 focus:ring-secondary"
                    aria-label={`Sektor alokasi ${i + 1}`}
                    value={r.sectorId}
                    onChange={(e) => setRowSector(i, e.target.value)}
                  >
                    <option value="">Pilih sektor…</option>
                    {sectorList.map((s) => (
                      <option key={s.id} value={s.id} disabled={s.id !== r.sectorId && usedIds.has(s.id)}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px] pointer-events-none">
                    expand_more
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    {r.sectorId === preferredSectorId && preferredSectorId
                      ? 'Sektor fokus langkah 1'
                      : 'Alokasi pilihanmu'}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0 ml-2 flex flex-col items-end gap-0.5">
                <div className="font-title-md text-title-md text-on-surface font-bold">
                  {maxNum > 0 ? `Rp ${group(String(rowNominals[i]!))}` : '–'}
                </div>
                <label className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant font-medium">
                  <input
                    className="w-14 h-8 px-1.5 rounded-lg bg-surface-container-lowest text-on-surface text-right font-bold focus:outline-none focus:ring-2 focus:ring-secondary"
                    aria-label={`Porsi persen ${sectorNameOf(r.sectorId)}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={100 - (totalPct - r.pct)}
                    value={r.pct}
                    onChange={(e) => setRowPct(i, Number(e.target.value))}
                  />
                  <span>% porsi</span>
                </label>
                <button
                  className="flex items-center gap-0.5 text-on-surface-variant hover:text-error font-label-sm text-label-sm active:scale-95 transition-all"
                  type="button"
                  aria-label={`Hapus alokasi ${sectorNameOf(r.sectorId)}`}
                  onClick={() => removeRow(i)}
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  <span>Hapus</span>
                </button>
              </div>
            </div>
          ))}
        </div>
        {maxNum > 0 && totalPct < 100 && rows.length > 0 && (
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Sisa Rp {group(String(remainder))} ({100 - totalPct}%) belum dialokasikan.
          </p>
        )}
        <button
          className="w-full h-11 rounded-xl bg-surface-container font-label-md text-label-md text-secondary font-bold flex items-center justify-center gap-1.5 hover:bg-surface-container-high active:scale-98 transition-all disabled:opacity-50"
          type="button"
          disabled={rows.length >= MAX_SECTORS}
          onClick={addRow}
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          <span>+ Tambah Sektor Alokasi</span>
        </button>
      </div>

      {/* Section 4: Target Imbal Hasil & Ekspektasi Tenor — visual */}
      <div className="flex flex-col gap-space-sm p-4 rounded-xl bg-surface-container-lowest shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-label-lg text-label-lg text-on-surface font-bold">
            Target Imbal Hasil &amp; Ekspektasi Tenor
          </h3>
          <span className="material-symbols-outlined text-on-surface-variant text-[18px]">trending_up</span>
        </div>
        <div className="grid grid-cols-2 gap-space-xs">
          <div className="p-3 rounded-xl bg-surface-container-low flex flex-col justify-between">
            <span className="font-body-sm text-body-sm text-on-surface-variant">Bagi Hasil Minimum</span>
            <div className="mt-1">
              <span className="font-headline-sm text-headline-sm text-on-surface font-extrabold">15% - 20%</span>
              <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">p.a. (Nisbah laba bersih)</p>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-surface-container-low flex flex-col justify-between">
            <span className="font-body-sm text-body-sm text-on-surface-variant">Preferensi Tenor Putaran</span>
            <div className="mt-1">
              <span className="font-headline-sm text-headline-sm text-secondary font-extrabold">12 – 24 Bulan</span>
              <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">Siklus pengembalian modal</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-container text-on-surface">
          <div className="w-9 h-9 rounded-lg bg-secondary text-on-secondary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">account_balance</span>
          </div>
          <div className="flex flex-col">
            <span className="font-label-md text-label-md font-bold text-on-surface">Estimasi Arus Kas Bulanan</span>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {maximumAmount ? (
                <>
                  Dana siaga {jt(maximumAmount)} berpotensi menghasilkan bagi hasil rata-rata {low} – {high}
                  /bulan via sistem Modalin Escrow.
                </>
              ) : (
                'Isi alokasi modal siaga untuk melihat estimasi arus kas bulanan.'
              )}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
