import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Avatar } from '../../components/ui/Avatar';
import { endpoints, type Connection } from '../../lib/api';
import { formatTanggal } from '../../lib/format';

/** FR-14 — hanya penerima yang boleh menerima atau menolak. */
export function IncomingCard({ connection }: { connection: Connection }) {
  const qc = useQueryClient();
  const partner = connection.sender.profile;

  const respond = useMutation({
    mutationFn: (status: 'ACCEPTED' | 'REJECTED') => endpoints.respondConnection(connection.id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['connections'] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return (
    <div className="card card-pad stack">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar name={partner?.fullName ?? 'Mitra'} seed={connection.senderId} size="md" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong>{partner?.fullName ?? 'Mitra'}</strong>
          <div className="opp-meta">
            {connection.fundingRequest?.title ?? 'Tertarik bekerja sama'} ·{' '}
            {formatTanggal(connection.createdAt)}
          </div>
        </div>
      </div>
      {connection.message && <p className="opp-desc">“{connection.message}”</p>}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          type="button"
          className="btn btn-soft"
          style={{ flex: 1 }}
          disabled={respond.isPending}
          onClick={() => respond.mutate('REJECTED')}
        >
          Tolak
        </button>
        <button
          type="button"
          className="btn btn-primary"
          style={{ flex: 1 }}
          disabled={respond.isPending}
          onClick={() => respond.mutate('ACCEPTED')}
        >
          Terima & buka chat
        </button>
      </div>
    </div>
  );
}
