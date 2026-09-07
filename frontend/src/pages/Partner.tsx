import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  COOPERATION_LABEL,
  endpoints,
  VERIFICATION_LABEL,
  type CooperationType,
  type Sector,
  type VerificationStatus,
} from '../lib/api';
import { Avatar } from '../components/ui/Avatar';
import { Icon } from '../components/ui/Icon';
import { Spinner, EmptyState, Notice, Stars, Badge, VERIFICATION_TONE } from '../components/ui';
import { formatRupiah, formatTanggal } from '../lib/format';
import { readSession } from '../lib/session';

/**
 * Detail mitra — layar detail_profil_investor / profil UMKM di Stitch.
 * Di sinilah FR-14 dimulai: tombol "Kirim Ketertarikan" membuat Connection
 * berstatus PENDING. Ruang chat baru terbuka kalau penerima menyetujuinya.
 */

type PublicProfile = {
  id: string;
  role: 'UMKM' | 'INVESTOR' | 'ADMIN';
  createdAt: string;
  isVerified: boolean;
  averageRating: number | null;
  ratingCount: number;
  profile: {
    fullName: string;
    avatarUrl: string | null;
    bio: string | null;
    location: string | null;
    trustScore: number;
    verificationStatus: VerificationStatus;
  };
  business: {
    id: string;
    name: string;
    description: string;
    location: string;
    establishedYear: number | null;
    employeeCount: number | null;
    sector: Sector;
    fundingRequests: {
      id: string;
      title: string;
      targetAmount: string | number;
      purpose: string;
      cooperationTypes: CooperationType[];
      tenorMonths: number | null;
      estimatedRoi: string | number | null;
    }[];
  } | null;
  investorPreference: {
    minimumAmount: string | number;
    maximumAmount: string | number;
    preferredLocation: string | null;
    cooperationTypes: CooperationType[];
    preferredSector: Sector | null;
  } | null;
  portfolios: { id: string; title: string; description: string | null; fileUrl: string; createdAt: string }[];
  ratingsReceived: {
    score: number;
    review: string | null;
    createdAt: string;
    reviewer: { profile: { fullName: string; avatarUrl: string | null } | null };
  }[];
};

