import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COOPERATION_LABEL, endpoints } from '../lib/api';
import { Avatar } from '../components/ui/Avatar';
import { Icon } from '../components/ui/Icon';
import { Notice, EmptyState, Spinner, Stars, Field } from '../components/ui';
import { formatRupiah } from '../lib/format';

/**
 * Modul 7 — FR-12.
 *
 * Dua gerbangnya ditegakkan di server: hanya kerja sama berstatus COMPLETED
 * yang bisa dinilai, dan satu pemberi hanya boleh menilai sekali. Halaman ini
 * mengambil daftar dari /api/ratings/pending, jadi yang muncul memang yang
 * benar-benar boleh dinilai.
 */

export function RatingPage() {
  const { agreementId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [score, setScore] = useState(0);
  const [review, setReview] = useState('');
  const [error, setError] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['pending-ratings'],
    queryFn: endpoints.pendingRatings,
    staleTime: 15_000,
  });

  const target = agreementId ? data?.find((row) => row.agreementId === agreementId) : undefined;

  const submit = useMutation({
    mutationFn: () => endpoints.rate(agreementId!, { score, review: review.trim() || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pending-ratings'] });
      qc.invalidateQueries({ queryKey: ['agreements'] });
      qc.invalidateQueries({ queryKey: ['profile'] });
      navigate('/app/agreements');
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Gagal mengirim ulasan.'),
  });

  if (isLoading) return <Spinner />;
  if (isError) {
    return (
      <div className="shell">
        <EmptyState icon="warning" title="Gagal memuat" message="Coba lagi sebentar lagi." />
      </div>
    );
  }

  // Tanpa id: tampilkan daftar kerja sama yang menunggu ulasan.
  if (!agreementId) {
    const rows = data ?? [];
    return (
      <div className="shell page-bottom">
        <div className="page-head">
          <h1>Beri ulasan</h1>
          <p>Ulasanmu memperbarui skor kepercayaan mitra.</p>
        </div>
        {rows.length === 0 ? (
          <EmptyState
            icon="star"
            title="Belum ada yang perlu diulas"
            message="Ulasan bisa diberikan setelah kerja sama ditandai selesai."
            action={
              <Link className="btn btn-outline" to="/app/agreements">
                Lihat kesepakatan
              </Link>
            }
          />
        ) : (
          <div className="stack">
            {rows.map((row) => (
              <Link className="row-link" to={`/app/rating/${row.agreementId}`} key={row.agreementId}>
                <Avatar name={row.partner.fullName ?? 'Mitra'} seed={row.partner.id} size="md" />
                <div className="row-main">
                  <div className="row-title">{row.partner.fullName ?? 'Mitra'}</div>
                  <div className="row-sub">
                    {row.agreementNumber} · {COOPERATION_LABEL[row.cooperationType]} ·{' '}
                    <span data-money>{formatRupiah(row.amount)}</span>
                  </div>
                </div>
                <span className="badge badge-primary">Ulas</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!target) {
    return (
      <div className="shell">
        <EmptyState
          icon="check"
          title="Kerja sama ini tidak bisa diulas"
          message="Mungkin belum selesai, atau kamu sudah pernah memberi ulasan untuknya."
          action={
            <Link className="btn btn-outline" to="/app/agreements">
              Kembali
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="shell page-bottom">
      <div style={{ padding: '14px 0' }}>
        <Link className="back-btn" to="/app/agreements" aria-label="Kembali ke perjanjian">
          <Icon name="chevron" size={20} className="flip-x" />
        </Link>
      </div>

      <div className="card card-pad stack">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar name={target.partner.fullName ?? 'Mitra'} seed={target.partner.id} size="lg" />
          <div>
            <h2>{target.partner.fullName ?? 'Mitra'}</h2>
            <div className="opp-meta">
              {target.agreementNumber} · {COOPERATION_LABEL[target.cooperationType]} ·{' '}
              <span data-money>{formatRupiah(target.amount)}</span>
            </div>
          </div>
        </div>

        {error && <Notice tone="error" onClose={() => setError('')}>{error}</Notice>}

        <Field label="Seberapa puas kamu dengan kerja sama ini?">
          <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
            <Stars value={score} onChange={setScore} />
          </div>
        </Field>

        <Field label="Ceritakan pengalamanmu (opsional)" hint="Ulasan yang jujur membantu pengguna lain menilai.">
          <textarea
            className="textarea"
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="mis. pelaporan rapi dan tepat waktu"
            maxLength={2000}
          />
        </Field>

        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={score < 1 || submit.isPending}
          onClick={() => submit.mutate()}
        >
          {submit.isPending ? 'Mengirim…' : 'Kirim ulasan'}
        </button>
        {score < 1 && <p className="field-hint">Pilih dulu jumlah bintangnya.</p>}
      </div>
    </div>
  );
}
