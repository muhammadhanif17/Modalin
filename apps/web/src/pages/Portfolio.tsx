import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Field, Notice, EmptyState, Spinner } from '../components/ui';
import { formatTanggal } from '../lib/format';

export function PortfolioPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['portfolio'],
    queryFn: () => api<PortfolioItem[]>('/api/portfolio'),
    staleTime: 30_000,
  });
  const qc = useQueryClient();
  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/portfolio/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolio'] }),
  });

  const rows = data ?? [];

  return (
    <div className="shell" style={{ paddingBottom: 30 }}>
      <div className="page-head">
        <h1>Rekam danai</h1>
        <p>Perlihatkan track record investasi yang sudah kamu danai.</p>
      </div>
      <div className="stack">
        <AddPortfolio />
        {isLoading && <Spinner />}
        {isError && <EmptyState icon="⚠️" title="Gagal memuat" message="Coba lagi." />}
        {!isLoading && !isError && rows.length === 0 && (
          <EmptyState icon="💼" title="Belum ada rekam danai" message="Tambahkan proyek yang sudah kamu danai." />
        )}
        {!isLoading && rows.length > 0 && (
          <div className="stack">
            {rows.map((item) => (
              <div className="card card-pad" key={item.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong>{item.title}</strong>
                    <div className="opp-meta">{item.fileType} · {formatTanggal(item.createdAt)}</div>
                    {item.description && (
                      <p className="note" style={{ marginTop: 8 }}>{item.description}</p>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <a className="btn btn-soft btn-sm" href={item.fileUrl} target="_blank" rel="noopener noreferrer">
                      Lihat
                    </a>
                    <button className="btn btn-outline btn-sm" onClick={() => remove.mutate(item.id)} aria-label="Hapus">
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AddPortfolio() {
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);
  const mutation = useMutation({
    mutationFn: (data: unknown) => api('/api/portfolio', { method: 'POST', json: data }),
    onSuccess: () => {
      setSaved(true);
      setError('');
      setOpen(false);
      qc.invalidateQueries({ queryKey: ['portfolio'] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Gagal menambah.'),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSaved(false);
    const raw = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const data = {
      title: raw.title,
      fileUrl: raw.fileUrl,
      fileType: raw.fileType || 'dokumen',
      description: raw.description || undefined,
    };
    mutation.mutate(data);
  }

  return (
    <div className="stack">
      {saved && <Notice tone="success" onClose={() => setSaved(false)}>Rekam danai ditambahkan.</Notice>}
      {!open ? (
        <button className="btn btn-primary" style={{ justifySelf: 'start' }} onClick={() => setOpen(true)}>
          + Tambah rekam danai
        </button>
      ) : (
        <form className="card card-pad" style={{ display: 'grid', gap: 16 }} onSubmit={onSubmit}>
          {error && <Notice tone="error">{error}</Notice>}
          <Field label="Judul">
            <input className="input" name="title" minLength={2} required placeholder="Mis: Danai Kopi Rindang" />
          </Field>
          <Field label="URL dokumen">
            <input className="input" name="fileUrl" type="url" required placeholder="https://..." />
            <small className="hint">Tempel tautan ke dokumen (PDF, laporan, dll).</small>
          </Field>
          <div className="field-grid">
            <Field label="Tipe file">
              <input className="input" name="fileType" defaultValue="dokumen" />
            </Field>
          </div>
          <Field label="Deskripsi">
            <textarea className="textarea" name="description" />
          </Field>
          <div className="hero-actions">
            <button className="btn btn-primary" type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button className="btn btn-outline" type="button" onClick={() => setOpen(false)}>
              Batal
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

type PortfolioItem = {
  id: string;
  title: string;
  description?: string | null;
  fileUrl: string;
  fileType: string;
  createdAt: string;
};