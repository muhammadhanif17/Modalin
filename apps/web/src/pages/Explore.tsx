import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { OpportunityCard, OpportunityItem } from '../components/OpportunityCard';
import { Spinner, EmptyState } from '../components/ui';
import { SECTORS } from '../lib/format';

export function ExplorePage() {
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('');
  const [location, setLocation] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['funding-requests'],
    queryFn: () => api<Row[]>('/api/funding-requests'),
    staleTime: 30_000,
  });

  const items: OpportunityItem[] = useMemo(() => {
    const rows = data ?? [];
    return rows
      .map((row) => ({
        id: row.id,
        name: row.business?.name ?? 'Usaha',
        sector: row.business?.sector?.name ?? 'Umum',
        location: row.business?.location ?? '-',
        description: row.business?.description ?? (row.purpose ?? ''),
        targetAmount: Number(row.targetAmount ?? 0),
        cooperationType: row.cooperationType ?? null,
        ownerName: row.business?.owner?.profile?.fullName ?? null,
      }))
      .filter((item) => {
        const q = search.trim().toLowerCase();
        if (q && !item.name.toLowerCase().includes(q) && !item.sector.toLowerCase().includes(q)) {
          return false;
        }
        if (sector && item.sector !== sector) return false;
        if (location && !item.location.toLowerCase().includes(location.toLowerCase())) return false;
        return true;
      });
  }, [data, search, sector, location]);

  const locations = useMemo(
    () => Array.from(new Set((data ?? []).map((r) => r.business?.location).filter(Boolean))),
    [data]
  );

  return (
    <div className="shell">
      <div className="page-head">
        <h1>Jelajahi peluang</h1>
        <p>Temukan bisnis dan investor yang paling cocok denganmu.</p>
      </div>

      <div className="filter-bar">
        <input
          className="input"
          placeholder="Cari nama usaha atau sektor"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Cari"
        />
        <select className="select" value={sector} onChange={(e) => setSector(e.target.value)} aria-label="Sektor">
          <option value="">Semua sektor</option>
          {SECTORS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select className="select" value={location} onChange={(e) => setLocation(e.target.value)} aria-label="Lokasi">
          <option value="">Semua lokasi</option>
          {locations.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <Spinner />}
      {isError && (
        <EmptyState icon="⚠️" title="Gagal memuat peluang" message="Periksa koneksimu lalu coba lagi." />
      )}
      {!isLoading && !isError && items.length === 0 && (
        <EmptyState
          icon="🔍"
          title="Tidak ada yang cocok"
          message="Coba ubah kata kunci atau filter untuk hasil lain."
        />
      )}
      {!isLoading && items.length > 0 && (
        <div className="grid-3">
          {items.map((item) => (
            <OpportunityCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

type Row = {
  id: string;
  targetAmount: number;
  cooperationType: string;
  purpose: string;
  business?: {
    name: string;
    description: string;
    location: string;
    sector?: { name: string } | null;
    owner?: { profile?: { fullName?: string } | null } | null;
  } | null;
};
