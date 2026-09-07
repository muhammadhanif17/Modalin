import { useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { setToken, isAuthed, endpoints } from '../lib/api';
import { subscribeToNotifications, disconnectSocket } from '../lib/socket';
import { readSession, saveSession } from '../lib/session';
import { Icon, type IconName } from './ui/Icon';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-with-nav">
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

  return (
    <header className="topnav">
      <div className="topnav-inner">
        <button className="brand" onClick={() => navigate('/')}>
          <span className="brand-mark">M</span>
          <span>
            modalin<span className="spark">.</span>
          </span>
        </button>
        <nav className="topnav-links" aria-label="Navigasi utama">
          {authed ? (
            <>
              {role === 'ADMIN' && <Link to="/app/admin">Admin</Link>}
              <Link to="/app/beranda">Beranda</Link>
              <Link to="/app/explore">Cari</Link>
              {role !== 'ADMIN' && <Link to="/app/matches">Rekomendasi</Link>}
              <Link to="/app/chat">Chat</Link>
              <Link to="/app/agreements">Perjanjian</Link>
            </>
          ) : (
            <Link to="/#cara">Cara kerja</Link>
          )}
        </nav>
        {authed ? (
          <Link className="btn btn-soft btn-sm" to="/app/profile">
            Profil
          </Link>
        ) : (
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            {/* Tanpa ini pengunjung di HP hanya punya "Daftar" dan tak bisa masuk. */}
            <Link className="btn btn-ghost btn-sm" to="/login">
              Masuk
            </Link>
            <Link className="btn btn-primary btn-sm" to="/register">
              Daftar
            </Link>
          </div>
        )}
      </div>
      {notif && notif.pendingConnections > 0 && (
        <div className="topbar-alert">
          <Link to="/app/chat">
            {notif.pendingConnections} ketertarikan menunggu responsmu →
          </Link>
        </div>
      )}
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
        navigate('/login');
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
