import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  COOPERATION_LABEL,
  endpoints,
  VERIFICATION_LABEL,
  type CooperationType,
  type Sector,
  type VerificationStatus,
} from '../lib/api';
import { Spinner, EmptyState } from '../components/ui';
import { formatRupiahSingkat, formatTanggal, initials } from '../lib/format';
import { readSession } from '../lib/session';

/**
 * Port 1:1 dari Mockup/a9. Detail Profil Investor - Rekam Jejak Pemodal
 * (Mobile UMKM).html — sudut pandang UMKM menilai calon pemodal.
 *
 * Section, class Tailwind, copy Indonesia, dan ikon Material Symbols
 * dipertahankan verbatim dari mockup. Header fixed + bottom nav mockup tidak
 * diport karena sudah dimiliki Layout (/app/*); yang diport hanya isi main:
 * context bar due-diligence, kartu profil, Trust Index, fokus investasi,
 * portofolio, ulasan, persyaratan, sticky action bar, dan toast.
 *
 * Logic API yang dipertahankan: fetch profil publik by id, banner
 * kepercayaan/verifikasi, kirim ketertarikan (FR-14, status awal PENDING),
 * serta loading/error states. Backend tidak diubah.
 */

type PublicProfile = {
  id: string;
  role: 'UMKM' | 'INVESTOR' | 'ADMIN';
  createdAt: string;
  isVerified: boolean;
  averageRating: number | null;
  ratingCount: number;
  profile: {
    fullName: string;
    avatarUrl: string | null;
    bio: string | null;
    location: string | null;
    trustScore: number;
    verificationStatus: VerificationStatus;
  };
  business: {
    id: string;
    name: string;
    description: string;
    location: string;
    establishedYear: number | null;
    employeeCount: number | null;
    sector: Sector;
    fundingRequests: {
      id: string;
      title: string;
      targetAmount: string | number;
      purpose: string;
      cooperationTypes: CooperationType[];
      tenorMonths: number | null;
      estimatedRoi: string | number | null;
    }[];
  } | null;
  investorPreference: {
    minimumAmount: string | number;
    maximumAmount: string | number;
    preferredLocation: string | null;
    cooperationTypes: CooperationType[];
    preferredSector: Sector | null;
  } | null;
  portfolios: { id: string; title: string; description: string | null; fileUrl: string; createdAt: string }[];
  ratingsReceived: {
    score: number;
    review: string | null;
    createdAt: string;
    reviewer: { profile: { fullName: string; avatarUrl: string | null } | null };
  }[];
};

/** Potret fallback verbatim dari mockup a9, dipakai bila API belum punya avatar. */
const FALLBACK_PORTRAIT =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuD0lFOvM8C7fAM3FdX8Ma2wjnfQ_yZEx2Wk1AD9Hd1LlFwx0zMIDxstcvZ9YTeQqbwLrgVHwl-cyY19uKl8jb3y9rwjhbyGv2SR1stMQjr2pZJLsQbAsZokCQOgM67efF-zs-Zu_34Q71Uhuj_aCVzBonbL7LdqwoZc79TZe_MwNINlRh-v1KdGfy7VeQMewi7r6TPuEcuIJMQsYHpcoR19qUjlbQ_Wc45G2pjwl2gmt-8dq8FEgvU1';

/** Ikon + isi statis verbatim mockup, tampil bila API belum punya portofolio. */
const FALLBACK_PORTFOLIOS = [
  {
    icon: 'bakery_dining',
    title: 'Dapur Manis Pastry',
    sub: 'Bandung \u2022 Modal Rp 65 Jt',
    note: 'Skema Bagi Hasil \u2022 Selesai Lancar',
    trailing: 'check_circle',
  },
  {
    icon: 'local_cafe',
    title: 'Kedai Kopi Taruma',
    sub: 'Cimahi \u2022 Modal Rp 100 Jt',
    note: 'Kemitraan Berjalan \u2022 Tahun ke-2',
    trailing: 'autorenew',
  },
  {
    icon: 'storefront',
    title: 'Keripik Singkong Barokah',
    sub: 'Garut \u2022 Modal Rp 40 Jt',
    note: 'Selesai Tepat Waktu (12 Bln)',
    trailing: 'check_circle',
  },
];

