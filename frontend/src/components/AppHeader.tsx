import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { endpoints, isAuthed } from '../lib/api';
import { Icon } from './ui/Icon';
import logoUrl from '../assets/logo.png';

/**
 * Baris logo + bel khusus layar HP untuk Beranda dan Profil (kedua peran).
 * TopNav global disembunyikan di ≤640px, jadi halaman-halaman ini butuh
 * identitas merek + jalan ke notifikasi sendiri. Di desktop disembunyikan
 * (sm:hidden) karena TopNav sudah menampilkan keduanya — tanpa ini logo dobel.
 */
export function AppHeader() {
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: endpoints.notifications,
    enabled: isAuthed(),
    staleTime: 20_000,
  });
  const count = (data?.pendingConnections ?? 0) + (data?.unreadMessages ?? 0);

  return (
    <div className="flex items-center justify-between py-1 sm:hidden">
      <Link to="/app/beranda" className="brand" aria-label="Ke beranda Modalin">
        <span className="brand-mark">
          <img src={logoUrl} alt="Logo Modalin" />
        </span>
        <span className="brand-text">
          <span className="brand-name">
            modalin<span className="spark">.id</span>
          </span>
        </span>
      </Link>
      <Link className="icon-btn" to="/app/notifikasi" aria-label="Notifikasi">
        <Icon name="bell" size={20} />
        {count > 0 && <span className="dot bell-dot">{count}</span>}
      </Link>
    </div>
  );
}
