import { useRef, useState } from 'react';

const QUICK_AMOUNTS = [
  { label: 'Rp 25 Jt', value: '25000000' },
  { label: 'Rp 50 Jt', value: '50000000' },
  { label: 'Rp 75 Jt', value: '75000000' },
  { label: 'Rp 100 Jt', value: '100000000' },
] as const;

const TENORS = ['6', '12', '24', '36', '48'] as const;

/* Pos alokasi yang diatur sendiri oleh UMKM (nama + porsi bisa diubah,
   baris bisa ditambah/dihapus). Sistem hanya menghitung nominal tiap pos
   (= porsi × target) dan menjaga total porsi maksimal 100%. */
type Pos = { name: string; desc: string; pct: number };

const DEFAULT_POS: Pos[] = [
  {
    name: 'Renovasi & Penambahan Area Duduk',
    desc: 'Memperluas kapasitas dari 24 menjadi 48 kursi',
    pct: 46,
  },
  {
    name: 'Mesin Espresso Komersial 2-Group',
    desc: 'Menaikkan laju seduh peak-hour s/d 120 cup/jam',
    pct: 33,
  },
  {
    name: 'Bahan Baku & Modal Kas Awal',
    desc: 'Stok green beans Flores & susu fresh 3 bulan',
    pct: 21,
  },
];

const BAR_COLORS = ['bg-primary-container', 'bg-secondary', 'bg-secondary-container', 'bg-primary'] as const;
const MAX_POS = 8;

function sanitizePos(raw: unknown): Pos[] {
  if (!Array.isArray(raw)) return DEFAULT_POS.map((p) => ({ ...p }));
  const list = (raw as Record<string, unknown>[])
    .filter((p) => p && typeof p.name === 'string' && p.name.trim())
    .map((p) => ({
      name: String(p.name).slice(0, 80),
      desc: typeof p.desc === 'string' ? String(p.desc).slice(0, 140) : '',
      pct: Math.max(0, Math.min(100, Math.round(Number(p.pct) || 0))),
    }));
  if (list.length === 0) return DEFAULT_POS.map((p) => ({ ...p }));
  /* Kunci total maksimal 100% berurutan dari pos pertama. */
  let acc = 0;
  for (const p of list) {
    p.pct = Math.min(p.pct, 100 - acc);
    acc += p.pct;
  }
  return list;
}

/* Kandidat nominal tiket. Yang ditawarkan hanya yang habis membagi target
   (jumlah slot selalu bulat — tidak ada 7,5 slot) dan total slot ≤ 60. */
const TICKET_CANDIDATES = [1000000, 2500000, 5000000, 10000000, 25000000, 50000000] as const;
const MAX_SLOTS = 60;

function formatRp(n: number): string {
  return `Rp ${n.toLocaleString('id-ID')}`;
}

function formatDigits(digits: string): string {
  if (!digits) return '';
  return Number(digits).toLocaleString('id-ID');
}

