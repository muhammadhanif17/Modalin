import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { endpoints } from '../../lib/api';
import { Spinner } from '../../components/ui';
import { readSession } from '../../lib/session';
import { formatRupiahSingkat } from '../../lib/format';

const IMG_UMKM =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBtdUnPLyqB1dqHpR3Sq_nWSs5Azz2Gb5UEJ6im0B6h89cmqaHB3GqGhHOrXlRXNO4s76c8OPEJa1erjqcwaLgEeVMdND867ztzPwYnU-C2Ikuj1muHgCvziAw9y4YHA7cVwh-IMrMq-TPASv_7GU64tRqocIGEQ1WO6rFRDLkCNHF6NR8MdU6-HodCuVjRELXv0Ze983XuPbOr4V6gqBAiU-y93QyhUWRwP6KUzFLaiAnJ5rd_nau8';
const IMG_INVESTOR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuB5rFbDfBXfmPLiR3O0K0SOsI45YE02fj4uwPMRNno6ewyXWBlKQ1QJ9eCFzfuFLUQHQqOQRlo3t6mtiPHbaGueJqFsXcMO6e_iBlk_jeB42_irmGk_Qhn_s1LNyPQrxkDl4j9zpJg9zKGGEiMyn_sdtNpYIxzLUQ3mQ_kyL6lHrtuK7MdROmPC_si13Af5HZpL7owONyJzZrYUmwleG1XlYQen8uSzAPKy0aMAju3qcTM-9x7BHsJF';
const IMG_SITI =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDuouE1GdBzYKSgJ2KvndIB7apym63PrKqxk9gZWH8Tdh_dhXJlUO1v9bmImm43zmQSIPKSBjh4pMKepCeEe_tjhtcsSRbU4XB4H_f2HKFsiU0bLyMdw3-j1MMbMHH_ZGbZpcneeMBVWOZQTXb5mMd5Ek_3R8E6zdvire7WXRLhmog0bIZyfhxAu4jnerliS0on4-je89x8KSghpO9DoIYDJ1UdKC5eG8KzFBCHZHinW16GVWVJXUuC';

/**
 * Port 1:1 dari:
 * - a1. Dashboard Pengusaha UMKM - Beranda.html (role UMKM)
 * - b1. Dashboard Investor - Beranda Pemodal (Mobile).html (role INVESTOR)
 * Section, class Tailwind, ikon Material Symbols dipertahankan verbatim.
 * Data (nama, skor, match, koneksi) diisi dari API; angka portofolio yang
 * belum ada endpoint-nya memakai placeholder mockup.
 */
export function DashboardPage() {
  const session = readSession();
  const isInvestor = session?.role === 'INVESTOR';

  const { data: profile, isLoading } = useQuery({ queryKey: ['profile'], queryFn: endpoints.me });
  const { data: connections } = useQuery({
    queryKey: ['connections'],
    queryFn: endpoints.connections,
  });
  const { data: matches } = useQuery({
    queryKey: ['matches'],
    queryFn: endpoints.matches,
    enabled: session?.role !== 'ADMIN',
  });

  if (isLoading) return <Spinner />;
  if (!profile) return null;

  const incoming = (connections ?? []).filter((c) => c.direction === 'masuk' && c.status === 'PENDING');
  const score = profile.trustScore ?? 0;
  const completeness = profile.trustScoreBreakdown?.profileCompleteness ?? 75;
  const firstName = (profile.fullName ?? 'Mitra').split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 19 ? 'Selamat sore' : 'Selamat malam';

  return (
    <div className="flex flex-col w-full space-y-space-md px-gutter-mobile pt-4 pb-6 max-w-md mx-auto">
      {isInvestor ? (
        <InvestorDashboard
          greeting={greeting}
          firstName={firstName}
          fullName={profile.fullName}
          avatar={profile.avatarUrl}
          score={score}
          completeness={completeness}
          matchCount={
            matches && !matches.needsSetup && matches.audience === 'peluang'
              ? matches.recommended.length + matches.alternatives.length
              : 2
          }
          matches={matches}
        />
      ) : (
        <UmkmDashboard
          greeting={greeting}
          firstName={firstName}
          fullName={profile.fullName}
          avatar={profile.avatarUrl}
          score={score}
          completeness={completeness}
          incomingCount={incoming.length}
          needsVerification={profile.verificationStatus !== 'VERIFIED'}
          matches={matches}
        />
      )}
    </div>
  );
}

