import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { COOPERATION_LABEL, endpoints } from '../lib/api';
import { readSession } from '../lib/session';
import { formatTanggal, formatWaktu } from '../lib/format';
import { EmptyState, Spinner } from '../components/ui';
import { AppHeader } from '../components/AppHeader';

type NotifItem = {
  key: string;
  icon: string;
  title: string;
  desc: string;
  time: string;
  to: string;
};

function partyName(p: { fullName?: string | null } | null | undefined, fallback: string): string {
  return p?.fullName ?? fallback;
}

/**
 * Pusat notifikasi: halaman sendiri (bukan tampilan chat) berisi ringkasan
 * yang butuh tindakan (ketertarikan masuk, tanda tangan, ulasan, pesan
 * belum dibaca), kabar kemitraan, dan notifikasi sistem. Seluruhnya disusun
 * dari endpoint yang sudah ada — tanpa data contoh.
 */
export function NotificationsPage() {
  const session = readSession();
  const meId = session?.id ?? '';

  const { data: conversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: endpoints.conversations,
    staleTime: 15_000,
  });
  const { data: connections } = useQuery({
    queryKey: ['connections'],
    queryFn: endpoints.connections,
    staleTime: 15_000,
  });
  const { data: agreements } = useQuery({
    queryKey: ['agreements'],
    queryFn: endpoints.agreements,
    staleTime: 15_000,
  });
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: endpoints.me,
    staleTime: 30_000,
  });
  const { data: pending } = useQuery({
    queryKey: ['pending-ratings'],
    queryFn: endpoints.pendingRatings,
    staleTime: 15_000,
  });

  if (profileLoading) return <Spinner />;

  const action: NotifItem[] = [];
  const news: NotifItem[] = [];
  const system: NotifItem[] = [];

  for (const c of connections ?? []) {
    const other = c.direction === 'masuk' ? c.sender : c.receiver;
    const name = partyName(other.profile, 'Calon mitra');
    const deal = c.fundingRequest ? ` • ${c.fundingRequest.business.name}` : '';
    if (c.direction === 'masuk' && c.status === 'PENDING') {
      action.push({
        key: `conn-${c.id}`,
        icon: 'handshake',
        title: `Ketertarikan baru dari ${name}`,
        desc: `Menunggu responsmu${deal}. Tanggapi dari Beranda.`,
        time: c.createdAt,
        to: '/app/beranda',
      });
    } else if (c.direction === 'keluar' && c.status === 'ACCEPTED') {
      news.push({
        key: `conn-${c.id}`,
        icon: 'check_circle',
        title: `${name} menerima ketertarikanmu`,
        desc: `Ruang chat sudah terbuka${deal}.`,
        time: c.createdAt,
        to: c.conversation ? `/app/chat/${c.conversation.id}` : '/app/beranda',
      });
    }
  }

  for (const a of agreements ?? []) {
    const signedByMe = a.signatures.some((s) => s.userId === meId);
    if (!signedByMe && (a.status === 'DRAFT' || a.status === 'WAITING_SIGNATURE')) {
      action.push({
        key: `sign-${a.id}`,
        icon: 'draw',
        title: 'Menunggu tanda tanganmu',
        desc: `${a.agreementNumber} • ${COOPERATION_LABEL[a.cooperationType]}. Periksa isi SPK lalu tanda tangani.`,
        time: a.createdAt,
        to: '/app/agreements',
      });
    } else if (a.status === 'COMPLETED') {
      news.push({
        key: `done-${a.id}`,
        icon: 'task_alt',
        title: `Kerja sama ${a.agreementNumber} selesai`,
        desc: 'Jangan lupa beri ulasan untuk mitra.',
        time: a.createdAt,
        to: '/app/agreements',
      });
    } else if (a.status === 'ACTIVE') {
      news.push({
        key: `active-${a.id}`,
        icon: 'play_circle',
        title: `Kerja sama ${a.agreementNumber} berjalan`,
        desc: `${COOPERATION_LABEL[a.cooperationType]} sedang aktif.`,
        time: a.createdAt,
        to: '/app/agreements',
      });
    }
  }

  for (const row of (pending ?? []) as { agreementId: string; agreementNumber: string; partner: { fullName?: string | null } }[]) {
    action.push({
      key: `rate-${row.agreementId}`,
      icon: 'star',
      title: `Beri ulasan untuk ${partyName(row.partner, 'mitra')}`,
      desc: `${row.agreementNumber} menunggu penilaianmu.`,
      time: '',
      to: `/app/rating/${row.agreementId}`,
    });
  }

  for (const conv of conversations ?? []) {
    if (conv.unreadCount > 0) {
      action.push({
        key: `msg-${conv.id}`,
        icon: 'chat',
        title: `${conv.unreadCount} pesan baru dari ${partyName(conv.partner, 'Mitra')}`,
        desc: conv.lastMessage ? conv.lastMessage.body.slice(0, 100) : 'Buka percakapan.',
        time: conv.lastMessage?.createdAt ?? '',
        to: `/app/chat/${conv.id}`,
      });
    }
  }

  const verification = profile?.verificationStatus ?? 'UNVERIFIED';
  if (verification === 'VERIFIED') {
    system.push({
      key: 'sys-verified',
      icon: 'verified_user',
      title: 'Akun terverifikasi',
      desc: 'Identitasmu lolos verifikasi. Skor kepercayaan ikut naik.',
      time: '',
      to: '/app/profile',
    });
  } else if (verification === 'PENDING') {
    system.push({
      key: 'sys-pending',
      icon: 'hourglass_top',
      title: 'Verifikasi sedang ditinjau',
      desc: 'Berkasmu masuk antrean admin. Kabari lewat sini begitu ada hasil.',
      time: '',
      to: '/app/verifikasi',
    });
  } else {
    system.push({
      key: 'sys-unverified',
      icon: 'shield',
      title:
        verification === 'REJECTED' ? 'Verifikasi ditolak — perbaiki berkas' : 'Verifikasi identitasmu',
      desc: 'Akun terverifikasi membuka rekomendasi prioritas dan menaikkan skor.',
      time: '',
      to: '/app/verifikasi',
    });
  }

  const byTime = (a: NotifItem, b: NotifItem) => (b.time || '').localeCompare(a.time || '');
  action.sort(byTime);
  news.sort(byTime);

  return (
    <div className="shell">
      <AppHeader />
      <div className="page-head">
        <h1>Notifikasi</h1>
        <p>Yang butuh tindakanmu dan kabar terbaru kemitraan.</p>
      </div>

      {action.length === 0 && news.length === 0 ? (
        <EmptyState
          icon="bell"
          title="Belum ada notifikasi"
          message="Ketertarikan baru, pesan, dan permintaan tanda tangan akan muncul di sini."
        />
      ) : (
        <div className="stack">
          {action.length > 0 && (
            <section aria-label="Perlu tindakanmu">
              <h3 className="rec-h">Perlu tindakanmu</h3>
              <div className="stack">
                {action.map((n) => (
                  <NotifRow key={n.key} item={n} hot />
                ))}
              </div>
            </section>
          )}
          {news.length > 0 && (
            <section aria-label="Kabar kemitraan">
              <h3 className="rec-h">Kabar kemitraan</h3>
              <div className="stack">
                {news.map((n) => (
                  <NotifRow key={n.key} item={n} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <section aria-label="Sistem" className="rec-gap-top">
        <h3 className="rec-h">Sistem</h3>
        <div className="stack">
          {system.map((n) => (
            <NotifRow key={n.key} item={n} />
          ))}
        </div>
      </section>
    </div>
  );
}

function NotifRow({ item, hot }: { item: NotifItem; hot?: boolean }) {
  return (
    <Link className="row-link" to={item.to}>
      <span
        className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0"
        aria-hidden="true"
      >
        <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
      </span>
      <div className="row-main">
        <div className="row-title">
          {hot && (
            <span className="dot" aria-label="Belum ditindaklanjuti" style={{ display: 'inline-block', marginRight: 6 }} />
          )}
          {item.title}
        </div>
        <div className="row-sub">{item.desc}</div>
      </div>
      {item.time && (
        <div className="opp-meta" style={{ flex: 'none', textAlign: 'right' }}>
          {formatTanggal(item.time)}
          <br />
          {formatWaktu(item.time)}
        </div>
      )}
    </Link>
  );
}
