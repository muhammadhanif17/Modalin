import { useRef } from 'react';

const QUICK_AMOUNTS = [
  { label: 'Rp 25 Jt', value: '25000000' },
  { label: 'Rp 50 Jt', value: '50000000' },
  { label: 'Rp 75 Jt', value: '75000000' },
  { label: 'Rp 100 Jt', value: '100000000' },
] as const;

const TENORS = ['6', '12', '24', '36', '48'] as const;

function formatDigits(digits: string): string {
  if (!digits) return '';
  return Number(digits).toLocaleString('id-ID');
}

/**
 * Port 1:1 dari Mockup/a4. Edit Profil Usaha - Kebutuhan Dana.html.
 * Class, copy, ikon Material Symbols dipertahankan verbatim (emoji lampu
 * diganti ikon lightbulb). Nominal tersimpan sebagai digit agar validasi
 * dan payload API tidak berubah; tiket, alokasi, dan performa adalah
 * placeholder visual karena belum ada endpoint-nya.
 * Kartu "Tenor, Lokasi & Imbal Hasil" memakai bahasa visual yang sama agar
 * field wajib validateStep langkah 2 (tenor, lokasi, ROI) tetap terisi.
 */
export function Step2KebutuhanDana({
  values,
  set,
  errors,
}: {
  values: Record<string, unknown>;
  set: <K extends string>(k: K, v: unknown) => void;
  errors: Record<string, string>;
}) {
  const amountRef = useRef<HTMLInputElement>(null);

  const digits = String(values.targetAmount ?? '').replace(/[^0-9]/g, '');
  const tenorMonths = (values.tenorMonths as string) ?? '';
  const location = (values.location as string) ?? '';
  const estimatedRoi = (values.estimatedRoi as string) ?? '';

  return (
    <>
      {/* Section 1: Nominal Dana */}
      <div className="flex flex-col gap-space-xs p-4 rounded-xl bg-surface-container-lowest shadow-sm">
        <label
          className="font-label-lg text-label-lg text-on-surface font-bold flex items-center justify-between"
          htmlFor="target-amount"
        >
          <span>Target Nominal Permodalan</span>
          <span className="font-label-sm text-label-sm text-secondary">IDR Rupiah</span>
        </label>
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-surface-container-low text-on-surface focus-within:bg-surface-container-lowest focus-within:shadow-md transition-all">
          <span className="font-headline-sm text-headline-sm text-on-surface-variant font-bold">Rp</span>
          <input
            aria-label="Nominal target modal usaha"
            className="w-full bg-transparent font-currency-display text-currency-display text-on-surface font-extrabold focus:outline-none tracking-tight"
            id="target-amount"
            ref={amountRef}
            type="text"
            inputMode="numeric"
            placeholder="75.000.000"
            value={formatDigits(digits)}
            onChange={(e) => set('targetAmount', e.target.value.replace(/[^0-9]/g, ''))}
          />
          <button
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
            type="button"
            aria-label="Ubah nominal"
            onClick={() => amountRef.current?.focus()}
          >
            <span className="material-symbols-outlined text-[18px]">edit</span>
          </button>
        </div>
        {errors.targetAmount && (
          <span className="font-body-sm text-body-sm text-error" role="alert">
            {errors.targetAmount}
          </span>
        )}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
          {QUICK_AMOUNTS.map((q) =>
            digits === q.value ? (
              <button
                key={q.value}
                className="px-3.5 py-1.5 rounded-full bg-primary-container text-on-primary font-label-md text-label-md shadow-sm shrink-0"
                type="button"
                onClick={() => set('targetAmount', q.value)}
              >
                {q.label}
              </button>
            ) : (
              <button
                key={q.value}
                className="px-3.5 py-1.5 rounded-full bg-surface-container font-label-md text-label-md text-on-surface hover:bg-surface-container-high transition-all shrink-0"
                type="button"
                onClick={() => set('targetAmount', q.value)}
              >
                {q.label}
              </button>
            ),
          )}
          <button
            className="px-3.5 py-1.5 rounded-full bg-surface-container font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high transition-all shrink-0"
            type="button"
            onClick={() => amountRef.current?.focus()}
          >
            Kustom
          </button>
        </div>
        <div className="flex items-start gap-2 p-3 mt-1 rounded-lg bg-surface-container text-on-surface-variant">
          <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">lightbulb</span>
          <p className="font-body-sm text-body-sm leading-snug">
            Rata-rata target pendanaan sektor F&amp;B mikro di Modalin berkisar{' '}
            <strong className="text-on-surface">Rp 30 Jt – Rp 100 Jt</strong> dengan durasi penggalangan
            14–28 hari.
          </p>
        </div>
      </div>

      {/* Tenor, Lokasi & Imbal Hasil — field wajib langkah 2, bahasa visual mockup */}
      <div className="flex flex-col gap-space-xs p-4 rounded-xl bg-surface-container-lowest shadow-sm">
        <div className="flex flex-col">
          <span className="font-label-lg text-label-lg text-on-surface font-bold">
            Tenor, Lokasi &amp; Imbal Hasil
          </span>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Ditampilkan di kartu eksplorasi investor.
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="tenor-select">
            Tenor yang diharapkan
          </label>
          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant text-[20px]">
              event_repeat
            </span>
            <select
              className="w-full h-12 bg-surface-container-low rounded-lg pl-10 pr-10 font-body-md text-body-md text-on-surface appearance-none focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary transition-all"
              id="tenor-select"
              value={tenorMonths}
              onChange={(e) => set('tenorMonths', e.target.value)}
            >
              <option value="">Pilih tenor…</option>
              {TENORS.map((t) => (
                <option key={t} value={t}>
                  {t} bulan
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-3 text-on-surface-variant text-[20px] pointer-events-none">
              expand_more
            </span>
          </div>
          {errors.tenorMonths && (
            <span className="font-body-sm text-body-sm text-error" role="alert">
              {errors.tenorMonths}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="city-location-2">
            Kota / Kabupaten Usaha
          </label>
          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant text-[20px]">
              location_city
            </span>
            <input
              className="w-full h-12 bg-surface-container-low rounded-lg pl-10 pr-space-md font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary transition-all"
              id="city-location-2"
              type="text"
              placeholder="cth. Kota Semarang"
              value={location}
              onChange={(e) => set('location', e.target.value)}
            />
          </div>
          {errors.location && (
            <span className="font-body-sm text-body-sm text-error" role="alert">
              {errors.location}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="roi-input">
            Estimasi imbal hasil (%)
          </label>
          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant text-[20px]">
              percent
            </span>
            <input
              className="w-full h-12 bg-surface-container-low rounded-lg pl-10 pr-space-md font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary transition-all"
              id="roi-input"
              type="number"
              inputMode="decimal"
              placeholder="cth. 12"
              value={estimatedRoi}
              onChange={(e) => set('estimatedRoi', e.target.value)}
            />
          </div>
          {errors.estimatedRoi ? (
            <span className="font-body-sm text-body-sm text-error" role="alert">
              {errors.estimatedRoi}
            </span>
          ) : (
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Hanya untuk Bagi Hasil &amp; Pinjaman. Opsional.
            </span>
          )}
        </div>
      </div>

      {/* Section 2: Minimal Investasi Per Tiket (placeholder — belum ada endpoint) */}
      <div className="flex flex-col gap-space-xs p-4 rounded-xl bg-surface-container-lowest shadow-sm">
        <div className="flex flex-col">
          <label className="font-label-lg text-label-lg text-on-surface font-bold" htmlFor="ticket-size">
            Minimal Investasi per Tiket Pemodal
          </label>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Nominal minimum bagi investor gabungan (konsorsium) untuk membeli 1 unit slot modal.
          </p>
        </div>
        <div className="relative mt-1">
          <select
            className="w-full h-12 px-4 rounded-xl bg-surface-container-low font-title-md text-title-md text-on-surface appearance-none focus:outline-none focus:bg-surface-container-lowest focus:shadow-sm transition-all pr-10"
            id="ticket-size"
            defaultValue="5000000"
          >
            <option value="2500000">Rp 2.500.000 / slot (30 slot)</option>
            <option value="5000000">Rp 5.000.000 / slot (15 slot tersedia)</option>
            <option value="10000000">Rp 10.000.000 / slot (7.5 slot)</option>
            <option value="single">Investor Tunggal (100% kepemilikan komitmen)</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-on-surface-variant">
            <span className="material-symbols-outlined text-[20px]">expand_more</span>
          </div>
        </div>
        <span className="font-body-sm text-body-sm text-on-surface-variant">
          Dengan Rp 5 Jt / slot, usaha Anda memiliki fleksibilitas hingga 15 pemodal aktif.
        </span>
      </div>

      {/* Section 3: Rencana Alokasi Modal (placeholder — belum ada endpoint) */}
      <div className="flex flex-col gap-space-sm p-4 rounded-xl bg-surface-container-lowest shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-label-lg text-label-lg text-on-surface font-bold">
              Alokasi &amp; Pos Penggunaan Dana
            </h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Total alokasi terpetakan: Rp 75.000.000 (100%)
            </p>
          </div>
          <span className="px-2 py-1 rounded-md bg-secondary/10 text-secondary font-label-sm text-label-sm font-bold">
            100% Berimbang
          </span>
        </div>
        <div className="w-full h-3 rounded-full overflow-hidden flex bg-surface-container">
          <div className="h-full bg-primary-container w-[46%]" title="Renovasi (46%)"></div>
          <div className="h-full bg-secondary w-[33%]" title="Mesin Espresso (33%)"></div>
          <div className="h-full bg-secondary-container w-[21%]" title="Bahan Baku (21%)"></div>
        </div>
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-start justify-between p-3 rounded-xl bg-surface-container-low">
            <div className="flex items-start gap-2.5 min-w-0">
              <span className="w-3 h-3 rounded-full bg-primary-container mt-1 shrink-0"></span>
              <div className="flex flex-col min-w-0">
                <span className="font-title-md text-title-md text-on-surface font-semibold truncate">
                  Renovasi &amp; Penambahan Area Duduk
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Memperluas kapasitas dari 24 menjadi 48 kursi
                </span>
              </div>
            </div>
            <div className="text-right shrink-0 ml-2">
              <div className="font-title-md text-title-md text-on-surface font-bold">Rp 35.000.000</div>
              <div className="font-label-sm text-label-sm text-on-surface-variant font-medium">46% porsi</div>
            </div>
          </div>
          <div className="flex items-start justify-between p-3 rounded-xl bg-surface-container-low">
            <div className="flex items-start gap-2.5 min-w-0">
              <span className="w-3 h-3 rounded-full bg-secondary mt-1 shrink-0"></span>
              <div className="flex flex-col min-w-0">
                <span className="font-title-md text-title-md text-on-surface font-semibold truncate">
                  Mesin Espresso Komersial 2-Group
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Menaikkan laju seduh peak-hour s/d 120 cup/jam
                </span>
              </div>
            </div>
            <div className="text-right shrink-0 ml-2">
              <div className="font-title-md text-title-md text-on-surface font-bold">Rp 25.000.000</div>
              <div className="font-label-sm text-label-sm text-on-surface-variant font-medium">33% porsi</div>
            </div>
          </div>
          <div className="flex items-start justify-between p-3 rounded-xl bg-surface-container-low">
            <div className="flex items-start gap-2.5 min-w-0">
              <span className="w-3 h-3 rounded-full bg-secondary-container mt-1 shrink-0"></span>
              <div className="flex flex-col min-w-0">
                <span className="font-title-md text-title-md text-on-surface font-semibold truncate">
                  Bahan Baku &amp; Modal Kas Awal
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Stok green beans Flores &amp; susu fresh 3 bulan
                </span>
              </div>
            </div>
            <div className="text-right shrink-0 ml-2">
              <div className="font-title-md text-title-md text-on-surface font-bold">Rp 15.000.000</div>
              <div className="font-label-sm text-label-sm text-on-surface-variant font-medium">21% porsi</div>
            </div>
          </div>
        </div>
        <button
          className="w-full h-11 rounded-xl bg-surface-container font-label-md text-label-md text-secondary font-bold flex items-center justify-center gap-1.5 hover:bg-surface-container-high active:scale-98 transition-all"
          type="button"
          title="Segera hadir"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          <span>Tambah Pos Alokasi</span>
        </button>
      </div>

      {/* Section 4: Performa Finansial & Proyeksi (placeholder — belum ada endpoint) */}
      <div className="flex flex-col gap-space-sm p-4 rounded-xl bg-surface-container-lowest shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-label-lg text-label-lg text-on-surface font-bold">
            Performa &amp; Proyeksi Finansial
          </h3>
          <span className="material-symbols-outlined text-on-surface-variant text-[18px]">trending_up</span>
        </div>
        <div className="grid grid-cols-2 gap-space-xs">
          <div className="p-3 rounded-xl bg-surface-container-low flex flex-col justify-between">
            <span className="font-body-sm text-body-sm text-on-surface-variant">Omzet Rata-rata</span>
            <div className="mt-1">
              <span className="font-headline-sm text-headline-sm text-on-surface font-extrabold">Rp 28,5 Jt</span>
              <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">/ bulan terakhir</p>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-surface-container-low flex flex-col justify-between">
            <span className="font-body-sm text-body-sm text-on-surface-variant">Margin Laba Bersih</span>
            <div className="mt-1">
              <span className="font-headline-sm text-headline-sm text-secondary font-extrabold">32%</span>
              <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">Nett profit ratio</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-container text-on-surface">
          <div className="w-9 h-9 rounded-lg bg-secondary text-on-secondary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">groups</span>
          </div>
          <div className="flex flex-col">
            <span className="font-label-md text-label-md font-bold text-on-surface">
              +45% Estimasi Kapasitas Pengunjung
            </span>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Peralatan baru &amp; area diperluas berpotensi mendorong omzet bulanan ke kisaran Rp 41 Jt – Rp 45
              Jt.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
