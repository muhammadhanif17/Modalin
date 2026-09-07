import { io, type Socket } from 'socket.io-client';
import { API, getToken, type ChatMessage, type ConnectionStatus } from './api';

/**
 * Klien Socket.io — FR-08 (pesan real-time) dan FR-09 (indikator in-app).
 *
 * Socket dipakai KHUSUS untuk chat dan notifikasi (ARCHITECTURE.md §3); semua
 * modul lain tetap lewat REST. Kalau WebSocket diblokir jaringan pengguna,
 * halaman chat tetap berfungsi lewat endpoint REST-nya — socket hanya membuat
 * pesan datang tanpa perlu memuat ulang.
 */

export type MessageNotification = {
  conversationId: string;
  messageId: string;
  preview: string;
  at: string;
};
export type ConnectionNotification = {
  connectionId: string;
  status: ConnectionStatus;
  at: string;
};

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  const token = getToken();
  if (!token) return null;

  if (socket?.connected || socket?.active) return socket;

  socket = io(API, {
    auth: { token },
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    withCredentials: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

/** Berlangganan pesan baru di satu percakapan. Mengembalikan fungsi pembatal. */
export function subscribeToConversation(
  conversationId: string,
  onMessage: (message: ChatMessage) => void,
): () => void {
  const s = getSocket();
  if (!s) return () => undefined;

  const join = () => s.emit('conversation:join', conversationId);
  join();
  s.on('connect', join);

  const handler = (message: ChatMessage) => {
    if (message.conversationId === conversationId) onMessage(message);
  };
  s.on('message:new', handler);

  return () => {
    s.off('message:new', handler);
    s.off('connect', join);
  };
}

/** Berlangganan indikator notifikasi global (FR-09). */
export function subscribeToNotifications(handlers: {
  onMessage?: (n: MessageNotification) => void;
  onConnection?: (n: ConnectionNotification) => void;
}): () => void {
  const s = getSocket();
  if (!s) return () => undefined;

  const onMessage = (n: MessageNotification) => handlers.onMessage?.(n);
  const onConnection = (n: ConnectionNotification) => handlers.onConnection?.(n);
  s.on('notification:message', onMessage);
  s.on('notification:connection', onConnection);

  return () => {
    s.off('notification:message', onMessage);
    s.off('notification:connection', onConnection);
  };
}

/**
 * Kirim lewat socket kalau tersambung. Mengembalikan false kalau tidak, supaya
 * pemanggil bisa jatuh ke REST — jaringan pengguna UMKM tidak selalu ramah
 * WebSocket.
 */
export function sendViaSocket(conversationId: string, body: string): Promise<boolean> {
  const s = getSocket();
  if (!s?.connected) return Promise.resolve(false);

  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), 2500);
    s.emit('message:send', { conversationId, body }, (ack: { ok?: boolean } | undefined) => {
      clearTimeout(timer);
      resolve(Boolean(ack?.ok));
    });
  });
}
