import { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  COOPERATION_LABEL,
  api,
  setToken,
  endpoints,
  VERIFICATION_LABEL,
  type Agreement,
  type MyProfile,
} from '../lib/api';
import { Notice, Spinner, type BadgeTone } from '../components/ui';
import { disconnectSocket } from '../lib/socket';
import { readSession, saveSession } from '../lib/session';
import { formatRupiah, formatRupiahSingkat, formatTanggal } from '../lib/format';

/**
 * Port 1:1 dari Mockup/b2. Tab Profil Investor - Kelola Portofolio (Mobile).html
 * (route /app/rekam-jejak untuk peran INVESTOR). Struktur section, class
 * Tailwind, copy Indonesia, dan ikon Material Symbols dipertahankan verbatim
 * dari mockup. Bottom nav mockup TIDAK diport (sudah ada nav global Layout).
 *
 * Section mockup yang diport:
 *  1. Top Utility Context Bar ("Profil Investor" + "INVESTOR TERAKREDITASI").
 *  2. Kartu identitas & kredibilitas + widget skor trust (Rincian expandable).
 *  3. Kartu "Ikhtisar Investasi" + CTA "Kelola Preferensi & Alokasi Modal".
 *  4. Showcase "Portofolio & Rekam Jejak" (grid 2 kartu).
 *  5. Grup menu: Informasi Finansial & Legalitas, Kemitraan & Tata Kelola,
 *     Akun & Keamanan.
 *  6. Tombol "Keluar Akun" + baris versi OJK.
 *
 * Mapping data API -> visual (fallback mockup bila kosong, pola dashboard):
 *  - GET /api/profile/me -> nama, avatar, bio/peran, lokasi, skor + rincian.
 *  - GET /api/agreements -> total modal disalurkan, hitung UMKM aktif,
 *    kartu showcase, hitung arsip kontrak. Kosong -> placeholder mockup
 *    (Rp 175.000.000, 4 UMKM, Kopi Seduh Nusantara, Dapur Manis Pastry).
 *  - GET /api/profile/investor-preference -> baris tiket modal.
 *  - GET /api/profile/portfolio -> daftar berkas rekam jejak (Lihat/Hapus).
 *  - Rata-rata imbal hasil & saldo escrow belum ada endpoint -> placeholder.
 *
 * Logic yang dipertahankan: query portfolio + loading/error/empty states,
 * unggah berkas (batas 10 MB, whitelist tipe), hapus/lihat berkas,
 * link /app/preferensi/edit, notice sukses dari wizard investor-edit,
 * logout (bersih token/sesi/cache/socket). Peran UMKM memakai cabang
 * Berkas pendukung usaha yang sama seperti sebelumnya.
 */

const AVATAR_FALLBACK =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCK_hP77i1w72-P01YQ3Jz0eW4fR1W-PkW0x2W26g4x1o4hD7tQ909x5f_3qR3c0yRzP7N_2EwA-X9A=s160';

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp';

/** Warna pill mengikuti status verifikasi (disalin dari Profile.tsx). */
const TONE_PILL: Record<BadgeTone, string> = {
  success: 'bg-secondary-container text-on-secondary-container',
  warning: 'bg-[#FDF0D3] text-[#7A5B00]',
  danger: 'bg-error-container text-on-error-container',
  soft: 'bg-surface-container-high text-on-surface-variant',
  primary: 'bg-primary text-on-primary',
};

const DEAL_STATUS: Record<string, { text: string; pill: string }> = {
  ACTIVE: { text: 'Aktif', pill: 'bg-secondary-container text-on-secondary-container' },
  SIGNED: { text: 'Siap Jalan', pill: 'bg-secondary-container text-on-secondary-container' },
  COMPLETED: { text: 'Selesai Lancar', pill: 'bg-surface-container-high text-on-surface-variant' },
  WAITING_SIGNATURE: { text: 'Menunggu TTD', pill: 'bg-[#FBEFD2] text-[#8A5A00]' },
  DRAFT: { text: 'Draf', pill: 'bg-surface-container-high text-on-surface-variant' },
  CANCELLED: { text: 'Dibatalkan', pill: 'bg-surface-container-high text-on-surface-variant' },
};

const INPUT_CLS =
  'w-full h-[52px] px-4 rounded-xl bg-surface-container-low text-on-surface placeholder:text-outline font-body-md text-body-md shadow-sm focus:outline-none focus:bg-surface-bright transition-all';