/* ---------------- UMKM (a1) ---------------- */

function UmkmDashboard(props: {
  greeting: string;
  firstName: string;
  fullName: string;
  avatar: string | null;
  score: number;
  completeness: number;
  incomingCount: number;
  needsVerification: boolean;
  matches: unknown;
}) {
  const { greeting, firstName, fullName, avatar, score, completeness, incomingCount, needsVerification, matches } = props;
  const m = matches as
    | { needsSetup: boolean; audience: string; recommended: unknown[]; alternatives: unknown[] }
    | undefined;
  const investors =
    m && !m.needsSetup && m.audience === 'pemodal'
      ? ([...(m.recommended as InvestorItem[]), ...(m.alternatives as InvestorItem[])] as InvestorItem[]).slice(0, 3)
      : [];

  const heroTitle = incomingCount > 0 ? 'Kemitraan Tahap Ekspansi' : needsVerification ? 'Verifikasi Identitas' : 'Profil Siap Didanai';
  const heroSub = incomingCount > 0 ? 'Mandiri Angel Group' : needsVerification ? 'KTP & NIB • 2 menit' : 'Jelajahi pemodal yang cocok';
  const heroCta =
    incomingCount > 0 ? 'Tinjau & Tanda Tangani Dokumen' : needsVerification ? 'Lengkapi Verifikasi Sekarang' : 'Cari Investor Sekarang';
  const heroTo = incomingCount > 0 ? '/app/agreements' : needsVerification ? '/app/verifikasi' : '/app/explore';

  return (
    <>
      <section className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm">
        <div className="flex items-center justify-between mb-space-sm">
          <div className="flex items-center gap-space-sm min-w-0">
            <div className="relative w-12 h-12 rounded-full overflow-hidden bg-primary-container flex-shrink-0 flex items-center justify-center">
              <img className="w-full h-full object-cover" src={avatar ?? IMG_UMKM} alt={fullName} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-headline-sm text-headline-sm text-on-surface truncate">{fullName}</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant truncate">{fullName}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-space-xs py-1 rounded-full bg-secondary-container text-on-secondary-container flex-shrink-0">
            <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              verified_user
            </span>
            <div className="flex flex-col text-right">
              <span className="font-label-sm text-label-sm leading-none">Skor {score}/100</span>
              <span className="font-body-sm text-[9px] leading-tight text-secondary">Terpercaya</span>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-low rounded-lg p-space-sm flex items-start gap-space-xs">
          <span className="material-symbols-outlined text-secondary text-[20px] flex-shrink-0 mt-0.5">
            sentiment_satisfied
          </span>
          <p className="font-body-md text-body-md text-on-surface">
            {greeting}, <span className="font-bold text-primary">{firstName}</span>.{' '}
            {incomingCount > 0 ? (
              <>
                Ada <strong>{incomingCount} aksi penting</strong> yang butuh persetujuan Anda hari ini.
              </>
            ) : needsVerification ? (
              <>
                <strong>Verifikasi identitasmu</strong> untuk menaikkan skor kepercayaan.
              </>
            ) : (
              <>
                Semua beres. <strong>Lengkapi berkas</strong> untuk menarik lebih banyak pemodal.
              </>
            )}
          </p>
        </div>
      </section>

      <section className="bg-primary-container text-on-primary rounded-xl p-space-md shadow-md relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-secondary opacity-15 pointer-events-none"></div>
        <div className="flex items-center justify-between mb-space-xs">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary-fixed">
            Perhatian Utama Hari Ini
          </span>
          <div className="flex items-center gap-1 bg-surface-bright/20 px-2.5 py-0.5 rounded-full text-surface-bright">
            <span className="w-2 h-2 rounded-full bg-error animate-pulse"></span>
            <span className="font-label-sm text-label-sm">
              {incomingCount > 0 ? 'Batas: 24 Jam' : needsVerification ? '2 Menit' : 'Siap Jalan'}
            </span>
          </div>
        </div>
        <h2 className="font-headline-sm text-headline-sm text-surface-bright mb-space-2xs">{heroTitle}</h2>
        <p className="font-body-sm text-body-sm text-primary-fixed mb-space-sm flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">corporate_fare</span>
          {heroSub}
        </p>
        <div className="mb-space-md bg-surface-container-lowest rounded-lg p-space-sm flex items-center justify-between text-on-surface">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[22px]">draw</span>
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-on-surface">Status Dokumen</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {incomingCount > 0 ? 'Menunggu Tanda Tangan Kontrak Legal' : needsVerification ? 'Menunggu Berkas KTP & NIB' : 'Semua dokumen beres'}
              </span>
            </div>
          </div>
          <span className="bg-surface-variant text-on-surface-variant px-2 py-1 rounded font-label-sm text-label-sm">
            {incomingCount > 0 ? 'SPK #4902' : needsVerification ? 'KYC' : 'AKTIF'}
          </span>
        </div>
        <Link
          to={heroTo}
          className="w-full h-touch-target-min bg-surface text-primary hover:bg-surface-bright active:scale-[0.98] transition-all rounded-lg font-title-md text-title-md flex items-center justify-center gap-space-xs shadow-sm"
        >
          <span>{heroCta}</span>
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </Link>
      </section>

      <section className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm">
        <div className="flex items-center justify-between mb-space-2xs">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-secondary text-[20px]">task_alt</span>
            <span className="font-title-md text-title-md text-on-surface">Kelengkapan Profil Usaha</span>
          </div>
          <span className="font-headline-sm text-headline-sm text-secondary">{completeness}%</span>
        </div>
        <div className="w-full bg-surface-container h-2.5 rounded-full overflow-hidden mb-space-sm">
          <div className="bg-secondary h-full rounded-full transition-all duration-500" style={{ width: `${completeness}%` }}></div>
        </div>
        <div className="flex items-start gap-space-xs bg-surface-container-low p-space-sm rounded-lg mb-space-sm">
          <span className="material-symbols-outlined text-secondary text-[18px] flex-shrink-0 mt-0.5">add_chart</span>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Tingkatkan peluang hingga <strong className="text-on-surface">+15%</strong> dengan mengunggah{' '}
            <strong>Laporan Penjualan Q2</strong> untuk mempercepat respon pemodal.
          </p>
        </div>
        <Link
          to="/app/profile/edit"
          className="w-full h-11 bg-surface-container-high hover:bg-surface-container-highest active:scale-[0.99] text-on-surface-variant rounded-lg font-label-lg text-label-lg flex items-center justify-center gap-1.5 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">upload_file</span>
          <span>Lengkapi Profil (2 Menit)</span>
        </Link>
      </section>

      <section className="space-y-space-sm">
        <div className="flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Rekomendasi Investor</h3>
            <Link className="font-label-md text-label-md text-secondary hover:underline flex items-center gap-0.5" to="/app/explore">
              Lihat Semua ({investors.length > 0 ? investors.length : 8})
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </Link>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1 mt-0.5">
            <span className="material-symbols-outlined text-secondary text-[15px]">auto_awesome</span>
            Dicocokkan otomatis berdasarkan skala usaha Anda
          </p>
        </div>

        {investors.length > 0
          ? investors.map((inv) => <InvestorMatchCard key={inv.id} inv={inv} />)
          : (
            <>
              <StaticInvestorCard
                img={IMG_INVESTOR}
                name="Hendrik Kusuma"
                sub="Impact Angel • Jakarta Selatan"
                badge="96% Cocok"
                alokasi="Rp 50 Jt - 150 Jt"
                fokus="F&B, Ritel Lokal"
                cta="Kirim Prospektus"
                ctaIcon="send"
                primary
              />
              <StaticInvestorCard
                initials="NS"
                name="Nusantara Seed Fund"
                sub="Modal Ventura UMKM • Bandung"
                badge="91% Cocok"
                alokasi="Rp 100 Jt - 300 Jt"
                fokus="Hasil Tani & F&B"
                cta="Lihat Profil Usaha"
                ctaIcon="visibility"
              />
              <StaticInvestorCard
                img={IMG_SITI}
                name="Siti Rahma"
                sub="Family Office • Surakarta"
                badge="85% Cocok"
                alokasi="Rp 25 Jt - 75 Jt"
                fokus="Kuliner Tradisional"
                cta="Lihat Profil Usaha"
                ctaIcon="visibility"
                dim
              />
            </>
          )}
      </section>

      <div className="flex items-center justify-center gap-2 p-space-sm bg-surface-container-low rounded-lg text-on-surface-variant">
        <span className="material-symbols-outlined text-[18px] text-secondary">security</span>
        <span className="font-body-sm text-body-sm">
          Dilindungi sistem verifikasi &amp; kepatuhan Otoritas Jasa Keuangan (OJK).
        </span>
      </div>
    </>
  );
}

