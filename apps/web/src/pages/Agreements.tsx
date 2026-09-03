import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Avatar } from '../components/ui/Avatar';
import { Spinner, EmptyState, Badge } from '../components/ui';
import { formatRupiah, formatTanggal } from '../lib/format';
import { readSession } from '../lib/session';

const STATUS_TONE: Record<string, 'soft' | 'warning' | 'success' | 'accent' | 'primary'> = {
  DRAFT: 'warning',
  COMPLETED: 'success',
  SIGNED: 'primary',
  active: 'success',
};

export function AgreementsPage() {
  const session = readSession();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['agreements'],
    queryFn: () => api<Row[]>('/api/agreements'),
    staleTime: 30_000,
  });

  const rows = data ?? [];

  return (
    <div className="shell" style={{ paddingBottom: 30 }}>
      <div className="page-head">
        <h1>Perjanjian</h1>
        <p>Rekam jejak kesepakatan dan status kemitraanmu.</p>
      </div>

      {isLoading && <Spinner />}
      {isError && <EmptyState icon="⚠️" title="Gagal memuat perjanjian" message="Coba lagi." />}
      {!isLoading && !isError && rows.length === 0 && (
        <EmptyState
          icon="📄"
          title="Belum ada perjanjian"
          message="Perjanjian muncul setelah kamu dan mitra sepakat untuk bekerja sama."
        />
      )}
      {!isLoading && rows.length > 0 && (
        <div className="stack">
          {rows.map((a) => {
            const conn = a.connection;
            const other =
              conn?.senderId === session?.id ? conn?.receiver : conn?.sender;
            const name = other?.profile?.fullName ?? 'Mitra';
            return (
              <div className="card card-pad" key={a.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <Avatar name={name} seed={other?.id} size="md" />
                  <div style={{ flex: 1 }}>
                    <strong>{a.agreementNumber}</strong>
                    <div className="opp-meta">
                      {name} · {a.cooperationType}
                    </div>
                  </div>
                  <Badge tone={STATUS_TONE[a.status] ?? 'soft'}>{label(a.status)}</Badge>
                </div>
                <hr className="divider" style={{ margin: '16px 0' }} />
                <div className="detail-list" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div className="detail-item">
                    <small>Nominal</small>
                    <strong>{formatRupiah(a.amount)}</strong>
                  </div>
                  <div className="detail-item">
                    <small>Mulai</small>
                    <strong>{formatTanggal(a.startDate)}</strong>
                  </div>
                  {a.endDate && (
                    <div className="detail-item">
                      <small>Selesai</small>
                      <strong>{formatTanggal(a.endDate)}</strong>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function label(status: string): string {
  const map: Record<string, string> = {
    DRAFT: 'Draf',
    SIGNED: 'Ditandatangani',
    COMPLETED: 'Selesai',
    ACTIVE: 'Aktif',
  };
  return map[status] ?? status;
}

type Row = {
  id: string;
  agreementNumber: string;
  amount: number;
  cooperationType: string;
  startDate: string;
  endDate?: string | null;
  status: string;
  connection?: {
    senderId: string;
    sender?: { id: string; profile?: { fullName?: string } | null } | null;
    receiver?: { id: string; profile?: { fullName?: string } | null } | null;
  } | null;
};
