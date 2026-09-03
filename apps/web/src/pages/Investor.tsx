import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Field, Notice, EmptyState, Badge } from '../components/ui';
import { readSession } from '../lib/session';

export function InvestorPage() {
  const session = readSession();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['investor-preference'],
    queryFn: () => api<Preference | null>('/api/investor/preference'),
    staleTime: 30_000,
  });

  return (
    <div className="shell" style={{ paddingBottom: 30 }}>
      <div className="page-head">
        <h1>Preferensi Investor</h1>
        <p>Tentukan kriteria danasi agar peluang terkait datang lebih cepat.</p>
      </div>
      <div className="stack">
        {isLoading ? (
          <EmptyState icon="⏳" title="Memuat preferensi..." />
        ) : isError ? (
          <EmptyState icon="⚠️" title="Gagal memuat" message="Coba lagi." />
        ) : (
          <PreferenceForm initial={data} />
        )}
        {session?.role === 'INVESTOR' && (
          <div className="card card-pad">
            <Field label="Profil investor"><small className="note">Preferensi tersimpan dapat diubah kapan saja.</small></Field>
          </div>
        )}
      </div>
    </div>
  );
}

function PreferenceForm({ initial }: { initial: Preference | null | undefined }) {
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const mutation = useMutation({
    mutationFn: (data: unknown) => api('/api/investor/preference', { method: 'PUT', json: data }),
    onSuccess: () => {
      setSaved(true);
      setError('');
      qc.invalidateQueries({ queryKey: ['investor-preference'] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Gagal menyimpan.'),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSaved(false);
    const raw = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const data = {
      minimumAmount: raw.minimumAmount ? Number(raw.minimumAmount) : undefined,
      maximumAmount: raw.maximumAmount ? Number(raw.maximumAmount) : undefined,
      preferredLocation: raw.preferredLocation || undefined,
      cooperationType: raw.cooperationType || undefined,
    };
    mutation.mutate(data);
  }

  return (
    <form className="card card-pad" style={{ display: 'grid', gap: 16 }} onSubmit={onSubmit}>
      {error && <Notice tone="error">{error}</Notice>}
      {saved && <Notice tone="success">Preferensi tersimpan!</Notice>}
      <div className="field-grid">
        <Field label="Minimal danasi (Rp)">
          <input className="input" name="minimumAmount" type="number" min={0} defaultValue={initial?.minimumAmount ? String(initial.minimumAmount) : ''} placeholder="50.000.000" />
        </Field>
        <Field label="Maksimal danasi (Rp)">
          <input className="input" name="maximumAmount" type="number" min={0} defaultValue={initial?.maximumAmount ? String(initial.maximumAmount) : ''} placeholder="500.000.000" />
        </Field>
      </div>
      <Field label="Lokasi yang disukai">
        <input className="input" name="preferredLocation" defaultValue={initial?.preferredLocation ?? ''} placeholder="Jawa, Sumatera, dll." />
      </Field>
      <Field label="Jenis kerja sama">
        <input className="input" name="cooperationType" defaultValue={initial?.cooperationType ?? ''} placeholder="Bagi hasil, pinjaman, dll." />
      </Field>
      <div className="hero-actions">
        <button className="btn btn-primary" type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Menyimpan...' : 'Simpan preferensi'}
        </button>
      </div>
    </form>
  );
}

type Preference = {
  minimumAmount?: number | null;
  maximumAmount?: number | null;
  preferredLocation?: string | null;
  cooperationType?: string | null;
};