export function PartnerPage() {
  const { id = '' } = useParams();
  const session = readSession();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['partner', id],
    queryFn: () => endpoints.publicProfile(id) as Promise<PublicProfile>,
    enabled: Boolean(id),
  });

  const { data: connections } = useQuery({ queryKey: ['connections'], queryFn: endpoints.connections });

  if (isLoading) return <Spinner />;
  if (isError || !data) {
    return (
      <div className="shell">
        <EmptyState icon="search" title="Mitra tidak ditemukan" message="Profil ini mungkin sudah tidak tersedia." />
      </div>
    );
  }

  const isSelf = data.id === session?.id;
  const existing = connections?.find((c) => c.senderId === data.id || c.receiverId === data.id);
  const funding = data.business?.fundingRequests ?? [];

  return (
    <div className="shell page-bottom">
      <div style={{ padding: '14px 0' }}>
        {/* Kembali ke halaman asal — dari Rekomendasi/Beranda dulu selalu terlempar ke Cari */}
        <button type="button" className="back-btn" onClick={() => navigate(-1)} aria-label="Kembali">
          <Icon name="chevron" size={20} className="flip-x" />
        </button>
      </div>

      {/* Panel kepercayaan di atas kartu, sesuai Trust Banner di DESIGN.md */}
      <div className="card card-pad stack">
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Avatar name={data.profile.fullName} seed={data.id} size="lg" />
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 className="partner-name">{data.profile.fullName}</h1>
            <div className="opp-meta">
              <span className="badge badge-primary">
                {data.role === 'UMKM' ? 'Pengusaha' : 'Pemodal'}
              </span>
              <Badge tone={VERIFICATION_TONE[data.profile.verificationStatus]}>
                {VERIFICATION_LABEL[data.profile.verificationStatus]}
              </Badge>
              {data.profile.location && (
                <span className="meta-item">
                  <Icon name="location" size={14} />
                  {data.profile.location}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="num-grid">
          <div>
            <small>Skor Kepercayaan</small>
            <b data-money>{data.profile.trustScore}/100</b>
          </div>
          <div>
            <small>Rata-rata Ulasan</small>
            <b data-money>{data.averageRating ? data.averageRating.toFixed(1) : '—'}</b>
          </div>
          <div>
            <small>Bergabung</small>
            <b>{formatTanggal(data.createdAt)}</b>
          </div>
        </div>

        {data.profile.bio && <p className="opp-desc">{data.profile.bio}</p>}
      </div>

      {/* Sisi UMKM: usaha dan permintaan pendanaan */}
      {data.business && (
        <>
          <div className="section-head">
            <h2>Tentang usaha</h2>
          </div>
          <div className="card card-pad stack">
            <div>
              <h3>{data.business.name}</h3>
              <div className="opp-meta">
                <span className="badge badge-primary">{data.business.sector.name}</span>
                <span className="meta-item">
                  <Icon name="location" size={14} />
                  {data.business.location}
                </span>
                {data.business.establishedYear && <span>· berdiri {data.business.establishedYear}</span>}
                {data.business.employeeCount && <span>· {data.business.employeeCount} pekerja</span>}
              </div>
            </div>
            <p className="opp-desc">{data.business.description}</p>
          </div>

          {funding.length > 0 && (
            <>
              <div className="section-head">
                <h2>Kebutuhan pendanaan</h2>
              </div>
              <div className="stack">
                {funding.map((request) => (
                  <div className="card card-pad stack" key={request.id}>
                    <h3>{request.title}</h3>
                    <p className="opp-desc">{request.purpose}</p>
                    <div className="chip-row">
                      {request.cooperationTypes.map((type) => (
                        <span key={type} className="chip">
                          {COOPERATION_LABEL[type]}
                        </span>
                      ))}
                    </div>
                    <div className="num-grid">
                      <div>
                        <small>Target Modal</small>
                        <b data-money>{formatRupiah(Number(request.targetAmount))}</b>
                      </div>
                      <div>
                        <small>Tenor</small>
                        <b data-money>{request.tenorMonths ? `${request.tenorMonths} bln` : '—'}</b>
                      </div>
                      <div>
                        <small>Estimasi ROI</small>
                        <b data-money>{request.estimatedRoi != null ? `${Number(request.estimatedRoi)}%` : '—'}</b>
                      </div>
                    </div>
                    {!isSelf && (
                      <InterestButton
                        receiverId={data.id}
                        fundingRequestId={request.id}
                        existingStatus={existing?.status}
                      />
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Sisi investor: fokus investasi */}
      {data.investorPreference && (
        <>
          <div className="section-head">
            <h2>Fokus investasi</h2>
          </div>
          <div className="card card-pad stack">
            <div className="chip-row">
              {data.investorPreference.cooperationTypes.map((type) => (
                <span key={type} className="chip">
                  {COOPERATION_LABEL[type]}
                </span>
              ))}
            </div>
            <div className="num-grid">
              <div>
                <small>Rentang Dana</small>
                <b data-money>
                  {formatRupiah(Number(data.investorPreference.minimumAmount))} –{' '}
                  {formatRupiah(Number(data.investorPreference.maximumAmount))}
                </b>
              </div>
              <div>
                <small>Sektor</small>
                <b>{data.investorPreference.preferredSector?.name ?? 'Semua'}</b>
              </div>
              <div>
                <small>Lokasi</small>
                <b>{data.investorPreference.preferredLocation ?? 'Fleksibel'}</b>
              </div>
            </div>
            {!isSelf && <InterestButton receiverId={data.id} existingStatus={existing?.status} />}
          </div>
        </>
      )}

      {/* Rekam jejak */}
      {data.portfolios.length > 0 && (
        <>
          <div className="section-head">
            <h2>Rekam jejak</h2>
          </div>
          <div className="stack">
            {data.portfolios.map((item) => (
              <div className="card card-pad" key={item.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong>{item.title}</strong>
                    {item.description && <p className="note">{item.description}</p>}
                  </div>
                  <a className="btn btn-soft btn-sm" href={item.fileUrl} target="_blank" rel="noopener noreferrer">
                    Lihat
                  </a>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Ulasan sebagai bahan due diligence */}
      {data.ratingsReceived.length > 0 && (
        <>
          <div className="section-head">
            <h2>Ulasan mitra sebelumnya</h2>
            <span className="opp-meta">{data.ratingCount} ulasan</span>
          </div>
          <div className="stack">
            {data.ratingsReceived.map((rating, i) => (
              <div className="card card-pad" key={i}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar name={rating.reviewer.profile?.fullName ?? 'Mitra'} seed={String(i)} size="sm" />
                  <div style={{ flex: 1 }}>
                    <strong>{rating.reviewer.profile?.fullName ?? 'Mitra'}</strong>
                    <div className="opp-meta">{formatTanggal(rating.createdAt)}</div>
                  </div>
                  <Stars value={rating.score} disabled />
                </div>
                {rating.review && <p className="opp-desc" style={{ marginTop: 10 }}>{rating.review}</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** FR-14 — kirim permintaan ketertarikan, status awal PENDING. */
function InterestButton({
  receiverId,
  fundingRequestId,
  existingStatus,
}: {
  receiverId: string;
  fundingRequestId?: string;
  existingStatus?: string;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const send = useMutation({
    mutationFn: () => endpoints.createConnection({ receiverId, fundingRequestId, message: message.trim() || undefined }),
    onSuccess: () => {
      setOpen(false);
      qc.invalidateQueries({ queryKey: ['connections'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
      /*
        Dulu mendarat di /app/chat, padahal ruang chat baru ada setelah mitra
        menerima — jadi pengguna selalu melihat "Belum ada percakapan" dan
        mengira pengirimannya gagal. Beranda punya konteks untuk menjelaskannya.
      */
      navigate('/app/beranda', {
        state: { notice: 'Ketertarikan terkirim. Kamu diberi tahu begitu mitra merespons.' },
      });
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Gagal mengirim ketertarikan.'),
  });

  if (existingStatus === 'PENDING') {
    return <p className="field-hint">Ketertarikanmu sudah terkirim. Menunggu respons mitra.</p>;
  }
  if (existingStatus === 'ACCEPTED') {
    return (
      <Link className="btn btn-outline btn-block" to="/app/chat">
        Buka percakapan
      </Link>
    );
  }

  return (
    <>
      <button type="button" className="btn btn-primary btn-block" onClick={() => setOpen(true)}>
        Kirim Ketertarikan
      </button>

      {open && (
        <div className="backdrop" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
          <div className="sheet stack" onClick={(e) => e.stopPropagation()}>
            <h2>Kirim ketertarikan</h2>
            <p className="field-hint">
              Mitra akan menerima pemberitahuan. Ruang percakapan terbuka setelah mereka menyetujui.
            </p>
            {error && <Notice tone="error">{error}</Notice>}
            <textarea
              className="textarea"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Perkenalkan dirimu singkat, mis. alasan tertarik dengan usaha ini."
              maxLength={500}
            />
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" className="btn btn-soft" style={{ flex: 1 }} onClick={() => setOpen(false)}>
                Batal
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={send.isPending}
                onClick={() => send.mutate()}
              >
                {send.isPending ? 'Mengirim…' : 'Kirim'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