/* ---------------- Investor (b1) ---------------- */

function InvestorDashboard(props: {
  greeting: string;
  firstName: string;
  fullName: string;
  avatar: string | null;
  score: number;
  completeness: number;
  matchCount: number;
  matches: unknown;
}) {
  const { greeting, firstName, fullName, avatar, score, matchCount, matches } = props;
  const m = matches as
    | { needsSetup: boolean; audience: string; recommended: unknown[]; alternatives: unknown[] }
    | undefined;
  const peluang =
    m && !m.needsSetup && m.audience === 'peluang'
      ? ([...(m.recommended as OpportunityItem[]), ...(m.alternatives as OpportunityItem[])] as OpportunityItem[]).slice(0, 3)
      : [];

  return (
    <>
      <section className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm">
        <div className="flex items-center justify-between mb-space-sm">
          <div className="flex items-center gap-space-sm min-w-0">
            <div className="relative w-12 h-12 rounded-full overflow-hidden bg-primary-container flex-shrink-0 flex items-center justify-center">
              <img className="w-full h-full object-cover" src={avatar ?? IMG_INVESTOR} alt={fullName} />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-headline-sm text-headline-sm text-on-surface truncate">{fullName}</span>
                <span className="material-symbols-outlined text-secondary text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  verified
                </span>
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
                Angel Investor • Terverifikasi OJK
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-space-xs py-1 rounded-full bg-secondary-container text-on-secondary-container flex-shrink-0">
            <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              verified_user
            </span>
            <div className="flex flex-col text-right">
              <span className="font-label-sm text-label-sm leading-none">Skor {score}/100</span>
              <span className="font-body-sm text-[9px] leading-tight text-secondary">Terpercaya</span>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-low rounded-lg p-space-sm flex items-start gap-space-xs">
          <span className="material-symbols-outlined text-secondary text-[20px] flex-shrink-0 mt-0.5">
            notifications_active
          </span>
          <p className="font-body-md text-body-md text-on-surface">
            {greeting}, <span className="font-bold text-primary">{firstName}</span>. Ada{' '}
            <strong>{matchCount} proposal UMKM baru</strong> yang cocok dengan preferensi portofolio Anda.
          </p>
        </div>
      </section>

      <section className="bg-primary-container text-on-primary rounded-xl p-space-md shadow-md relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-secondary opacity-15 pointer-events-none"></div>
        <div className="flex items-center justify-between mb-space-xs">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary-fixed">
            Ringkasan Portofolio
          </span>
          <div className="flex items-center gap-1 bg-surface-bright/20 px-2.5 py-0.5 rounded-full text-surface-bright">
            <span className="w-2 h-2 rounded-full bg-secondary-fixed animate-pulse"></span>
            <span className="font-label-sm text-label-sm">4 UMKM Aktif</span>
          </div>
        </div>
        <h2 className="font-headline-sm text-headline-sm text-surface-bright mb-space-xs">
          Ringkasan Investasi &amp; Imbal Hasil
        </h2>
        <div className="grid grid-cols-2 gap-space-xs mb-space-sm">
          <div className="bg-primary p-space-xs rounded-lg">
            <span className="font-body-sm text-[11px] text-primary-fixed block">Total Modal Tersalurkan</span>
            <span className="font-title-md text-title-md font-bold text-surface-bright">Rp 175.000.000</span>
          </div>
          <div className="bg-primary p-space-xs rounded-lg">
            <span className="font-body-sm text-[11px] text-secondary-fixed-dim block">Rata-rata Imbal Hasil</span>
            <span className="font-title-md text-title-md font-bold text-secondary-fixed">18,4% p.a.</span>
          </div>
        </div>
        <div className="mb-space-md bg-surface-container-lowest rounded-lg p-space-sm flex items-center justify-between text-on-surface">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[22px]">payments</span>
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-on-surface">Bagi Hasil Bulan Ini</span>
              <span className="font-body-sm text-body-sm text-secondary font-semibold">
                +Rp 3.850.000 <span className="font-normal text-on-surface-variant text-[11px]">(Cair tgl 5)</span>
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="block font-body-sm text-[11px] text-on-surface-variant">Saldo Siaga</span>
            <span className="font-label-sm text-label-sm font-bold text-on-surface">Rp 50 Jt</span>
          </div>
        </div>
        <Link
          to="/app/rekam-jejak"
          className="w-full h-touch-target-min bg-surface text-primary hover:bg-surface-bright active:scale-[0.98] transition-all rounded-lg font-title-md text-title-md flex items-center justify-center gap-space-xs shadow-sm"
        >
          <span>Lihat Laporan Portofolio</span>
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </Link>
      </section>

      <section className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm">
        <div className="flex items-center justify-between mb-space-2xs">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-secondary text-[20px]">tune</span>
            <span className="font-title-md text-title-md text-on-surface">Preferensi Investasi Anda</span>
          </div>
          <span className="font-label-md text-label-md text-secondary font-semibold">Matchmaking Aktif</span>
        </div>
        <div className="flex items-start gap-space-xs bg-surface-container-low p-space-sm rounded-lg mb-space-sm">
          <span className="material-symbols-outlined text-secondary text-[18px] flex-shrink-0 mt-0.5">filter_alt</span>
          <div className="font-body-sm text-body-sm text-on-surface-variant">
            <p>
              <strong className="text-on-surface">Tiket:</strong> Rp 25 - 100 Jt •{' '}
              <strong className="text-on-surface">Sektor:</strong> F&amp;B, Kriya, Agri-retail
            </p>
            <p className="mt-0.5">
              <strong className="text-on-surface">Skema:</strong> Bagi Hasil Syirkah • Akurasi filter 96% presisi
            </p>
          </div>
        </div>
        <Link
          to="/app/preferensi/edit"
          className="w-full h-11 bg-surface-container-high hover:bg-surface-container-highest active:scale-[0.99] text-on-surface-variant rounded-lg font-label-lg text-label-lg flex items-center justify-center gap-1.5 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">settings</span>
          <span>Atur Preferensi Investasi (1 Menit)</span>
        </Link>
      </section>

      <section className="space-y-space-sm">
        <div className="flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Peluang Usaha Terkurasi</h3>
            <Link className="font-label-md text-label-md text-secondary hover:underline flex items-center gap-0.5" to="/app/explore">
              Lihat Semua ({peluang.length > 0 ? peluang.length : 14})
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </Link>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1 mt-0.5">
            <span className="material-symbols-outlined text-secondary text-[15px]">auto_awesome</span>
            Dicocokkan otomatis dengan preferensi modal &amp; sektor minat Anda
          </p>
        </div>

        {peluang.length > 0 ? (
          peluang.map((o) => <OpportunityMatchCard key={o.id} o={o} />)
        ) : (
          <StaticInvestorCard
            img={IMG_UMKM}
            name="Kopi Seduh Nusantara"
            sub="Ibu Retno H. • Bandung, Jawa Barat"
            badge="96% Cocok"
            alokasi="Rp 80 Jt dibutuhkan"
            fokus="F&B • Bagi Hasil"
            cta="Lihat Prospektus"
            ctaIcon="visibility"
            primary
          />
        )}
      </section>

      <div className="flex items-center justify-center gap-2 p-space-sm bg-surface-container-low rounded-lg text-on-surface-variant">
        <span className="material-symbols-outlined text-[18px] text-secondary">security</span>
        <span className="font-body-sm text-body-sm">
          Dilindungi sistem verifikasi &amp; kepatuhan Otoritas Jasa Keuangan (OJK) Sandboxing.
        </span>
      </div>
    </>
  );
}