type Preference = {
  minimumAmount?: string | number | null;
  maximumAmount?: string | number | null;
  preferredLocation?: string | null;
  preferredSectorId?: string | null;
  cooperationTypes?: string[];
};

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;

export function PortfolioPage() {
  const session = readSession();
  if (session?.role !== 'INVESTOR') return <UmkmPortfolio />;
  return <InvestorPortfolio />;
}

/* ---------------- Investor (mockup b2) ---------------- */

function InvestorPortfolio() {
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const [showBreakdown, setShowBreakdown] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api<MyProfile>(`/api/profile/me`),
    staleTime: 30_000,
  });
  const { data: preference } = useQuery({
    queryKey: ['investor-preference'],
    queryFn: () => endpoints.investorPreference() as Promise<Preference | null>,
    staleTime: 30_000,
  });
  const { data: agreements } = useQuery({
    queryKey: ['agreements'],
    queryFn: endpoints.agreements,
    staleTime: 15_000,
  });

  const notice = (location.state as { notice?: string } | null)?.notice ?? null;

  const status = profile?.verificationStatus ?? 'UNVERIFIED';
  const verifyBadgeClass =
    status === 'VERIFIED' ? 'bg-tertiary-fixed text-on-tertiary-fixed' : TONE_PILL[toneOf(status)];
  const verifyBadgeText = status === 'VERIFIED' ? 'OJK / KYC Terverifikasi' : VERIFICATION_LABEL[status];

  const breakdown = profile?.trustScoreBreakdown ?? null;
  const score = profile?.trustScore ?? 94;
  const fullName = profile?.fullName ?? 'Hendrik Kusuma, S.E.';
  const roleLine = profile?.bio ?? 'Angel Investor & Praktisi Bisnis F&B';
  const metaLine = profile?.location
    ? `${profile.location} • Escrow Mandiri Aktif`
    : 'Anggota ANGIN • Escrow Mandiri Aktif';

  const deals = agreements ?? [];
  const activeCount = deals.filter((a) => a.status === 'ACTIVE' || a.status === 'SIGNED').length;
  const totalModal = deals.reduce((sum, a) => sum + Number(a.amount || 0), 0);

  const minAmt = Number(preference?.minimumAmount ?? 0);
  const maxAmt = Number(preference?.maximumAmount ?? 0);
  const ticketLine =
    minAmt > 0 || maxAmt > 0
      ? `Tiket ${formatRupiahSingkat(minAmt)} - ${formatRupiahSingkat(maxAmt)}`
      : 'F&B, Agribisnis • Tiket Rp 25 - 100 Jt';

  function handleLogout() {
    // Sama seperti Profile.tsx: bersihkan token, sesi, cache, dan socket
    // sekaligus supaya tidak ada data pengguna sebelumnya yang tertinggal.
    setToken(null);
    saveSession(null);
    disconnectSocket();
    qc.clear();
    endpoints.logout().catch(() => undefined);
    navigate('/login');
  }

  return (
    <div className="flex flex-col w-full space-y-space-md px-gutter-mobile pt-4 pb-6 max-w-md mx-auto">
      {notice && <Notice tone="success">{notice}</Notice>}

      {/* Top Utility Context Bar */}
      <div className="flex items-center justify-between py-space-2xs">
        <div className="flex flex-col">
          <div className="flex items-center gap-space-2xs">
            <span className="font-headline-sm text-headline-sm text-primary">Profil Investor</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm tracking-wide font-semibold">
              <span
                className="material-symbols-outlined text-[12px] mr-1"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                verified
              </span>
              INVESTOR TERAKREDITASI
            </span>
          </div>
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            Kelola portofolio, preferensi modal &amp; data legalitas pemodal
          </span>
        </div>
      </div>

      {/* Investor Identity & Credibility Card */}
      <div className="relative overflow-hidden rounded-2xl bg-surface-container-lowest p-space-md shadow-sm">
        <div className="flex items-start gap-space-md">
          <div className="relative shrink-0">
            <img
              alt={fullName}
              className="w-16 h-16 rounded-full object-cover shadow-sm ring-2 ring-surface"
              src={profile?.avatarUrl ?? AVATAR_FALLBACK}
            />
            {status === 'VERIFIED' && (
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-secondary text-on-secondary flex items-center justify-center shadow">
                <span
                  className="material-symbols-outlined text-[13px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check
                </span>
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="font-title-md text-title-md text-primary font-bold truncate">{fullName}</h2>
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded font-label-sm text-label-sm font-semibold ${verifyBadgeClass}`}
              >
                {verifyBadgeText}
              </span>
            </div>
            <p className="font-body-md text-body-md text-primary font-semibold truncate mt-0.5">
              {roleLine}
            </p>
            <div className="flex items-center gap-1 text-on-surface-variant font-body-sm text-body-sm mt-0.5">
              <span className="material-symbols-outlined text-[15px] text-secondary">account_balance</span>
              <span className="truncate">{metaLine}</span>
            </div>
          </div>
        </div>

        {/* Trust Score Insight Widget */}
        <div className="mt-space-md pt-space-sm bg-surface-container-low rounded-xl p-space-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-xs">
              <div className="w-9 h-9 rounded-full bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed">
                <span className="material-symbols-outlined text-[18px]">verified_user</span>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="font-headline-sm text-headline-sm text-primary font-bold">{score}</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">/ 100</span>
                  <span className="font-label-sm text-label-sm text-secondary font-bold px-1.5 py-0.5 bg-surface-container-lowest rounded-full ml-1">
                    Investor Sangat Terpercaya
                  </span>
                </div>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Kredibilitas Pemodal (Peringkat A+)
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowBreakdown((v) => !v)}
              aria-expanded={showBreakdown}
              className="text-secondary font-label-md text-label-md flex items-center gap-0.5 active:opacity-75"
            >
              <span>Rincian</span>
              <span
                className="material-symbols-outlined text-[16px] transition-transform"
                style={{ transform: showBreakdown ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                expand_more
              </span>
            </button>
          </div>
          {showBreakdown && (
            <div className="mt-space-sm pt-space-xs space-y-1.5">
              <div className="flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] text-secondary">check_circle</span>
                  KTP &amp; NPWP Terverifikasi DJP
                </span>
                <span className="font-label-md text-label-md text-primary font-semibold">
                  +{breakdown?.verification ?? 45}
                </span>
              </div>
              <div className="flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] text-secondary">check_circle</span>
                  Rekam Jejak {deals.length > 0 ? deals.length : 4} Pendanaan Tanpa Sengketa
                </span>
                <span className="font-label-md text-label-md text-primary font-semibold">
                  +{breakdown?.rating ?? 35}
                </span>
              </div>
              <div className="flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] text-secondary">check_circle</span>
                  Verifikasi Rekening Escrow RDL Mandiri
                </span>
                <span className="font-label-md text-label-md text-primary font-semibold">
                  +{breakdown?.profileCompleteness ?? 14}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Investor Key Metrics & Portfolio Summary Card */}
      <div className="relative overflow-hidden rounded-2xl bg-surface-container-lowest p-space-md shadow-sm">
        <div className="flex items-start justify-between gap-space-xs mb-space-sm">
          <div>
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm mb-1">
              <span className="material-symbols-outlined text-[12px]">monitoring</span>
              Ringkasan Finansial
            </div>
            <h3 className="font-headline-sm text-headline-sm text-primary font-bold">Ikhtisar Investasi</h3>
          </div>
          <div className="w-11 h-11 rounded-xl bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed shrink-0">
            <span className="material-symbols-outlined text-[24px]">wallet</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-space-xs bg-surface-container-low p-space-sm rounded-xl mb-space-sm">
          <div>
            <span className="font-body-sm text-body-sm text-on-surface-variant block">
              Total Modal Disalurkan
            </span>
            <span className="font-title-md text-title-md font-bold text-primary block mt-0.5">
              {totalModal > 0 ? formatRupiah(totalModal) : 'Rp 175.000.000'}
            </span>
            <span className="font-label-sm text-label-sm text-secondary font-semibold">
              {activeCount > 0 ? activeCount : 4} UMKM Aktif
            </span>
          </div>
          <div>
            <span className="font-body-sm text-body-sm text-on-surface-variant block">
              Rata-rata Imbal Hasil
            </span>
            <span className="font-title-md text-title-md font-bold text-secondary block mt-0.5">
              18.4% p.a.
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Bagi Hasil Syirkah</span>
          </div>
        </div>
        <div className="flex items-center justify-between p-space-xs px-space-sm rounded-lg bg-surface-container">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-secondary">lock</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">Saldo Siaga / Escrow RDL</span>
          </div>
          <span className="font-label-md text-label-md font-bold text-primary">Rp 50.000.000</span>
        </div>
        {/* CTA Button */}
        <Link
          to="/app/preferensi/edit"
          className="mt-space-md w-full min-h-[50px] px-space-md rounded-xl bg-primary text-on-primary font-title-md text-title-md font-semibold flex items-center justify-between shadow-md active:scale-[0.98] transition-transform"
        >
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">tune</span>
            <span>Kelola Preferensi &amp; Alokasi Modal</span>
          </span>
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </Link>
      </div>

      {/* Showcase Portofolio Investasi */}
      <div className="space-y-space-xs">
        <div className="flex items-center justify-between px-1">
          <h4 className="font-label-lg text-label-lg text-primary uppercase tracking-wide">
            Portofolio &amp; Rekam Jejak
          </h4>
          <Link
            to="/app/agreements"
            className="font-label-md text-label-md text-secondary font-semibold cursor-pointer"
          >
            Lihat Semua ({deals.length > 0 ? deals.length : 4} UMKM)
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-space-xs">
          {deals.length > 0 ? (
            deals
              .slice(0, 2)
              .map((deal) => <DealCard key={deal.id} deal={deal} />)
          ) : (
            <>
              <div className="relative rounded-xl overflow-hidden bg-surface-container-lowest p-space-sm shadow-sm border border-surface-container-high">
                <div className="flex items-center justify-between mb-1">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-secondary-container text-on-secondary-container font-label-sm text-[11px] font-bold">
                    Aktif
                  </span>
                  <span className="font-label-sm text-[11px] text-secondary font-bold">18% Bagi Hasil</span>
                </div>
                <h5 className="font-title-md text-[14px] text-primary font-bold truncate">
                  Kopi Seduh Nusantara
                </h5>
                <p className="font-body-sm text-[12px] text-on-surface-variant truncate">
                  F&amp;B • Modal Rp 50 Jt
                </p>
              </div>
              <div className="relative rounded-xl overflow-hidden bg-surface-container-lowest p-space-sm shadow-sm border border-surface-container-high">
                <div className="flex items-center justify-between mb-1">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-label-sm text-[11px] font-bold">
                    Selesai Lancar
                  </span>
                  <span className="font-label-sm text-[11px] text-primary font-bold">100% ROI</span>
                </div>
                <h5 className="font-title-md text-[14px] text-primary font-bold truncate">
                  Dapur Manis Pastry
                </h5>
                <p className="font-body-sm text-[12px] text-on-surface-variant truncate">
                  Kuliner • Modal Rp 35 Jt
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      <BerkasListCard />
      <UploadFormCard />

      {/* Investor Menu Groups */}
      <div className="space-y-space-md pt-space-xs">
        {/* Group 1: Informasi Finansial & Legalitas */}
        <div className="space-y-space-xs">
          <span className="px-1 font-label-sm text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">
            Informasi Finansial &amp; Legalitas
          </span>
          <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm">
            <Link
              to="/app/preferensi/edit"
              className="flex items-center justify-between p-space-md hover:bg-surface-container-low transition-colors"
            >
              <div className="flex items-center gap-space-sm min-w-0">
                <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-[20px]">badge</span>
                </div>
                <div className="min-w-0">
                  <div className="font-title-md text-title-md text-primary font-semibold truncate">
                    Data Diri &amp; Legalitas Pemodal
                  </div>
                  <div className="font-body-sm text-body-sm text-on-surface-variant truncate">
                    KTP, NPWP, Akreditasi Investor Terverifikasi
                  </div>
                </div>
              </div>
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant shrink-0 ml-2">
                chevron_right
              </span>
            </Link>
            <div className="h-[1px] bg-surface-container-high mx-space-md"></div>
            <Link
              to="/app/preferensi/edit"
              className="flex items-center justify-between p-space-md hover:bg-surface-container-low transition-colors"
            >
              <div className="flex items-center gap-space-sm min-w-0">
                <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-[20px]">tune</span>
                </div>
                <div className="min-w-0">
                  <div className="font-title-md text-title-md text-primary font-semibold truncate">
                    Preferensi Investasi &amp; Tiket Modal
                  </div>
                  <div className="font-body-sm text-body-sm text-secondary font-semibold truncate">
                    {ticketLine}
                  </div>
                </div>
              </div>
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant shrink-0 ml-2">
                chevron_right
              </span>
            </Link>
            <div className="h-[1px] bg-surface-container-high mx-space-md"></div>
            <Link
              to="/app/preferensi/edit"
              className="flex items-center justify-between p-space-md hover:bg-surface-container-low transition-colors"
            >
              <div className="flex items-center gap-space-sm min-w-0">
                <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-[20px]">account_balance</span>
                </div>
                <div className="min-w-0">
                  <div className="font-title-md text-title-md text-primary font-semibold truncate">
                    Rekening Bank &amp; Rekening Escrow
                  </div>
                  <div className="font-body-sm text-body-sm text-on-surface-variant truncate">
                    Bank Mandiri Escrow terhubung
                  </div>
                </div>
              </div>
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant shrink-0 ml-2">
                chevron_right
              </span>
            </Link>
          </div>
        </div>

        {/* Group 2: Kemitraan & Tata Kelola */}
        <div className="space-y-space-xs">
          <span className="px-1 font-label-sm text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">
            Kemitraan &amp; Tata Kelola
          </span>
          <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm">
            <Link
              to="/app/rating"
              className="flex items-center justify-between p-space-md hover:bg-surface-container-low transition-colors"
            >
              <div className="flex items-center gap-space-sm min-w-0">
                <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-[20px]">star_rate</span>
                </div>
                <div className="min-w-0">
                  <div className="font-title-md text-title-md text-primary font-semibold truncate">
                    Riwayat Kemitraan &amp; Ulasan UMKM
                  </div>
                  <div className="flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant">
                    <span className="text-secondary font-bold">5.0 ★</span>
                    <span>({deals.length > 0 ? deals.length : 6} UMKM Terdanai) • Lihat Detail</span>
                  </div>
                </div>
              </div>
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant shrink-0 ml-2">
                chevron_right
              </span>
            </Link>
            <div className="h-[1px] bg-surface-container-high mx-space-md"></div>
            <Link
              to="/app/agreements"
              className="flex items-center justify-between p-space-md hover:bg-surface-container-low transition-colors"
            >
              <div className="flex items-center gap-space-sm min-w-0">
                <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-[20px]">history_edu</span>
                </div>
                <div className="min-w-0">
                  <div className="font-title-md text-title-md text-primary font-semibold truncate">
                    Arsip Kontrak &amp; SPK Digital
                  </div>
                  <div className="font-body-sm text-body-sm text-on-surface-variant truncate">
                    {deals.length > 0 ? deals.length : 4} Dokumen Aktif tersimpan aman
                  </div>
                </div>
              </div>
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant shrink-0 ml-2">
                chevron_right
              </span>
            </Link>
          </div>
        </div>

        {/* Group 3: Akun & Keamanan */}
        <div className="space-y-space-xs">
          <span className="px-1 font-label-sm text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">
            Akun &amp; Keamanan
          </span>
          <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm">
            <Link
              to="/app/verifikasi"
              className="flex items-center justify-between p-space-md hover:bg-surface-container-low transition-colors"
            >
              <div className="flex items-center gap-space-sm min-w-0">
                <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-[20px]">shield</span>
                </div>
                <div className="min-w-0">
                  <div className="font-title-md text-title-md text-primary font-semibold truncate">
                    Pengaturan Keamanan &amp; PIN Transaksi
                  </div>
                  <div className="font-body-sm text-body-sm text-on-surface-variant truncate">
                    Autentikasi 2 Langkah Aktif
                  </div>
                </div>
              </div>
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant shrink-0 ml-2">
                chevron_right
              </span>
            </Link>
            <div className="h-[1px] bg-surface-container-high mx-space-md"></div>
            <Link
              to="/app/chat"
              className="flex items-center justify-between p-space-md hover:bg-surface-container-low transition-colors"
            >
              <div className="flex items-center gap-space-sm min-w-0">
                <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-[20px]">support_agent</span>
                </div>
                <div className="min-w-0">
                  <div className="font-title-md text-title-md text-primary font-semibold truncate">
                    Pusat Bantuan &amp; Konsultasi Hukum/Pajak
                  </div>
                  <div className="font-body-sm text-body-sm text-on-surface-variant truncate">
                    Panduan Pajak Investasi UMKM &amp; FAQ OJK
                  </div>
                </div>
              </div>
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant shrink-0 ml-2">
                chevron_right
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Logout Button Action */}
      <div className="pt-space-xs pb-space-lg">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full min-h-touch-target-min rounded-xl bg-surface-container text-error font-title-md text-title-md font-semibold flex items-center justify-center gap-space-xs active:bg-error-container active:text-on-error-container transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          <span>Keluar Akun</span>
        </button>
        <p className="text-center font-body-sm text-body-sm text-on-surface-variant mt-space-sm">
          Modalin v2.4.0 • Terdaftar &amp; Diawasi Otoritas Jasa Keuangan (OJK)
        </p>
      </div>
    </div>
  );
}

function toneOf(status: MyProfile['verificationStatus']): BadgeTone {
  if (status === 'PENDING') return 'warning';
  if (status === 'REJECTED') return 'danger';
  return 'soft';
}

/* ---------------- kartu showcase dari data kesepakatan ---------------- */

function DealCard({ deal }: { deal: Agreement }) {
  const status = DEAL_STATUS[deal.status] ?? DEAL_STATUS.DRAFT!;
  const businessName =
    deal.connection.fundingRequest?.business.name ??
    deal.connection.fundingRequest?.title ??
    'UMKM Mitra';
  const ratio = deal.profitSharingRatio ?? deal.equityPercentage ?? deal.interestRate;
  const ratioLabel = ratio != null ? `${Number(ratio)}% Bagi Hasil` : COOPERATION_LABEL[deal.cooperationType];

  return (
    <div className="relative rounded-xl overflow-hidden bg-surface-container-lowest p-space-sm shadow-sm border border-surface-container-high">
      <div className="flex items-center justify-between mb-1">
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded font-label-sm text-[11px] font-bold ${status.pill}`}
        >
          {status.text}
        </span>
        <span className="font-label-sm text-[11px] text-secondary font-bold">{ratioLabel}</span>
      </div>
      <h5 className="font-title-md text-[14px] text-primary font-bold truncate">{businessName}</h5>
      <p className="font-body-sm text-[12px] text-on-surface-variant truncate">
        Modal {formatRupiahSingkat(Number(deal.amount))} • {deal.agreementNumber}
      </p>
    </div>
  );
}

