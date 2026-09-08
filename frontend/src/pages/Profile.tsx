import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, setToken, endpoints, VERIFICATION_LABEL, type VerificationStatus } from '../lib/api';
import { VERIFICATION_TONE, type BadgeTone, Field, Notice } from '../components/ui';
import { disconnectSocket } from '../lib/socket';
import { saveSession } from '../lib/session';

const AVATAR_FALLBACK =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCrp8cYS31KBcm2N1aqUC0-82F_te_wptw8y_HUQmoOcizapk89yDypUjoN0k7ES_UhCe5a0hM1TY2kj50PE73vnGuiIboW5VBM6dPuHk81psTKHmqgY7MkBx9q4NrHmIydRdQkqoAcFOax6rOUPdnHP7UFpC58Gncpl59IWGenxEefTcFt1OTwV2zdZKV5dFOegMkh-fN5yX8nFtZjxaOSlA4LZ1qOZ_Y-Frp5IVsq40IM3fE_mypw';
const IMG_GERAI =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuA2Yy5JkQwQ7d0IvnA_TbGVzWi8TdRKEbZba6eC2_oLnRQRtNrLGyVZnBOH3gU7gWkAGrLA5VbfLQLVeJLK0fiKZ6KI8XIME1S--6Es2WkZY_fuZFH5ydCLSIMxTJiTwlsAqhhHhZzI-UV_PyN6SIbmXKgdpefvrKWPA5a3k6d8ZRnIWYFkeAB2Ri_t5_CPSfNwuKa77RG1Ew7IFwktMpQtIyr18CMrJv2p1_4Lt-CV6Eh7NQXWTxP3';
const IMG_PRODUK =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCEr1lFyGs6GJmAYRwwHNTQiotpJqDFtSfqDbj6m-9IrDP6u8p7zR8rhqcMvndJ6Wwh6qjJBdy5f5k6FB5d5jcmxZ-K04exleScP28nKHGo-9PJslTCAx7zOvg63vjwUWNsIaDEeUmD9PK71DDF618QbCn24vIV1_8LQzKCsaPSqoVOe0LA835dSwu2Fw_qt8LA6Cmb4QQXiSggRNGB989nF9_VRfFYcmS8uDrEkn9etK40_KdFEYEn';

/** Warna pill mengikuti status verifikasi (satu sumber: VERIFICATION_TONE). */
const TONE_PILL: Record<BadgeTone, string> = {
  success: 'bg-secondary-container text-on-secondary-container',
  warning: 'bg-[#FDF0D3] text-[#7A5B00]',
  danger: 'bg-error-container text-on-error-container',
  soft: 'bg-surface-container-high text-on-surface-variant',
  primary: 'bg-primary text-on-primary',
};

/**
 * Port 1:1 dari Mockup/a2. Tab Profil Pengusaha UMKM (Menu Edit Profil).html
 * (route /app/profile). Struktur section, class Tailwind, copy Indonesia, dan
 * ikon Material Symbols dipertahankan verbatim dari mockup.
 * Bottom nav mockup TIDAK diport (sudah ada nav global dari Layout).
 * Data dinamis (nama, usaha, lokasi, foto, skor, status verifikasi) diisi dari
 * API; angka etalase yang belum ada endpoint-nya memakai placeholder mockup.
 * Logic yang dipertahankan: useQuery profile/business, VERIFICATION_LABEL,
 * VERIFICATION_TONE, form edit kontak (PATCH /api/profile/me), logout.
 */
