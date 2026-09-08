import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { endpoints, VERIFICATION_LABEL } from '../lib/api';
import { Spinner, VERIFICATION_TONE, type BadgeTone } from '../components/ui';
import { formatTanggal } from '../lib/format';

/**
 * Port 1:1 dari:
 * - Mockup/5. Verifikasi Identitas & NIB (KYC).html (state form: belum/parsial unggah)
 * - Mockup/6. Verifikasi Selesai & Review Status (Langkah 3 dari 3).html (state review/selesai)
 *
 * Struktur section, class Tailwind (token bg-surface/text-primary/dsb.),
 * copy Indonesia, dan ikon Material Symbols dipertahankan verbatim dari mockup.
 * Bottom nav / header fixed mockup TIDAK diport (sudah ada nav global dari Layout).
 * Satu komponen, render kondisional berdasar `data` — bukan dua route
 * (/app/verifikasi/status redirect ke sini, lihat main.tsx).
 *
 * Logic API yang dipertahankan: query ['kyc'] (ktpUrl, nibUrl, requiresNib,
 * isVerified, verificationStatus, kycSubmittedAt, rejectReason), mutasi
 * uploadKtp/uploadNib + invalidasi ['kyc'] + ['profile'], validasi 10MB,
 * accept PDF/JPG/PNG/WebP, capture="environment", VERIFICATION_LABEL +
 * VERIFICATION_TONE (REJECTED merah/danger), 3 state notice, progres 3 langkah.
 */

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp';

/** Warna pill mengikuti status verifikasi (satu sumber: VERIFICATION_TONE). */
const TONE_PILL: Record<BadgeTone, string> = {
  success: 'bg-secondary-container text-on-secondary-container',
  warning: 'bg-[#FDF0D3] text-[#7A5B00]',
  danger: 'bg-error-container text-on-error-container',
  soft: 'bg-surface-container-high text-on-surface-variant',
  primary: 'bg-primary text-on-primary',
};

const TONE_DOT: Record<BadgeTone, string> = {
  success: 'bg-secondary',
  warning: 'bg-[#B45309]',
  danger: 'bg-error',
  soft: 'bg-outline',
  primary: 'bg-on-primary',
};

export function VerificationPage() {
  const qc = useQueryClient();
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['kyc'],
    queryFn: endpoints.kycStatus,
    staleTime: 15_000,
  });

  const upload = useMutation({
    mutationFn: ({ doc, file }: { doc: 'ktp' | 'nib'; file: File }) =>
      doc === 'ktp' ? endpoints.uploadKtp(file) : endpoints.uploadNib(file),
    onSuccess: () => {
      setError('');
      qc.invalidateQueries({ queryKey: ['kyc'] });
      qc.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Dokumen gagal diunggah.'),
  });

  function pick(doc: 'ktp' | 'nib') {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setError('');
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > MAX_BYTES) {
        setError('Ukuran berkas maksimal 10 MB. Coba foto ulang dengan resolusi lebih kecil.');
        e.target.value = '';
        return;
      }
      upload.mutate({ doc, file });
      e.target.value = '';
    };
  }

  if (isLoading) {
    return (
      <div className="flex flex-col w-full max-w-md mx-auto px-gutter-mobile pt-4 pb-6">
        <Spinner />
      </div>
    );
  }
  if (!data) return null;

  // Mockup 5 = belum/parsial unggah (form KTP + NIB).
  // Mockup 6 = review/selesai (PENDING ditinjau / VERIFIED selesai).
  const isReview = data.verificationStatus === 'PENDING' || data.isVerified;
  const roleLabel = data.requiresNib ? 'Pengusaha UMKM' : 'Investor / Pemodal';

  return (
    <div className="flex flex-col w-full px-gutter-mobile pt-4 pb-6 max-w-md mx-auto">
      <div className="flex flex-col w-full pb-10">
        {isReview ? (
          <ReviewView data={data} roleLabel={roleLabel} />
        ) : (
          <FormView
            data={data}
            roleLabel={roleLabel}
            error={error}
            uploading={upload.isPending}
            onPickKtpCamera={pick('ktp')}
            onPickKtpGallery={pick('ktp')}
            onPickNib={pick('nib')}
            onCloseError={() => setError('')}
          />
        )}

        <Link
          to="/app/profile"
          className="mt-space-md w-full h-[52px] rounded-xl bg-surface-container-lowest text-primary font-label-lg text-label-lg font-bold flex items-center justify-center gap-space-xs border border-surface-container-high/60 shadow-sm active:scale-[0.98] transition-transform"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          <span>Kembali ke profil</span>
        </Link>
      </div>
    </div>
  );
}

