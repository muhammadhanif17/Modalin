import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { endpoints } from '../lib/api';
import { OpportunityCard } from '../components/OpportunityCard';
import { Spinner, EmptyState } from '../components/ui';

/**
 * FR-06 + FR-07 — hasil pencocokan otomatis.
 *
 * Skor dan urutannya datang apa adanya dari server; halaman ini tidak
 * mengurutkan ulang atau mengarang angka. Kandidat di bawah ambang tetap
 * ditampilkan sebagai alternatif informatif, bukan disembunyikan jadi layar
 * kosong.
 */
export function MatchesPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['matches'],
    queryFn: endpoints.matches,
    staleTime: 15_000,
  });

  return (
    <div className="shell">
      <div className="page-head">
        <h1>Rekomendasi untukmu</h1>
        <p>
          Dicocokkan dari sektor (40%), kebutuhan dana (30%), lokasi (10%), dan skor kepercayaan (20%).
        </p>
      </div>

      {isLoading && <Spinner />}
      {isError && <EmptyState icon="⚠️" title="Gagal memuat rekomendasi" message="Coba lagi sebentar lagi." />}

      {/* Investor belum mengatur preferensi: tidak ada yang bisa dicocokkan */}
      {data?.needsPreference && (
        <EmptyState
          icon="🎯"
          title="Atur preferensi investasimu dulu"
          message={data.emptyMessage ?? undefined}
          action={
            <Link className="btn btn-primary" to="/app/preferensi">
              Atur preferensi
            </Link>
          }
        />
      )}

      {data && !data.needsPreference && (
        <div className="stack">
          {data.rejectedByHardFilter > 0 && (
            <p className="opp-meta">
              {data.rejectedByHardFilter} peluang disaring lebih dulu karena skema kerja samanya tidak
              beririsan dengan preferensimu.
            </p>
          )}

          {data.recommended.length > 0 && (
            <>
              <div className="section-head">
                <h2>Paling cocok</h2>
                <span className="opp-meta">skor {data.minScore ?? 50} ke atas</span>
              </div>
              <div className="grid-3">
                {data.recommended.map((item) => (
                  <OpportunityCard key={item.id} item={item} match={item.match} />
                ))}
              </div>
            </>
          )}

          {/* FR-07: alternatif informatif ketika tidak ada yang lolos ambang */}
          {data.recommended.length === 0 && data.alternatives.length > 0 && (
            <EmptyState
              icon="🌱"
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
              <div className="grid-3">
                {data.alternatives.map((item) => (
                  <OpportunityCard key={item.id} item={item} match={item.match} />
                ))}
              </div>
            </>
          )}

          {data.recommended.length === 0 && data.alternatives.length === 0 && (
            <EmptyState
              icon="🤝"
              title="Belum ada mitra yang cocok"
              message={data.emptyMessage ?? undefined}
              action={
                <Link className="btn btn-outline" to="/app/preferensi">
                  Longgarkan preferensi
                </Link>
              }
            />
          )}
        </div>
      )}
    </div>
  );
}
