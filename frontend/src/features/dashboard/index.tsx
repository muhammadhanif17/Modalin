import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { endpoints, type Connection, type MatchedInvestor, type MatchedOpportunity } from '../../lib/api';
import { Spinner } from '../../components/ui';
import { AppHeader } from '../../components/AppHeader';
import { InvestorCard } from '../../components/InvestorCard';
import { OpportunityCard } from '../../components/OpportunityCard';
import { readSession } from '../../lib/session';
import { initials } from '../../lib/format';

/**
 * Beranda mengikuti pola index.html (view-beranda): sapaan + skor
 * kepercayaan, kartu "Menunggu responsmu", dan daftar rekomendasi memakai
 * kartu yang sama dengan halaman Cari (InvestorCard/OpportunityCard).
 *
 * Data semuanya dari API: tanpa kartu contoh statis bernama orang (sebelumnya
 * "Hendrik Kusuma" dkk. tampil untuk semua pengguna) dan tanpa klaim OJK.
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
  const completeness = profile.trustScoreBreakdown?.profileCompleteness ?? 0;
  const verified = profile.verificationStatus === 'VERIFIED';
  const firstName = (profile.fullName ?? 'Mitra').split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 19 ? 'Selamat sore' : 'Selamat malam';

  const investors: MatchedInvestor[] =
    matches && !matches.needsSetup && matches.audience === 'pemodal'
      ? [...matches.recommended, ...matches.alternatives].slice(0, 3)
      : [];
  const peluang: MatchedOpportunity[] =
    matches && !matches.needsSetup && matches.audience === 'peluang'
      ? [...matches.recommended, ...matches.alternatives].slice(0, 3)
      : [];

  return (
    <div className="shell">
      <AppHeader />
      <div className="page-head">
        <h1>
          {greeting}, {firstName}
        </h1>
        <p>{isInvestor ? 'Portofolio & peluang terkurasi untukmu' : (profile.location ?? 'Kelola usahamu')}</p>
      </div>

      <div className="grid rec-gap-top">
        <section className="card card-pad" aria-label="Skor kepercayaan">
          <div className="opp-top">
            <div>
              <div className="opp-meta">Skor kepercayaan</div>
              <div className="rec-score-big" data-money>
                {score}
                <span>/100</span>
              </div>
            </div>
            {verified ? (
              <span className="badge badge-success">Terverifikasi</span>
            ) : (
              <span className="badge badge-warning">Belum terverifikasi</span>
            )}
          </div>
          <div className="steps" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span key={i} className={i < stepsDone(completeness) ? 'done' : ''} />
            ))}
          </div>
          <p className="opp-desc">
            {verified
              ? 'Profilmu terverifikasi. Lengkapi portofolio untuk membuka rekomendasi prioritas.'
              : 'Verifikasi identitasmu untuk menaikkan skor dan membuka rekomendasi prioritas.'}
          </p>
        </section>

        <section className="card card-pad" aria-label="Menunggu responsmu">
          <h3 className="rec-h">Menunggu responsmu</h3>
          {incoming.length > 0 ? (
            <div className="grid">
              {incoming.slice(0, 3).map((c) => (
                <WaitingRow key={c.id} connection={c} />
              ))}
            </div>
          ) : (
            <p className="opp-desc">Tidak ada yang menunggu. Semua beres untuk saat ini.</p>
          )}
        </section>

        <section aria-label="Rekomendasi">
          <div className="opp-top rec-h">
            <h3 className="rec-h">{isInvestor ? 'Rekomendasi peluang usaha' : 'Rekomendasi pemodal'}</h3>
            <Link className="btn btn-soft btn-sm" to="/app/explore">
              Lihat semua
            </Link>
          </div>
          <div className="grid grid-3">
            {isInvestor
              ? peluang.map((o) => <OpportunityCard key={o.id} item={o} match={o.match} />)
              : investors.map((inv) => <InvestorCard key={inv.id} item={inv} match={inv.match} />)}
          </div>
          {(isInvestor ? peluang.length === 0 : investors.length === 0) && (
            <div className="card card-pad rec-gap-top">
              <p className="opp-desc">
                Belum ada rekomendasi yang cocok.{' '}
                <Link to="/app/explore">Jelajahi manual</Link> atau lengkapi profil agar pencocokan
                otomatis bisa bekerja.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/** 3 bilah index.html dari kelengkapan profil (0-100). */
function stepsDone(completeness: number) {
  if (completeness >= 75) return 3;
  if (completeness >= 50) return 2;
  if (completeness > 0) return 1;
  return 0;
}

/** Baris row-link index.html untuk satu ketertarikan masuk. */
function WaitingRow({ connection: c }: { connection: Connection }) {
  const other = c.direction === 'masuk' ? c.sender.profile : c.receiver.profile;
  const name = other?.fullName ?? 'Mitra';
  const sub = c.fundingRequest?.title ?? c.message ?? 'Ketertarikan baru';
  const to = c.conversation ? `/app/chat/${c.conversation.id}` : '/app/chat';

  return (
    <Link className="row-link" to={to}>
      {other?.avatarUrl ? (
        <img className="rec-avatar" src={other.avatarUrl} alt="" loading="lazy" decoding="async" />
      ) : (
        <span className={`avatar avatar-md ${toneFor(c.id)}`} aria-hidden="true">
          {initials(name)}
        </span>
      )}
      <span className="row-main">
        <span className="row-title">{name}</span>
        <br />
        <span className="row-sub">{sub}</span>
      </span>
      <span className="badge badge-warning">Baru</span>
    </Link>
  );
}

/** Nada avatar stabil per id dari palet avatar-t1..t6. */
function toneFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h + id.charCodeAt(i)) % 6;
  return `avatar-t${h + 1}`;
}
