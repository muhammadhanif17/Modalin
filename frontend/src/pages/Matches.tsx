import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { endpoints, type MatchesResponse } from '../lib/api';
import { OpportunityCard } from '../components/OpportunityCard';
import { InvestorCard } from '../components/InvestorCard';
import { Spinner, EmptyState } from '../components/ui';

/**
 * FR-06 + FR-07 — hasil pencocokan otomatis, dua arah.
 *
 * Investor menerima peluang usaha, UMKM menerima pemodal; mesin skornya sama
 * (hard filter irisan skema lalu bobot 40/30/10/20), yang berbeda hanya sisi
 * mana yang diperingkat. Skor dan urutannya datang apa adanya dari server —
 * halaman ini tidak mengurutkan ulang atau mengarang angka. Kandidat di bawah
 * ambang tetap ditampilkan sebagai alternatif informatif, bukan disembunyikan
 * jadi layar kosong.
 */

const COPY = {
  peluang: {
    title: 'Rekomendasi untukmu',
    lead: 'Peluang usaha dicocokkan dari sektor (40%), kebutuhan dana (30%), lokasi (10%), dan skor kepercayaan (20%).',
    setupTitle: 'Atur preferensi investasimu dulu',
    setupCta: 'Atur preferensi',
    setupTo: '/app/preferensi',
    filtered: (n: number) =>
      `${n} peluang disaring lebih dulu karena skema kerja samanya tidak beririsan dengan preferensimu.`,
    emptyTitle: 'Belum ada peluang yang cocok',
    loosenCta: 'Longgarkan preferensi',
    loosenTo: '/app/preferensi',
  },
  pemodal: {
    title: 'Pemodal yang cocok untukmu',
    lead: 'Pemodal dicocokkan dari sektor (40%), kebutuhan dana (30%), lokasi (10%), dan skor kepercayaan (20%).',
    setupTitle: 'Buat permintaan pendanaan dulu',
    setupCta: 'Lengkapi profil usaha',
    setupTo: '/app/profile',
    filtered: (n: number) =>
      `${n} pemodal disaring lebih dulu karena skema kerja samanya tidak beririsan dengan pengajuanmu.`,
    emptyTitle: 'Belum ada pemodal yang cocok',
    loosenCta: 'Ubah permintaan pendanaan',
    loosenTo: '/app/profile',
  },
} as const;

/** Kartu mengikuti sisi yang diperingkat. */
function Results({ data, kind }: { data: MatchesResponse; kind: 'recommended' | 'alternatives' }) {
  if (data.audience === 'pemodal') {
    return (
      <div className="grid-3">
        {data[kind].map((item) => (
          <InvestorCard key={item.id} item={item} match={item.match} />
        ))}
      </div>
    );
  }
  return (
    <div className="grid-3">
      {data[kind].map((item) => (
        <OpportunityCard key={item.id} item={item} match={item.match} />
      ))}
    </div>
  );
}

export function MatchesPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['matches'],
    queryFn: endpoints.matches,
    staleTime: 15_000,
  });

  const copy = COPY[data?.audience ?? 'peluang'];

  return (
    <div className="shell page-bottom">
      <div className="page-head">
        <h1>{copy.title}</h1>
        <p>{copy.lead}</p>
      </div>

      {isLoading && <Spinner />}
      {isError && <EmptyState icon="warning" title="Gagal memuat rekomendasi" message="Coba lagi sebentar lagi." />}

      {/* Belum ada bahan untuk dicocokkan dari sisi pengguna sendiri */}
      {data?.needsSetup && (
        <EmptyState
          icon="target"
          title={copy.setupTitle}
          message={data.emptyMessage ?? undefined}
          action={
            <Link className="btn btn-primary" to={copy.setupTo}>
              {copy.setupCta}
            </Link>
          }
        />
      )}

      {data && !data.needsSetup && (
        <div className="stack">
          {data.rejectedByHardFilter > 0 && (
            <p className="opp-meta">{copy.filtered(data.rejectedByHardFilter)}</p>
          )}

          {data.recommended.length > 0 && (
            <>
              <div className="section-head">
                <h2>Paling cocok</h2>
                <span className="opp-meta">skor {data.minScore ?? 50} ke atas</span>
              </div>
              <Results data={data} kind="recommended" />
            </>
          )}

          {/* FR-07: alternatif informatif ketika tidak ada yang lolos ambang */}
          {data.recommended.length === 0 && data.alternatives.length > 0 && (
            <EmptyState
              icon="sprout"
              title="Belum ada yang mencapai skor minimum"
              message={data.emptyMessage ?? undefined}
            />
          )}

          {data.alternatives.length > 0 && (
            <>
              <div className="section-head">
                <h2>Alternatif terdekat</h2>
                <span className="opp-meta">di bawah ambang, tapi masih relevan</span>
              </div>
              <Results data={data} kind="alternatives" />
            </>
          )}

          {data.recommended.length === 0 && data.alternatives.length === 0 && (
            <EmptyState
              icon="users"
              title={copy.emptyTitle}
              message={data.emptyMessage ?? undefined}
              action={
                <Link className="btn btn-outline" to={copy.loosenTo}>
                  {copy.loosenCta}
                </Link>
              }
            />
          )}
        </div>
      )}
    </div>
  );
}
