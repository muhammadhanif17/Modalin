import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { COOPERATION_HELP, COOPERATION_LABEL, endpoints, type CooperationType } from '../lib/api';
import { OpportunityCard } from '../components/OpportunityCard';
import { Spinner, EmptyState } from '../components/ui';

/**
 * FR-05 — pencarian dan filter manual.
 *
 * Penyaringan dikerjakan di server, bukan di klien: filter harus bekerja pada
 * seluruh data, bukan hanya pada halaman pertama yang kebetulan sudah diunduh.
 * Pesan saat tidak ada hasil juga datang dari server supaya kalimatnya konsisten.
 */

const SORTS = [
  { key: 'terbaru', label: 'Terbaru' },
  { key: 'trust', label: 'Skor tertinggi' },
  { key: 'dana_terkecil', label: 'Dana terkecil' },
  { key: 'dana_terbesar', label: 'Dana terbesar' },
] as const;

const COOPERATION_TYPES: CooperationType[] = ['BAGI_HASIL', 'PENYERTAAN_MODAL', 'PINJAMAN'];

export function ExplorePage() {
  const [q, setQ] = useState('');
  const [sectorId, setSectorId] = useState('');
  const [location, setLocation] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [cooperationType, setCooperationType] = useState<CooperationType | ''>('');
  const [minTrustScore, setMinTrustScore] = useState('');
  const [sort, setSort] = useState<(typeof SORTS)[number]['key']>('terbaru');

  const { data: sectors } = useQuery({ queryKey: ['sectors'], queryFn: endpoints.sectors, staleTime: 600_000 });

  const filters = { q, sectorId, location, minAmount, maxAmount, cooperationType, minTrustScore, sort };
  const { data, isLoading, isError } = useQuery({
    queryKey: ['search', filters],
    queryFn: () =>
      endpoints.search({
        q: q.trim() || undefined,
        sectorId: sectorId || undefined,
        location: location.trim() || undefined,
        minAmount: minAmount || undefined,
        maxAmount: maxAmount || undefined,
        cooperationType: cooperationType || undefined,
        minTrustScore: minTrustScore || undefined,
        sort,
      }),
    staleTime: 15_000,
  });

  const activeFilters =
    [sectorId, location, minAmount, maxAmount, cooperationType, minTrustScore].filter(Boolean).length;

  const resetAll = () => {
    setQ('');
    setSectorId('');
    setLocation('');
    setMinAmount('');
    setMaxAmount('');
    setCooperationType('');
    setMinTrustScore('');
    setSort('terbaru');
  };

  return (
    <div className="shell">
      <div className="page-head">
        <h1>Cari peluang</h1>
        <p>Saring berdasarkan sektor, kebutuhan dana, lokasi, skema, dan skor kepercayaan.</p>
      </div>

      {/* Desktop: filter di kiri, hasil di kanan (DESIGN.md, grid 12 kolom) */}
      <div className="two-pane">
        <aside className="card card-pad stack">
          <input
            className="input"
            placeholder="Cari nama atau deskripsi usaha"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Kata kunci"
          />

          <div className="field">
            <label htmlFor="f-sector">Sektor</label>
            <select id="f-sector" className="input" value={sectorId} onChange={(e) => setSectorId(e.target.value)}>
              <option value="">Semua sektor</option>
              {(sectors ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="f-loc">Lokasi</label>
            <input
              id="f-loc"
              className="input"
              placeholder="mis. Bandung"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="field">
            <label>Kebutuhan dana</label>
            <div className="field-grid">
              <label className="input-money">
                <input
                  className="input"
                  inputMode="numeric"
                  placeholder="Minimum"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value.replace(/\D/g, ''))}
                  aria-label="Dana minimum"
                />
              </label>
              <label className="input-money">
                <input
                  className="input"
                  inputMode="numeric"
                  placeholder="Maksimum"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value.replace(/\D/g, ''))}
                  aria-label="Dana maksimum"
                />
              </label>
            </div>
          </div>

          <div className="field">
            <label>Jenis kerja sama</label>
            <div className="chip-row">
              <button
                type="button"
                className="chip"
                aria-pressed={cooperationType === ''}
                onClick={() => setCooperationType('')}
              >
                Semua
              </button>
              {COOPERATION_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  className="chip"
                  aria-pressed={cooperationType === type}
                  onClick={() => setCooperationType(cooperationType === type ? '' : type)}
                  title={COOPERATION_HELP[type]}
                >
                  {COOPERATION_LABEL[type]}
                  <span className="info-dot" aria-hidden="true">
                    i
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label htmlFor="f-trust">Skor kepercayaan minimum</label>
            <select
              id="f-trust"
              className="input"
              value={minTrustScore}
              onChange={(e) => setMinTrustScore(e.target.value)}
            >
              <option value="">Semua skor</option>
              <option value="50">50 ke atas</option>
              <option value="70">70 ke atas</option>
              <option value="85">85 ke atas</option>
            </select>
          </div>

          {activeFilters > 0 && (
            <button type="button" className="btn btn-soft btn-block" onClick={resetAll}>
              Hapus {activeFilters} filter
            </button>
          )}
        </aside>

        <section className="stack">
          <div className="chip-row" role="tablist" aria-label="Urutkan">
            {SORTS.map((s) => (
              <button
                key={s.key}
                type="button"
                className="chip"
                aria-pressed={sort === s.key}
                onClick={() => setSort(s.key)}
              >
                {s.label}
              </button>
            ))}
          </div>

          {isLoading && <Spinner />}
          {isError && (
            <EmptyState icon="⚠️" title="Gagal memuat peluang" message="Periksa koneksimu lalu coba lagi." />
          )}

          {/* Pesan kosong berasal dari server (FR-05) */}
          {!isLoading && !isError && data && data.items.length === 0 && (
            <EmptyState
              icon="🔍"
              title="Tidak ada yang cocok"
              message={data.emptyMessage ?? 'Coba ubah kata kunci atau filter.'}
              action={
                activeFilters > 0 ? (
                  <button type="button" className="btn btn-outline" onClick={resetAll}>
                    Hapus semua filter
                  </button>
                ) : undefined
              }
            />
          )}

          {!isLoading && data && data.items.length > 0 && (
            <>
              <p className="opp-meta">{data.total} peluang ditemukan</p>
              <div className="grid-3">
                {data.items.map((item) => (
                  <OpportunityCard key={item.id} item={item} />
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
