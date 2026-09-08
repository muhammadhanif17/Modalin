import { useEffect } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { setToken, isAuthed, endpoints } from '../lib/api';
import { subscribeToNotifications, disconnectSocket } from '../lib/socket';
import { readSession, saveSession } from '../lib/session';
import { Icon, type IconName } from './ui/Icon';
import logoUrl from '../assets/logo.png';

export function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  // Ruang chat (dan halaman fullscreen lain) mengatur headernya sendiri:
  // logo + navbar global disembunyikan supaya tidak dobel dan tidak
  // memakan tinggi layar HP. Contoh: /app/chat/:id menampilkan nama
  // lawan bicara + tombol kembali, bukan logo Modalin.
  const isFullscreen = /^\/app\/chat\/.+/.test(pathname);
  if (isFullscreen) {
    return <div className="conv-fullscreen">{children}</div>;
  }
  // Halaman publik (landing) tidak punya bottomnav: padding bawah bawaan
  // page-with-nav menyisakan strip kosong 76-84px di bawah footer gelap.
  const publicOnly = !isAuthed();
  return (
    <div className={publicOnly ? 'page-public' : 'page-with-nav'}>
      <TopNav />
      {children}
      <BottomNav />
    </div>
  );
}

/**
 * FR-09 — indikator in-app. Angkanya diambil sekali saat aplikasi dibuka, lalu
 * disegarkan setiap ada peristiwa dari socket, bukan lewat polling.
 */
function useNotifications() {
  const qc = useQueryClient();
  const authed = isAuthed();

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: endpoints.notifications,
    enabled: authed,
    staleTime: 20_000,
  });

  useEffect(() => {
    if (!authed) return;
    const refresh = () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    };
    const unsubscribe = subscribeToNotifications({
      onMessage: refresh,
      onConnection: () => {
        refresh();
        qc.invalidateQueries({ queryKey: ['connections'] });
      },
    });
    return unsubscribe;
  }, [authed, qc]);

  return data;
}

function TopNav() {
  const authed = isAuthed();
  const session = readSession();
  const navigate = useNavigate();
  const role = session?.role;
  const notif = useNotifications();
  // Satu angka untuk bell: ketertarikan menunggu + pesan belum dibaca.
  const bellCount = (notif?.pendingConnections ?? 0) + (notif?.unreadMessages ?? 0);

  return (
    <header className={authed ? 'topnav topnav-app' : 'topnav'}>
      <div className="topnav-inner">
        {/* Lambang merek: logo jabat tangan + tunas, tulisan modalin.id tetap */}
        <button className="brand" onClick={() => navigate('/')} aria-label="Ke beranda Modalin">
          <span className="brand-mark">
            <img src={logoUrl} alt="Logo Modalin" />
          </span>
          <span className="brand-text">
            <span className="brand-name">
              modalin<span className="spark">.id</span>
            </span>
            <span className="brand-tagline">Mitra Modal Nusantara</span>
          </span>
        </button>
        <nav className="topnav-links" aria-label="Navigasi utama">
          {authed ? (
            <>
              {role === 'ADMIN' && <Link to="/app/admin">Admin</Link>}
              <Link to="/app/beranda">Beranda</Link>
              <Link to="/app/explore">Cari</Link>
              <Link to="/app/chat">Chat</Link>
              <Link to="/app/agreements">Perjanjian</Link>
            </>
          ) : (
            <Link to="/#cara">Cara kerja</Link>
          )}
        </nav>
        {authed ? (
          <div className="top-actions">
            {role && (
              <span className="badge badge-soft">
                {role === 'INVESTOR' ? 'Pemodal' : role === 'ADMIN' ? 'Admin' : 'UMKM'}
              </span>
            )}
            <Link className="icon-btn" to="/app/notifikasi" aria-label="Notifikasi">
              <Icon name="bell" size={20} />
              {bellCount > 0 && <span className="dot bell-dot">{bellCount}</span>}
            </Link>
            <Link className="btn btn-soft btn-sm" to="/app/profile">
              Profil
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            {/* Tanpa ini pengunjung di HP hanya punya "Daftar" dan tak bisa masuk. */}
            <Link className="btn btn-ghost btn-sm" to="/login">
              Masuk
            </Link>
            <Link className="btn btn-primary btn-sm" to="/pilih-peran">
              Daftar
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

export function LogoutButton() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  return (
    <button
      className="btn btn-outline btn-block"
      onClick={() => {
        // Bersihkan token, sesi, cache, dan socket sekaligus supaya tidak ada
        // data pengguna sebelumnya yang tertinggal di perangkat bersama.
        setToken(null);
        saveSession(null);
        disconnectSocket();
        qc.clear();
        endpoints.logout().catch(() => undefined);
        navigate('/');
      }}
    >
      Keluar
    </button>
  );
}

/** Empat tab persis seperti bottom nav di Stitch: Beranda, Cari, Chat, Profil. */
const APP_LINKS: { to: string; label: string; icon: IconName }[] = [
  { to: '/app/beranda', label: 'Beranda', icon: 'home' },
  { to: '/app/explore', label: 'Cari', icon: 'search' },
  { to: '/app/chat', label: 'Chat', icon: 'chat' },
  { to: '/app/profile', label: 'Profil', icon: 'person' },
];

/**
 * Tab admin hanya ada di topnav desktop, padahal topnav disembunyikan di ≤640px.
 * Tanpa slot di bawah, admin yang meninjau KYC dari HP terkunci dari panelnya.
 */
const ADMIN_LINK: { to: string; label: string; icon: IconName } = {
  to: '/app/admin',
  label: 'Admin',
  icon: 'shield',
};

function BottomNav() {
  const notif = useNotifications();
  const session = readSession();
  if (!isAuthed()) return null;

  const links = session?.role === 'ADMIN' ? [...APP_LINKS, ADMIN_LINK] : APP_LINKS;

  return (
    <nav className="bottomnav" aria-label="Navigasi bawah">
      <div className="bottomnav-inner">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="bottomnav-icon">
              <Icon name={link.icon} size={22} />
              {link.to === '/app/chat' && notif && notif.unreadMessages > 0 && (
                <span className="dot dot-corner">{notif.unreadMessages}</span>
              )}
            </span>
            {link.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
