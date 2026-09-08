import { Link, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { endpoints, VERIFICATION_LABEL, type Connection } from '../lib/api';
import { Avatar } from '../components/ui/Avatar';
import { Icon, type IconName } from '../components/ui/Icon';
import { Spinner, EmptyState, Badge, Notice, VERIFICATION_TONE } from '../components/ui';
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
  const location = useLocation();
  const isInvestor = session?.role === 'INVESTOR';
  // Dikirim halaman lain setelah aksi yang tidak punya layar hasilnya sendiri,
  // mis. "ketertarikan terkirim" dari detail mitra, atau pentalan RoleGuard.
  const { notice, noticeTone = 'success' } =
    (location.state ?? {}) as { notice?: string; noticeTone?: 'success' | 'info' };

  const { data: profile, isLoading } = useQuery({ queryKey: ['profile'], queryFn: endpoints.me });
  const { data: connections } = useQuery({ queryKey: ['connections'], queryFn: endpoints.connections });
  // Rekomendasi kini dua arah — UMKM melihat pemodal, investor melihat peluang.
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

  /*
   * Satu hal paling mendesak untuk kartu "Perhatian Utama Hari Ini".
   * Urutannya: menahan orang lain > menahan diri sendiri > tidak ada.
   */
  const attention = (() => {
    if (incoming.length > 0) {
      const name = incoming[0].sender.profile?.fullName ?? 'Calon mitra';
      return {
        tag: 'Menunggu responsmu',
        title: incoming.length === 1 ? `${name} menunggu jawabanmu` : `${incoming.length} ketertarikan belum dijawab`,
        sub: 'Ruang negosiasi baru terbuka setelah kamu menerima. Selama belum dijawab, mereka tidak bisa menghubungimu.',
        cta: 'Tinjau ketertarikan',
        to: '/app/beranda',
      };
    }
    if (profile.verificationStatus === 'REJECTED') {
      return {
        tag: 'Perlu diperbaiki',
        title: 'Dokumen identitasmu ditolak',
        sub: 'Perbaiki sesuai catatan admin lalu unggah ulang. Tanpa verifikasi, badge Terverifikasi tidak muncul di kartumu.',
        cta: 'Perbaiki dokumen',
        to: '/app/verifikasi',
      };
    }
    if (needsVerification) {
      return {
        tag: null,
        title: 'Verifikasi identitas belum selesai',
        sub: 'Akun terverifikasi lebih dipercaya mitra dan naik skor kepercayaannya.',
        cta: 'Verifikasi sekarang',
        to: '/app/verifikasi',
      };
    }
    return null;
  })();

  return (
    <div className="shell page-bottom">
      {notice && (
        <div style={{ paddingTop: 16 }}>
          <Notice tone={noticeTone}>{notice}</Notice>
        </div>
      )}

      {/* Kartu identitas pembuka, mengikuti greeting card mockup beranda */}
      <div className="greeting">
        <Avatar name={profile.fullName} seed={session?.id} size="lg" />
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 className="greeting-name">{profile.fullName}</h1>
          <div className="greeting-role">{isInvestor ? 'Pemodal' : 'Pengusaha'}</div>
          <div className="greeting-pills">
            <span className="score">
              Skor {profile.trustScore}/100
            </span>
            <Badge tone={VERIFICATION_TONE[profile.verificationStatus]}>
              {VERIFICATION_LABEL[profile.verificationStatus]}
            </Badge>
          </div>
        </div>
      </div>

      <p className="greeting-lead">
        {salam()}, {profile.fullName.split(' ')[0]}. {lead}
      </p>

      {/*
        Kartu gelap "Perhatian Utama Hari Ini" dari mockup beranda — satu hal
        paling mendesak, ditonjolkan sebelum apa pun yang lain. Aksi lebih dulu,
        skor menyusul.
      */}
      {attention && (
        <div className="attention">
          <div className="attention-head">
            <span>Perhatian Utama Hari Ini</span>
            {attention.tag && <span className="attention-tag">{attention.tag}</span>}
          </div>
          <strong className="attention-title">{attention.title}</strong>
          <p className="attention-sub">{attention.sub}</p>
          <Link className="btn btn-attention btn-block" to={attention.to}>
            {attention.cta}
          </Link>
        </div>
      )}

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

      {/* Skor kepercayaan + apa yang masih kurang */}
      <div className="card card-pad stack" style={{ marginTop: incoming.length > 0 ? 20 : 0 }}>
        <div className="opp-top">
          <div>
            <h3>Skor kepercayaan</h3>
            <div className="opp-meta">Dihitung dari kelengkapan profil, verifikasi, dan ulasan</div>
          </div>
          <Badge tone={VERIFICATION_TONE[profile.verificationStatus]}>
            {VERIFICATION_LABEL[profile.verificationStatus]}
          </Badge>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span data-money className="score-display">
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

        {needsVerification && (
          <Link className="btn btn-primary btn-block" to="/app/verifikasi">
            {profile.verificationStatus === 'REJECTED' ? 'Perbaiki dokumen' : 'Verifikasi identitas'}
          </Link>
        )}
      </div>

      {/* Tiga teratas dari pencocokan otomatis, sisi mana pun */}
      {matches && !matches.needsSetup && matches.recommended.length > 0 && (
        <>
          <div className="section-head">
            <h2>Paling cocok untukmu</h2>
            <Link to="/app/matches" className="opp-meta">
              Lihat semua →
            </Link>
          </div>
          <div className="stack">
            {matches.audience === 'pemodal'
              ? matches.recommended.slice(0, 3).map((item) => (
                  <Link className="row-link" to={`/app/mitra/${item.id}`} key={item.id}>
                    <Avatar name={item.fullName ?? 'Pemodal'} seed={item.id} size="md" />
                    <div className="row-main">
                      <div className="row-title">{item.fullName ?? 'Pemodal'}</div>
                      <div className="row-sub">
                        {item.preference?.preferredSector?.name ?? 'Semua sektor'} ·{' '}
                        <span data-money>
                          {item.preference ? formatRupiah(item.preference.maximumAmount) : '—'}
                        </span>
                      </div>
                    </div>
                    <span className="badge badge-primary">Match {item.match.score}%</span>
                  </Link>
                ))
              : matches.recommended.slice(0, 3).map((item) => (
                  <Link className="row-link" to={`/app/mitra/${item.owner.id}`} key={item.id}>
                    <Avatar name={item.business.name} seed={item.owner.id} size="md" />
                    <div className="row-main">
                      <div className="row-title">{item.business.name}</div>
                      <div className="row-sub">
                        {item.business.sector.name} ·{' '}
                        <span data-money>{formatRupiah(item.targetAmount)}</span>
                      </div>
                    </div>
                    {/* Skor kecocokan pakai warna brand, bukan hijau status verifikasi */}
                    <span className="badge badge-primary">Match {item.match.score}%</span>
                  </Link>
                ))}
          </div>
        </>
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

      {/* Pintasan */}
      <div className="section-head">
        <h2>Pintasan</h2>
      </div>
      <div className="stack">
        {shortcuts(isInvestor).map((item) => (
          <Link className="row-link" to={item.to} key={item.to}>
            <span className="row-icon">
              <Icon name={item.icon} />
            </span>
            <div className="row-main">
              <div className="row-title">{item.title}</div>
              <div className="row-sub">{item.sub}</div>
            </div>
            <Icon name="chevron" size={18} className="row-chevron" />
          </Link>
        ))}
      </div>
    </div>
  );
}

const shortcuts = (
  isInvestor: boolean,
): { to: string; icon: IconName; title: string; sub: string }[] => [
  {
    to: '/app/agreements',
    icon: 'document',
    title: 'Dokumen kesepakatan',
    sub: 'Susun, tandatangani, dan terbitkan SPK',
  },
  {
    to: '/app/rekam-jejak',
    icon: 'folder',
    title: isInvestor ? 'Rekam jejak pendanaan' : 'Berkas pendukung',
    sub: 'Unggah dokumen agar mitra lebih yakin',
  },
  {
    to: '/app/pembayaran',
    icon: 'receipt',
    title: 'Pembayaran',
    sub: 'Biaya layanan dan langganan Modalin Pro',
  },
];

/** Sapaan mengikuti waktu perangkat, seperti "Selamat pagi" di mockup. */
function salam(): string {
  const h = new Date().getHours();
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 19) return 'Selamat sore';
  return 'Selamat malam';
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