/**
 * Port 1:1 dari Mockup/a4. Edit Profil Usaha - Kebutuhan Dana.html.
 * Class, copy, ikon Material Symbols dipertahankan verbatim (emoji lampu
 * diganti ikon lightbulb). Nominal tersimpan sebagai digit agar validasi
 * dan payload API tidak berubah. Opsi tiket dibangkitkan dari target sehingga
 * jumlah slot selalu bulat, dan nominal tiap pos alokasi = porsi × target —
 * pos dan porsinya diatur sendiri oleh UMKM (total dikunci maks 100%).
 * Performa finansial adalah placeholder visual karena belum ada
 * endpoint-nya.
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

  const target = Number(digits) || 0;

  /* Opsi tiket valid untuk target saat ini: hanya nominal yang menghasilkan
     jumlah slot bulat. Pilihan tersimpan lokal; ikut ter-reset otomatis bila
     target berubah sehingga opsi lama tak lagi valid. */
  const [ticket, setTicket] = useState('5000000');
  const validTickets = target > 0
    ? TICKET_CANDIDATES.filter((t) => target % t === 0 && target / t >= 1 && target / t <= MAX_SLOTS)
    : [];
  const effectiveTicket = validTickets.some((t) => String(t) === ticket) ? ticket : 'single';
  const activeSlots = effectiveTicket === 'single' ? 0 : target / Number(effectiveTicket);

  /* Alokasi bikinan pengguna — tersimpan di draf agar tidak hilang saat
     pindah langkah. Total porsi dikunci maksimal 100%: setiap ubahan porsi
     dijepit ke sisa yang tersedia. */
  const [posList, setPosList] = useState<Pos[]>(() => sanitizePos(values.allocation));
  function commitPos(next: Pos[]) {
    setPosList(next);
    set('allocation', next);
  }
  const totalPct = posList.reduce((s, p) => s + p.pct, 0);
  function setPosPct(i: number, raw: number) {
    const others = totalPct - posList[i]!.pct;
    const pct = Math.max(0, Math.min(100 - others, Math.round(raw || 0)));
    if (pct === posList[i]!.pct) return;
    commitPos(posList.map((p, j) => (j === i ? { ...p, pct } : p)));
  }
  function setPosField(i: number, field: 'name' | 'desc', value: string) {
    commitPos(posList.map((p, j) => (j === i ? { ...p, [field]: value } : p)));
  }
  function addPos() {
    if (posList.length >= MAX_POS) return;
    commitPos([...posList, { name: `Pos ${posList.length + 1}`, desc: '', pct: 0 }]);
  }
  function removePos(i: number) {
    if (posList.length <= 1) return;
    commitPos(posList.filter((_, j) => j !== i));
  }

  /* Nominal tiap pos = porsi × target (dibulatkan ke bawah per ribuan).
     Pos terakhir yang berporsi menyerap sisa pembulatan bila total sudah
     100% supaya pas dengan target; sisanya ditampilkan sebagai dana yang
     belum dialokasikan. */
  let lastNonZero = -1;
  posList.forEach((p, i) => {
    if (p.pct > 0) lastNonZero = i;
  });
  const floored = posList.map((p) => (target > 0 && p.pct > 0 ? Math.floor((target * p.pct) / 100 / 1000) * 1000 : 0));
  const nominals = floored.map((f, i) =>
    i === lastNonZero && totalPct === 100 ? target - floored.reduce((s, v, j) => (j === i ? s : s + v), 0) : f,
  );
  const mapped = nominals.reduce((s, v) => s + v, 0);
  const remainder = target > 0 ? target - mapped : 0;

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
            value={effectiveTicket}
            onChange={(e) => setTicket(e.target.value)}
            disabled={target <= 0}
          >
            {target <= 0 && <option value="single">Isi target nominal dulu…</option>}
            {validTickets.map((t) => (
              <option key={t} value={String(t)}>
                {formatRp(t)} / slot ({(target / t).toLocaleString('id-ID')} slot)
              </option>
            ))}
            {target > 0 && <option value="single">Investor Tunggal (100% kepemilikan komitmen)</option>}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-on-surface-variant">
            <span className="material-symbols-outlined text-[20px]">expand_more</span>
          </div>
        </div>
        <span className="font-body-sm text-body-sm text-on-surface-variant">
          {target <= 0 ? (
            'Pilih atau ketik target nominal di atas untuk melihat opsi tiket.'
          ) : effectiveTicket === 'single' ? (
            `Dengan investor tunggal, seluruh ${formatRp(target)} ditanggung 1 pemodal.`
          ) : (
            <>
              Dengan {formatRp(Number(effectiveTicket))} / slot, usaha Anda memiliki fleksibilitas hingga{' '}
              {activeSlots.toLocaleString('id-ID')} pemodal aktif.
            </>
          )}
        </span>
      </div>

      {/* Section 3: Rencana Alokasi Modal — pos dan porsi diatur sendiri,
          nominal tiap pos dihitung dari target nominal di atas. */}
      <div className="flex flex-col gap-space-sm p-4 rounded-xl bg-surface-container-lowest shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-label-lg text-label-lg text-on-surface font-bold">
              Alokasi &amp; Pos Penggunaan Dana
            </h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Total alokasi terpetakan:{' '}
              {target > 0 ? `${formatRp(mapped)} (${totalPct}%)` : '— (isi target dulu)'}
            </p>
          </div>
          <span className="px-2 py-1 rounded-md bg-secondary/10 text-secondary font-label-sm text-label-sm font-bold">
            {totalPct === 100 ? '100% Berimbang' : totalPct > 0 ? `${totalPct}% Terpetakan` : 'Belum Diatur'}
          </span>
        </div>
        <div className="w-full h-3 rounded-full overflow-hidden flex bg-surface-container">
          {posList.map((p, i) =>
            p.pct > 0 ? (
              <div
                key={i}
                className={`h-full ${BAR_COLORS[i % BAR_COLORS.length]}`}
                style={{ width: `${p.pct}%` }}
                title={`${p.name} (${p.pct}%)`}
              ></div>
            ) : null,
          )}
        </div>
        <div className="flex flex-col gap-2 pt-1">
          {posList.map((p, i) => (
            <div key={i} className="flex items-start justify-between gap-2 p-3 rounded-xl bg-surface-container-low">
              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                <span className={`w-3 h-3 rounded-full ${BAR_COLORS[i % BAR_COLORS.length]} mt-1 shrink-0`}></span>
                <div className="flex flex-col min-w-0 flex-1">
                  <input
                    className="w-full bg-transparent font-title-md text-title-md text-on-surface font-semibold focus:outline-none focus:bg-surface-container-lowest rounded px-1 -mx-1"
                    aria-label={`Nama pos alokasi ${i + 1}`}
                    value={p.name}
                    maxLength={80}
                    onChange={(e) => setPosField(i, 'name', e.target.value)}
                  />
                  <input
                    className="w-full bg-transparent font-body-sm text-body-sm text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest rounded px-1 -mx-1"
                    aria-label={`Keterangan pos alokasi ${i + 1}`}
                    placeholder="Keterangan (opsional)"
                    value={p.desc}
                    maxLength={140}
                    onChange={(e) => setPosField(i, 'desc', e.target.value)}
                  />
                </div>
              </div>
              <div className="text-right shrink-0 ml-2 flex flex-col items-end gap-0.5">
                <div className="font-title-md text-title-md text-on-surface font-bold">
                  {target > 0 ? formatRp(nominals[i]!) : '—'}
                </div>
                <label className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant font-medium">
                  <input
                    className="w-14 h-8 px-1.5 rounded-lg bg-surface-container-lowest text-on-surface text-right font-bold focus:outline-none focus:ring-2 focus:ring-secondary"
                    aria-label={`Porsi persen pos ${p.name || i + 1}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={100 - (totalPct - p.pct)}
                    value={p.pct}
                    onChange={(e) => setPosPct(i, Number(e.target.value))}
                  />
                  <span>% porsi</span>
                </label>
                {posList.length > 1 && (
                  <button
                    className="flex items-center gap-0.5 text-on-surface-variant hover:text-error font-label-sm text-label-sm active:scale-95 transition-all"
                    type="button"
                    aria-label={`Hapus ${p.name || `pos ${i + 1}`}`}
                    onClick={() => removePos(i)}
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    <span>Hapus</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        {target > 0 && totalPct < 100 && (
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Sisa {formatRp(remainder)} ({100 - totalPct}%) belum dialokasikan — naikkan porsi atau tambah pos baru.
          </p>
        )}
        <button
          className="w-full h-11 rounded-xl bg-surface-container font-label-md text-label-md text-secondary font-bold flex items-center justify-center gap-1.5 hover:bg-surface-container-high active:scale-98 transition-all disabled:opacity-50"
          type="button"
          disabled={posList.length >= MAX_POS}
          onClick={addPos}
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
