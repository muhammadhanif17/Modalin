import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  COOPERATION_HELP,
  COOPERATION_LABEL,
  endpoints,
  type CooperationType,
  type Sector,
} from '../lib/api';
import { Field, Notice, EmptyState, Spinner } from '../components/ui';
import { formatRupiah } from '../lib/format';

/**
 * Preferensi investasi — sisi investor untuk matchmaking.
 *
 * Tiga kolom di sini yang menghidupkan FR-06 dan FR-07:
 *   cooperationTypes  -> irisan hard filter (FR-06)
 *   preferredSectorId -> bobot sektor 40% (FR-07)
 *   preferredLocation -> bobot lokasi 10%, hanya kalau diisi (FR-07)
 * Karena itu formulirnya menjelaskan dampaknya, bukan sekadar meminta data.
 */

const TYPES: CooperationType[] = ['BAGI_HASIL', 'PENYERTAAN_MODAL', 'PINJAMAN'];

type Preference = {
  minimumAmount?: string | number | null;
  maximumAmount?: string | number | null;
  preferredLocation?: string | null;
  preferredSectorId?: string | null;
  cooperationTypes?: CooperationType[];
};

export function InvestorPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['investor-preference'],
    queryFn: () => endpoints.investorPreference() as Promise<Preference | null>,
    staleTime: 30_000,
  });
  const { data: sectors } = useQuery({ queryKey: ['sectors'], queryFn: endpoints.sectors, staleTime: 600_000 });

  return (
    <div className="shell" style={{ paddingBottom: 30 }}>
      <div className="page-head">
        <h1>Preferensi investasi</h1>
        <p>Kriteria ini yang dipakai sistem untuk mencarikan mitra yang cocok untukmu.</p>
      </div>

      {isLoading && <Spinner />}
      {isError && <EmptyState icon="warning" title="Gagal memuat preferensi" message="Coba lagi sebentar lagi." />}
      {!isLoading && !isError && <PreferenceForm initial={data ?? null} sectors={sectors ?? []} />}
    </div>
  );
}

function PreferenceForm({ initial, sectors }: { initial: Preference | null; sectors: Sector[] }) {
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const [types, setTypes] = useState<CooperationType[]>(initial?.cooperationTypes ?? ['BAGI_HASIL']);
  const [minAmount, setMinAmount] = useState(initial?.minimumAmount ? String(Number(initial.minimumAmount)) : '');
  const [maxAmount, setMaxAmount] = useState(initial?.maximumAmount ? String(Number(initial.maximumAmount)) : '');

  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => endpoints.savePreference(body),
    onSuccess: () => {
      setSaved(true);
      setError('');
      qc.invalidateQueries({ queryKey: ['investor-preference'] });
      // Preferensi berubah berarti hasil pencocokan ikut berubah.
      qc.invalidateQueries({ queryKey: ['matches'] });
    },
    onError: (err) => {
      setSaved(false);
      setError(err instanceof Error ? err.message : 'Gagal menyimpan preferensi.');
    },
  });

  const toggle = (type: CooperationType) =>
    setTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSaved(false);

    if (types.length === 0) {
      setError('Pilih minimal satu jenis kerja sama, supaya kami tahu peluang mana yang cocok untukmu.');
      return;
    }
    const min = minAmount ? Number(minAmount) : 0;
    const max = maxAmount ? Number(maxAmount) : 0;
    if (max > 0 && min > max) {
      setError('Anggaran minimum tidak boleh lebih besar dari maksimum.');
      return;
    }

    const raw = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    mutation.mutate({
      minimumAmount: min,
      maximumAmount: max,
      preferredLocation: raw.preferredLocation?.trim() || null,
      preferredSectorId: raw.preferredSectorId || null,
      cooperationTypes: types,
    });
  }

  return (
    <form className="card card-pad stack" onSubmit={onSubmit}>
      {error && <Notice tone="error">{error}</Notice>}
      {saved && <Notice tone="success">Preferensi tersimpan. Rekomendasimu sudah diperbarui.</Notice>}

      <div className="field">
        <label>Jenis kerja sama yang kamu terima</label>
        <span className="field-hint">
          Peluang yang skemanya tidak beririsan dengan pilihanmu tidak akan pernah muncul di rekomendasi.
        </span>
        <div className="stack" style={{ gap: 8, marginTop: 10 }}>
          {TYPES.map((type) => (
            <label key={type} className="choice">
              <input type="checkbox" checked={types.includes(type)} onChange={() => toggle(type)} />
              <span>
                <b>{COOPERATION_LABEL[type]}</b>
                <span className="field-hint">{COOPERATION_HELP[type]}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="field">
        <label>Rentang anggaran</label>
        <span className="field-hint">Bobot 30% dari skor kecocokan. Kosongkan kalau kamu fleksibel.</span>
        <div className="field-grid" style={{ marginTop: 10 }}>
          <label className="input-money">
            <input
              className="input"
              inputMode="numeric"
              placeholder="50.000.000"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value.replace(/\D/g, ''))}
              aria-label="Anggaran minimum"
            />
          </label>
          <label className="input-money">
            <input
              className="input"
              inputMode="numeric"
              placeholder="500.000.000"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value.replace(/\D/g, ''))}
              aria-label="Anggaran maksimum"
            />
          </label>
        </div>
        {(minAmount || maxAmount) && (
          <span className="field-hint">
            {formatRupiah(Number(minAmount || 0))} sampai{' '}
            {maxAmount ? formatRupiah(Number(maxAmount)) : 'tanpa batas'}
          </span>
        )}
      </div>

      <Field
        label="Sektor yang diminati"
        hint="Bobot terbesar, 40% dari skor kecocokan. Kalau dikosongkan, semua sektor diperlakukan sama."
      >
        <select className="input" name="preferredSectorId" defaultValue={initial?.preferredSectorId ?? ''}>
          <option value="">Semua sektor</option>
          {sectors.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Lokasi yang diutamakan"
        hint="Bobot 10%, dan hanya dihitung kalau kolom ini diisi. Kosongkan kalau lokasi tidak jadi pertimbangan."
      >
        <input
          className="input"
          name="preferredLocation"
          defaultValue={initial?.preferredLocation ?? ''}
          placeholder="mis. Bandung"
        />
      </Field>

      <button className="btn btn-primary btn-block" type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Menyimpan…' : 'Simpan preferensi'}
      </button>
    </form>
  );
}