/* ---------------- berkas rekam jejak (GET/DELETE /api/profile/portfolio) ---------------- */

function BerkasListCard() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['portfolio'],
    queryFn: endpoints.portfolio,
    staleTime: 30_000,
  });

  const remove = useMutation({
    mutationFn: (id: string) => endpoints.removePortfolio(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portfolio'] });
      qc.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  const rows = data ?? [];

  return (
    <section aria-label="Berkas rekam jejak" className="space-y-space-xs">
      <span className="px-1 font-label-sm text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">
        Berkas Rekam Jejak
      </span>
      <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm">
        {isLoading && (
          <div className="p-space-md">
            <Spinner />
          </div>
        )}
        {isError && (
          <div className="p-space-md">
            <Notice tone="error">Gagal memuat berkas. Coba lagi sebentar lagi.</Notice>
          </div>
        )}
        {!isLoading && !isError && rows.length === 0 && (
          <div className="p-space-md flex items-start gap-space-xs bg-surface-container-lowest">
            <span className="material-symbols-outlined text-secondary text-[20px] flex-shrink-0 mt-0.5">
              folder_open
            </span>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Belum ada berkas. Unggah bukti pendanaan pertamamu lewat formulir di bawah — ini
              menaikkan skor kepercayaanmu.
            </p>
          </div>
        )}
        {rows.map((item, i) => (
          <div key={item.id}>
            {i > 0 && <div className="h-[1px] bg-surface-container-high mx-space-md"></div>}
            <div className="flex items-center justify-between gap-space-sm p-space-md">
              <div className="flex items-center gap-space-sm min-w-0">
                <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-[20px]">description</span>
                </div>
                <div className="min-w-0">
                  <div className="font-title-md text-title-md text-primary font-semibold truncate">
                    {item.title}
                  </div>
                  <div className="font-body-sm text-body-sm text-on-surface-variant truncate">
                    {item.fileType.replace('application/', '').replace('image/', '').toUpperCase()} •{' '}
                    {formatSize(item.fileSize)} • {formatTanggal(item.createdAt)}
                  </div>
                  {item.description && (
                    <div className="font-body-sm text-body-sm text-on-surface-variant truncate">
                      {item.description}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-space-xs shrink-0 ml-2">
                <a
                  className="px-3 py-1.5 rounded-full bg-surface-container-high text-primary font-label-md text-label-md active:scale-95 transition-transform"
                  href={item.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Lihat
                </a>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-full text-error font-label-md text-label-md active:scale-95 transition-transform disabled:opacity-50"
                  onClick={() => remove.mutate(item.id)}
                  disabled={remove.isPending}
                >
                  {remove.isPending ? 'Menghapus…' : 'Hapus'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- unggah berkas (FR-04, maks 10 MB) ---------------- */

function UploadFormCard() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const upload = useMutation({
    mutationFn: () => endpoints.addPortfolio(file!, title.trim(), description.trim() || undefined),
    onSuccess: () => {
      setDone(true);
      setError('');
      setFile(null);
      setTitle('');
      setDescription('');
      if (fileRef.current) fileRef.current.value = '';
      qc.invalidateQueries({ queryKey: ['portfolio'] });
      qc.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (err) => {
      setDone(false);
      setError(err instanceof Error ? err.message : 'Berkas gagal diunggah.');
    },
  });

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    setError('');
    setDone(false);
    const picked = e.target.files?.[0] ?? null;
    // Cegah lebih dulu di klien supaya pengguna tidak menunggu sia-sia.
    if (picked && picked.size > MAX_BYTES) {
      setError(`Ukuran berkas ${formatSize(picked.size)}, maksimal 10 MB. Coba kompres dulu ya.`);
      setFile(null);
      e.target.value = '';
      return;
    }
    setFile(picked);
    if (picked && !title) setTitle(picked.name.replace(/\.[^.]+$/, ''));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    if (!file) return setError('Pilih berkasnya dulu ya.');
    if (title.trim().length < 2) return setError('Beri judul minimal 2 huruf.');
    upload.mutate();
  }

  return (
    <section aria-label="Tambah bukti pendanaan" className="space-y-space-xs">
      <span className="px-1 font-label-sm text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">
        Tambah Bukti Pendanaan
      </span>
      <form
        onSubmit={onSubmit}
        className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm flex flex-col gap-space-sm"
      >
        {error && <Notice tone="error">{error}</Notice>}
        {done && <Notice tone="success">Berkas berhasil diunggah.</Notice>}

        <div className="flex flex-col gap-1.5">
          <label className="font-label-md text-label-md text-on-surface font-semibold" htmlFor="berkas-file">
            Berkas
          </label>
          <input
            ref={fileRef}
            id="berkas-file"
            className={INPUT_CLS}
            type="file"
            accept={ACCEPT}
            onChange={pick}
          />
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {file ? (
              <>
                {file.name} • {formatSize(file.size)}
              </>
            ) : (
              'PDF, JPG, PNG, atau WebP. Maksimal 10 MB per berkas.'
            )}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="font-label-md text-label-md text-on-surface font-semibold" htmlFor="berkas-title">
            Judul berkas
          </label>
          <input
            id="berkas-title"
            className={INPUT_CLS}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="mis. Bukti pendanaan Kopi Seduh tahap 1"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="font-label-md text-label-md text-on-surface font-semibold" htmlFor="berkas-desc">
            Keterangan (opsional)
          </label>
          <textarea
            id="berkas-desc"
            className="w-full min-h-[96px] p-4 rounded-xl bg-surface-container-low text-on-surface placeholder:text-outline font-body-md text-body-md shadow-sm focus:outline-none focus:bg-surface-bright transition-all"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ringkas isi berkasnya dalam satu-dua kalimat."
          />
        </div>

        <button
          className="w-full min-h-[50px] px-space-md rounded-xl bg-primary text-on-primary font-title-md text-title-md font-semibold flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-transform disabled:opacity-50"
          type="submit"
          disabled={upload.isPending || !file}
        >
          <span className="material-symbols-outlined text-[20px]">upload_file</span>
          <span>{upload.isPending ? 'Mengunggah…' : 'Unggah berkas'}</span>
        </button>
      </form>
    </section>
  );
}

/* ---------------- UMKM: berkas pendukung usaha (perilaku lama) ---------------- */

function UmkmPortfolio() {
  return (
    <div className="shell page-bottom max-w-md mx-auto">
      <div className="page-head">
        <h1>Berkas pendukung usaha</h1>
        <p>Lampirkan proposal, laporan, atau foto produk agar pemodal lebih percaya.</p>
      </div>

      <div className="stack">
        <UploadFormCard />
        <BerkasListCard />
      </div>
    </div>
  );
}
