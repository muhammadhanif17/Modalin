import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { endpoints, VERIFICATION_LABEL, type VerificationStatus } from '../lib/api';
import { Avatar } from '../components/ui/Avatar';
import { Spinner, EmptyState, Notice, Badge, VERIFICATION_TONE } from '../components/ui';
import { formatTanggal } from '../lib/format';

/**
 * Panel admin — FR-02.
 *
 * Antrean diurutkan server berdasarkan waktu unggah, jadi yang paling lama
 * menunggu selalu tampil lebih dulu (ARCHITECTURE.md §2.3). Approve cukup satu
 * klik; reject wajib menyertakan alasan singkat supaya pengguna tahu apa yang
 * harus diperbaiki.
 */

const TABS: { key: VerificationStatus; label: string }[] = [
  { key: 'PENDING', label: 'Menunggu tinjauan' },
  { key: 'VERIFIED', label: 'Disetujui' },
  { key: 'REJECTED', label: 'Ditolak' },
];

export function AdminPage() {
  const [tab, setTab] = useState<VerificationStatus>('PENDING');

  const { data: stats } = useQuery({ queryKey: ['admin-stats'], queryFn: endpoints.adminStats, staleTime: 30_000 });
  const { data: queue, isLoading, isError } = useQuery({
    queryKey: ['verifications', tab],
    queryFn: () => endpoints.verificationQueue(tab),
    staleTime: 10_000,
  });

  return (
    <div className="shell page-bottom">
      <div className="page-head">
        <h1>Panel admin</h1>
        <p>Tinjau dokumen KYC dan pantau aktivitas platform.</p>
      </div>

      {stats && (
        <div className="stat-grid">
          <Stat label="Pengguna" value={stats.totalUsers} />
          <Stat label="Menunggu tinjauan" value={stats.pendingVerification} />
          <Stat label="Terverifikasi" value={stats.verified} />
          <Stat label="Peluang aktif" value={stats.activeRequests} />
          <Stat label="Koneksi diterima" value={stats.acceptedConnections} />
          <Stat label="Kesepakatan" value={stats.signedAgreements} />
        </div>
      )}

      <div className="chip-row" style={{ margin: '20px 0 12px' }} role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className="chip"
            aria-pressed={tab === t.key}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading && <Spinner />}
      {isError && <EmptyState icon="warning" title="Gagal memuat antrean" message="Coba lagi sebentar lagi." />}
      {!isLoading && !isError && (queue ?? []).length === 0 && (
        <EmptyState
          icon="check"
          title={tab === 'PENDING' ? 'Antrean kosong' : 'Belum ada data'}
          message={tab === 'PENDING' ? 'Semua dokumen sudah ditinjau.' : undefined}
        />
      )}

      <div className="stack">
        {(queue ?? []).map((row) => (
          <QueueRow key={row.userId} row={row} reviewable={tab === 'PENDING'} />
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-box">
      <b data-money>{value}</b>
      <small>{label}</small>
    </div>
  );
}

type QueueItem = Awaited<ReturnType<typeof endpoints.verificationQueue>>[number];

function QueueRow({ row, reviewable }: { row: QueueItem; reviewable: boolean }) {
  const qc = useQueryClient();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const decide = useMutation({
    mutationFn: (body: { decision: 'APPROVE' } | { decision: 'REJECT'; reason: string }) =>
      endpoints.decideVerification(row.userId, body),
    onSuccess: () => {
      setRejecting(false);
      setReason('');
      setError('');
      qc.invalidateQueries({ queryKey: ['verifications'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Gagal menyimpan keputusan.'),
  });

  return (
    <div className="card card-pad stack">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar name={row.fullName} seed={row.userId} size="md" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong>{row.fullName}</strong>
          <div className="opp-meta">
            {row.user.email} · {row.user.role === 'UMKM' ? 'Pengusaha' : 'Pemodal'}
            {row.location ? ` · ${row.location}` : ''}
          </div>
          {row.kycSubmittedAt && (
            <div className="opp-meta">Diajukan {formatTanggal(row.kycSubmittedAt)}</div>
          )}
        </div>
        <Badge tone={VERIFICATION_TONE[row.verificationStatus]}>
          {VERIFICATION_LABEL[row.verificationStatus]}
        </Badge>
      </div>

      <div className="chip-row">
        {row.ktpUrl ? (
          <a className="chip" href={row.ktpUrl} target="_blank" rel="noopener noreferrer">
            Lihat KTP
          </a>
        ) : (
          <span className="chip">KTP belum ada</span>
        )}
        {row.user.role === 'UMKM' &&
          (row.nibUrl ? (
            <a className="chip" href={row.nibUrl} target="_blank" rel="noopener noreferrer">
              Lihat NIB
            </a>
          ) : (
            <span className="chip">NIB belum ada</span>
          ))}
        <span className="chip">Skor {row.trustScore}</span>
      </div>

      {row.rejectReason && <Notice tone="error">Alasan penolakan: {row.rejectReason}</Notice>}
      {error && <Notice tone="error" onClose={() => setError('')}>{error}</Notice>}

      {reviewable && !rejecting && (
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            type="button"
            className="btn btn-soft"
            style={{ flex: 1 }}
            disabled={decide.isPending}
            onClick={() => setRejecting(true)}
          >
            Tolak
          </button>
          <button
            type="button"
            className="btn btn-primary"
            style={{ flex: 1 }}
            disabled={decide.isPending}
            onClick={() => decide.mutate({ decision: 'APPROVE' })}
          >
            {decide.isPending ? 'Menyimpan…' : 'Setujui'}
          </button>
        </div>
      )}

      {reviewable && rejecting && (
        <div className="stack">
          <textarea
            className="textarea"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Alasan penolakan, mis. foto NIB buram dan nomornya tidak terbaca."
            maxLength={500}
          />
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" className="btn btn-soft" style={{ flex: 1 }} onClick={() => setRejecting(false)}>
              Batal
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={reason.trim().length < 5 || decide.isPending}
              onClick={() => decide.mutate({ decision: 'REJECT', reason: reason.trim() })}
            >
              Kirim penolakan
            </button>
          </div>
          {reason.trim().length < 5 && <p className="field-hint">Alasan minimal 5 karakter.</p>}
        </div>
      )}
    </div>
  );
}
