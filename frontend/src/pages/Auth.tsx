import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api, setToken } from '../lib/api';
import { saveSession } from '../lib/session';

type LoginState = { from?: string; notice?: string };
type RegisterLocationState = { role?: 'UMKM' | 'INVESTOR' };

/**
 * Port 1:1 dari Mockup/3. Form Login Akun Terdaftar (Mobile).html
 * Class, copy, ikon Material Symbols dipertahankan verbatim.
 * Tambahan: state show/hide password, role pill, error/notice, submit API.
 */
export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { from, notice } = (location.state ?? {}) as LoginState;
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [pill, setPill] = useState<'UMKM' | 'INVESTOR'>('UMKM');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const rawIdentity = String(fd.get('identity') ?? '');
    // Mockup mengizinkan "Email atau No. WhatsApp", API butuh email.
    const email = rawIdentity.includes('@') ? rawIdentity : rawIdentity;
    try {
      const result = await api<{
        accessToken: string;
        user: { id: string; email: string; role: 'UMKM' | 'INVESTOR' };
      }>('/api/auth/login', {
        method: 'POST',
        json: { email, password: String(fd.get('password') ?? '') },
      });
      setToken(result.accessToken);
      saveSession(result.user);
      navigate(from ?? '/app/beranda', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tidak dapat masuk.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex justify-center p-0 sm:py-6 bg-[#FEF9EE] antialiased">
      <div className="w-full max-w-md mx-auto bg-[#FEF9EE] min-h-screen flex flex-col justify-between px-5 py-5 shadow-sm border-x border-[#ECE6D8]">
        <div>
          <header className="flex items-center justify-between pt-1 pb-6 border-b border-[#EADFCB]">
            <button
              aria-label="Kembali"
              className="w-10 h-10 rounded-full bg-white border border-[#E3DFD5] flex items-center justify-center text-[#0F2419] shadow-sm hover:bg-[#F5F1E5] transition-colors"
              type="button"
              onClick={() => navigate(-1)}
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <div className="flex items-center gap-2.5">
              <div className="text-right">
                <span className="block font-extrabold text-[#0F2419] text-[18px] leading-none tracking-tight">
                  Modalin
                </span>
                <span className="block text-[11px] font-bold text-[#526359] uppercase tracking-wider mt-0.5">
                  MASUK AKUN
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#0F2419] flex items-center justify-center text-white shadow-sm">
                <span className="material-symbols-outlined text-[20px]">trending_up</span>
              </div>
            </div>
          </header>

          <div className="mt-6">
            <h2 className="text-2xl font-extrabold text-[#0F2419] tracking-tight leading-snug">
              Selamat Datang Kembali
            </h2>
            <p className="text-xs text-[#526359] mt-1.5 leading-relaxed">
              Masuk ke akun Anda untuk memantau kemitraan dan perkembangan dana usaha.
            </p>
          </div>

          {notice && !error && (
            <div className="mt-4 px-3.5 py-3 rounded-xl bg-[#EAF5EE] border border-[#BCEECD] text-[12px] font-medium text-[#0F2419]">
              {notice}
            </div>
          )}
          {error && (
            <div className="mt-4 px-3.5 py-3 rounded-xl bg-[#FDECEC] border border-[#F5C2C2] text-[12px] font-semibold text-[#93000a]">
              {error}
            </div>
          )}

          <div className="mt-6 p-1 bg-[#EFE9DC] rounded-xl flex items-center gap-1 border border-[#E2D8C6]">
            <button
              className={`flex-1 py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                pill === 'UMKM'
                  ? 'bg-white text-[#0F2419] shadow-xs'
                  : 'text-[#526359] hover:text-[#0F2419] font-medium'
              }`}
              type="button"
              onClick={() => setPill('UMKM')}
            >
              <span
                className={`material-symbols-outlined text-[16px] ${
                  pill === 'UMKM' ? 'text-[#0F2419]' : 'text-[#526359]'
                }`}
              >
                storefront
              </span>
              <span>Pengusaha UMKM</span>
            </button>
            <button
              className={`flex-1 py-2.5 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors ${
                pill === 'INVESTOR'
                  ? 'bg-white text-[#0F2419] font-bold shadow-xs'
                  : 'text-[#526359] hover:text-[#0F2419] font-medium'
              }`}
              type="button"
              onClick={() => setPill('INVESTOR')}
            >
              <span className="material-symbols-outlined text-[16px] text-[#526359]">savings</span>
              <span>Investor / Pemodal</span>
            </button>
          </div>

          <form className="mt-5 space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#0F2419]">
                Email atau No. WhatsApp
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-[#526359] text-[20px]">
                  mail
                </span>
                <input
                  name="identity"
                  className="w-full bg-white border border-[#DCD5C5] rounded-xl pl-10 pr-3.5 py-3 text-xs font-medium text-[#0F2419] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0F2419] focus:ring-1 focus:ring-[#0F2419] transition-all shadow-xs"
                  placeholder="nama@bisnis.id atau 0812xxxxxxx"
                  type="text"
                  required
                  autoComplete="email"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-[#0F2419]">Kata Sandi</label>
                <span className="text-[11px] font-bold text-[#1E3A2F]">Lupa Kata Sandi?</span>
              </div>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-[#526359] text-[20px]">
                  lock
                </span>
                <input
                  name="password"
                  className="w-full bg-white border border-[#DCD5C5] rounded-xl pl-10 pr-10 py-3 text-xs font-medium text-[#0F2419] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0F2419] focus:ring-1 focus:ring-[#0F2419] transition-all shadow-xs tracking-wider"
                  placeholder="Masukkan minimal 8 karakter"
                  type={showPw ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="current-password"
                />
                <button
                  aria-label="Lihat Password"
                  className="absolute right-3 text-[#526359] hover:text-[#0F2419] flex items-center justify-center p-1"
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPw ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  defaultChecked
                  className="w-4 h-4 rounded border-[#DCD5C5] text-[#0F2419] accent-[#0F2419] focus:ring-0"
                  type="checkbox"
                />
                <span className="text-xs font-medium text-[#405247]">Ingat sesi masuk saya</span>
              </label>
              <div className="inline-flex items-center gap-1 text-[11px] text-[#1E3A2F] font-semibold">
                <span className="material-symbols-outlined text-[14px] text-[#2c694e]">lock</span>
                <span>Enkripsi 256-bit</span>
              </div>
            </div>
            <button
              className="w-full mt-2 bg-[#0F2419] hover:bg-[#183627] text-white font-bold text-sm py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99] disabled:opacity-60"
              type="submit"
              disabled={busy}
            >
              <span>{busy ? 'Memasuki...' : 'Masuk ke Dashboard'}</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
            <div className="relative my-4 flex items-center justify-center">
              <div className="border-t border-[#E2D8C6] w-full"></div>
              <span className="bg-[#FEF9EE] px-3 text-[11px] font-semibold text-[#7A8B80] uppercase tracking-wider absolute">
                atau masuk dengan
              </span>
            </div>
            <div>
              <button
                className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-white border border-[#DCD5C5] rounded-xl hover:bg-[#F9F7F1] transition-colors shadow-xs text-[#0F2419] font-bold text-xs"
                type="button"
                title="Segera hadir"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  ></path>
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  ></path>
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    fill="#FBBC05"
                  ></path>
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    fill="#EA4335"
                  ></path>
                </svg>
                <span>Google</span>
              </button>
            </div>
          </form>
        </div>

        <div className="pt-6 pb-2 space-y-4">
          <div className="text-center text-xs text-[#526359]">
            <span>Belum memiliki akun?</span>{' '}
            <Link
              to="/pilih-peran"
              className="font-bold text-[#0F2419] hover:underline inline-flex items-center gap-0.5"
            >
              Daftar sekarang
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#7A8B80] text-center pt-2">
            <span className="material-symbols-outlined text-[13px] text-[#526359]">
              verified_user
            </span>
            <span>Diawasi &amp; berstandar keamanan OJK Sandboxing</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Port 1:1 dari Mockup/4. Form Registrasi Dasar.html
 * Header fixed, progress Langkah 1 dari 3, intro card, 4 field,
 * badge +62, toggle password + strength, phone formatting, terms.
 */
export function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialRole = ((location.state ?? {}) as RegisterLocationState).role ?? 'UMKM';
  const [role] = useState<'UMKM' | 'INVESTOR'>(initialRole);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const strong = password.length >= 8 && hasLetter && hasNumber;

  function onPhoneInput(value: string) {
    let val = value.replace(/[^0-9]/g, '');
    if (val.startsWith('0')) val = val.substring(1);
    if (val.length > 7) setPhone(val.slice(0, 3) + '-' + val.slice(3, 7) + '-' + val.slice(7, 12));
    else if (val.length > 3) setPhone(val.slice(0, 3) + '-' + val.slice(3));
    else setPhone(val);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      const result = await api<{
        accessToken: string;
        user: { id: string; email: string; role: 'UMKM' | 'INVESTOR' };
      }>('/api/auth/register', {
        method: 'POST',
        json: {
          fullName: String(fd.get('fullName') ?? ''),
          email: String(fd.get('email') ?? ''),
          phone: '+62' + String(phone).replace(/[^0-9]/g, ''),
          password: String(fd.get('password') ?? ''),
          role,
        },
      });
      setToken(result.accessToken);
      saveSession(result.user);
      navigate('/app/verifikasi', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tidak dapat membuat akun.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-surface text-on-surface flex flex-col min-h-screen antialiased">
      <header className="fixed top-0 w-full z-50 bg-surface/90 backdrop-blur-xl shadow-[0_2px_12px_rgba(15,36,25,0.04)] pt-safe">
        <div className="h-16 px-4 flex items-center justify-between w-full border-b border-surface-container-high/60 max-w-md mx-auto">
          <div className="flex items-center gap-2">
            <button
              aria-label="Kembali"
              className="w-10 h-10 flex items-center justify-center text-primary rounded-full hover:bg-surface-container-high active:scale-95 transition-all"
              type="button"
              onClick={() => navigate(-1)}
            >
              <span className="material-symbols-outlined text-[22px]">arrow_back</span>
            </button>
            <div className="flex items-center gap-2 ml-1">
              <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center text-secondary-fixed shrink-0">
                <span className="material-symbols-outlined text-[18px]">trending_up</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-[16px] text-primary leading-tight tracking-tight">
                  Modalin
                </span>
                <span className="text-[10px] text-secondary font-semibold uppercase tracking-wider">
                  REGISTRASI AKUN
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-secondary font-semibold bg-secondary-fixed/50 px-2.5 py-1 rounded-full whitespace-nowrap">
              Verifikasi OJK
            </span>
          </div>
        </div>
      </header>

      <main
        className="flex-1 flex flex-col relative w-full px-gutter-mobile pb-safe bg-surface pt-14"
        style={{ backgroundColor: 'rgb(254, 249, 238)' }}
      >
        <div className="flex flex-col w-full pb-10 max-w-md mx-auto">
          <div className="flex flex-col gap-2 pt-3 mb-space-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EAE6DC] border border-[#DDD9CD] text-[#2C694E] font-semibold text-[12px]">
                  <span className="w-2 h-2 rounded-full bg-[#2C694E]"></span>
                  {role === 'UMKM' ? 'Pengusaha UMKM' : 'Investor / Pemodal'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-semibold text-[#424844]">Langkah 1 dari 3</span>
              </div>
            </div>
            <div className="w-full h-1.5 bg-[#E8E4D9] rounded-full overflow-hidden flex">
              <div
                className="h-full bg-[#0F2419] rounded-full transition-all duration-500 ease-out"
                style={{ width: '33.33%' }}
              ></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-space-md shadow-sm mb-space-lg flex items-start gap-space-sm border border-[#E8E4D9]">
            <div className="w-11 h-11 rounded-xl bg-[#EAF5EE] text-[#0F2419] flex items-center justify-center shrink-0 border border-[#BCEECD]">
              <span className="material-symbols-outlined text-[22px] text-[#2C694E]">badge</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-[20px] text-[#0F2419] font-bold tracking-tight">
                Buat Akun Anda
              </h1>
              <p className="text-[13px] text-[#424844] mt-1 leading-snug">
                Isi data diri dasar Anda untuk memulai proses pendanaan usaha yang bermartabat dan
                transparan.
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-space-md px-3.5 py-3 rounded-xl bg-[#ffdad6] border border-[#ba1a1a]/30 text-[13px] font-semibold text-[#93000a]">
              {error}
            </div>
          )}

          <form className="flex flex-col gap-space-md" onSubmit={onSubmit}>
            <div className="flex flex-col gap-1.5">
              <label
                className="text-label-lg text-on-surface flex items-center justify-between font-semibold"
                htmlFor="fullName"
              >
                <span>
                  Nama Lengkap <span className="text-error">*</span>
                </span>
                <span className="text-body-sm text-on-surface-variant font-normal">Sesuai KTP</span>
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-4 pointer-events-none text-on-surface-variant flex items-center">
                  <span className="material-symbols-outlined text-[20px]">person</span>
                </div>
                <input
                  className="w-full h-[52px] pl-11 pr-4 rounded-xl bg-surface-container-lowest text-on-surface placeholder:text-outline text-body-lg shadow-sm focus:outline-none focus:bg-surface-bright transition-all"
                  id="fullName"
                  name="fullName"
                  placeholder="Contoh: Budi Prasetyo"
                  required
                  type="text"
                  autoComplete="name"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                className="text-label-lg text-on-surface font-semibold"
                htmlFor="email"
              >
                Alamat Email <span className="text-error">*</span>
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-4 pointer-events-none text-on-surface-variant flex items-center">
                  <span className="material-symbols-outlined text-[20px]">mail</span>
                </div>
                <input
                  className="w-full h-[52px] pl-11 pr-4 rounded-xl bg-surface-container-lowest text-on-surface placeholder:text-outline text-body-lg shadow-sm focus:outline-none focus:bg-surface-bright transition-all"
                  id="email"
                  name="email"
                  placeholder="nama@email.com"
                  required
                  type="email"
                  autoComplete="email"
                />
              </div>
              <p className="text-body-sm text-on-surface-variant">
                Surat konfirmasi dan tanda terima resmi akan dikirim ke sini.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                className="text-label-lg text-on-surface font-semibold"
                htmlFor="phoneNumber"
              >
                Nomor WhatsApp / Telepon <span className="text-error">*</span>
              </label>
              <div className="flex items-center gap-2">
                <div className="h-[52px] px-3.5 rounded-xl bg-surface-container-high text-on-surface text-label-lg flex items-center gap-1.5 shrink-0 shadow-sm font-semibold">
                  <span className="text-base leading-none">🇮🇩</span>
                  <span>+62</span>
                </div>
                <div className="relative flex-1 flex items-center">
                  <input
                    className="w-full h-[52px] px-4 rounded-xl bg-surface-container-lowest text-on-surface placeholder:text-outline text-body-lg shadow-sm focus:outline-none focus:bg-surface-bright transition-all"
                    id="phoneNumber"
                    inputMode="numeric"
                    name="phoneNumber"
                    placeholder="812-3456-7890"
                    required
                    type="tel"
                    value={phone}
                    onChange={(e) => onPhoneInput(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-1 text-secondary mt-0.5">
                <span className="material-symbols-outlined text-[16px]">verified_user</span>
                <span className="text-body-sm">Untuk verifikasi OTP instan via WhatsApp.</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                className="text-label-lg text-on-surface font-semibold"
                htmlFor="password"
              >
                Kata Sandi <span className="text-error">*</span>
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-4 pointer-events-none text-on-surface-variant flex items-center">
                  <span className="material-symbols-outlined text-[20px]">lock</span>
                </div>
                <input
                  className="w-full h-[52px] pl-11 pr-12 rounded-xl bg-surface-container-lowest text-on-surface placeholder:text-outline text-body-lg shadow-sm focus:outline-none focus:bg-surface-bright transition-all"
                  id="password"
                  minLength={8}
                  name="password"
                  placeholder="Buat kata sandi akun"
                  required
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  aria-label="Tampilkan atau sembunyikan kata sandi"
                  className="absolute right-3 w-9 h-9 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container active:scale-95 transition-transform"
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPw ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              <div className="flex items-center justify-between px-1">
                <span className="text-body-sm text-on-surface-variant">
                  Minimal 8 karakter (huruf &amp; angka)
                </span>
                {strong && (
                  <div className="flex items-center gap-1 text-label-sm text-secondary font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                    Kuat
                  </div>
                )}
              </div>
            </div>

            <div className="mt-space-xs p-space-sm rounded-xl bg-surface-container-low shadow-sm">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input className="peer sr-only" required type="checkbox" />
                <div className="w-5 h-5 rounded-md bg-surface-container-lowest peer-checked:bg-primary flex items-center justify-center shadow-sm transition-all duration-150 mt-0.5 shrink-0 border border-outline-variant">
                  <span className="material-symbols-outlined text-white text-[16px]">
                    check
                  </span>
                </div>
                <span className="text-body-md text-on-surface leading-snug">
                  Saya menyetujui{' '}
                  <span className="text-secondary font-semibold hover:underline">
                    Syarat &amp; Ketentuan
                  </span>{' '}
                  serta{' '}
                  <span className="text-secondary font-semibold hover:underline">
                    Kebijakan Privasi
                  </span>{' '}
                  Modalin.
                </span>
              </label>
            </div>

            <div className="mt-space-md flex flex-col gap-space-sm">
              <button
                className="w-full h-[52px] rounded-xl bg-primary text-on-primary text-label-lg flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-transform hover:bg-secondary font-semibold disabled:opacity-60"
                type="submit"
                disabled={busy}
              >
                <span>{busy ? 'Membuat akun...' : 'Lanjut ke Verifikasi Identitas'}</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
              <div className="flex items-center justify-center gap-1.5 text-on-surface-variant py-1">
                <span className="material-symbols-outlined text-[16px] text-secondary">
                  verified
                </span>
                <span className="text-body-sm text-center">
                  Data Anda dienkripsi dan dilindungi standar keamanan perbankan.
                </span>
              </div>
              <p className="text-center text-[13px] text-on-surface-variant">
                Sudah punya akun?{' '}
                <Link to="/login" className="font-bold text-primary hover:underline">
                  Masuk di sini
                </Link>
              </p>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