/** Testimoni statis verbatim mockup, tampil bila API belum punya ulasan. */
const FALLBACK_TESTIMONIALS = [
  {
    initials: 'RH',
    chip: 'bg-secondary-container text-on-secondary-container',
    name: 'Retno H.',
    quote:
      '\u201CPak Budi sangat kooperatif dan tidak membebani operasional kami. Pembagian bagi hasil bulanan via sistem Modalin sangat jelas dan beliau sering memberi masukan rantai pasok kopi.\u201D',
    meta: 'Owner Kopi Seduh Nusantara \u2022 Didanai 2023',
  },
  {
    initials: 'HW',
    chip: 'bg-primary-fixed text-on-primary-fixed',
    name: 'Hendra W.',
    quote:
      '\u201CInvestor yang suportif dan transparan saat pencairan dana di awal. Sangat menjaga etika bisnis kemitraan UMKM.\u201D',
    meta: 'Owner Dapur Manis \u2022 Selesai Penuh',
  },
];

const PORTFOLIO_ICONS = ['bakery_dining', 'local_cafe', 'storefront'];
const REVIEW_CHIPS = [
  'bg-secondary-container text-on-secondary-container',
  'bg-primary-fixed text-on-primary-fixed',
];

function trustGrade(score: number) {
  if (score >= 90) return { badge: 'Kredibilitas A+', tag: 'Investor Sangat Terpercaya' };
  if (score >= 80) return { badge: 'Kredibilitas A', tag: 'Investor Terpercaya' };
  if (score >= 70) return { badge: 'Kredibilitas B+', tag: 'Investor Cukup Terpercaya' };
  return { badge: 'Kredibilitas B', tag: 'Investor Berkembang' };
}

/** "Rp 50 jt - 200 jt" mengikuti pola mockup "Rp 50 - 200 Jt". */
function formatTiket(min: string | number, max: string | number) {
  const low = formatRupiahSingkat(min);
  const high = formatRupiahSingkat(max).replace(/^Rp\s?/, '');
  return `${low} - ${high}`;
}