/* ---------------- kartu ---------------- */

type InvestorItem = {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  location: string | null;
  trustScore: number;
  preference: { minimumAmount: number; maximumAmount: number } | null;
  match: { score: number };
};

type OpportunityItem = {
  id: string;
  targetAmount: number;
  business: { name: string; location: string };
  owner: { fullName: string | null; trustScore: number };
  match: { score: number };
};

function InvestorMatchCard({ inv }: { inv: InvestorItem }) {
  return (
    <article className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-space-sm transition-transform active:scale-[0.99]">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-space-sm">
          <div className="relative w-11 h-11 rounded-full overflow-hidden bg-surface-container flex-shrink-0">
            <img className="w-full h-full object-cover" src={inv.avatarUrl ?? IMG_INVESTOR} alt={inv.fullName ?? 'Investor'} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <h4 className="font-title-md text-title-md text-on-surface">{inv.fullName ?? 'Investor'}</h4>
              <span className="material-symbols-outlined text-secondary text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                verified
              </span>
            </div>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              {inv.location ?? 'Indonesia'} • Skor {inv.trustScore}
            </span>
          </div>
        </div>
        <span className="px-2 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm flex items-center gap-1">
          <span className="material-symbols-outlined text-[13px]">check_circle</span>
          {inv.match.score}% Cocok
        </span>
      </div>
      <div className="grid grid-cols-2 gap-space-xs bg-surface-container-low p-space-xs rounded-lg">
        <div className="p-1.5">
          <span className="font-body-sm text-[11px] text-on-surface-variant block">Alokasi Modal</span>
          <span className="font-title-md text-title-md text-on-surface font-semibold">
            {inv.preference
              ? `${formatRupiahSingkat(inv.preference.minimumAmount)} - ${formatRupiahSingkat(inv.preference.maximumAmount)}`
              : 'Fleksibel'}
          </span>
        </div>
        <div className="p-1.5">
          <span className="font-body-sm text-[11px] text-on-surface-variant block">Fokus Minat</span>
          <span className="font-title-md text-title-md text-secondary truncate block">Terverifikasi OJK</span>
        </div>
      </div>
      <div className="flex items-center gap-space-xs pt-1">
        <Link
          to="/app/explore"
          className="flex-1 h-touch-target-min bg-primary text-on-primary rounded-lg font-label-lg text-label-lg hover:bg-secondary active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[18px]">send</span>
          <span>Kirim Prospektus</span>
        </Link>
        <button
          aria-label="Simpan profil"
          className="w-12 h-touch-target-min bg-surface-container rounded-lg text-on-surface-variant hover:text-primary flex items-center justify-center"
          type="button"
        >
          <span className="material-symbols-outlined text-[20px]">bookmark_border</span>
        </button>
      </div>
    </article>
  );
}

