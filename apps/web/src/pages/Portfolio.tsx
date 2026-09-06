import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { endpoints } from '../lib/api';
import { Field, Notice, EmptyState, Spinner } from '../components/ui';
import { formatTanggal } from '../lib/format';
import { readSession } from '../lib/session';

/**
 * FR-04 — unggah dokumen pendukung.
 *
 * Portofolio generik untuk kedua peran: UMKM mengunggah proposal usaha,
 * investor mengunggah rekam jejak pendanaannya (ARCHITECTURE.md §5.2).
 *
 * Batas 10MB dan whitelist tipe ditegakkan di server; pemeriksaan di sini
 * hanya supaya pengguna tidak perlu menunggu unggahan besar gagal di tengah.
 */

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp';

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;

export function PortfolioPage() {
  const session = readSession();
  const isInvestor = session?.role === 'INVESTOR';
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['portfolio'],
    queryFn: endpoints.portfolio,
    staleTime: 30_000,
  });

  const remove = useMutation({
    mutationFn: (id: string) => endpoints.removePortfolio(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portfolio'] });
      qc.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  const rows = data ?? [];

  return (
    <div className="shell" style={{ paddingBottom: 30 }}>
      <div className="page-head">
        <h1>{isInvestor ? 'Rekam jejak pendanaan' : 'Berkas pendukung usaha'}</h1>
        <p>
          {isInvestor
            ? 'Tunjukkan kerja sama yang pernah kamu danai agar UMKM lebih yakin.'
            : 'Lampirkan proposal, laporan, atau foto produk agar pemodal lebih percaya.'}
        </p>
      </div>

      <div className="stack">
        <UploadForm />

        {isLoading && <Spinner />}
        {isError && <EmptyState icon="⚠️" title="Gagal memuat berkas" message="Coba lagi sebentar lagi." />}
        {!isLoading && !isError && rows.length === 0 && (
          <EmptyState
            icon="📄"
            title="Belum ada berkas"
            message="Unggah berkas pertamamu, ini menaikkan skor kepercayaanmu."
          />
        )}

        {rows.map((item) => (
          <div className="card card-pad" key={item.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>{item.title}</strong>
                <div className="opp-meta">
                  {item.fileType.replace('application/', '').replace('image/', '').toUpperCase()} ·{' '}
                  <span data-money>{formatSize(item.fileSize)}</span> · {formatTanggal(item.createdAt)}
                </div>
                {item.description && (
                  <p className="note" style={{ marginTop: 8 }}>
                    {item.description}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none' }}>
                <a className="btn btn-soft btn-sm" href={item.fileUrl} target="_blank" rel="noopener noreferrer">
                  Lihat
                </a>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => remove.mutate(item.id)}
                  disabled={remove.isPending}
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UploadForm() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const upload = useMutation({
    mutationFn: () => endpoints.addPortfolio(file!, title.trim(), description.trim() || undefined),
    onSuccess: () => {
      setDone(true);
      setError('');
      setFile(null);
      setTitle('');
      setDescription('');
      if (fileRef.current) fileRef.current.value = '';
      qc.invalidateQueries({ queryKey: ['portfolio'] });
      qc.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (err) => {
      setDone(false);
      setError(err instanceof Error ? err.message : 'Berkas gagal diunggah.');
    },
  });

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    setError('');
    setDone(false);
    const picked = e.target.files?.[0] ?? null;
    // Cegah lebih dulu di klien supaya pengguna tidak menunggu sia-sia.
    if (picked && picked.size > MAX_BYTES) {
      setError(`Ukuran berkas ${formatSize(picked.size)}, maksimal 10 MB. Coba kompres dulu ya.`);
      setFile(null);
      e.target.value = '';
      return;
    }
    setFile(picked);
    if (picked && !title) setTitle(picked.name.replace(/\.[^.]+$/, ''));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    if (!file) return setError('Pilih berkasnya dulu ya.');
    if (title.trim().length < 2) return setError('Beri judul minimal 2 huruf.');
    upload.mutate();
  }

  return (
    <form className="card card-pad stack" onSubmit={onSubmit}>
      {error && <Notice tone="error">{error}</Notice>}
      {done && <Notice tone="success">Berkas berhasil diunggah.</Notice>}

      <Field label="Berkas" hint="PDF, JPG, PNG, atau WebP. Maksimal 10 MB per berkas.">
        <input ref={fileRef} className="input" type="file" accept={ACCEPT} onChange={pick} />
        {file && (
          <span className="field-hint">
            {file.name} · <span data-money>{formatSize(file.size)}</span>
          </span>
        )}
      </Field>

      <Field label="Judul berkas">
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="mis. Proposal usaha dan proyeksi keuangan"
        />
      </Field>

      <Field label="Keterangan (opsional)">
        <textarea
          className="textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ringkas isi berkasnya dalam satu-dua kalimat."
        />
      </Field>

      <button className="btn btn-primary btn-block" type="submit" disabled={upload.isPending || !file}>
        {upload.isPending ? 'Mengunggah…' : 'Unggah berkas'}
      </button>
    </form>
  );
}
