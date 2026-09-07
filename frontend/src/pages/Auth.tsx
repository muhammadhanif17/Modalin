import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api, setToken } from '../lib/api';
import { Field, Notice } from '../components/ui';
import { saveSession } from '../lib/session';

/** Dikirim AuthGuard atau CTA landing supaya pengguna tahu kenapa diminta masuk. */
type LoginState = { from?: string; notice?: string };

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { from, notice } = (location.state ?? {}) as LoginState;
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const result = await api<{ accessToken: string; user: { id: string; email: string; role: 'UMKM' | 'INVESTOR' } }>(
        '/api/auth/login',
        { method: 'POST', json: data }
      );
      setToken(result.accessToken);
      saveSession(result.user);
      // Kembali ke halaman yang tadi diminta, kalau ada.
      navigate(from ?? '/app/beranda', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tidak dapat masuk.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Selamat datang kembali"
      subtitle="Lanjutkan menemukan mitra yang tepat."
      footer={
        <p className="auth-switch">
          Belum punya akun? <Link to="/register">Daftar di sini</Link>
        </p>
      }
    >
      <form className="auth-form card" onSubmit={onSubmit}>
        {notice && !error && <Notice tone="info">{notice}</Notice>}
        {error && <Notice tone="error">{error}</Notice>}
        <Field label="Email">
          <input className="input" name="email" type="email" placeholder="nama@email.com" required autoComplete="email" />
        </Field>
        <Field label="Password">
          <input className="input" name="password" type="password" placeholder="Masukkan password" required autoComplete="current-password" />
        </Field>
        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy ? 'Memasuki...' : 'Masuk ke akun'}
        </button>
      </form>
    </AuthShell>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<'UMKM' | 'INVESTOR'>('UMKM');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const result = await api<{ accessToken: string; user: { id: string; email: string; role: 'UMKM' | 'INVESTOR' } }>(
        '/api/auth/register',
        { method: 'POST', json: { ...data, role } }
      );
      setToken(result.accessToken);
      saveSession(result.user);
      // Langkah 2 dari onboarding: langsung ke verifikasi, bukan ke pencarian.
      navigate('/app/verifikasi', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tidak dapat membuat akun.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Mulai dari satu pertemuan"
      subtitle="Bangun profil yang membuat peluang datang lebih dekat."
      footer={
        <p className="auth-switch">
          Sudah punya akun? <Link to="/login">Masuk di sini</Link>
        </p>
      }
    >
      <form className="auth-form card" onSubmit={onSubmit}>
        {/* Onboarding tiga langkah: Profil → Verifikasi → Selesai (NFR Usability) */}
        <div className="steps" aria-label="Langkah 1 dari 3: buat profil">
          <span className="now" />
          <span />
          <span />
        </div>
        {error && <Notice tone="error">{error}</Notice>}
        <Field label="Saya adalah">
          <div className="role-grid">
            <button
              type="button"
              className={`role-opt ${role === 'UMKM' ? 'selected' : ''}`}
              onClick={() => setRole('UMKM')}
            >
              <strong>Pemilik usaha</strong>
              <small>Cari modal untuk usahamu.</small>
            </button>
            <button
              type="button"
              className={`role-opt ${role === 'INVESTOR' ? 'selected' : ''}`}
              onClick={() => setRole('INVESTOR')}
            >
              <strong>Investor</strong>
              <small>Danai bisnis lokal yang sehat.</small>
            </button>
          </div>
        </Field>
        <Field label="Nama lengkap">
          <input className="input" name="fullName" placeholder="Nama kamu" minLength={2} required autoComplete="name" />
        </Field>
        <Field label="Email">
          <input className="input" name="email" type="email" placeholder="nama@email.com" required autoComplete="email" />
        </Field>
        <Field label="Password" hint="Minimal 8 karakter.">
          <input className="input" name="password" type="password" placeholder="Buat password" minLength={8} required autoComplete="new-password" />
        </Field>
        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy ? 'Membuat akun...' : 'Buat akun'}
        </button>
      </form>
    </AuthShell>
  );
}

function AuthShell({
  title,
  subtitle,
  footer,
  children,
}: {
  title: string;
  subtitle: string;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="shell">
      <section className="auth-wrap">
        <div className="auth-title">
          <span className="eyebrow">Modalin</span>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <div>
          {children}
          {footer}
        </div>
      </section>
    </div>
  );
}
