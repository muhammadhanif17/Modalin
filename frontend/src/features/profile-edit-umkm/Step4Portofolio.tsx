import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { endpoints } from '../../lib/api';
import { Spinner } from '../../components/ui';

const MAX_BYTES = 10 * 1024 * 1024;

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Port 1:1 dari Mockup/a7. Edit Profil Usaha - Portofolio & Berkas.html.
 * Class, copy, ikon Material Symbols dipertahankan verbatim. Daftar berkas
 * memakai endpoint portfolio yang sudah ada (tambah/hapus, maks 10 MB);
 * NIB dan kartu skor adalah placeholder visual karena belum ada endpoint-nya.
 * Satu kartu "Tambah Berkas Baru" menampung judul + picker agar unggah
 * tetap bisa dilakukan dari struktur mockup.
 */
export function Step4Portofolio({ errors }: { errors: Record<string, string> }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['portfolio'], queryFn: endpoints.portfolio });
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const uploadRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const add = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Pilih berkas dulu.');
      if (!title.trim()) throw new Error('Judul wajib diisi.');
      if (file.size > MAX_BYTES) throw new Error('Berkas terlalu besar. Maksimal 10 MB.');
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
  const photos = items.filter((it) => it.fileType.startsWith('image/'));
  const pdfs = items.filter((it) => it.fileType === 'application/pdf');
  const others = items.filter((it) => !it.fileType.startsWith('image/') && it.fileType !== 'application/pdf');

  const focusUpload = () => {
    uploadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => titleRef.current?.focus(), 300);
  };

  return (
    <>
      {/* Header Card Banner */}
      <div className="bg-secondary-container/50 rounded-xl p-space-md flex gap-space-sm items-start relative overflow-hidden">
        <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container shrink-0 shadow-sm">
          <span className="material-symbols-outlined text-[22px]">attachment</span>
        </div>
        <div className="flex-1 space-y-1">
          <h2 className="font-headline-sm text-headline-sm text-primary">Unggah Berkas Bukti &amp; Portofolio</h2>
          <p className="font-body-sm text-body-sm text-on-secondary-container leading-relaxed">
            Dokumen lengkap meningkatkan <span className="font-bold text-primary">Skor Kepercayaan (Trust Score)</span>{' '}
            hingga 85+ dan mempercepat minat investor terverifikasi hingga 3x lipat.
          </p>
        </div>
      </div>

      {error && (
        <div
          className="px-3.5 py-3 rounded-xl bg-error-container border border-error/30 text-[13px] font-semibold text-on-error-container"
          role="alert"
        >
          {error}
        </div>
      )}
      {errors.portfolio && (
        <div
          className="px-3.5 py-3 rounded-xl bg-error-container border border-error/30 text-[13px] font-semibold text-on-error-container"
          role="alert"
        >
          {errors.portfolio}
        </div>
      )}

      {/* Section 1: Photo Gallery Grid */}
      <div className="bg-surface-container-lowest rounded-xl p-space-md space-y-space-sm shadow-sm">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="font-title-md text-title-md text-on-surface">1. Foto Operasional &amp; Kedai Usaha</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Unggah visual asli tempat usaha Anda (Maksimal 5 foto).
            </p>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-surface-container font-label-sm text-label-sm text-secondary font-bold">
            {photos.length}/5 Terunggah
          </span>
        </div>
        <div className="grid grid-cols-2 gap-space-xs">
          {photos.map((it) => (
            <div key={it.id} className="relative rounded-xl overflow-hidden aspect-[4/3] bg-surface-container group">
              <img className="w-full h-full object-cover" src={it.fileUrl} alt={it.title} />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-black/20 flex flex-col justify-between p-2 pointer-events-none">
                <div className="self-end bg-secondary text-on-secondary rounded-full p-0.5 flex items-center justify-center shadow">
                  <span className="material-symbols-outlined text-[14px]">check</span>
                </div>
                <span className="font-label-sm text-label-sm text-on-primary truncate font-medium">{it.title}</span>
              </div>
              <button
                aria-label={`Hapus ${it.title}`}
                className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-primary-container/80 text-on-primary flex items-center justify-center"
                type="button"
                onClick={() => remove.mutate(it.id)}
                disabled={remove.isPending}
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
              </button>
            </div>
          ))}
          <button
            className="rounded-xl aspect-[4/3] bg-surface-container-low hover:bg-surface-container active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-1.5 p-2 text-center text-secondary"
            type="button"
            onClick={focusUpload}
          >
            <div className="w-9 h-9 rounded-full bg-surface-container-highest flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[20px]">add_a_photo</span>
            </div>
            <span className="font-label-sm text-label-sm font-semibold text-on-surface">Tambah Foto Usaha</span>
            <span className="font-body-sm text-body-sm text-outline text-[10px]">JPG, PNG max 5MB</span>
          </button>
        </div>
      </div>

      {/* Section 2: Proposal Bisnis */}
      <div className="bg-surface-container-lowest rounded-xl p-space-md space-y-space-xs shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-title-md text-title-md text-on-surface">2. Proposal Bisnis (Pitch Deck)</h3>
          <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm">
            Wajib
          </span>
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Rencana ekspansi, analisis kompetitor, dan alokasi modal kerja.
        </p>
        {pdfs.length === 0 && (
          <p className="p-3 rounded-xl border border-dashed border-outline-variant font-body-sm text-body-sm text-on-surface-variant text-center">
            Belum ada proposal. Tambahkan berkas PDF melalui kartu di bawah.
          </p>
        )}
        {pdfs.map((it) => (
          <div key={it.id} className="p-space-sm rounded-xl bg-surface-container-low flex items-center justify-between gap-space-sm">
            <div className="flex items-center gap-space-xs min-w-0">
              <div className="w-10 h-10 rounded-lg bg-error-container text-on-error-container flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">picture_as_pdf</span>
              </div>
              <div className="min-w-0">
                <p className="font-label-lg text-label-lg text-on-surface truncate">{it.title}</p>
                <div className="flex items-center gap-2">
                  <span className="font-body-sm text-body-sm text-outline text-[11px]">{formatSize(it.fileSize)}</span>
                  <span className="text-secondary font-label-sm text-label-sm flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[13px]">verified</span> Terverifikasi PDF
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <a
                aria-label={`Lihat ${it.title}`}
                className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
                href={it.fileUrl}
                target="_blank"
                rel="noreferrer"
              >
                <span className="material-symbols-outlined text-[18px]">visibility</span>
              </a>
              <button
                aria-label={`Hapus ${it.title}`}
                className="w-8 h-8 rounded-full flex items-center justify-center text-error hover:bg-error-container/30"
                type="button"
                onClick={() => remove.mutate(it.id)}
                disabled={remove.isPending}
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Section 3: Laporan Keuangan Sederhana */}
      <div className="bg-surface-container-lowest rounded-xl p-space-md space-y-space-xs shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-title-md text-title-md text-on-surface">3. Laporan Kas &amp; Finansial</h3>
          <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm">
            Wajib
          </span>
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Arus kas kasir / POS atau pembukuan digital 6 bulan terakhir.
        </p>
        {others.length === 0 && (
          <p className="p-3 rounded-xl border border-dashed border-outline-variant font-body-sm text-body-sm text-on-surface-variant text-center">
            Belum ada laporan kas. Tambahkan berkas melalui kartu di bawah.
          </p>
        )}
        {others.map((it) => (
          <div key={it.id} className="p-space-sm rounded-xl bg-surface-container-low flex items-center justify-between gap-space-sm">
            <div className="flex items-center gap-space-xs min-w-0">
              <div className="w-10 h-10 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">table_view</span>
              </div>
              <div className="min-w-0">
                <p className="font-label-lg text-label-lg text-on-surface truncate">{it.title}</p>
                <div className="flex items-center gap-2">
                  <span className="font-body-sm text-body-sm text-outline text-[11px]">{formatSize(it.fileSize)}</span>
                  <span className="text-on-tertiary-container font-label-sm text-label-sm flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[13px]">check_circle</span> Berkas Terunggah
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <a
                aria-label={`Lihat ${it.title}`}
                className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
                href={it.fileUrl}
                target="_blank"
                rel="noreferrer"
              >
                <span className="material-symbols-outlined text-[18px]">visibility</span>
              </a>
              <button
                aria-label={`Hapus ${it.title}`}
                className="w-8 h-8 rounded-full flex items-center justify-center text-error hover:bg-error-container/30"
                type="button"
                onClick={() => remove.mutate(it.id)}
                disabled={remove.isPending}
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Section 4: Dokumen Legalitas Tambahan (placeholder — terhubung KYC, belum ada endpoint) */}
      <div className="bg-surface-container-lowest rounded-xl p-space-md space-y-space-xs shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-title-md text-title-md text-on-surface">4. Dokumen Legalitas (NIB / Halal)</h3>
          <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
            Rekomendasi
          </span>
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Nomor Induk Berusaha atau sertifikat kepatuhan operasional.
        </p>
        <div className="p-space-sm rounded-xl bg-surface-container-low flex items-center justify-between gap-space-sm">
          <div className="flex items-center gap-space-xs min-w-0">
            <div className="w-10 h-10 rounded-lg bg-surface-container-highest text-secondary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">policy</span>
            </div>
            <div className="min-w-0">
              <p className="font-label-lg text-label-lg text-on-surface truncate">Dokumen NIB usaha</p>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-secondary-container text-on-secondary-container font-label-sm text-[10px] font-bold">
                  Terhubung Sistem KYC OSS
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              aria-label="Cek status verifikasi"
              className="w-8 h-8 rounded-full flex items-center justify-center text-secondary hover:bg-secondary-container/50"
              type="button"
              title="Segera hadir"
            >
              <span className="material-symbols-outlined text-[18px]">verified_user</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tambah Berkas Baru — satu-satunya form unggah (judul + berkas, maks 10 MB) */}
      <div ref={uploadRef} className="bg-surface-container-lowest rounded-xl p-space-md space-y-space-xs shadow-sm scroll-mt-24">
        <div className="flex items-center justify-between">
          <h3 className="font-title-md text-title-md text-on-surface">Tambah Berkas Baru</h3>
          <span className="px-2 py-0.5 rounded-full bg-surface-container font-label-sm text-label-sm text-on-surface-variant">
            PDF, JPG, PNG, WebP
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="portfolio-title">
            Judul berkas
          </label>
          <input
            className="w-full h-12 bg-surface-container-low rounded-lg px-4 font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary transition-all"
            id="portfolio-title"
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="cth. Proposal 2026"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="portfolio-file">
            Pilih berkas
          </label>
          <input
            className="w-full font-body-sm text-body-sm text-on-surface-variant file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-surface-container file:font-label-md file:text-on-surface"
            id="portfolio-file"
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <span className="font-body-sm text-body-sm text-on-surface-variant">Maks 10 MB per berkas.</span>
        </div>
        <button
          type="button"
          className="w-full h-12 rounded-xl bg-primary-container text-on-primary font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 shadow-md hover:bg-secondary active:scale-[0.98] transition-all disabled:opacity-60"
          onClick={() => add.mutate()}
          disabled={add.isPending || !file || !title.trim()}
        >
          <span className="material-symbols-outlined text-[20px]">upload_file</span>
          <span>{add.isPending ? 'Mengunggah…' : 'Tambah ke portofolio'}</span>
        </button>
      </div>

      {/* Section 5: Trust Score Impact Indicator (placeholder — belum ada endpoint skor) */}
      <div className="bg-gradient-to-br from-primary-container to-secondary rounded-xl p-space-md text-on-primary space-y-space-xs shadow-md relative overflow-hidden">
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                insights
              </span>
            </div>
            <span className="font-label-sm text-label-sm uppercase tracking-wide text-secondary-fixed">
              Algoritma Kurasi Cerdas
            </span>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold">
            Skor: 88/100
          </span>
        </div>
        <div className="space-y-1 relative z-10">
          <h4 className="font-title-md text-title-md text-surface font-bold">
            Proyeksi Skor Kepercayaan: Sangat Kredibel
          </h4>
          <p className="font-body-sm text-body-sm text-inverse-on-surface/90 leading-relaxed">
            Hebat! Berkas Anda lengkap. Profil usaha berpeluang diprioritaskan di fitur Matchmaking Otomatis ke{' '}
            <span className="font-bold text-secondary-fixed">45+ Investor F&amp;B aktif</span> minggu ini.
          </p>
        </div>
        <div className="w-full bg-surface-container/20 h-2 rounded-full overflow-hidden relative z-10">
          <div className="bg-secondary-fixed h-full rounded-full w-[88%]"></div>
        </div>
      </div>

      {/* Reassurance Microcopy */}
      <div className="flex items-center justify-center gap-1.5 py-1 text-on-surface-variant font-body-sm text-body-sm">
        <span className="material-symbols-outlined text-[16px] text-secondary">cloud_done</span>
        <span>Seluruh data dan berkas tersimpan aman dengan enkripsi AES-256</span>
      </div>
    </>
  );
}