function OpportunityMatchCard({ o }: { o: OpportunityItem }) {
  return (
    <article className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-space-sm transition-transform active:scale-[0.99]">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-space-sm">
          <div className="relative w-11 h-11 rounded-full overflow-hidden bg-surface-container flex-shrink-0">
            <img className="w-full h-full object-cover" src={IMG_UMKM} alt={o.business.name} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <h4 className="font-title-md text-title-md text-on-surface">{o.business.name}</h4>
              <span className="material-symbols-outlined text-secondary text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                verified
              </span>
            </div>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              {o.owner.fullName ?? 'UMKM'} • {o.business.location}
            </span>
          </div>
        </div>
        <span className="px-2 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm flex items-center gap-1">
          <span className="material-symbols-outlined text-[13px]">check_circle</span>
          {o.match.score}% Cocok
        </span>
      </div>
      <div className="grid grid-cols-2 gap-space-xs bg-surface-container-low p-space-xs rounded-lg">
        <div className="p-1.5">
          <span className="font-body-sm text-[11px] text-on-surface-variant block">Kebutuhan Dana</span>
          <span className="font-title-md text-title-md text-on-surface font-semibold">
            {formatRupiahSingkat(o.targetAmount)}
          </span>
        </div>
        <div className="p-1.5">
          <span className="font-body-sm text-[11px] text-on-surface-variant block">Skor Usaha</span>
          <span className="font-title-md text-title-md text-secondary truncate block">{o.owner.trustScore}/100</span>
        </div>
      </div>
      <div className="flex items-center gap-space-xs pt-1">
        <Link
          to={`/app/mitra/${o.id}`}
          className="flex-1 h-touch-target-min bg-primary text-on-primary rounded-lg font-label-lg text-label-lg hover:bg-secondary active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[18px]">visibility</span>
          <span>Lihat Prospektus</span>
        </Link>
        <button
          aria-label="Simpan peluang"
          className="w-12 h-touch-target-min bg-surface-container rounded-lg text-on-surface-variant hover:text-primary flex items-center justify-center"
          type="button"
        >
          <span className="material-symbols-outlined text-[20px]">bookmark_border</span>
        </button>
      </div>
    </article>
  );
}