export function PartnerPage() {
  const { id = '' } = useParams();
  const session = readSession();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['partner', id],
    queryFn: () => endpoints.publicProfile(id) as Promise<PublicProfile>,
    enabled: Boolean(id),
  });

  const { data: connections } = useQuery({ queryKey: ['connections'], queryFn: endpoints.connections });

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2400);
  }

  function toggleSave() {
    const sideLabel = data?.role === 'INVESTOR' ? 'Investor' : 'Usaha';
    setSaved((prev) => {
      showToast(
        !prev
          ? `${firstNameOf(data?.profile.fullName ?? 'Mitra')} disimpan ke Daftar Pantau ${sideLabel}`
          : 'Dihapus dari Daftar Pantau',
      );
      return !prev;
    });
  }

  async function shareProfile() {
    const sideLabel = data?.role === 'INVESTOR' ? 'Calon Investor' : 'Prospektus UMKM';
    const title = `Profil ${sideLabel} - ${data?.profile.fullName ?? 'Modalin'} | Modalin`;
    const text =
      data?.role === 'INVESTOR'
        ? `Tinjau rekam jejak dan trust score ${data?.profile.fullName ?? 'pemodal ini'} di Modalin.`
        : `Tinjau prospektus usaha ${data?.business?.name ?? data?.profile.fullName ?? 'ini'} di Modalin.`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url: window.location.href });
        return;
      }
      throw new Error('no-share');
    } catch {
      try {
        await navigator.clipboard.writeText(window.location.href);
      } catch {
        /* clipboard boleh gagal di perangkat lama; toast tetap menjelaskan */
      }
      showToast('Tautan profil disalin ke clipboard!');
    }
  }

  if (isLoading) {
    return (
      <div className="w-full max-w-md mx-auto px-gutter-mobile pt-10">
        <Spinner />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="w-full max-w-md mx-auto px-gutter-mobile pt-10">
        <EmptyState icon="search" title="Mitra tidak ditemukan" message="Profil ini mungkin sudah tidak tersedia." />
      </div>
    );
  }

  const isSelf = data.id === session?.id;
  const existing = connections?.find((c) => c.senderId === data.id || c.receiverId === data.id);
  const funding = data.business?.fundingRequests ?? [];
  const isInvestorSide = data.role === 'INVESTOR' || Boolean(data.investorPreference);

  const fullName = data.profile.fullName;
  const firstName = fullName.split(' ')[0] || fullName;
  const avatar = data.profile.avatarUrl ?? FALLBACK_PORTRAIT;
  const location = data.profile.location ?? 'Coblong, Kota Bandung, Jawa Barat';
  const verified = data.profile.verificationStatus === 'VERIFIED' || data.isVerified;
  const score = data.profile.trustScore ?? 0;
  const grade = trustGrade(score);
  const avg = data.averageRating;
  const ratingSummary =
    data.ratingCount > 0 && avg != null
      ? `${avg.toFixed(1)} (${data.ratingCount} Ulasan)`
      : '5.0 (6 Ulasan)';
  const etikaValue =
    data.ratingCount > 0 && avg != null
      ? `${avg.toFixed(1)} \u2605 dari ${data.ratingCount} UMKM Terdanai`
      : '5.0 \u2605 Sempurna dari 6 UMKM Terdanai';

  const pref = data.investorPreference;
  const sectorName = pref?.preferredSector?.name ?? 'Kuliner & F&B';
  const schemeLabels = (pref?.cooperationTypes ?? []).map((t) => COOPERATION_LABEL[t]);
  const schemeValue =
    schemeLabels.length <= 1 ? (schemeLabels[0] ?? 'Bagi Hasil') : `${schemeLabels[0]} +${schemeLabels.length - 1}`;

  return (
    <div className="flex flex-col w-full max-w-md mx-auto pb-32">
      {/* Top Visual Sub-Header Context Bar */}
      <section className="w-full px-gutter-mobile pt-3 pb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          <button
            aria-label="Kembali"
            className="w-10 h-10 min-w-[40px] flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container transition-colors -ml-2"
            type="button"
            onClick={() => navigate(-1)}
          >
            <span className="material-symbols-outlined text-[22px]">arrow_back</span>
          </button>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm min-w-0">
            <span className="material-symbols-outlined text-[16px] text-secondary flex-shrink-0">verified_user</span>
            <span className="truncate">
              {isInvestorSide ? 'Uji Kelayakan Pemodal (Due Diligence)' : 'Profil Usaha & Kebutuhan Dana'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            aria-label="Simpan Profil"
            className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container transition-colors"
            type="button"
            onClick={toggleSave}
          >
            <span
              className={`material-symbols-outlined text-[22px] ${saved ? "[font-variation-settings:'FILL'_1]" : ''}`}
            >
              {saved ? 'bookmark' : 'bookmark_border'}
            </span>
          </button>
          <button
            aria-label="Bagikan Profil"
            className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container transition-colors"
            type="button"
            onClick={shareProfile}
          >
            <span className="material-symbols-outlined text-[22px]">share</span>
          </button>
        </div>
      </section>

      {/* 1. Profil Investor Card Header */}
      <section className="w-full px-gutter-mobile mt-2">
        <div className="w-full bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-md">
          <div className="flex items-start gap-space-md">
            <div className="relative flex-shrink-0">
              <img className="w-20 h-20 rounded-2xl object-cover shadow-sm" src={avatar} alt={fullName} />
              {verified && (
                <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-secondary text-on-secondary flex items-center justify-center shadow">
                  <span className="material-symbols-outlined text-[14px]">verified</span>
                </div>
              )}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <h1 className="font-headline-sm text-headline-sm text-primary font-bold truncate">
                  {!isInvestorSide && data.business ? data.business.name : fullName}
                </h1>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 line-clamp-2 leading-relaxed">
                {data.profile.bio ??
                  (isInvestorSide
                    ? 'Angel Investor & Praktisi Bisnis F&B \u2022 Anggota Asosiasi Angel Investor Indonesia'
                    : (data.business?.description ?? 'Pelaku UMKM terverifikasi Modalin'))}
              </p>
              {!isInvestorSide && data.business && (
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 truncate">
                  Owner: {fullName}
                </p>
              )}
              <div className="flex items-center gap-1 mt-2 text-on-surface-variant font-label-md text-label-md">
                <span className="material-symbols-outlined text-[16px] text-secondary">location_on</span>
                <span className="truncate">
                  {!isInvestorSide && data.business ? data.business.location : location}
                </span>
              </div>
            </div>
          </div>
          {/* Trust banner: status verifikasi APIwin, copy KYC mockup bila terverifikasi */}
          <div className="w-full bg-secondary-fixed/50 rounded-xl p-3 flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[20px] text-on-secondary-fixed flex-shrink-0">task_alt</span>
            <p className="font-label-sm text-label-sm text-on-secondary-fixed font-bold leading-tight">
              {verified
                ? isInvestorSide
                  ? 'Terverifikasi KYC KTP, NPWP & Rekening Escrow Bank Mandiri'
                  : 'Terverifikasi NIB, KTP & Rekening Escrow Bank Mandiri'
                : VERIFICATION_LABEL[data.profile.verificationStatus]}
            </p>
          </div>
        </div>
      </section>

      {/* 2. Modalin Investor Trust Index */}
      <section className="w-full px-gutter-mobile mt-space-md">
        <div className="w-full bg-primary-container text-on-primary rounded-2xl p-space-lg shadow-md flex flex-col gap-space-md relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-secondary/30 blur-2xl pointer-events-none"></div>
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-secondary-fixed">shield_lock</span>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary-fixed-dim">
                Modalin Trust Index\u2122
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-secondary/60 text-secondary-fixed font-label-sm text-label-sm font-semibold">
              {grade.badge}
            </span>
          </div>
          <div className="flex items-baseline gap-space-xs relative z-10">
            <span className="font-display-lg-mobile text-display-lg-mobile font-extrabold text-on-primary tracking-tight">
              {score}
            </span>
            <span className="font-title-md text-title-md text-primary-fixed-dim font-semibold">/ 100</span>
            <span className="ml-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container-lowest/15 text-secondary-fixed font-label-md text-label-md font-bold">
              <span className="material-symbols-outlined text-[14px]">star</span>
              {isInvestorSide ? grade.tag : grade.badge}
            </span>
          </div>
          <div className="flex flex-col gap-2.5 pt-1 relative z-10">
            <div className="flex items-center gap-2.5 bg-surface-container-lowest/10 rounded-xl p-2.5">
              <span className="material-symbols-outlined text-[18px] text-secondary-fixed flex-shrink-0">
                {isInvestorSide ? 'account_balance_wallet' : 'policy'}
              </span>
              <div className="flex flex-col min-w-0">
                <span className="font-label-sm text-label-sm text-primary-fixed-dim">
                  {isInvestorSide ? 'Kesiapan Dana Bersertifikat' : 'Legalitas & Perizinan'}
                </span>
                <span className="font-body-sm text-body-sm text-on-primary font-semibold truncate">
                  {isInvestorSide ? 'Rekening Escrow Siaga (Proof of Funds Valid)' : 'NIB & KTP Valid Dukcapil'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 bg-surface-container-lowest/10 rounded-xl p-2.5">
              <span className="material-symbols-outlined text-[18px] text-secondary-fixed flex-shrink-0">
                {isInvestorSide ? 'gavel' : 'query_stats'}
              </span>
              <div className="flex flex-col min-w-0">
                <span className="font-label-sm text-label-sm text-primary-fixed-dim">
                  {isInvestorSide ? 'Transparansi Kontrak' : 'Pembukuan & Laporan Kas'}
                </span>
                <span className="font-body-sm text-body-sm text-on-primary font-semibold truncate">
                  {isInvestorSide ? '100% Menggunakan Kontrak Standar Modalin' : 'Arus kas tercatat berkala'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 bg-surface-container-lowest/10 rounded-xl p-2.5">
              <span className="material-symbols-outlined text-[18px] text-secondary-fixed flex-shrink-0">handshake</span>
              <div className="flex flex-col min-w-0">
                <span className="font-label-sm text-label-sm text-primary-fixed-dim">Etika Kemitraan UMKM</span>
                <span className="font-body-sm text-body-sm text-on-primary font-semibold truncate">{etikaValue}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Fokus & Kebijakan Investasi */}
      {pref && (
        <section className="w-full px-gutter-mobile mt-space-md">
          <div className="w-full bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-md">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-secondary">tune</span>
              <h2 className="font-headline-sm text-headline-sm text-primary font-bold">Fokus & Kebijakan Investasi</h2>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
              Fokus berinvestasi pada UMKM sektor <span className="text-primary font-semibold">{sectorName}</span>
              {pref.preferredLocation ? (
                <>
                  {' '}di wilayah <span className="text-primary font-semibold">{pref.preferredLocation}</span>
                </>
              ) : (
                ' di wilayah Jawa Barat'
              )}{' '}
              yang sudah berjalan minimal 1 tahun dan memiliki cashflow positif. Mengutamakan skema{' '}
              <span className="text-primary font-semibold">
                {schemeLabels.length > 0 ? schemeLabels.join(', ') : 'bagi hasil proporsional tanpa bunga/riba'}
              </span>
              , dengan pendampingan manajemen berkala.
            </p>
            <div className="grid grid-cols-2 gap-space-xs mt-1">
              <div className="bg-surface-container-low rounded-xl p-3 flex flex-col justify-between">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Sektor Minat</span>
                <span className="font-title-md text-title-md text-primary font-bold mt-1">{sectorName}</span>
                <span className="font-label-sm text-label-sm text-secondary font-medium mt-0.5">Coffee shop & olahan</span>
              </div>
              <div className="bg-surface-container-low rounded-xl p-3 flex flex-col justify-between">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Tiket Investasi</span>
                <span className="font-title-md text-title-md text-primary font-bold mt-1">
                  {formatTiket(pref.minimumAmount, pref.maximumAmount)}
                </span>
                <span className="font-label-sm text-label-sm text-secondary font-medium mt-0.5">Per unit usaha</span>
              </div>
              <div className="bg-surface-container-low rounded-xl p-3 flex flex-col justify-between">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Skema Akad</span>
                <span className="font-title-md text-title-md text-primary font-bold mt-1">{schemeValue}</span>
                <span className="font-label-sm text-label-sm text-secondary font-medium mt-0.5">
                  Nisbah bersih 15% - 20%
                </span>
              </div>
              <div className="bg-surface-container-low rounded-xl p-3 flex flex-col justify-between">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Lama Pendanaan</span>
                <span className="font-title-md text-title-md text-primary font-bold mt-1">12 - 24 Bulan</span>
                <span className="font-label-sm text-label-sm text-secondary font-medium mt-0.5">Bisa perpanjangan</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Sisi UMKM: tentang usaha + kebutuhan pendanaan (tetap dipertahankan bila profilnya UMKM) */}
      {data.business && (
        <section className="w-full px-gutter-mobile mt-space-md">
          <div className="w-full bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-md">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-secondary">storefront</span>
              <h2 className="font-headline-sm text-headline-sm text-primary font-bold">Tentang Usaha</h2>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-title-md text-title-md text-primary font-bold">{data.business.name}</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-secondary">location_on</span>
                {data.business.location}
                {data.business.establishedYear ? ` \u2022 Berdiri ${data.business.establishedYear}` : ''}
                {data.business.employeeCount ? ` \u2022 ${data.business.employeeCount} pekerja` : ''}
              </span>
              <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-bold self-start mt-1">
                {data.business.sector.name}
              </span>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
              {data.business.description}
            </p>
          </div>
        </section>
      )}

      {funding.length > 0 && (
        <section className="w-full px-gutter-mobile mt-space-md">
          <div className="w-full bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-md">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-secondary">payments</span>
              <h2 className="font-headline-sm text-headline-sm text-primary font-bold">Kebutuhan Pendanaan</h2>
            </div>
            <div className="flex flex-col gap-space-sm">
              {funding.map((request) => (
                <div key={request.id} className="p-3.5 bg-surface-container-low rounded-xl flex flex-col gap-2">
                  <span className="font-title-md text-title-md text-primary font-bold">{request.title}</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">{request.purpose}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {request.cooperationTypes.map((type) => (
                      <span
                        key={type}
                        className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-bold"
                      >
                        {COOPERATION_LABEL[type]}
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-space-xs">
                    <div className="flex flex-col">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">Target Modal</span>
                      <span className="font-title-md text-title-md text-primary font-bold">
                        {formatRupiahSingkat(request.targetAmount)}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">Tenor</span>
                      <span className="font-title-md text-title-md text-primary font-bold">
                        {request.tenorMonths ? `${request.tenorMonths} Bln` : '\u2014'}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">Estimasi ROI</span>
                      <span className="font-title-md text-title-md text-primary font-bold">
                        {request.estimatedRoi != null ? `${Number(request.estimatedRoi)}%` : '\u2014'}
                      </span>
                    </div>
                  </div>
                  {!isSelf && (
                    <InterestButton
                      receiverId={data.id}
                      fundingRequestId={request.id}
                      existingStatus={existing?.status}
                      variant="block"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4. Portofolio & Rekam Jejak Pendanaan */}
      <section className="w-full px-gutter-mobile mt-space-md">
        <div className="w-full bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-secondary">history_edu</span>
              <h2 className="font-headline-sm text-headline-sm text-primary font-bold">
                {isInvestorSide ? 'Portofolio & Rekam Jejak' : 'Dokumen & Berkas Due Diligence'}
              </h2>
            </div>
            <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-bold">
              {data.portfolios.length > 0
                ? isInvestorSide
                  ? `${data.portfolios.length} UMKM Terbuka`
                  : `${data.portfolios.length} Dokumen Lengkap`
                : isInvestorSide
                  ? '3 UMKM Terbuka'
                  : 'Dokumen Lengkap'}
            </span>
          </div>
          <div className="flex flex-col gap-space-sm">
            {data.portfolios.length > 0
              ? data.portfolios.map((item, i) => (
                  <div key={item.id} className="p-3.5 bg-surface-container-low rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center flex-shrink-0 text-primary">
                        <span className="material-symbols-outlined text-[20px]">
                          {PORTFOLIO_ICONS[i % PORTFOLIO_ICONS.length]}
                        </span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-title-md text-title-md text-primary font-bold truncate">{item.title}</span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
                          {item.description ?? `Terverifikasi \u2022 ${formatTanggal(item.createdAt)}`}
                        </span>
                        <span className="font-label-sm text-label-sm text-secondary font-semibold mt-0.5">
                          Portofolio Terverifikasi Modalin
                        </span>
                      </div>
                    </div>
                    <a
                      aria-label={`Lihat ${item.title}`}
                      className="flex-shrink-0 text-secondary hover:opacity-70 transition-opacity"
                      href={item.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="material-symbols-outlined text-[22px]">check_circle</span>
                    </a>
                  </div>
                ))
              : FALLBACK_PORTFOLIOS.map((item) => (
                  <div key={item.title} className="p-3.5 bg-surface-container-low rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center flex-shrink-0 text-primary">
                        <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-title-md text-title-md text-primary font-bold truncate">{item.title}</span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">{item.sub}</span>
                        <span className="font-label-sm text-label-sm text-secondary font-semibold mt-0.5">{item.note}</span>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-secondary text-[22px] flex-shrink-0">
                      {item.trailing}
                    </span>
                  </div>
                ))}
          </div>
        </div>
      </section>

      {/* 5. Ulasan & Testimoni Pelaku UMKM */}
      <section className="w-full px-gutter-mobile mt-space-md">
        <div className="w-full bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-secondary">forum</span>
              <h2 className="font-headline-sm text-headline-sm text-primary font-bold">
                {isInvestorSide ? 'Ulasan Mitra UMKM' : 'Ulasan Investor Sebelumnya'}
              </h2>
            </div>
            <div className="flex items-center gap-1 text-secondary font-label-md text-label-md font-bold">
              <span className="material-symbols-outlined text-[16px] text-secondary [font-variation-settings:'FILL'_1]">
                star
              </span>
              <span>{ratingSummary}</span>
            </div>
          </div>
          {data.ratingsReceived.length > 0
            ? data.ratingsReceived.map((rating, i) => {
                const reviewerName = rating.reviewer.profile?.fullName ?? 'Mitra';
                return (
                  <div key={`${rating.createdAt}-${i}`} className="bg-surface-container-low rounded-xl p-space-md flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold font-label-sm text-label-sm ${REVIEW_CHIPS[i % REVIEW_CHIPS.length]}`}
                        >
                          {initials(reviewerName)}
                        </div>
                        <span className="font-title-md text-title-md text-primary font-bold">{reviewerName}</span>
                      </div>
                      <div className="flex items-center text-secondary">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <span
                            key={n}
                            className={`material-symbols-outlined text-[16px] ${n <= Math.round(rating.score) ? "[font-variation-settings:'FILL'_1]" : ''}`}
                          >
                            star
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface leading-relaxed italic">
                      {rating.review ? `\u201C${rating.review}\u201D` : `Menilai kemitraan ${rating.score}/5 tanpa catatan tambahan.`}
                    </p>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      Ulasan terverifikasi \u2022 {formatTanggal(rating.createdAt)}
                    </span>
                  </div>
                );
              })
            : FALLBACK_TESTIMONIALS.map((item) => (
                <div key={item.initials} className="bg-surface-container-low rounded-xl p-space-md flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold font-label-sm text-label-sm ${item.chip}`}
                      >
                        {item.initials}
                      </div>
                      <span className="font-title-md text-title-md text-primary font-bold">{item.name}</span>
                    </div>
                    <div className="flex items-center text-secondary">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span
                          key={n}
                          className="material-symbols-outlined text-[16px] [font-variation-settings:'FILL'_1]"
                        >
                          star
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface leading-relaxed italic">{item.quote}</p>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">{item.meta}</span>
                </div>
              ))}
        </div>
      </section>

      {/* 6. Persyaratan Pengajuan Modal */}
      {isInvestorSide && (
        <section className="w-full px-gutter-mobile mt-space-md">
          <div className="w-full bg-surface-container-high rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-sm">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-secondary">checklist</span>
              <h3 className="font-headline-sm text-headline-sm text-primary font-bold">Persyaratan Pengajuan</h3>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface leading-relaxed">
              {firstName} mengutamakan pengajuan dengan berkas awal yang ringkas dan jelas:
            </p>
            <div className="flex flex-col gap-2 mt-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-secondary">check_circle</span>
                <span className="font-body-sm text-body-sm text-on-surface font-medium">
                  Draf proposal / profil usaha singkat
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-secondary">check_circle</span>
                <span className="font-body-sm text-body-sm text-on-surface font-medium">
                  Ringkasan arus kas (cashflow) 6 bulan terakhir
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-secondary">check_circle</span>
                <span className="font-body-sm text-body-sm text-on-surface font-medium">
                  Foto tempat usaha & kegiatan operasional aktif
                </span>
              </div>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-on-surface-variant font-label-sm text-label-sm">
              <span className="material-symbols-outlined text-[14px]">lock</span>
              <span>Data pitch Anda hanya dapat diakses setelah akad NDA Modalin disetujui bersama.</span>
            </div>
          </div>
        </section>
      )}

      {/* 7. Sticky Bottom Action Bar */}
      {!isSelf && (
        <div className="fixed bottom-16 inset-x-0 z-40 bg-surface/95 backdrop-blur-md px-gutter-mobile py-2.5 shadow-[0_-4px_16px_rgba(15,36,25,0.06)]">
          <div className="max-w-[430px] mx-auto flex items-center gap-space-xs">
            <button
              aria-label="Simpan Profil"
              className="h-[50px] w-[50px] min-w-[50px] rounded-xl bg-surface-container-highest text-primary flex items-center justify-center hover:bg-surface-container-high transition-transform active:scale-95"
              type="button"
              onClick={toggleSave}
            >
              <span
                className={`material-symbols-outlined text-[24px] ${saved ? "[font-variation-settings:'FILL'_1]" : ''}`}
              >
                {saved ? 'bookmark' : 'bookmark_border'}
              </span>
            </button>
            <InterestButton
              receiverId={data.id}
              fundingRequestId={pref ? undefined : funding[0]?.id}
              existingStatus={existing?.status}
              variant="sticky"
              stickyLabel={isInvestorSide ? undefined : 'Mulai Negosiasi & Buka Chat'}
            />
          </div>
        </div>
      )}

      {/* Interactive Toast Notification */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-primary-container text-on-primary font-label-md text-label-md shadow-lg flex items-center gap-2 max-w-[calc(100vw-2rem)]">
          <span className="material-symbols-outlined text-[18px] text-secondary-fixed flex-shrink-0">check_circle</span>
          <span className="truncate">{toast}</span>
        </div>
      )}
    </div>
  );
}

/** Nama depan untuk copy sapaan ("Pak Budi" di mockup). */
function firstNameOf(fullName: string) {
  return fullName.split(' ')[0] || fullName;
}

/**
 * FR-14 — kirim permintaan ketertarikan, status awal PENDING.
 * Varian sticky mengisi CTA bar bawah a9; varian block dipakai di kartu
 * kebutuhan pendanaan. Teks status mengikuti state koneksi yang sama.
 */
function InterestButton({
  receiverId,
  fundingRequestId,
  existingStatus,
  variant = 'block',
  stickyLabel,
}: {
  receiverId: string;
  fundingRequestId?: string;
  existingStatus?: string;
  variant?: 'sticky' | 'block';
  stickyLabel?: string;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const send = useMutation({
    mutationFn: () => endpoints.createConnection({ receiverId, fundingRequestId, message: message.trim() || undefined }),
    onSuccess: () => {
      setOpen(false);
      qc.invalidateQueries({ queryKey: ['connections'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
      /*
        Dulu mendarat di /app/chat, padahal ruang chat baru ada setelah mitra
        menerima — jadi pengguna selalu melihat "Belum ada percakapan" dan
        mengira pengirimannya gagal. Beranda punya konteks untuk menjelaskannya.
      */
      navigate('/app/beranda', {
        state: { notice: 'Ketertarikan terkirim. Kamu diberi tahu begitu mitra merespons.' },
      });
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Gagal mengirim ketertarikan.'),
  });

  const stickyCta =
    'flex-1 h-[50px] px-space-md rounded-xl bg-primary-container text-on-primary font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 shadow hover:bg-secondary transition-all active:scale-[0.98]';
  const blockCta =
    'w-full h-[50px] px-space-md rounded-xl bg-primary-container text-on-primary font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 shadow hover:bg-secondary transition-all active:scale-[0.98]';

  if (existingStatus === 'PENDING') {
    if (variant === 'sticky') {
      return (
        <div className="flex-1 h-[50px] px-space-md rounded-xl bg-surface-container-high text-on-surface-variant font-label-lg text-label-lg font-bold flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-[18px]">schedule</span>
          <span className="truncate">Ketertarikan Terkirim \u2022 Menunggu Respons</span>
        </div>
      );
    }
    return (
      <p className="font-body-sm text-body-sm text-on-surface-variant">
        Ketertarikanmu sudah terkirim. Menunggu respons mitra.
      </p>
    );
  }
  if (existingStatus === 'ACCEPTED') {
    return (
      <Link className={variant === 'sticky' ? stickyCta : blockCta} to="/app/chat">
        <span>Buka Percakapan</span>
        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
      </Link>
    );
  }

  return (
    <>
      <button type="button" className={variant === 'sticky' ? stickyCta : blockCta} onClick={() => setOpen(true)}>
        <span>{variant === 'sticky' ? (stickyLabel ?? 'Kirim Prospektus & Mulai Chat') : 'Kirim Ketertarikan'}</span>
        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-primary/60 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-space-lg shadow-md flex flex-col gap-space-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-headline-sm text-headline-sm text-primary font-bold">Kirim ketertarikan</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Mitra akan menerima pemberitahuan. Ruang percakapan terbuka setelah mereka menyetujui.
            </p>
            {error && (
              <div className="px-3.5 py-3 rounded-xl bg-error-container text-on-error-container font-body-sm text-body-sm font-semibold">
                {error}
              </div>
            )}
            <textarea
              className="w-full min-h-[120px] rounded-xl bg-surface-container-low text-on-surface placeholder:text-outline font-body-md text-body-md p-3.5 shadow-sm focus:outline-none"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Perkenalkan dirimu singkat, mis. alasan tertarik dengan usaha ini."
              maxLength={500}
            />
            <div className="flex gap-3">
              <button
                type="button"
                className="flex-1 h-[50px] rounded-xl bg-surface-container-high text-on-surface font-label-lg text-label-lg font-bold hover:bg-surface-container transition-colors"
                onClick={() => setOpen(false)}
              >
                Batal
              </button>
              <button
                type="button"
                className="flex-1 h-[50px] rounded-xl bg-primary-container text-on-primary font-label-lg text-label-lg font-bold hover:bg-secondary transition-colors disabled:opacity-60"
                disabled={send.isPending}
                onClick={() => send.mutate()}
              >
                {send.isPending ? 'Mengirim\u2026' : 'Kirim'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
