import type { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ConnectionStatus, Role } from '@prisma/client';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';

/**
 * Modul 5 — Chat Engine (FR-08, FR-09).
 * ARCHITECTURE.md §3: Socket.io dipakai KHUSUS untuk chat; seluruh modul lain
 * tetap lewat REST. Riwayat percakapan tetap disimpan permanen di MySQL —
 * socket hanya lapisan pengiriman, bukan sumber kebenaran.
 */

type SocketUser = { id: string; role: Role };
type ChatSocket = Socket & { data: { user?: SocketUser } };

let io: Server | null = null;

/** Room per pengguna, supaya satu orang bisa membuka beberapa tab sekaligus. */
const userRoom = (userId: string) => `user:${userId}`;

/**
 * Pastikan pengguna memang salah satu pihak di percakapan DAN koneksinya masih
 * ACCEPTED. Chat tertutup begitu koneksi ditolak atau diakhiri — Modul 5 hanya
 * terbuka setelah Modul 4 menyetujui (ARCHITECTURE.md §4.1).
 */
async function loadAccessibleConversation(conversationId: string, userId: string) {
  return prisma.conversation.findFirst({
    where: {
      id: conversationId,
      connection: {
        status: ConnectionStatus.ACCEPTED,
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
    },
    select: { id: true, connection: { select: { senderId: true, receiverId: true } } },
  });
}

export function initChatGateway(server: HttpServer): Server {
  io = new Server(server, {
    cors: { origin: env.WEB_ORIGIN, credentials: true },
    path: '/socket.io',
  });

  // Handshake diverifikasi dengan access token yang sama seperti REST.
  io.use((socket: ChatSocket, next) => {
    const token = socket.handshake.auth?.token;
    if (typeof token !== 'string') return next(new Error('Token tidak ada'));
    try {
      const payload = jwt.verify(token, env.JWT_SECRET, {
        algorithms: ['HS256'],
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE,
      });
      if (typeof payload === 'string' || !payload.sub || !payload.role) throw new Error('invalid');
      socket.data.user = { id: payload.sub, role: payload.role as Role };
      next();
    } catch {
      next(new Error('Sesi tidak sah'));
    }
  });

  io.on('connection', (socket: ChatSocket) => {
    const user = socket.data.user;
    if (!user) return socket.disconnect(true);
    socket.join(userRoom(user.id));

    socket.on('conversation:join', async (conversationId: unknown) => {
      if (typeof conversationId !== 'string') return;
      const conv = await loadAccessibleConversation(conversationId, user.id);
      if (conv) socket.join(`conversation:${conv.id}`);
    });

    socket.on('message:send', async (payload: unknown, ack?: (r: unknown) => void) => {
      const data = payload as { conversationId?: unknown; body?: unknown } | null;
      const conversationId = typeof data?.conversationId === 'string' ? data.conversationId : null;
      const body = typeof data?.body === 'string' ? data.body.trim() : '';

      if (!conversationId || !body || body.length > 4000) {
        ack?.({ ok: false, error: 'Pesan tidak valid.' });
        return;
      }

      const conv = await loadAccessibleConversation(conversationId, user.id);
      if (!conv) {
        ack?.({ ok: false, error: 'Percakapan tidak tersedia.' });
        return;
      }

      // Riwayat permanen (FR-08) — simpan dulu, baru siarkan.
      const message = await prisma.message.create({
        data: { conversationId: conv.id, senderId: user.id, body },
        include: { sender: { select: { id: true, profile: { select: { fullName: true, avatarUrl: true } } } } },
      });

      io?.to(`conversation:${conv.id}`).emit('message:new', message);

      // FR-09 — indikator pesan masuk untuk lawan bicara, meski dia belum
      // membuka ruang percakapan ini.
      const other =
        conv.connection.senderId === user.id ? conv.connection.receiverId : conv.connection.senderId;
      io?.to(userRoom(other)).emit('notification:message', {
        conversationId: conv.id,
        messageId: message.id,
        preview: body.slice(0, 120),
        at: message.createdAt,
      });

      ack?.({ ok: true, message });
    });
  });

  return io;
}

/** FR-09 — dipanggil Modul 4 saat status koneksi berubah. */
export function notifyConnectionUpdate(
  userId: string,
  connectionId: string,
  status: ConnectionStatus,
): void {
  io?.to(userRoom(userId)).emit('notification:connection', { connectionId, status, at: new Date() });
}

/** Dipakai Modul 6 supaya kedua pihak langsung tahu dokumen sudah terbit. */
export function notifyAgreementUpdate(userId: string, agreementId: string, status: string): void {
  io?.to(userRoom(userId)).emit('notification:agreement', { agreementId, status, at: new Date() });
}

export function getIo(): Server | null {
  return io;
}

export async function closeChatGateway(): Promise<void> {
  await io?.close();
  io = null;
}