export function ProfilePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api<Profile>(`/api/profile/me`),
    staleTime: 30_000,
  });
  const { data: business } = useQuery({
    queryKey: ['business'],
    queryFn: endpoints.business,
    staleTime: 30_000,
  });
  const [editing, setEditing] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col w-full max-w-md mx-auto px-gutter-mobile pt-4 pb-6">
        <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm">
          <p className="font-body-md text-body-md text-on-surface-variant">Memuat profil...</p>
        </div>
      </div>
    );
  }

  const status = profile?.verificationStatus ?? 'UNVERIFIED';
  const tone = VERIFICATION_TONE[status];
  const verifyBadgeClass =
    status === 'VERIFIED' ? 'bg-tertiary-fixed text-on-tertiary-fixed' : TONE_PILL[tone];
  const verifyBadgeText = status === 'VERIFIED' ? 'OJK / KYC' : VERIFICATION_LABEL[status];

  const breakdown = profile?.trustScoreBreakdown ?? null;
  const completeness = breakdown?.profileCompleteness ?? 75;
  const score = profile?.trustScore ?? 0;
  const fullName = profile?.fullName ?? 'Pengusaha UMKM';

  const biz = (business ?? {}) as {
    name?: string;
    location?: string | null;
    sector?: { name?: string } | null;
  };
  const businessName = biz.name ?? 'Belum ada nama usaha';
  const sectorName = biz.sector?.name ?? null;
  const location = profile?.location ?? biz.location ?? null;
  const metaLine = [sectorName, location].filter(Boolean).join(' • ') || 'Lokasi belum diisi';

  function handleLogout() {
    // Sama seperti LogoutButton di Layout: bersihkan token, sesi, cache,
    // dan socket sekaligus supaya tidak ada data pengguna sebelumnya
    // yang tertinggal di perangkat bersama.
    setToken(null);
    saveSession(null);
    disconnectSocket();
    qc.clear();
    endpoints.logout().catch(() => undefined);
    navigate('/login');
  }

  return (
    <div className="flex flex-col w-full space-y-space-md px-gutter-mobile pt-4 pb-6 max-w-md mx-auto">
      {/* Top Utility Context Bar */}
      <div className="flex items-center justify-between py-space-2xs">
        <div className="flex flex-col">
          <div className="flex items-center gap-space-2xs">
            <span className="font-headline-sm text-headline-sm text-primary">Profil Saya</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm tracking-wide">
              <span
                className="material-symbols-outlined text-[12px] mr-1"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                verified
              </span>
              UMKM BINAAN
            </span>
          </div>
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            Kelola profil usaha dan kelayakan pendanaan
          </span>
        </div>
        <div className="flex items-center gap-space-xs">
          <Link
            aria-label="Notifikasi Profil"
            to="/app/chat"
            className="relative w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-secondary"></span>
          </Link>
          <Link
            aria-label="Pengaturan Akun"
            to="/app/verifikasi"
            className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
          </Link>
        </div>
      </div>

      {/* Profile Header Card */}
      <div className="relative overflow-hidden rounded-2xl bg-surface-container-lowest p-space-md shadow-sm">
        <div className="flex items-start gap-space-md">
          <div className="relative shrink-0">
            <img
              className="w-16 h-16 rounded-full object-cover shadow-sm"
              src={profile?.avatarUrl ?? AVATAR_FALLBACK}
              alt={fullName}
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
                className={`inline-flex items-center px-1.5 py-0.5 rounded font-label-sm text-label-sm ${verifyBadgeClass}`}
              >
                {verifyBadgeText}
              </span>
            </div>
            <p className="font-body-md text-body-md text-primary font-semibold truncate mt-0.5">
              {businessName}
            </p>
            <div className="flex items-center gap-1 text-on-surface-variant font-body-sm text-body-sm mt-0.5">
              <span className="material-symbols-outlined text-[15px] text-secondary">storefront</span>
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
                    Terpercaya
                  </span>
                </div>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Skor Kredibilitas Usaha
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
          {/* Expandable Breakdown */}
          {showBreakdown && (
            <div className="mt-space-sm pt-space-xs space-y-1.5">
              <div className="flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] text-secondary">check_circle</span>
                  KTP &amp; NIB Valid Terverifikasi
                </span>
                <span className="font-label-md text-label-md text-primary font-semibold">
                  +{breakdown?.verification ?? 40}
                </span>
              </div>
              <div className="flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] text-secondary">check_circle</span>
                  Riwayat Imbal Hasil Tepat Waktu
                </span>
                <span className="font-label-md text-label-md text-primary font-semibold">
                  +{breakdown?.rating ?? 30}
                </span>
              </div>
              <div className="flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] text-secondary">check_circle</span>
                  Kelengkapan Portofolio Toko
                </span>
                <span className="font-label-md text-label-md text-primary font-semibold">
                  +{breakdown?.profileCompleteness ?? 18}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Primary Action Banner: Edit & Etalase Usaha */}
      <div className="relative overflow-hidden rounded-2xl bg-surface-container-lowest p-space-md shadow-sm">
        <div className="flex items-start justify-between gap-space-xs">
          <div>
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm mb-1">
              <span className="material-symbols-outlined text-[12px]">spark</span>
              Prioritas Investor
            </div>
            <h3 className="font-headline-sm text-headline-sm text-primary font-bold">
              Edit Profil &amp; Etalase Usaha
            </h3>
            <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
              Perbarui data dasar, kebutuhan modal, skema bagi hasil, dan portofolio berkas usaha Anda.
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed shrink-0">
            <span className="material-symbols-outlined text-[24px]">storefront</span>
          </div>
        </div>
        {/* Progress Indicator */}
        <div className="mt-space-md space-y-1.5">
          <div className="flex items-center justify-between font-label-md text-label-md">
            <span className="text-on-surface-variant">Kelengkapan Berkas Etalase</span>
            <span className="text-secondary font-bold">{completeness}% Lengkap</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-surface-container-high overflow-hidden">
            <div
              className="h-full rounded-full bg-secondary transition-all duration-500"
              style={{ width: `${completeness}%` }}
            ></div>
          </div>
          <div className="flex items-center gap-1 text-on-surface-variant font-body-sm text-body-sm pt-0.5">
            <span className="material-symbols-outlined text-[14px] text-secondary">info</span>
            <span>Tambahkan laporan keuangan Q3 untuk naik ke 90%</span>
          </div>
        </div>
        {/* CTA Button */}
        <Link
          to="/app/profile/edit"
          className="mt-space-md w-full min-h-[50px] px-space-md rounded-xl bg-primary text-on-primary font-title-md text-title-md font-semibold flex items-center justify-between shadow-md active:scale-[0.98] transition-transform"
        >
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">edit_document</span>
            <span>Buka Form Edit Profil (4 Langkah)</span>
          </span>
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </Link>
      </div>

      {/* Showcase Snapshot Mini-Gallery */}
      <div className="space-y-space-xs">
        <div className="flex items-center justify-between px-1">
          <h4 className="font-label-lg text-label-lg text-primary uppercase tracking-wide">
            Pratinjau Etalase Publik
          </h4>
          <Link
            to="/app/explore"
            className="font-label-md text-label-md text-secondary font-semibold cursor-pointer"
          >
            Lihat Sebagai Investor
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-space-xs">
          <div className="relative rounded-xl overflow-hidden bg-surface-container h-24">
            <img className="w-full h-full object-cover" src={IMG_GERAI} alt="Gerai utama kopi" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent flex items-end p-2">
              <span className="text-on-primary font-label-sm text-label-sm font-semibold truncate">
                Gerai Utama Kopi
              </span>
            </div>
          </div>
          <div className="relative rounded-xl overflow-hidden bg-surface-container h-24">
            <img
              className="w-full h-full object-cover"
              src={IMG_PRODUK}
              alt="Kemasan dan produk"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent flex items-end p-2">
              <span className="text-on-primary font-label-sm text-label-sm font-semibold truncate">
                Kemasan &amp; Produk
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Management Groups */}
      <div className="space-y-space-md pt-space-xs">
        {/* Group 1: Informasi Bisnis & Portofolio */}
        <div className="space-y-space-xs">
          <span className="px-1 font-label-sm text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">
            Informasi Bisnis &amp; Portofolio
          </span>
          <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm">
            <Link
              to="/app/profile/edit"
              className="flex items-center justify-between p-space-md hover:bg-surface-container-low transition-colors"
            >
              <div className="flex items-center gap-space-sm min-w-0">
                <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-[20px]">badge</span>
                </div>
                <div className="min-w-0">
                  <div className="font-title-md text-title-md text-primary font-semibold truncate">
                    Data Dasar &amp; Legalitas Usaha
                  </div>
                  <div className="font-body-sm text-body-sm text-on-surface-variant truncate">
                    NIB, KTP, Alamat Gerai Terdaftar
                  </div>
                </div>
              </div>
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant shrink-0 ml-2">
                chevron_right
              </span>
            </Link>
            <div className="h-[1px] bg-surface-container-high mx-space-md"></div>
            <Link
              to="/app/profile/edit"
              className="flex items-center justify-between p-space-md hover:bg-surface-container-low transition-colors"
            >
              <div className="flex items-center gap-space-sm min-w-0">
                <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-[20px]">handshake</span>
                </div>
                <div className="min-w-0">
                  <div className="font-title-md text-title-md text-primary font-semibold truncate">
                    Kebutuhan Dana &amp; Skema Kerja Sama
                  </div>
                  <div className="font-body-sm text-body-sm text-secondary font-semibold truncate">
                    Bagi Hasil 18% • Target Rp 75.000.000
                  </div>
                </div>
              </div>
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant shrink-0 ml-2">
                chevron_right
              </span>
            </Link>
            <div className="h-[1px] bg-surface-container-high mx-space-md"></div>
            <Link
              to="/app/rekam-jejak"
              className="flex items-center justify-between p-space-md hover:bg-surface-container-low transition-colors"
            >
              <div className="flex items-center gap-space-sm min-w-0">
                <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-[20px]">folder_special</span>
                </div>
                <div className="min-w-0">
                  <div className="font-title-md text-title-md text-primary font-semibold truncate">
                    Berkas &amp; Portofolio Produk
                  </div>
                  <div className="font-body-sm text-body-sm text-on-surface-variant truncate">
                    Pitch Deck PDF, Foto Gerai, Lapkeu Q2
                  </div>
                </div>
              </div>
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant shrink-0 ml-2">
                chevron_right
              </span>
            </Link>
          </div>
        </div>

        {/* Group 2: Reputasi & Kemitraan */}
        <div className="space-y-space-xs">
          <span className="px-1 font-label-sm text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">
            Reputasi &amp; Kemitraan
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
                    Riwayat Kemitraan &amp; Ulasan
                  </div>
                  <div className="flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant">
                    <span className="text-secondary font-bold">4.9 ★</span>
                    <span>(3 Investor Aktif) • Lihat Detail</span>
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
                    Dokumen Perjanjian &amp; SPK Digital
                  </div>
                  <div className="font-body-sm text-body-sm text-on-surface-variant truncate">
                    Arsip Akad Musyarakah &amp; Lembar OJK
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
                    Pengaturan Keamanan &amp; PIN
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
                    Bantuan &amp; Layanan Pengusaha
                  </div>
                  <div className="font-body-sm text-body-sm text-on-surface-variant truncate">
                    Pusat Edukasi Akad &amp; Konsultasi FAQ
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

      {/* Detail kontak — form edit cepat (PATCH /api/profile/me), gaya kartu mockup */}
      <section
        aria-label="Detail kontak"
        className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm"
      >
        {!editing ? (
          <>
            <div className="flex items-center justify-between mb-space-xs">
              <h3 className="font-title-md text-title-md text-primary font-semibold">Detail Kontak</h3>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="px-3 py-1.5 rounded-full bg-surface-container-high text-primary font-label-md text-label-md active:scale-95 transition-transform"
              >
                Ubah profil
              </button>
            </div>
            <div className="space-y-space-xs">
              <div className="flex items-center justify-between gap-space-sm">
                <span className="font-body-sm text-body-sm text-on-surface-variant">Nomor HP</span>
                <span className="font-body-md text-body-md text-primary font-medium text-right">
                  {profile?.phone || '-'}
                </span>
              </div>
              <div className="h-[1px] bg-surface-container-high"></div>
              <div className="flex items-center justify-between gap-space-sm">
                <span className="font-body-sm text-body-sm text-on-surface-variant">Lokasi</span>
                <span className="font-body-md text-body-md text-primary font-medium text-right">
                  {profile?.location || '-'}
                </span>
              </div>
              <div className="h-[1px] bg-surface-container-high"></div>
              <div className="flex items-center justify-between gap-space-sm">
                <span className="font-body-sm text-body-sm text-on-surface-variant">Tentang</span>
                <span className="font-body-md text-body-md text-primary font-medium text-right truncate max-w-[60%]">
                  {profile?.bio || '-'}
                </span>
              </div>
            </div>
          </>
        ) : (
          <EditProfile
            profile={profile}
            onDone={() => {
              setEditing(false);
              qc.invalidateQueries({ queryKey: ['profile'] });
            }}
          />
        )}
      </section>

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

function EditProfile({ profile = {}, onDone }: { profile?: Profile; onDone: () => void }) {
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const mutation = useMutation({
    mutationFn: (data: unknown) => api('/api/profile/me', { method: 'PATCH', json: data }),
    onSuccess: () => {
      setSaved(true);
      qc.invalidateQueries({ queryKey: ['profile'] });
      setTimeout(onDone, 700);
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Gagal menyimpan.'),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSaved(false);
    const data = Object.fromEntries(new FormData(e.currentTarget));
    mutation.mutate(data);
  }

  return (
    <form className="stack" onSubmit={onSubmit} aria-label="Ubah profil dasar">
      {error && <Notice tone="error">{error}</Notice>}
      {saved && <Notice tone="success">Profil tersimpan!</Notice>}
      <Field label="Nama lengkap">
        <input className="input" name="fullName" defaultValue={profile?.fullName} minLength={2} required />
      </Field>
      <Field label="Nomor HP">
        <input className="input" name="phone" defaultValue={profile?.phone ?? ''} />
      </Field>
      <Field label="Lokasi">
        <input className="input" name="location" defaultValue={profile?.location ?? ''} />
      </Field>
      <Field label="Tentang">
        <textarea className="textarea" name="bio" defaultValue={profile?.bio ?? ''} />
      </Field>
      <div className="hero-actions">
        <button className="btn btn-primary" type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Menyimpan...' : 'Simpan perubahan'}
        </button>
        <button className="btn btn-outline" type="button" onClick={onDone}>
          Batal
        </button>
      </div>
    </form>
  );
}

type Profile = {
  fullName?: string;
  phone?: string | null;
  location?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  isVerified?: boolean;
  verificationStatus?: VerificationStatus;
  trustScore?: number;
  trustScoreBreakdown?: { total: number; profileCompleteness: number; verification: number; rating: number } | null;
};
