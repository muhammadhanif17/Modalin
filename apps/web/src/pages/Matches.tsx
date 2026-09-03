import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { OpportunityCard, OpportunityItem } from '../components/OpportunityCard';
import { Spinner, EmptyState } from '../components/ui';

export function MatchesPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['matches'],
    queryFn: () => api<Row[]>('/api/matches'),
    staleTime: 30_000,
  });

  const sorted = useMemo(() => {
    const rows = data ?? [];
    return [...rows].sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
  }, [data]);

  const items: OpportunityItem[] = sorted.map((row) => ({
    id: row.id,
    name: row.business?.name ?? 'Usaha',
    sector: row.business?.sector?.name ?? 'Umum',
    location: row.business?.location ?? '-',
    description: row.business?.description ?? (row.purpose ?? ''),
    targetAmount: Number(row.targetAmount ?? 0),
    cooperationType: row.cooperationType ?? null,
    ownerName: row.business?.owner?.profile?.fullName ?? null,
    matchScore: row.matchScore ?? null,
  }));

  return (
    <div className="shell">
      <div className="page-head">
        <h1>Kecocokanmu</h1>
        <p>Diurutkan dari yang paling sesuai berdasarkan kriteria membangun bersamamu.</p>
      </div>

      <div className="stack">
        {isLoading && <Spinner />}
        {isError && (
          <EmptyState icon="⚠️" title="Gagal memuat kecocokan" message="Coba lagi sebentar lagi." />
        )}
        {!isLoading && !isError && items.length === 0 && (
          <EmptyState
            icon="💚"
            title="Belum ada kecocokan"
            message="Lengkapi profilmu agar sistem bisa menemukan mitra yang tepat."
          />
        )}
        {items.map((item, i) => (
          <OpportunityCard key={item.id} item={item} rank={i} />
        ))}
      </div>
    </div>
  );
}

type Row = {
  id: string;
  targetAmount: number;
  cooperationType: string;
  purpose: string;
  matchScore: number;
  business?: {
    name: string;
    description: string;
    location: string;
    sector?: { name: string } | null;
    owner?: { profile?: { fullName?: string } | null } | null;
  } | null;
};
