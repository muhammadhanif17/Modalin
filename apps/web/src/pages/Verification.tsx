import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { endpoints, VERIFICATION_LABEL } from '../lib/api';
import { Notice, Spinner, Badge, Field, VERIFICATION_TONE } from '../components/ui';
import { formatTanggal } from '../lib/format';

/**
 * FR-02 di sisi pengguna — unggah dokumen KYC lalu pantau statusnya.
 *
 * KTP wajib untuk kedua peran, NIB hanya untuk Pengusaha. Begitu syarat sesuai
 * peran terpenuhi, server memindahkan status ke PENDING dan mencatat waktunya —
 * waktu itulah yang mengurutkan antrean admin.
 *
 * Badge Terverifikasi hanya muncul setelah admin menyetujui, tidak sebelumnya.
 */

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp';

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

  if (isLoading) return <Spinner />;
  if (!data) return null;

  const steps = [Boolean(data.ktpUrl), data.requiresNib ? Boolean(data.nibUrl) : true, data.isVerified];
  const doneCount = steps.filter(Boolean).length;

  return (
    <div className="shell page-bottom">
      <div className="page-head">
        <h1>Verifikasi identitas</h1>
        <p>Akun terverifikasi lebih dipercaya mitra dan naik skor kepercayaannya.</p>
      </div>

      {/* Indikator progres, sesuai NFR Usability: form bertahap dengan progres */}
      <div className="steps" aria-label={`Langkah ${doneCount} dari 3`}>
        {steps.map((done, i) => (
          <span key={i} className={done ? 'done' : i === doneCount ? 'now' : ''} />
        ))}
      </div>

      <div className="card card-pad stack">
        <div className="opp-top">
          <div>
            <h3>Status verifikasi</h3>
            {data.kycSubmittedAt && (
              <div className="opp-meta">Diajukan {formatTanggal(data.kycSubmittedAt)}</div>
            )}
          </div>
          <Badge tone={VERIFICATION_TONE[data.verificationStatus]}>
            {VERIFICATION_LABEL[data.verificationStatus]}
          </Badge>
        </div>

        {data.verificationStatus === 'PENDING' && (
          <Notice tone="info">
            Dokumenmu sedang ditinjau admin. Antrean diproses urut waktu pengajuan.
          </Notice>
        )}
        {data.verificationStatus === 'REJECTED' && data.rejectReason && (
          <Notice tone="error">
            <b>Perlu diperbaiki:</b> {data.rejectReason} Unggah ulang dokumennya, lalu akan ditinjau lagi.
          </Notice>
        )}
        {data.isVerified && (
          <Notice tone="success">
            Akunmu sudah terverifikasi. Badge Terverifikasi kini tampil di profil dan kartu peluangmu.
          </Notice>
        )}
      </div>

      {error && <Notice tone="error" onClose={() => setError('')}>{error}</Notice>}

      <div className="stack" style={{ marginTop: 16 }}>
        <DocCard
          title="Kartu Tanda Penduduk (KTP)"
          hint="Wajib untuk semua akun. Pastikan nomor dan foto terbaca jelas."
          uploaded={Boolean(data.ktpUrl)}
          disabled={upload.isPending || data.isVerified}
          onPick={pick('ktp')}
        />
        {data.requiresNib && (
          <DocCard
            title="Nomor Induk Berusaha (NIB)"
            hint="Wajib untuk akun Pengusaha. Bisa berupa PDF dari OSS atau fotonya."
            uploaded={Boolean(data.nibUrl)}
            disabled={upload.isPending || data.isVerified}
            onPick={pick('nib')}
          />
        )}
      </div>

      <p className="field-hint" style={{ marginTop: 16 }}>
        Dokumen identitasmu disimpan terpisah dan hanya bisa dibuka olehmu dan admin verifikasi.
      </p>

      <div style={{ marginTop: 20 }}>
        <Link className="btn btn-outline btn-block" to="/app/profile">
          Kembali ke profil
        </Link>
      </div>
    </div>
  );
}

function DocCard({
  title,
  hint,
  uploaded,
  disabled,
  onPick,
}: {
  title: string;
  hint: string;
  uploaded: boolean;
  disabled: boolean;
  onPick: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="card card-pad stack">
      <div className="opp-top">
        <h3>{title}</h3>
        {uploaded && <Badge tone="success">Terunggah</Badge>}
      </div>
      <Field label={uploaded ? 'Ganti berkas' : 'Pilih berkas'} hint={hint}>
        {/* capture: di HP langsung buka kamera belakang, bukan pemilih berkas */}
        <input
          className="input"
          type="file"
          accept={ACCEPT}
          capture="environment"
          onChange={onPick}
          disabled={disabled}
        />
      </Field>
    </div>
  );
}
