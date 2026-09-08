import { Router } from 'express';
import { ConnectionStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { ah, notFound } from '../../lib/http.js';
import { currentUser, requireAuth, type AuthRequest } from '../../middleware/auth.js';
import { getIo } from './chat.gateway.js';

/**
 * Modul 5 — sisi REST dari Chat Engine.
 * Socket.io menangani pengiriman real-time; REST menangani muat riwayat,
 * tanda baca, dan hitungan notifikasi saat aplikasi baru dibuka (FR-09).
 */

export const chatRouter = Router();
chatRouter.use(requireAuth);

async function accessibleConversation(conversationId: string, userId: string) {
  const conv = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      connection: { status: ConnectionStatus.ACCEPTED, OR: [{ senderId: userId }, { receiverId: userId }] },
    },
    select: { id: true, connection: { select: { id: true, senderId: true, receiverId: true } } },
  });
  if (!conv) throw notFound('Percakapan tidak tersedia.');
  return conv;
}

/** Daftar percakapan + jumlah pesan belum dibaca, untuk badge di bottom nav. */
chatRouter.get(
  '/conversations',
  ah(async (req: AuthRequest, res) => {
    const me = currentUser(req);
    const rows = await prisma.conversation.findMany({
      where: { connection: { status: ConnectionStatus.ACCEPTED, OR: [{ senderId: me.id }, { receiverId: me.id }] } },
      select: {
        id: true,
        createdAt: true,
        connection: {
          select: {
            id: true,
            senderId: true,
            receiverId: true,
            sender: { select: { id: true, profile: { select: { fullName: true, avatarUrl: true } } } },
            receiver: { select: { id: true, profile: { select: { fullName: true, avatarUrl: true } } } },
            fundingRequest: { select: { id: true, title: true } },
          },
        },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { messages: { where: { readAt: null, senderId: { not: me.id } } } } },
      },
    });

    const items = rows
      .map((row) => {
        const c = row.connection;
        const partner = c.senderId === me.id ? c.receiver : c.sender;
        return {
          id: row.id,
          connectionId: c.id,
          fundingRequest: c.fundingRequest,
          partner: { id: partner.id, ...partner.profile },
          lastMessage: row.messages[0] ?? null,
          unreadCount: row._count.messages,
        };
      })
      .sort((a, b) => {
        const at = a.lastMessage?.createdAt?.getTime() ?? 0;
        const bt = b.lastMessage?.createdAt?.getTime() ?? 0;
        return bt - at;
      });

    res.json(items);
  }),
);

chatRouter.get(
  '/conversations/:id/messages',
  ah(async (req: AuthRequest, res) => {
    const me = currentUser(req);
    const conv = await accessibleConversation(String(req.params.id), me.id);
    const messages = await prisma.message.findMany({
      where: { conversationId: conv.id },
      include: { sender: { select: { id: true, profile: { select: { fullName: true, avatarUrl: true } } } } },
      orderBy: { createdAt: 'asc' },
      take: 500,
    });
    res.json(messages);
  }),
);

/**
 * Fallback REST untuk kirim pesan — dipakai kalau WebSocket diblokir jaringan
 * pengguna. Hasilnya tetap disiarkan lewat socket supaya lawan bicara yang
 * online tetap menerimanya seketika.
 */
chatRouter.post(
  '/conversations/:id/messages',
  ah(async (req: AuthRequest, res) => {
    const me = currentUser(req);
    const { body } = z.object({ body: z.string().trim().min(1, 'Pesan tidak boleh kosong').max(4000) }).parse(req.body);
    const conv = await accessibleConversation(String(req.params.id), me.id);

    const message = await prisma.message.create({
      data: { conversationId: conv.id, senderId: me.id, body },
      include: { sender: { select: { id: true, profile: { select: { fullName: true, avatarUrl: true } } } } },
    });

    const io = getIo();
    io?.to(`conversation:${conv.id}`).emit('message:new', message);
    const other = conv.connection.senderId === me.id ? conv.connection.receiverId : conv.connection.senderId;
    io?.to(`user:${other}`).emit('notification:message', {
      conversationId: conv.id,
      messageId: message.id,
      preview: body.slice(0, 120),
      at: message.createdAt,
    });

    res.status(201).json(message);
  }),
);

chatRouter.post(
  '/conversations/:id/read',
  ah(async (req: AuthRequest, res) => {
    const me = currentUser(req);
    const conv = await accessibleConversation(String(req.params.id), me.id);
    const { count } = await prisma.message.updateMany({
      where: { conversationId: conv.id, senderId: { not: me.id }, readAt: null },
      data: { readAt: new Date() },
    });
    res.json({ ok: true, marked: count });
  }),
);

/**
 * FR-09 — ringkasan indikator in-app. Diturunkan dari data yang sudah ada
 * (Message.readAt dan Connection.status), tanpa tabel Notification tersendiri.
 */
chatRouter.get(
  '/notifications/summary',
  ah(async (req: AuthRequest, res) => {
    const me = currentUser(req);
    const [unreadMessages, pendingConnections, acceptedUnseen] = await Promise.all([
      prisma.message.count({
        where: {
          readAt: null,
          senderId: { not: me.id },
          conversation: { connection: { OR: [{ senderId: me.id }, { receiverId: me.id }] } },
        },
      }),
      // Ketertarikan masuk yang belum direspons.
      prisma.connection.count({ where: { receiverId: me.id, status: ConnectionStatus.PENDING } }),
      // Ketertarikan yang kita kirim dan baru saja diterima.
      prisma.connection.count({ where: { senderId: me.id, status: ConnectionStatus.ACCEPTED } }),
    ]);
    res.json({ unreadMessages, pendingConnections, acceptedConnections: acceptedUnseen });
  }),
);
