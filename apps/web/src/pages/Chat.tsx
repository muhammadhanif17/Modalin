import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Avatar } from '../components/ui/Avatar';
import { Spinner, EmptyState, Badge } from '../components/ui';
import { formatWaktu } from '../lib/format';
import { readSession } from '../lib/session';

type Row = {
  id: string;
  senderId: string;
  status: string;
  fundingRequest?: { business?: { name?: string } | null } | null;
  sender?: { id: string; profile?: { fullName?: string } | null } | null;
  receiver?: { id: string; profile?: { fullName?: string } | null } | null;
};

type Msg = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
};

export function ChatListPage() {
  const session = readSession();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['connections'],
    queryFn: () => api<Row[]>('/api/connections'),
    staleTime: 20_000,
  });

  const accepted = (data ?? []).filter((c) => c.status === 'ACCEPTED');

  return (
    <div className="shell" style={{ paddingBottom: 30 }}>
      <div className="page-head">
        <h1>Percakapan</h1>
        <p>Bagikan detail dan bangun kepercayaan bersama calon mitra.</p>
      </div>

      {isLoading && <Spinner />}
      {isError && <EmptyState icon="⚠️" title="Gagal memuat percakapan" message="Coba lagi." />}
      {!isLoading && !isError && accepted.length === 0 && (
        <EmptyState
          icon="💬"
          title="Belum ada percakapan"
          message="Temukan kecocokan lalu mulai obrolan dengan calon mitra."
          action={
            <Link className="btn btn-primary" to="/app/matches">
              Lihat kecocokan
            </Link>
          }
        />
      )}
      {!isLoading && accepted.length > 0 && (
        <div className="stack">
          {accepted.map((conn) => {
            const other =
              conn.senderId === session?.id ? conn.receiver : conn.sender;
            const name = other?.profile?.fullName ?? 'Mitra';
            return (
              <Link className="row-link" to={`/app/chat/${conn.id}`} key={conn.id}>
                <Avatar name={name} seed={other?.id} size="md" />
                <div className="row-main">
                  <div className="row-title">{name}</div>
                  <div className="row-sub">{conn.fundingRequest?.business?.name ?? 'Kemitraan'}</div>
                </div>
                <Badge tone="primary">Buka</Badge>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ConversationPage({ connectionId }: { connectionId: string }) {
  const session = readSession();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['messages', connectionId],
    queryFn: () => api<Msg[]>(`/api/conversations/${connectionId}/messages`),
    staleTime: 10_000,
  });

  const { data: conn } = useQuery({
    queryKey: ['connections'],
    queryFn: () => api<Row[]>('/api/connections'),
  });

  const rows = conn ?? [];
  const thisConn = rows.find((c) => c.id === connectionId);
  const other = thisConn
    ? thisConn.senderId === session?.id
      ? thisConn.receiver
      : thisConn.sender
    : null;
  const otherName = other?.profile?.fullName ?? 'Mitra';

  if (isLoading) return <Spinner />;
  if (isError) return <EmptyState icon="⚠️" title="Gagal memuat percakapan" message="Coba lagi." />;

  const messages = data ?? [];

  return (
    <div className="shell" style={{ paddingBottom: 20 }}>
      <div style={{ padding: '14px 0' }}>
        <Link className="btn btn-ghost" to="/app/chat">
          ← Kembali
        </Link>
      </div>
      <div className="chat-shell">
        <div className="chat-head">
          <Avatar name={otherName} seed={other?.id} size="sm" />
          <span>{otherName}</span>
        </div>
        <div className="chat-body">
          {messages.length === 0 && (
            <p style={{ color: 'var(--text-3)', textAlign: 'center', margin: 'auto' }}>
              Belum ada pesan. Sapa dulu untuk memulai.
            </p>
          )}
          {messages.map((m) => {
            const mine = m.senderId === session?.id;
            return (
              <div key={m.id} className={`msg ${mine ? 'mine' : 'theirs'}`}>
                {m.body}
                <time>{formatWaktu(m.createdAt)}</time>
              </div>
            );
          })}
        </div>
        <MessageInput connectionId={connectionId} />
      </div>
    </div>
  );
}

function MessageInput({ connectionId }: { connectionId: string }) {
  const qc = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: (body: string) => api(`/api/conversations/${connectionId}/messages`, { method: 'POST', json: { body } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['messages', connectionId] }),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem('body') as HTMLTextAreaElement;
    const text = input.value.trim();
    if (!text) return;
    mutate(text);
    input.value = '';
  }

  return (
    <form className="chat-input" onSubmit={onSubmit}>
      <textarea className="input" name="body" placeholder="Tulis pesan..." rows={1} />
      <button className="btn btn-primary" type="submit" disabled={isPending}>
        Kirim
      </button>
    </form>
  );
}
