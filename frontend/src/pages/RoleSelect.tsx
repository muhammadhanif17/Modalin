import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

/**
 * Port 1:1 dari Mockup/2. Pilih Peran Akun & Masuk (Mobile).html
 * Struktur, class Tailwind, copy, dan ikon Material Symbols dipertahankan
 * verbatim. Satu-satunya tambahan: state role + navigasi React.
 */
export function RoleSelectPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<'UMKM' | 'INVESTOR'>('UMKM');

  const umkmSelected = role === 'UMKM';

  return (
    <div className="min-h-screen bg-[#fef9ee] flex justify-center items-start text-[#0f2419] antialiased">
      <main className="w-full max-w-[375px] min-h-screen flex flex-col justify-between px-4 py-6 bg-[#fef9ee] relative shadow-sm">
        <div>
          <header className="flex items-center justify-between pb-4 mb-5 border-b border-[#e3dfd5]/80">
            <button
              aria-label="Kembali"
              className="w-11 h-11 rounded-full flex items-center justify-center text-[#0f2419] bg-white border border-[#e3dfd5] active:scale-95 transition-transform shadow-xs"
              type="button"
              onClick={() => navigate(-1)}
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <div className="flex items-center gap-2.5 ml-auto">
              <div className="text-right">
                <span className="text-sm font-extrabold tracking-tight block leading-tight text-[#0f2419]">
                  Modalin
                </span>
                <span className="text-[9px] font-bold text-[#2c694e] tracking-widest uppercase block">
                  PILIH PERAN
                </span>
              </div>
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuA2qJwG25EcRlaMeUJIRHiHnWMpJJjekhw2o8XjE8OOqwqxicBgfdWphuMrMGAIoq1NFgQg7xz8Qj0WNCDtcSarOTJoYWk8qgmxPlfVv3UBwqLOn6tAei4Q01YJfvskL7WvwVlnO7n_ZEXlB17_MecepvBbU1vsYWKhMtZNqsQxrc5fJSaS5Tbd7TUJKZPL3uF0fqQKyrwN8byto3mEfAFzEz1sAB4V2b1cIgdfwZXnLUECrbcNa6q7kmBdVOA_ysESUw"
                alt="Modalin Logo"
                className="w-8 h-8 rounded-lg object-contain shadow-xs shrink-0"
              />
            </div>
          </header>

          <section className="mb-5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#2c694e]/10 text-[#0f2419] text-[11px] font-semibold mb-2.5">
              <span className="material-symbols-outlined text-[14px] text-[#2c694e]">handshake</span>
              Akses Finansial Kolaboratif
            </div>
            <h1 className="text-[22px] font-extrabold tracking-tight text-[#0f2419] leading-tight mb-2">
              Siap Memulai Perjalanan Anda?
            </h1>
            <p className="text-[13px] text-[#626864] leading-relaxed">
              Tentukan peran yang sesuai dengan tujuan Anda di ekosistem investasi dan pendanaan Modalin.
            </p>
          </section>

          <section aria-label="Pilihan Peran Pengguna" className="space-y-3.5 mb-5">
            <label
              className={`relative flex items-start gap-3 p-4 rounded-2xl bg-white cursor-pointer transition-all hover:shadow-md block ${
                umkmSelected
                  ? 'border-2 border-[#0f2419] shadow-sm'
                  : 'border border-[#e3dfd5] hover:border-[#0f2419]/40 shadow-xs hover:shadow-sm'
              }`}
            >
              <input
                className="sr-only"
                name="user_role"
                type="radio"
                value="umkm"
                checked={umkmSelected}
                onChange={() => setRole('UMKM')}
              />
              <div className="w-11 h-11 rounded-xl bg-[#0f2419] text-[#bceecd] flex items-center justify-center shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[22px]">storefront</span>
              </div>
              <div className="flex-1 pr-6">
                <div className="flex items-center flex-wrap gap-1.5 mb-1.5">
                  <span className="font-bold text-[14px] text-[#0f2419]">Pengusaha / Pelaku UMKM</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#bceecd] text-[#0f2419]">
                    Cari Modal
                  </span>
                </div>
                <p className="text-[12px] text-[#626864] leading-snug mb-2.5">
                  Saya butuh modal kerja, ekspansi usaha, dan mitra pendanaan dengan skema bagi
                  hasil/penyertaan modal.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#0f2419] bg-[#f8f3e8] px-2 py-0.5 rounded-md border border-[#e3dfd5]">
                    <span className="material-symbols-outlined text-[12px] text-emerald-700 filled">
                      verified
                    </span>
                    Verifikasi NIB &amp; KTP
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#0f2419] bg-[#f8f3e8] px-2 py-0.5 rounded-md border border-[#e3dfd5]">
                    <span className="material-symbols-outlined text-[12px] text-emerald-700">
                      contract_edit
                    </span>
                    Dokumen Otomatis
                  </span>
                </div>
              </div>
              <div
                className={`absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  umkmSelected ? 'border-[#0f2419] bg-[#0f2419]' : 'border-[#c2c8c2] bg-white'
                }`}
              >
                {umkmSelected && <span className="w-2 h-2 rounded-full bg-[#bceecd]"></span>}
              </div>
            </label>

            <label
              className={`relative flex items-start gap-3 p-4 rounded-2xl bg-white cursor-pointer transition-all hover:shadow-md block ${
                !umkmSelected
                  ? 'border-2 border-[#0f2419] shadow-sm'
                  : 'border border-[#e3dfd5] hover:border-[#0f2419]/40 shadow-xs hover:shadow-sm'
              }`}
            >
              <input
                className="sr-only"
                name="user_role"
                type="radio"
                value="investor"
                checked={!umkmSelected}
                onChange={() => setRole('INVESTOR')}
              />
              <div className="w-11 h-11 rounded-xl bg-[#e8f7ee] text-[#1e3a2f] flex items-center justify-center shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[22px]">finance_chip</span>
              </div>
              <div className="flex-1 pr-6">
                <div className="flex items-center flex-wrap gap-1.5 mb-1.5">
                  <span className="font-bold text-[14px] text-[#0f2419]">Investor / Pemodal</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#e8f7ee] text-[#1e3a2f]">
                    Tanam Modal
                  </span>
                </div>
                <p className="text-[12px] text-[#626864] leading-snug mb-2.5">
                  Saya ingin mendanai bisnis UMKM terkurasi, terverifikasi OJK sandboxing, dan
                  mendapatkan imbal hasil transparan.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#0f2419] bg-[#f8f3e8] px-2 py-0.5 rounded-md border border-[#e3dfd5]">
                    <span className="material-symbols-outlined text-[12px] text-emerald-700">
                      shield
                    </span>
                    Trust Score &amp; Due Diligence
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#0f2419] bg-[#f8f3e8] px-2 py-0.5 rounded-md border border-[#e3dfd5]">
                    <span className="material-symbols-outlined text-[12px] text-emerald-700">
                      percent
                    </span>
                    Bagi Hasil Terbuka
                  </span>
                </div>
              </div>
              <div
                className={`absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  !umkmSelected ? 'border-[#0f2419] bg-[#0f2419]' : 'border-[#c2c8c2] bg-white'
                }`}
              >
                {!umkmSelected && <span className="w-2 h-2 rounded-full bg-[#bceecd]"></span>}
              </div>
            </label>
          </section>

          <section className="grid grid-cols-2 gap-2 mb-6">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/80 border border-[#e3dfd5]">
              <span className="material-symbols-outlined text-[18px] text-[#2c694e]">timer</span>
              <span className="text-[11px] font-semibold text-[#0f2419] leading-tight">
                Registrasi 3 Menit
              </span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/80 border border-[#e3dfd5]">
              <span className="material-symbols-outlined text-[18px] text-[#2c694e]">
                verified_user
              </span>
              <span className="text-[11px] font-semibold text-[#0f2419] leading-tight">
                Verifikasi Aman &amp; Resmi
              </span>
            </div>
          </section>
        </div>

        <footer className="space-y-3.5 pt-2">
          <button
            className="w-full min-h-[48px] py-3.5 px-5 rounded-xl bg-[#0f2419] hover:bg-[#1e3a2f] text-white font-bold text-[14px] flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all"
            type="button"
            onClick={() => navigate('/register', { state: { role } })}
          >
            <span>Lanjut ke Formulir Akun</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
          <div className="min-h-[44px] p-3 rounded-xl bg-white border border-[#e3dfd5] text-center shadow-xs flex items-center justify-center">
            <p className="text-[12px] text-[#626864]">
              Sudah memiliki akun terdaftar?
              <Link
                className="font-bold text-[#0f2419] hover:text-[#2c694e] underline underline-offset-2 ml-1 inline-flex items-center gap-0.5"
                to="/login"
              >
                Masuk di sini
                <span className="material-symbols-outlined text-[14px]">login</span>
              </Link>
            </p>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-center text-[10px] text-[#626864] pt-1">
            <span className="material-symbols-outlined text-[13px] text-emerald-700">lock</span>
            <span>Data dienkripsi 256-bit SSL dan terlindungi standar kerahasiaan.</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
