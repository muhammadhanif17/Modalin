import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Spinner, EmptyState, Notice, Badge } from '../components/ui';
import { formatRupiah, formatTanggal } from '../lib/format';

export function AdminPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api<Stats>('/api/admin/stats'),
    staleTime: 30_000,
  });

  return (
    <div className="shell" style={{ paddingBottom: 30 }}>
      <div className="page-head">
        <h1>Dashboard Admin</h1>
        <p>Pantau aktivitas dan moderasi platform Modalin.</p>
      </div>
      <section className="stack">
        {statsLoading ? (
          <Spinner />
        ) : (
          <div className="stat-grid">
            <Stat label="Total pengguna" value={String(stats?.totalUsers ?? 0)} />
            <Stat label="UMKM" value={String(stats?.umkmCount ?? 0)} />
            <Stat label="Investor" value={String(stats?.investorCount ?? 0)} />
            <Stat label="Admin" value={String(stats?.adminCount ?? 0)} />
            <Stat label="Permohonan aktif" value={String(stats?.activeRequests ?? 0)} />
            <Stat label="Terkumpul" value={String(stats?.fundedRequests ?? 0)} />
            <Stat label="Koneksi" value={String(stats?.totalConnections ?? 0)} />
            <Stat label="Perjanjian" value={String(stats?.totalAgreements ?? 0)} />
          </div>
        )}
      </section>
      <div className="stack" style={{ marginTop: 24 }}>
        <ModerateRequests />
        <ManageUsers />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card card-pad stat-box">
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function ModerateRequests() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-funding'],
    queryFn: () => api<FRow[]>('/api/admin/funding-requests'),
    staleTime: 30_000,
  });
  const mutation = useMutation({
    mutationFn: (payload: { id: string; status: string }) =>
      api(`/api/admin/funding-requests/${payload.id}/status`, { method: 'PATCH', json: { status: payload.status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-funding'] }),
  });

  const rows = data ?? [];

  return (
    <div className="card card-pad">
      <h3>Moderasi permohonan</h3>
      {isLoading && <Spinner />}
      {isError && <EmptyState icon="⚠️" title="Gagal memuat" message="Coba lagi." />}
      {!isLoading && !isError && rows.length === 0 && (
        <EmptyState icon="📭" title="Tidak ada permohonan" message="Belum ada funding request." />
      )}
      {!isLoading && rows.length > 0 && (
        <div className="list">
          {rows.map((r) => (
            <div className="list-row" key={r.id}>
              <div style={{ flex: 1 }}>
                <strong>{r.business?.name ?? '-'}</strong>
                <div className="opp-meta">
                  {formatRupiah(r.targetAmount)} · {r.status}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {r.status !== 'ACTIVE' && (
                  <button className="btn btn-soft btn-sm" onClick={() => mutation.mutate({ id: r.id, status: 'ACTIVE' })}>
                    Aktifkan
                  </button>
                )}
                {r.status !== 'FUNDED' && (
                  <button className="btn btn-soft btn-sm" onClick={() => mutation.mutate({ id: r.id, status: 'FUNDED' })}>
                    Tandai terkumpul
                  </button>
                )}
                {r.status !== 'CANCELLED' && (
                  <button className="btn btn-outline btn-sm" onClick={() => mutation.mutate({ id: r.id, status: 'CANCELLED' })}>
                    Batalkan
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ManageUsers() {
  const [filter, setFilter] = useState('');
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-users', filter],
    queryFn: () => api<URow[]>(`/api/admin/users${filter ? `?role=${filter}` : ''}`),
    staleTime: 30_000,
  });
  const mutation = useMutation({
    mutationFn: (payload: { id: string; isVerified: boolean }) =>
      api(`/api/admin/users/${payload.id}/verify`, { method: 'PATCH', json: { isVerified: payload.isVerified } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
  const [notice, setNotice] = useState('');

  const rows = data ?? [];

  return (
    <div className="card card-pad">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h3>Manajemen pengguna</h3>
        <select className="select" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter peran">
          <option value="">Semua peran</option>
          <option value="UMKM">UMKM</option>
          <option value="INVESTOR">Investor</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>
      {notice && <Notice tone="success" onClose={() => setNotice('')}>{notice}</Notice>}
      {isLoading && <Spinner />}
      {isError && <EmptyState icon="⚠️" title="Gagal memuat" message="Coba lagi." />}
      {!isLoading && rows.length === 0 && <EmptyState icon="👥" title="Tidak ada pengguna" />}
      {!isLoading && rows.length > 0 && (
        <div className="list">
          {rows.map((u) => (
            <div className="list-row" key={u.id}>
              <div style={{ flex: 1 }}>
                <strong>{u.profile?.fullName ?? u.email}</strong>
                <div className="opp-meta">
                  {u.email} · {u.role}
                </div>
              </div>
              <Badge tone={u.profile?.isVerified ? 'success' : 'warning'}>
                {u.profile?.isVerified ? 'Terverifikasi' : 'Belum verifikasi'}
              </Badge>
              <button
                className="btn btn-soft btn-sm"
                onClick={() =>
                  mutation.mutate(
                    { id: u.id, isVerified: !u.profile?.isVerified },
                    {
                      onSuccess: () =>
                        setNotice(u.profile?.isVerified ? 'Verifikasi dibatalkan.' : 'Pengguna diverifikasi.'),
                    }
                  )
                }
              >
                {u.profile?.isVerified ? 'Tarik verifikasi' : 'Verifikasi'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type Stats = {
  totalUsers: number;
  umkmCount: number;
  investorCount: number;
  adminCount: number;
  activeRequests: number;
  fundedRequests: number;
  totalConnections: number;
  totalAgreements: number;
};

type FRow = {
  id: string;
  targetAmount: number;
  status: string;
  business?: { name?: string } | null;
};

type URow = {
  id: string;
  email: string;
  role: string;
  profile?: { fullName?: string; isVerified?: boolean } | null;
};