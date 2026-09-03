import { Link, NavLink, useNavigate } from 'react-router-dom';
import { setToken, isAuthed } from '../lib/api';

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
  const navigate = useNavigate();
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
              <Link to="/app/explore">Jelajah</Link>
              <Link to="/app/matches">Cocok</Link>
              <Link to="/app/chat">Chat</Link>
              <Link to="/app/agreements">Perjanjian</Link>
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
  return (
    <nav className="bottomnav" aria-label="Navigasi bawah">
      <div className="bottomnav-inner">
        {APP_LINKS.map((link) => (
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