function StaticInvestorCard(props: {
  img?: string;
  initials?: string;
  name: string;
  sub: string;
  badge: string;
  alokasi: string;
  fokus: string;
  cta: string;
  ctaIcon: string;
  primary?: boolean;
  dim?: boolean;
}) {
  return (
    <article className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-space-sm transition-transform active:scale-[0.99]">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-space-sm">
          {props.img ? (
            <div className="relative w-11 h-11 rounded-full overflow-hidden bg-surface-container flex-shrink-0">
              <img className="w-full h-full object-cover" src={props.img} alt={props.name} />
            </div>
          ) : (
            <div className="w-11 h-11 rounded-full bg-primary flex-shrink-0 flex items-center justify-center text-on-primary font-bold font-title-md text-title-md">
              {props.initials}
            </div>
          )}
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <h4 className="font-title-md text-title-md text-on-surface">{props.name}</h4>
              <span className="material-symbols-outlined text-secondary text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                verified
              </span>
            </div>
            <span className="font-body-sm text-body-sm text-on-surface-variant">{props.sub}</span>
          </div>
        </div>
        <span
          className={`px-2 py-1 rounded-full font-label-sm text-label-sm flex items-center gap-1 ${
            props.dim ? 'bg-secondary-fixed text-on-secondary-fixed-variant' : 'bg-secondary-container text-on-secondary-container'
          }`}
        >
          <span className="material-symbols-outlined text-[13px]">check_circle</span>
          {props.badge}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-space-xs bg-surface-container-low p-space-xs rounded-lg">
        <div className="p-1.5">
          <span className="font-body-sm text-[11px] text-on-surface-variant block">Alokasi Modal</span>
          <span className="font-title-md text-title-md text-on-surface font-semibold">{props.alokasi}</span>
        </div>
        <div className="p-1.5">
          <span className="font-body-sm text-[11px] text-on-surface-variant block">Fokus Minat</span>
          <span className="font-title-md text-title-md text-secondary truncate block">{props.fokus}</span>
        </div>
      </div>
      <div className="flex items-center gap-space-xs pt-1">
        <Link
          to="/app/explore"
          className={`flex-1 h-touch-target-min rounded-lg font-label-lg text-label-lg active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 ${
            props.primary
              ? 'bg-primary text-on-primary hover:bg-secondary'
              : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">{props.ctaIcon}</span>
          <span>{props.cta}</span>
        </Link>
        <button
          aria-label={`Simpan profil ${props.name}`}
          className="w-12 h-touch-target-min bg-surface-container rounded-lg text-on-surface-variant hover:text-primary flex items-center justify-center"
          type="button"
        >
          <span className="material-symbols-outlined text-[20px]">bookmark_border</span>
        </button>
      </div>
    </article>
  );
}
