import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { endpoints } from '../../lib/api';
import { Icon, type IconName } from '../../components/ui/Icon';
import { Notice, Spinner } from '../../components/ui';

/** a7 — Portofolio & Berkas: daftar portofolio, tambah/hapus. */
export function Step4Portofolio({ errors }: { errors: Record<string, string> }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['portfolio'], queryFn: endpoints.portfolio });
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const add = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Pilih berkas dulu.');
      if (!title.trim()) throw new Error('Judul wajib diisi.');
      if (file.size > 10 * 1024 * 1024) throw new Error('Berkas terlalu besar. Maksimal 10 MB.');
      return endpoints.addPortfolio(file, title.trim());
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portfolio'] });
      setTitle('');
      setFile(null);
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => endpoints.removePortfolio(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolio'] }),
  });

  if (isLoading) return <Spinner />;

  const items = data ?? [];

  return (
    <>
      <p className="step-intro">
        Unggah proposal, foto produk, atau laporan keuangan. Format: PDF, JPG, PNG, WebP. Maks 10 MB.
      </p>
      {error && <Notice tone="error">{error}</Notice>}
      {(errors.portfolio as string | undefined) && (
        <Notice tone="error">{errors.portfolio}</Notice>
      )}

      <ul className="portfolio-list">
        {items.map((it) => (
          <li key={it.id} className="portfolio-row">
            <Icon name={iconForType(it.fileType)} />
            <div className="portfolio-main">
              <strong>{it.title}</strong>
              <small>{Math.round(it.fileSize / 1024)} KB</small>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => remove.mutate(it.id)}
              disabled={remove.isPending}
              aria-label={`Hapus ${it.title}`}
            >
              <Icon name="trash" size={16} />
            </button>
          </li>
        ))}
      </ul>

      <div className="field">
        <label>Judul berkas</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="cth. Proposal 2026" />
      </div>
      <div className="field">
        <label>Pilih berkas</label>
        <input
          className="input"
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>
      <button
        type="button"
        className="btn btn-soft btn-block"
        onClick={() => add.mutate()}
        disabled={add.isPending || !file || !title.trim()}
      >
        {add.isPending ? 'Mengunggah…' : 'Tambah ke portofolio'}
      </button>
    </>
  );
}

function iconForType(t: string): IconName {
  if (t.startsWith('image/')) return 'image';
  if (t === 'application/pdf') return 'document';
  return 'document';
}
