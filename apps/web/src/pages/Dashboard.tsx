import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { endpoints, VERIFICATION_LABEL, type Connection } from '../lib/api';
import { Avatar } from '../components/ui/Avatar';
import { Spinner, EmptyState, Badge } from '../components/ui';
import { formatRupiah, formatTanggal } from '../lib/format';
import { readSession } from '../lib/session';

/**
 * Beranda setelah masuk — layar dashboard_pengusaha_umkm_beranda di Stitch.
 *
 * Isinya menyesuaikan peran: UMKM melihat ketertarikan yang masuk dan status
 * verifikasinya, investor melihat rekomendasi teratas. Keduanya melihat apa
 * yang masih perlu dilengkapi untuk menaikkan skor kepercayaan (FR-03).
 */
export function DashboardPage() {
  const session = readSession();
  const isInvestor = session?.role === 'INVESTOR';

  const { data: profile, isLoading } = useQuery({ queryKey: ['profile'], queryFn: endpoints.me });
  const { data: connections } = useQuery({ queryKey: ['connections'], queryFn: endpoints.connections });
  const { data: matches } = useQuery({
    queryKey: ['matches'],
    queryFn: endpoints.matches,
    enabled: isInvestor,
  });

  if (isLoading) return <Spinner />;
  if (!profile) return null;

  const incoming = (connections ?? []).filter((c) => c.direction === 'masuk' && c.status === 'PENDING');
  const breakdown = profile.trustScoreBreakdown;

  return (
    <div className="shell" style={{ paddingBottom: 30 }}>
      <div className="page-head">
        <h1>Halo, {profile.fullName.split(' ')[0]}</h1>
        <p>{isInvestor ? 'Peluang yang cocok denganmu hari ini.' : 'Ringkasan usahamu hari ini.'}</p>
      </div>

      {/* Skor kepercayaan + apa yang masih kurang */}
      <div className="card card-pad stack">
        <div className="opp-top">
          <div>
            <h3>Skor kepercayaan</h3>
            <div className="opp-meta">Dihitung dari kelengkapan profil, verifikasi, dan ulasan</div>
          </div>
          <Badge
            tone={
              profile.verificationStatus === 'VERIFIED'
                ? 'success'
                : profile.verificationStatus === 'PENDING'
                  ? 'warning'
                  : 'soft'
            }
          >
            {VERIFICATION_LABEL[profile.verificationStatus]}
          </Badge>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span data-money style={{ fontSize: 34, fontWeight: 800 }}>
            {profile.trustScore}
          </span>
          <span className="opp-meta">/ 100</span>
        </div>
        <div className="meter" aria-label={`Skor ${profile.trustScore} dari 100`}>
          <span style={{ width: `${profile.trustScore}%` }} />
        </div>

        {breakdown && breakdown.missing.length > 0 && (
          <>
            <p className="field-hint">Lengkapi ini untuk menaikkan skormu:</p>
            <ul className="reasons">
              {breakdown.missing.slice(0, 4).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </>
        )}

        {profile.verificationStatus !== 'VERIFIED' && (
          <Link className="btn btn-primary btn-block" to="/app/verifikasi">
            {profile.verificationStatus === 'REJECTED' ? 'Perbaiki dokumen' : 'Verifikasi identitas'}
          </Link>
        )}
      </div>

      {/* Ketertarikan masuk yang menunggu respons (FR-14) */}
      {incoming.length > 0 && (
        <>
          <div className="section-head">
            <h2>Menunggu responsmu</h2>
            <span className="dot">{incoming.length}</span>
          </div>
          <div className="stack">
            {incoming.map((connection) => (
              <IncomingCard key={connection.id} connection={connection} />
            ))}
          </div>
        </>
      )}

      {/* Rekomendasi teratas untuk investor */}
      {isInvestor && matches && !matches.needsPreference && matches.recommended.length > 0 && (
        <>
          <div className="section-head">
            <h2>Paling cocok untukmu</h2>
            <Link to="/app/matches" className="opp-meta">
              Lihat semua →
            </Link>
          </div>
          <div className="stack">
            {matches.recommended.slice(0, 3).map((item) => (
              <Link className="row-link" to={`/app/mitra/${item.owner.id}`} key={item.id}>
                <Avatar name={item.business.name} seed={item.owner.id} size="md" />
                <div className="row-main">
                  <div className="row-title">{item.business.name}</div>
                  <div className="row-sub">
                    {item.business.sector.name} · <span data-money>{formatRupiah(item.targetAmount)}</span>
                  </div>
                </div>
                <span className="badge badge-success">Match {item.match.score}%</span>
              </Link>
            ))}
          </div>
        </>
      )}

      {isInvestor && matches?.needsPreference && (
        <EmptyState
          icon="🎯"
          title="Atur preferensi dulu"
          message="Kami butuh kriteria investasimu untuk mencarikan mitra yang cocok."
          action={
            <Link className="btn btn-primary" to="/app/preferensi">
              Atur sekarang
            </Link>
          }
        />
      )}

      {/* Pintasan */}
      <div className="section-head">
        <h2>Pintasan</h2>
      </div>
      <div className="stack">
        <Link className="row-link" to="/app/agreements">
          <span aria-hidden="true">📝</span>
          <div className="row-main">
            <div className="row-title">Dokumen kesepakatan</div>
            <div className="row-sub">Susun, tandatangani, dan terbitkan SPK</div>
          </div>
        </Link>
        <Link className="row-link" to="/app/rekam-jejak">
          <span aria-hidden="true">📄</span>
          <div className="row-main">
            <div className="row-title">{isInvestor ? 'Rekam jejak pendanaan' : 'Berkas pendukung'}</div>
            <div className="row-sub">Unggah dokumen agar mitra lebih yakin</div>
          </div>
        </Link>
        <Link className="row-link" to="/app/pembayaran">
          <span aria-hidden="true">🧾</span>
          <div className="row-main">
            <div className="row-title">Pembayaran</div>
            <div className="row-sub">Biaya layanan dan langganan Modalin Pro</div>
          </div>
        </Link>
      </div>
    </div>
  );
}

/** FR-14 — hanya penerima yang boleh menerima atau menolak. */
function IncomingCard({ connection }: { connection: Connection }) {
  const qc = useQueryClient();
  const partner = connection.sender.profile;

  const respond = useMutation({
    mutationFn: (status: 'ACCEPTED' | 'REJECTED') => endpoints.respondConnection(connection.id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['connections'] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return (
    <div className="card card-pad stack">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar name={partner?.fullName ?? 'Mitra'} seed={connection.senderId} size="md" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong>{partner?.fullName ?? 'Mitra'}</strong>
          <div className="opp-meta">
            {connection.fundingRequest?.title ?? 'Tertarik bekerja sama'} ·{' '}
            {formatTanggal(connection.createdAt)}
          </div>
        </div>
      </div>
      {connection.message && <p className="opp-desc">“{connection.message}”</p>}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          type="button"
          className="btn btn-soft"
          style={{ flex: 1 }}
          disabled={respond.isPending}
          onClick={() => respond.mutate('REJECTED')}
        >
          Tolak
        </button>
        <button
          type="button"
          className="btn btn-primary"
          style={{ flex: 1 }}
          disabled={respond.isPending}
          onClick={() => respond.mutate('ACCEPTED')}
        >
          Terima & buka chat
        </button>
      </div>
    </div>
  );
}
