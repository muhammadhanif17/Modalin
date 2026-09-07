import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { endpoints, type ChatMessage } from '../lib/api';
import { subscribeToConversation, sendViaSocket } from '../lib/socket';
import { Avatar } from '../components/ui/Avatar';
import { Icon } from '../components/ui/Icon';
import { Spinner, EmptyState, Notice } from '../components/ui';
import { formatWaktu, formatTanggal } from '../lib/format';
import { readSession } from '../lib/session';

/**
 * Modul 5 di sisi klien — FR-08 (pesan real-time) dan FR-09 (indikator).
 *
 * Catatan: rute memakai conversationId, bukan connectionId. Versi sebelumnya
 * mengirim connectionId ke endpoint percakapan sehingga selalu gagal.
 */

export function ChatListPage() {
  const session = readSession();
  const isInvestor = session?.role === 'INVESTOR';

  const { data, isLoading, isError } = useQuery({
    queryKey: ['conversations'],
    queryFn: endpoints.conversations,
    staleTime: 15_000,
  });

  const rows = data ?? [];

  return (
    <div className="shell page-bottom">
      <div className="page-head">
        <h1>Chat</h1>
      </div>

      {isLoading && <Spinner />}
      {isError && <EmptyState icon="warning" title="Gagal memuat percakapan" message="Coba lagi sebentar lagi." />}
      {!isLoading && !isError && rows.length === 0 && (
        <EmptyState
          icon="chat"
          title="Belum ada percakapan"
          message="Kirim ketertarikan ke calon mitra dulu. Ruang chat terbuka begitu mereka menerima."
          action={
            <Link className="btn btn-primary" to="/app/beranda">
              {isInvestor ? 'Lihat rekomendasi peluang' : 'Lihat rekomendasi pemodal'}
            </Link>
          }
        />
      )}

      <div className="stack">
        {rows.map((row) => (
          <Link className="row-link" to={`/app/chat/${row.id}`} key={row.id}>
            <Avatar name={row.partner.fullName ?? 'Mitra'} seed={row.partner.id} size="md" />
            <div className="row-main">
              <div className="row-title">{row.partner.fullName ?? 'Mitra'}</div>
              <div className="row-sub chat-snippet">
                {row.lastMessage ? row.lastMessage.body : row.fundingRequest?.title ?? 'Kemitraan'}
              </div>
            </div>
            <div style={{ textAlign: 'right', flex: 'none' }}>
              {row.lastMessage && (
                <div className="opp-meta">{formatWaktu(row.lastMessage.createdAt)}</div>
              )}
              {/* FR-09 — indikator pesan belum dibaca */}
              {row.unreadCount > 0 && <span className="dot">{row.unreadCount}</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function ConversationPage({ conversationId }: { conversationId: string }) {
  const session = readSession();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState<ChatMessage[]>([]);
  const [error, setError] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => endpoints.messages(conversationId),
    staleTime: 10_000,
  });

  const { data: conversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: endpoints.conversations,
  });
  const meta = conversations?.find((c) => c.id === conversationId);

  // FR-08 — pesan masuk lewat socket, tanpa memuat ulang halaman.
  useEffect(() => {
    const unsubscribe = subscribeToConversation(conversationId, (message) => {
      setLive((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
    });
    return unsubscribe;
  }, [conversationId]);

  // Tandai terbaca begitu ruang dibuka, supaya indikator FR-09 ikut turun.
  useEffect(() => {
    endpoints
      .markRead(conversationId)
      .then(() => qc.invalidateQueries({ queryKey: ['notifications'] }))
      .catch(() => undefined);
  }, [conversationId, qc]);

  const messages = [...(data ?? []), ...live.filter((m) => !(data ?? []).some((d) => d.id === m.id))];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (isLoading) return <Spinner />;
  if (isError) {
    return (
      <div className="shell">
        <EmptyState
          icon="lock"
          title="Percakapan tidak tersedia"
          message="Ruang chat hanya terbuka untuk koneksi yang sudah diterima."
          action={
            <Link className="btn btn-outline" to="/app/chat">
              Kembali
            </Link>
          }
        />
      </div>
    );
  }

  const partnerName = meta?.partner.fullName ?? 'Mitra';

  return (
    <div className="shell" style={{ paddingBottom: 0 }}>
      <div style={{ padding: '14px 0' }}>
        <button type="button" className="back-btn" onClick={() => navigate('/app/chat')} aria-label="Kembali ke daftar chat">
          <Icon name="chevron" size={20} className="flip-x" />
        </button>
      </div>

      <div className="chat-shell">
        <div className="chat-head">
          <Avatar name={partnerName} seed={meta?.partner.id} size="sm" />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700 }}>{partnerName}</div>
            {/*
              Sengaja TIDAK menulis "Aktif sekarang": presence belum dilacak, dan
              mengarang status online membuat pengguna menunggu balasan yang tak
              akan datang. Yang ditegaskan adalah hal yang memang benar.
            */}
            <div className="chat-presence">
              <span className="presence-dot" aria-hidden="true" />
              Terhubung via Modalin
              {meta?.fundingRequest ? ` · ${meta.fundingRequest.title}` : ''}
            </div>
          </div>
        </div>

        {/*
          Kartu sistem dari layar ruang_negosiasi Stitch. Ditaruh DI LUAR
          .chat-body: di dalamnya ia ikut tergulir dan langsung hilang, karena
          ruang pesan otomatis menggulir ke bawah begitu dibuka — jadi konteks
          yang seharusnya selalu terlihat justru tidak pernah terbaca.
        */}
        <div className="escrow-note">
          <Icon name="shield" size={18} />
          <div>
            <strong>Diawasi Sistem Modalin</strong>
            <p>
              Kedua pihak sudah menunjukkan ketertarikan. Dana investasi disalurkan langsung antar
              kalian, di luar platform.
            </p>
          </div>
        </div>

        <div className="chat-body">
          {messages.length === 0 && (
            <p style={{ color: 'var(--text-3)', textAlign: 'center', margin: 'auto' }}>
              Belum ada pesan. Sapa dulu untuk memulai negosiasi.
            </p>
          )}
          {messages.map((m, i) => {
            const mine = m.senderId === session?.id;
            const prev = messages[i - 1];
            const newDay =
              !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
            return (
              <div key={m.id}>
                {newDay && (
                  <div className="chat-day">
                    <span>{formatTanggal(m.createdAt)}</span>
                  </div>
                )}
                <div className={`msg ${mine ? 'mine' : 'theirs'}`}>
                  {m.body}
                  <time>{formatWaktu(m.createdAt)}</time>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {error && <Notice tone="error" onClose={() => setError('')}>{error}</Notice>}
        <MessageInput conversationId={conversationId} onError={setError} />
      </div>

      {/* CTA menuju penyusunan kesepakatan, sesuai layar ruang_negosiasi Stitch */}
      <div className="action-shelf">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => navigate(`/app/agreements?conversation=${conversationId}`)}
        >
          Buat Dokumen SPK
        </button>
      </div>
    </div>
  );
}

function MessageInput({
  conversationId,
  onError,
}: {
  conversationId: string;
  onError: (message: string) => void;
}) {
  const qc = useQueryClient();
  const [value, setValue] = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: async (body: string) => {
      // Coba socket dulu; kalau jaringan memblokir WebSocket, jatuh ke REST.
      const sent = await sendViaSocket(conversationId, body);
      if (!sent) await endpoints.sendMessage(conversationId, body);
    },
    onSuccess: () => {
      setValue('');
      qc.invalidateQueries({ queryKey: ['messages', conversationId] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (err) => onError(err instanceof Error ? err.message : 'Pesan gagal terkirim.'),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = value.trim();
    if (!text) return;
    mutate(text);
  }

  return (
    <form className="chat-input" onSubmit={onSubmit}>
      <textarea
        className="input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Tulis pesan…"
        rows={1}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
          }
        }}
      />
      <button className="btn btn-primary" type="submit" disabled={isPending || !value.trim()}>
        Kirim
      </button>
    </form>
  );
}
