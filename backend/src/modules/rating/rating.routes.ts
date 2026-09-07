import { Router } from 'express';
import { AgreementStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { ah, badRequest, conflict, notFound } from '../../lib/http.js';
import { currentUser, requireAuth, type AuthRequest } from '../../middleware/auth.js';
import { recomputeTrustScore } from '../trust-score/trust-score.service.js';

/**
 * Modul 7 — Rating & Ulasan (FR-12).
 * ARCHITECTURE.md §4.1: satu rating per kerja sama per pemberi, hanya setelah
 * status selesai, lalu memicu pembaruan Modul 2.
 */

export const ratingRouter = Router();
ratingRouter.use(requireAuth);

const ratingSchema = z.object({
  score: z.coerce.number().int().min(1, 'Nilai minimal 1 bintang').max(5, 'Nilai maksimal 5 bintang'),
  review: z.string().trim().max(2000).optional(),
});

ratingRouter.post(
  '/agreements/:id/ratings',
  ah(async (req: AuthRequest, res) => {
    const me = currentUser(req);
    const input = ratingSchema.parse(req.body);

    const agreement = await prisma.agreement.findUnique({
      where: { id: String(req.params.id) },
      select: {
        id: true,
        status: true,
        connection: { select: { senderId: true, receiverId: true } },
      },
    });
    if (!agreement) throw notFound('Kerja sama tidak ditemukan.');

    const { senderId, receiverId } = agreement.connection;
    if (senderId !== me.id && receiverId !== me.id) throw notFound('Kerja sama tidak ditemukan.');

    // FR-12 gerbang pertama: hanya setelah selesai.
    if (agreement.status !== AgreementStatus.COMPLETED) {
      throw badRequest('Ulasan baru bisa diberikan setelah kerja sama selesai.');
    }

    // FR-12 gerbang kedua: cegah rating ganda. Unique key di database yang
    // benar-benar menegakkannya; cek ini hanya untuk pesan yang ramah.
    const existing = await prisma.rating.findFirst({
      where: { agreementId: agreement.id, reviewerId: me.id },
      select: { id: true },
    });
    if (existing) throw conflict('Kamu sudah memberi ulasan untuk kerja sama ini.');

    const reviewedUserId = senderId === me.id ? receiverId : senderId;
    const rating = await prisma.rating.create({
      data: {
        agreementId: agreement.id,
        reviewerId: me.id,
        reviewedUserId,
        score: input.score,
        review: input.review ?? null,
      },
    });

    // Modul 7 memicu Modul 2 (ARCHITECTURE.md §4.1). Ditunggu di sini supaya
    // skor yang dikembalikan ke UI sudah yang terbaru.
    const breakdown = await recomputeTrustScore(reviewedUserId);
    res.status(201).json({ rating, reviewedTrustScore: breakdown?.total ?? null });
  }),
);

/** Kerja sama selesai yang belum kuberi ulasan — sumber CTA "Beri Ulasan". */
ratingRouter.get(
  '/ratings/pending',
  ah(async (req: AuthRequest, res) => {
    const me = currentUser(req);
    const rows = await prisma.agreement.findMany({
      where: {
        status: AgreementStatus.COMPLETED,
        connection: { OR: [{ senderId: me.id }, { receiverId: me.id }] },
        ratings: { none: { reviewerId: me.id } },
      },
      include: {
        connection: {
          select: {
            senderId: true,
            receiverId: true,
            sender: { select: { id: true, profile: { select: { fullName: true, avatarUrl: true } } } },
            receiver: { select: { id: true, profile: { select: { fullName: true, avatarUrl: true } } } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json(
      rows.map((row) => {
        const c = row.connection;
        const partner = c.senderId === me.id ? c.receiver : c.sender;
        return {
          agreementId: row.id,
          agreementNumber: row.agreementNumber,
          cooperationType: row.cooperationType,
          amount: Number(row.amount),
          partner: { id: partner.id, ...partner.profile },
        };
      }),
    );
  }),
);

ratingRouter.get(
  '/users/:id/ratings',
  ah(async (req, res) => {
    const userId = String(req.params.id);
    const [items, agg] = await Promise.all([
      prisma.rating.findMany({
        where: { reviewedUserId: userId },
        include: { reviewer: { select: { id: true, profile: { select: { fullName: true, avatarUrl: true } } } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.rating.aggregate({
        where: { reviewedUserId: userId },
        _avg: { score: true },
        _count: { _all: true },
      }),
    ]);
    res.json({ items, average: agg._avg.score, total: agg._count._all });
  }),
);
