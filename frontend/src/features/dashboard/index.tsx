import { useLocation, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { endpoints, type Connection, type MatchesResponse } from '../../lib/api';
import { Spinner, Notice, EmptyState } from '../../components/ui';
import { readSession } from '../../lib/session';
import { DashboardHeader } from './DashboardHeader';
import { AttentionCard } from './AttentionCard';
import { TrustScoreCard } from './TrustScoreCard';
import { TopMatches } from './TopMatches';
import { Shortcuts } from './Shortcuts';
import { IncomingCard } from './IncomingCard';

/**
 * Beranda setelah masuk — layar dashboard_pengusaha_umkm_beranda / b1 di Stitch.
 * Isinya menyesuaikan peran: UMKM melihat ketertarikan yang masuk dan status
 * verifikasinya, investor melihat rekomendasi teratas. Keduanya melihat apa
 * yang masih perlu dilengkapi untuk menaikkan skor kepercayaan (FR-03).
 */
export function DashboardPage() {
  const session = readSession();
  const location = useLocation();
  const isInvestor = session?.role === 'INVESTOR';
  const { notice, noticeTone = 'success' } =
    (location.state ?? {}) as { notice?: string; noticeTone?: 'success' | 'info' };

  const { data: profile, isLoading } = useQuery({ queryKey: ['profile'], queryFn: endpoints.me });
  const { data: connections } = useQuery({ queryKey: ['connections'], queryFn: endpoints.connections });
  const { data: matches } = useQuery({
    queryKey: ['matches'],
    queryFn: endpoints.matches,
    enabled: session?.role !== 'ADMIN',
  });

  if (isLoading) return <Spinner />;
  if (!profile) return null;

  const incoming = (connections ?? []).filter((c) => c.direction === 'masuk' && c.status === 'PENDING');
  const breakdown = profile.trustScoreBreakdown;
  const needsVerification = profile.verificationStatus !== 'VERIFIED';

  // Sapaan menyebut satu hal paling mendesak, bukan basa-basi generik.
  const lead =
    incoming.length > 0
      ? `Ada ${incoming.length} aksi penting yang menunggu responsmu hari ini.`
      : needsVerification
        ? 'Verifikasi identitasmu untuk menaikkan skor kepercayaan.'
        : isInvestor
          ? 'Peluang yang cocok denganmu hari ini.'
          : 'Semua beres. Lengkapi berkas untuk menarik lebih banyak pemodal.';

  // Satu hal paling mendesak. Urutan: menahan orang lain > menahan diri sendiri > tidak ada.
  const attention = pickAttention(incoming, profile.verificationStatus, isInvestor);

  return (
    <div className="shell page-bottom">
      {notice && (
        <div style={{ paddingTop: 16 }}>
          <Notice tone={noticeTone}>{notice}</Notice>
        </div>
      )}

      <DashboardHeader profile={profile} isInvestor={isInvestor} lead={lead} />
      <AttentionCard attention={attention} />

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

      <TrustScoreCard profile={profile} breakdown={breakdown} />

      {matches && !matches.needsSetup && (
        <TopMatches matches={matches as MatchesResponse} />
      )}

      {matches?.needsSetup && (
        <EmptyState
          icon="target"
          title={isInvestor ? 'Atur preferensi dulu' : 'Buat permintaan pendanaan dulu'}
          message={matches.emptyMessage ?? undefined}
          action={
            <Link className="btn btn-primary" to={isInvestor ? '/app/preferensi' : '/app/profile'}>
              {isInvestor ? 'Atur sekarang' : 'Lengkapi profil usaha'}
            </Link>
          }
        />
      )}

      <Shortcuts isInvestor={isInvestor} />
    </div>
  );
}

function pickAttention(
  incoming: Connection[],
  verificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED',
  _isInvestor: boolean,
) {
  if (incoming.length > 0) {
    const name = incoming[0].sender.profile?.fullName ?? 'Calon mitra';
    return {
      tag: 'Menunggu responsmu' as const,
      title:
        incoming.length === 1
          ? `${name} menunggu jawabanmu`
          : `${incoming.length} ketertarikan belum dijawab`,
      sub: 'Ruang negosiasi baru terbuka setelah kamu menerima. Selama belum dijawab, mereka tidak bisa menghubungimu.',
      cta: 'Tinjau ketertarikan',
      to: '/app/beranda',
    };
  }
  if (verificationStatus === 'REJECTED') {
    return {
      tag: 'Perlu diperbaiki' as const,
      title: 'Dokumen identitasmu ditolak',
      sub: 'Perbaiki sesuai catatan admin lalu unggah ulang. Tanpa verifikasi, badge Terverifikasi tidak muncul di kartumu.',
      cta: 'Perbaiki dokumen',
      to: '/app/verifikasi',
    };
  }
  if (verificationStatus !== 'VERIFIED') {
    return {
      tag: null,
      title: 'Verifikasi identitas belum selesai',
      sub: 'Akun terverifikasi lebih dipercaya mitra dan naik skor kepercayaannya.',
      cta: 'Verifikasi sekarang',
      to: '/app/verifikasi',
    };
  }
  return null;
}
