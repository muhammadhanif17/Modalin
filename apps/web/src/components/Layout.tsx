import { Link, NavLink, useNavigate } from 'react-router-dom';
import { setToken, isAuthed } from '../lib/api';
import { readSession } from '../lib/session';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-with-nav">
      <TopNav />
      {children}
      <BottomNav />
    </div>
  );
}

function TopNav() {
  const authed = isAuthed();
  const session = readSession();
  const navigate = useNavigate();
  const role = session?.role;
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
              {role === 'ADMIN' && <Link to="/app/admin">Dashboard</Link>}
              <Link to="/app/explore">Jelajah</Link>
              <Link to="/app/matches">Cocok</Link>
              <Link to="/app/chat">Chat</Link>
              <Link to="/app/agreements">Perjanjian</Link>
              {role === 'INVESTOR' && (
                <>
                  <Link to="/app/preferensi">Preferensi</Link>
                  <Link to="/app/rekam-danai">Rekam danai</Link>
                </>
              )}
            </>
          ) : (
            <>
              <Link to="/#cara">Cara kerja</Link>
            </>
          )}
        </nav>
        {authed ? (
          <Link className="btn btn-soft" to="/app/profile">
            Profil
          </Link>
        ) : (
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            <Link className="btn btn-ghost hide-sm" to="/login">
              Masuk
            </Link>
            <Link className="btn btn-primary" to="/register">
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
  return (
    <button
      className="btn btn-outline btn-block"
      onClick={() => {
        setToken(null);
        navigate('/login');
      }}
    >
      Keluar
    </button>
  );
}

const APP_LINKS = [
  { to: '/app/explore', label: 'Jelajah', icon: '🔍' },
  { to: '/app/matches', label: 'Cocok', icon: '💚' },
  { to: '/app/chat', label: 'Chat', icon: '💬' },
  { to: '/app/profile', label: 'Akun', icon: '👤' },
];

function BottomNav() {
  if (!isAuthed()) return null;
  const session = readSession();
  const role = session?.role;
  const links = [...APP_LINKS];
  if (role === 'INVESTOR') {
    links.push({ to: '/app/preferensi', label: 'Preferensi', icon: '🎯' });
  }
  if (role === 'ADMIN') {
    links.push({ to: '/app/admin', label: 'Admin', icon: '🛡️' });
  }
  return (
    <nav className="bottomnav" aria-label="Navigasi bawah">
      <div className="bottomnav-inner">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <span aria-hidden="true">{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