type Kyc = Awaited<ReturnType<typeof endpoints.kycStatus>>;

/* ---------------- Indikator progres gaya Mockup 6 ---------------- */

function ProgressHeader({
  roleLabel,
  stepLabel,
  barClass,
}: {
  roleLabel: string;
  stepLabel: string;
  barClass: string;
}) {
  return (
    <div className="w-full pt-1 pb-2">
      <div className="flex items-center justify-between gap-space-xs mb-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high/80 text-on-surface text-label-sm font-semibold">
          <span className="w-2 h-2 rounded-full bg-secondary"></span>
          <span>{roleLabel}</span>
        </div>
        <span className="text-on-surface-variant font-medium text-label-sm">{stepLabel}</span>
      </div>
      <div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden">
        <div
          className={`bg-primary-container h-full rounded-full transition-all duration-500 ${barClass}`}
        ></div>
      </div>
    </div>
  );
}

/* ---------------- Mockup 5: form unggah ---------------- */

function FormView({
  data,
  roleLabel,
  error,
  uploading,
  onPickKtpCamera,
  onPickKtpGallery,
  onPickNib,
  onCloseError,
}: {
  data: Kyc;
  roleLabel: string;
  error: string;
  uploading: boolean;
  onPickKtpCamera: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPickKtpGallery: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPickNib: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCloseError: () => void;
}) {
  const tone = VERIFICATION_TONE[data.verificationStatus];
  const ktpDone = Boolean(data.ktpUrl);
  const nibDone = data.requiresNib ? Boolean(data.nibUrl) : true;
  const docsComplete = ktpDone && nibDone;
  const locked = uploading;
  const rejected = data.verificationStatus === 'REJECTED';

  return (
    <>
      <ProgressHeader roleLabel={roleLabel} stepLabel="Langkah 2 dari 3" barClass="w-2/3" />

      {/* Banner status */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm mb-space-lg border border-surface-container-high/50">
        <div className="flex items-start gap-space-sm">
          <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center shrink-0 mt-0.5">
            <span
              className={`material-symbols-outlined text-[20px] ${rejected ? 'text-error' : 'text-secondary'}`}
            >
              {rejected ? 'error' : 'hourglass_top'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-1.5 ${TONE_PILL[tone]}`}
            >
              <span className={`w-2 h-2 rounded-full ${TONE_DOT[tone]}`}></span>
              <span className="font-label-sm text-label-sm font-bold">
                Status: {VERIFICATION_LABEL[data.verificationStatus]}
              </span>
            </div>
            {rejected && data.rejectReason ? (
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                <b>Perlu diperbaiki:</b> {data.rejectReason} Unggah ulang dokumennya, lalu akan
                ditinjau lagi.
              </p>
            ) : (
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Dokumen Anda akan divalidasi oleh sistem kurasi legalitas sebelum pencairan modal
                dibuka.
              </p>
            )}
            {data.kycSubmittedAt && (
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                Diajukan {formatTanggal(data.kycSubmittedAt)} — antrean diproses urut waktu
                pengajuan.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Judul */}
      <div className="mb-space-xl">
        <h1 className="font-headline-md text-headline-md text-primary tracking-tight font-bold mb-space-xs">
          Verifikasi Identitas &amp; Usaha
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Langkah wajib berstandar perbankan untuk memastikan keamanan transaksi pemodalan bersama
          mitra investor terdaftar.
        </p>
      </div>

      {/* Section 1: e-KTP */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm mb-space-xl border border-surface-container-high/50">
        <div className="flex items-center justify-between mb-space-sm">
          <div className="flex items-center gap-space-xs">
            <span className="font-title-md text-title-md text-primary font-bold">
              Foto e-KTP Pemilik Usaha
            </span>
            <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
              Wajib
            </span>
          </div>
          <span className="material-symbols-outlined text-secondary text-[20px]">
            {ktpDone ? 'check_circle' : 'badge'}
          </span>
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
          Pastikan e-KTP asli tidak buram, keempat sudut berada dalam bingkai, dan tanpa pantulan
          kilau lampu.
        </p>
        <label
          htmlFor="ktp-camera-input"
          className="relative rounded-xl p-space-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 bg-surface-container-low hover:bg-surface-container active:scale-[0.99] border-2 border-dashed border-surface-tint"
        >
          <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-secondary mb-space-sm shadow-sm">
            <span className="material-symbols-outlined text-[30px]">
              {ktpDone ? 'check_circle' : 'photo_camera'}
            </span>
          </div>
          <span className="font-label-lg text-label-lg text-primary font-bold mb-1">
            {ktpDone ? 'e-KTP Terunggah' : 'Ambil Foto e-KTP Asli'}
          </span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            {ktpDone
              ? 'Ketuk untuk mengganti berkas (PDF/JPG/PNG/WebP, maks. 10 MB)'
              : 'Ketuk untuk membuka kamera smartphone'}
          </span>
        </label>
        <input
          id="ktp-camera-input"
          type="file"
          accept={ACCEPT}
          capture="environment"
          className="hidden"
          onChange={onPickKtpCamera}
          disabled={locked}
        />
        <input
          id="ktp-gallery-input"
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={onPickKtpGallery}
          disabled={locked}
        />
        <div className="grid grid-cols-3 gap-space-xs mt-space-md">
          <div className="bg-surface-container-low rounded-lg p-2 text-center">
            <span className="material-symbols-outlined text-secondary text-[18px] block mb-1">
              crop_free
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant block">
              4 Sudut Rata
            </span>
          </div>
          <div className="bg-surface-container-low rounded-lg p-2 text-center">
            <span className="material-symbols-outlined text-secondary text-[18px] block mb-1">
              light_mode
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant block">
              Cahaya Jelas
            </span>
          </div>
          <div className="bg-surface-container-low rounded-lg p-2 text-center">
            <span className="material-symbols-outlined text-secondary text-[18px] block mb-1">
              visibility
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant block">
              Teks Terbaca
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-space-sm mt-space-md">
          <label
            htmlFor="ktp-camera-input"
            className="h-11 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary flex items-center justify-center gap-1.5 transition-colors font-label-md text-label-md font-bold cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">photo_camera</span>
            Kamera Langsung
          </label>
          <label
            htmlFor="ktp-gallery-input"
            className="h-11 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary flex items-center justify-center gap-1.5 transition-colors font-label-md text-label-md font-bold cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">image</span>
            Unggah Galeri
          </label>
        </div>
      </div>

      {/* Section 2: NIB / Legalitas Usaha */}
      {data.requiresNib && (
        <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm mb-space-xl border border-surface-container-high/50">
          <div className="flex items-center justify-between mb-space-sm">
            <div className="flex items-center gap-space-xs">
              <span className="font-title-md text-title-md text-primary font-bold">
                Nomor Induk Berusaha (NIB)
              </span>
              <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm">
                UMKM
              </span>
            </div>
            <span className="material-symbols-outlined text-secondary text-[20px]">
              {nibDone ? 'task_alt' : 'verified_user'}
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
            Unggah sertifikat resmi NIB dari OSS atau Izin Usaha Mikro Kecil (IUMK) berformat PDF
            atau foto lembar pertama.
          </p>
          <label
            htmlFor="nib-file-input"
            className="relative rounded-xl p-space-lg flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 bg-surface-container-low hover:bg-surface-container active:scale-[0.99] border-2 border-dashed border-surface-tint"
          >
            <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-secondary mb-space-xs shadow-sm">
              <span className="material-symbols-outlined text-[26px]">
                {nibDone ? 'task' : 'file_present'}
              </span>
            </div>
            <span className="font-label-lg text-label-lg text-primary font-bold mb-1">
              {nibDone ? 'Dokumen NIB Terlampir' : 'Unggah Dokumen NIB / OSS'}
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              {nibDone
                ? 'Ketuk untuk mengganti berkas (PDF/JPG/PNG/WebP, maks. 10 MB)'
                : 'Format PDF, JPG, atau PNG (Maks. 10 MB)'}
            </span>
          </label>
          <input
            id="nib-file-input"
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={onPickNib}
            disabled={locked}
          />
          <label className="flex items-start gap-space-sm mt-space-md p-space-sm rounded-lg bg-surface-container-low cursor-pointer hover:bg-surface-container transition-colors">
            <div className="relative flex items-center justify-center mt-0.5">
              <input defaultChecked className="sr-only peer" type="checkbox" />
              <div className="w-5 h-5 rounded bg-surface-container-lowest peer-checked:bg-primary transition-colors flex items-center justify-center border border-outline-variant">
                <span className="material-symbols-outlined text-on-primary text-[16px]">check</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-label-md text-label-md text-primary font-semibold block">
                Saya memiliki 13 digit NIB resmi
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                Terdaftar di sistem OSS Kementerian Investasi / BKPM RI
              </span>
            </div>
          </label>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-space-lg px-3.5 py-3 rounded-xl bg-error-container border border-error/20 text-[12px] font-semibold text-on-error-container flex items-start gap-2"
        >
          <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={onCloseError}
            aria-label="Tutup"
            className="shrink-0 active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* Reassurance */}
      <div className="bg-surface-container-low rounded-2xl p-space-md mb-space-2xl border border-surface-container-high/50">
        <div className="flex items-start gap-space-sm">
          <span className="material-symbols-outlined text-secondary text-[22px] shrink-0 mt-0.5">
            shield_lock
          </span>
          <div className="flex-1 min-w-0">
            <span className="font-label-md text-label-md text-primary font-bold block mb-1">
              Verifikasi Kilat 1x24 Jam Kerja
            </span>
            <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
              Seluruh berkas diproteksi enkripsi TLS 256-bit dan diaudit oleh tim kurasi internal
              Modalin. Anda dapat tetap melengkapi profil etalase toko selama verifikasi
              berlangsung.
            </p>
          </div>
        </div>
      </div>

      {/* Aksi */}
      <div className="mt-auto pt-space-md flex flex-col gap-space-md">
        {uploading ? (
          <button
            type="button"
            disabled
            className="w-full h-[52px] rounded-xl bg-primary-container text-on-primary font-label-lg text-label-lg font-bold flex items-center justify-center gap-space-xs transition-all shadow-md disabled:opacity-70"
          >
            <span className="material-symbols-outlined text-[20px] animate-spin">sync</span>
            <span>Mengirim Berkas Legalitas...</span>
          </button>
        ) : docsComplete ? (
          <Link
            to="/app/beranda"
            className="w-full h-[52px] rounded-xl bg-primary-container text-on-primary font-label-lg text-label-lg font-bold flex items-center justify-center gap-space-xs transition-all shadow-md active:scale-[0.98]"
          >
            <span>Kirim Dokumen &amp; Selesaikan</span>
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </Link>
        ) : (
          <button
            type="button"
            disabled
            title="Lengkapi dokumen di atas dulu"
            className="w-full h-[52px] rounded-xl bg-primary-container text-on-primary font-label-lg text-label-lg font-bold flex items-center justify-center gap-space-xs transition-all shadow-md disabled:opacity-60"
          >
            <span>Kirim Dokumen &amp; Selesaikan</span>
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </button>
        )}
        {data.requiresNib && (
          <div className="text-center">
            <a
              className="inline-flex items-center gap-1 font-label-md text-label-md text-secondary hover:underline"
              href="https://oss.go.id"
              target="_blank"
              rel="noreferrer"
            >
              <span className="material-symbols-outlined text-[16px]">help</span>
              <span>Belum memiliki NIB? Buka Panduan Kilat UMKM</span>
            </a>
          </div>
        )}
      </div>
    </>
  );
}

/* ---------------- Mockup 6: review / selesai ---------------- */

function ReviewView({ data, roleLabel }: { data: Kyc; roleLabel: string }) {
  const tone = VERIFICATION_TONE[data.verificationStatus];
  const verified = data.isVerified;
  const ktpDone = Boolean(data.ktpUrl);
  const nibDone = data.requiresNib ? Boolean(data.nibUrl) : true;

  return (
    <>
      <ProgressHeader roleLabel={roleLabel} stepLabel="Langkah 3 dari 3" barClass="w-full" />

      <div className="flex flex-col gap-space-md pb-space-4xl">
        {/* Kartu status utama */}
        <div className="relative overflow-hidden rounded-2xl bg-surface-container-lowest p-space-md shadow-sm border border-surface-container-high/50">
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-secondary-container/30 pointer-events-none"></div>
          <div className="flex items-start gap-space-md">
            <div className="relative shrink-0 w-14 h-14 rounded-2xl bg-primary-container flex items-center justify-center text-secondary-fixed shadow-md">
              <span className="material-symbols-outlined text-[30px]">verified_user</span>
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-secondary-fixed text-on-secondary-fixed text-[12px] font-bold ring-2 ring-surface-container-lowest">
                <span className="material-symbols-outlined text-[14px]">
                  {verified ? 'check' : 'hourglass_top'}
                </span>
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
                  <span className="material-symbols-outlined text-[13px] text-secondary">tag</span>
                  <span>
                    {data.kycSubmittedAt
                      ? `Diajukan ${formatTanggal(data.kycSubmittedAt)}`
                      : VERIFICATION_LABEL[data.verificationStatus]}
                  </span>
                </div>
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full ${TONE_PILL[tone]}`}
                >
                  <span className={`w-2 h-2 rounded-full ${TONE_DOT[tone]}`}></span>
                  <span className="font-label-sm text-label-sm font-bold">
                    Status: {VERIFICATION_LABEL[data.verificationStatus]}
                  </span>
                </div>
              </div>
              <h2 className="font-headline-sm text-headline-sm text-primary leading-snug">
                {verified
                  ? 'Akunmu Sudah Terverifikasi!'
                  : 'Berkas Identitas & Usaha Berhasil Dikirim!'}
              </h2>
            </div>
          </div>
          <div className="mt-space-md p-3 rounded-xl bg-surface-container-low flex items-center gap-space-xs border border-surface-container-high/40">
            <span className="material-symbols-outlined text-secondary shrink-0 text-[18px]">
              {verified ? 'check_circle' : 'published_with_changes'}
            </span>
            <p className="font-label-md text-label-md text-on-secondary-fixed-variant">
              {verified
                ? 'Terverifikasi — Badge tampil di profil dan kartu peluangmu'
                : 'Sedang Ditinjau Tim Kurasi Legalitas Modalin (Maks. 1x24 Jam Kerja)'}
            </p>
          </div>
          {verified ? (
            <p className="mt-space-sm font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
              Akunmu sudah terverifikasi. Badge Terverifikasi kini tampil di profil dan kartu
              peluangmu.
            </p>
          ) : (
            <p className="mt-space-sm font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
              Sesuai standar kepatuhan OJK &amp; UU ITE, verifikasi e-KTP dan NIB Anda sedang
              divalidasi otomatis untuk membuka akses penuh transaksi pembiayaan dan menyematkan
              lencana <span className="text-secondary font-semibold">Terverifikasi</span> pada
              profil usaha Anda. Dokumenmu sedang ditinjau admin. Antrean diproses urut waktu
              pengajuan.
            </p>
          )}
        </div>

        {/* Skor Kepercayaan Awal */}
        <div className="rounded-2xl bg-surface-container-lowest p-space-md shadow-sm border border-surface-container-high/50 flex flex-col gap-space-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-xs">
              <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[18px]">speed</span>
              </div>
              <div>
                <h3 className="font-title-md text-title-md text-primary">Skor Kepercayaan Awal</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Pratinjau Modalin Trust Index (FR-03)
                </p>
              </div>
            </div>
          </div>
          <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col items-center justify-center relative overflow-hidden">
            <div className="flex items-baseline gap-1">
              <span className="font-currency-display text-currency-display text-primary tracking-tight">
                65
              </span>
              <span className="font-title-md text-title-md text-on-surface-variant">/ 100</span>
            </div>
            <span className="font-label-md text-label-md text-secondary font-semibold mt-0.5">
              Cukup Kredibel — Menunggu Validasi KYC
            </span>
            <div className="w-full mt-space-sm bg-surface-container-highest h-2 rounded-full overflow-hidden flex">
              <div className="bg-secondary h-full rounded-full transition-all duration-700 w-[65%]"></div>
              <div className="bg-secondary-fixed h-full rounded-full opacity-60 transition-all duration-700 w-[30%]"></div>
            </div>
            <div className="w-full flex justify-between items-center mt-1">
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                Dasar (65)
              </span>
              <span className="font-label-sm text-label-sm text-secondary font-semibold">
                Target Pasca-KYC (95)
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-space-xs">
            <div className="flex items-start gap-space-xs p-space-xs rounded-lg bg-surface-bright border border-surface-container-high/40">
              <span className="material-symbols-outlined text-secondary text-[20px] shrink-0 mt-0.5">
                check_circle
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <span className="font-label-md text-label-md text-primary font-semibold">
                    Kelengkapan Data Diri
                  </span>
                  <span className="font-label-sm text-label-sm text-secondary font-bold">
                    +35 Poin
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Status: 100% Tercapai &amp; sinkron dengan profil pemilik
                </p>
              </div>
            </div>
            <div className="flex items-start gap-space-xs p-space-xs rounded-lg bg-surface-container-low border border-surface-container-high/40">
              <span className="material-symbols-outlined text-on-surface-variant text-[20px] shrink-0 mt-0.5">
                pending
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <span className="font-label-md text-label-md text-primary font-semibold">
                    Dokumen KYC (KTP &amp; NIB)
                  </span>
                  <span className="font-label-sm text-label-sm text-on-secondary-container font-bold">
                    +30 Poin Menunggu
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Menunggu verifikasi verifikator untuk mengaktifkan poin
                </p>
              </div>
            </div>
            <div className="flex items-start gap-space-xs p-space-xs rounded-lg bg-surface-bright border border-surface-container-high/40">
              <span className="material-symbols-outlined text-outline text-[20px] shrink-0 mt-0.5">
                hotel_class
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <span className="font-label-md text-label-md text-primary font-semibold">
                    Riwayat Kemitraan &amp; Rating
                  </span>
                  <span className="font-label-sm text-label-sm text-outline font-bold">
                    0 Transaksi
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Akumulasi bertambah seiring penyelesaian putaran modal usaha
                </p>
              </div>
            </div>
          </div>
          <div className="p-space-xs rounded-xl bg-secondary-container/30 flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-secondary text-[18px]">
              tips_and_updates
            </span>
            <p className="font-label-sm text-label-sm text-on-secondary-fixed-variant">
              Skor akan otomatis melesat ke <strong>85+</strong> begitu berkas NIB dan KTP
              tervalidasi oleh sistem.
            </p>
          </div>
        </div>

        {/* Rangkuman Berkas Terunggah */}
        <div className="rounded-2xl bg-surface-container-lowest p-space-md shadow-sm border border-surface-container-high/50 flex flex-col gap-space-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-title-md text-title-md text-primary">Rangkuman Berkas Terunggah</h3>
            <span className="font-label-sm text-label-sm text-secondary bg-secondary-fixed/40 px-2.5 py-0.5 rounded-full font-bold">
              Tersimpan Aman
            </span>
          </div>
          <div className="flex flex-col gap-space-xs">
            <div className="flex items-center gap-space-xs p-space-xs rounded-xl bg-surface-container-low border border-surface-container-high/40">
              <div className="w-10 h-10 rounded-lg bg-primary-container text-on-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">badge</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-label-md text-label-md text-primary truncate font-semibold">
                    {ktpDone ? 'e-KTP Terunggah' : 'e-KTP Belum diunggah'}
                  </p>
                  {ktpDone && (
                    <span className="material-symbols-outlined text-secondary text-[16px]">
                      lock
                    </span>
                  )}
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  e-KTP Pemilik — Enkripsi AES-256
                </p>
              </div>
              <span
                className={`material-symbols-outlined text-[20px] ${ktpDone ? 'text-secondary' : 'text-on-surface-variant'}`}
              >
                {ktpDone ? 'task_alt' : 'pending'}
              </span>
            </div>
            {data.requiresNib && (
              <div className="flex items-center gap-space-xs p-space-xs rounded-xl bg-surface-container-low border border-surface-container-high/40">
                <div className="w-10 h-10 rounded-lg bg-primary-container text-on-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">description</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-label-md text-label-md text-primary truncate font-semibold">
                      {nibDone ? 'Dokumen NIB Terlampir' : 'Dokumen NIB Belum diunggah'}
                    </p>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    OSS Indonesia — 13 Digit Valid
                  </p>
                </div>
                <span
                  className={`material-symbols-outlined text-[20px] ${nibDone ? 'text-secondary' : 'text-on-surface-variant'}`}
                >
                  {nibDone ? 'task_alt' : 'pending'}
                </span>
              </div>
            )}
            <div className="flex items-center gap-space-xs p-space-xs rounded-xl bg-surface-container-low border border-surface-container-high/40">
              <div className="w-10 h-10 rounded-lg bg-primary-container text-on-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">schedule</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-label-md text-label-md text-primary truncate font-semibold">
                    {data.kycSubmittedAt
                      ? `Diajukan ${formatTanggal(data.kycSubmittedAt)}`
                      : 'Menunggu antrean'}
                  </p>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  {verified
                    ? 'Disetujui admin verifikasi'
                    : 'Antrean diproses urut waktu pengajuan'}
                </p>
              </div>
              <span className="material-symbols-outlined text-secondary text-[20px]">
                {verified ? 'task_alt' : 'hourglass_top'}
              </span>
            </div>
          </div>
        </div>

        {/* Sambil menunggu */}
        <div className="rounded-2xl bg-surface-container p-space-md flex flex-col gap-space-md border border-surface-container-high/60">
          <div className="flex items-start gap-space-xs">
            <span className="material-symbols-outlined text-secondary text-[22px] shrink-0 mt-0.5">
              storefront
            </span>
            <div className="flex-1">
              <h4 className="font-title-md text-title-md text-primary font-bold">
                Sambil Menunggu Peninjauan
              </h4>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 leading-relaxed">
                Anda tetap dapat menjelajahi peluang investasi, melengkapi etalase produk, serta
                merapikan proyeksi omzet usaha Anda agar semakin menarik di mata calon pemodal.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-space-xs">
            <Link
              to="/app/beranda"
              className="w-full h-[52px] rounded-xl bg-primary-container text-on-primary font-label-lg text-label-lg font-bold flex items-center justify-center gap-space-xs active:scale-[0.98] transition-transform shadow-md"
            >
              <span>{data.requiresNib ? 'Lanjut ke Dashboard Pengusaha' : 'Lanjut ke Dashboard'}</span>
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </Link>
            <Link
              to={data.requiresNib ? '/app/profile/edit' : '/app/preferensi/edit'}
              className="w-full h-[52px] rounded-xl bg-surface-container-lowest text-primary font-label-lg text-label-lg font-bold flex items-center justify-center gap-space-xs active:scale-[0.98] transition-transform shadow-sm border border-surface-container-high/60"
            >
              <span className="material-symbols-outlined text-secondary text-[20px]">
                add_photo_alternate
              </span>
              <span>
                {data.requiresNib ? 'Lengkapi Portofolio & Foto Usaha' : 'Lengkapi Preferensi Investasi'}
              </span>
            </Link>
          </div>
        </div>

        <div className="flex items-center justify-center gap-space-2xs text-center px-space-sm pt-space-xs">
          <span className="material-symbols-outlined text-outline text-[16px]">verified</span>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Seluruh data identitas diproteksi enkripsi TLS &amp; disimpan di server tersertifikasi
            ISO 27001.
          </p>
        </div>
      </div>
    </>
  );
}
