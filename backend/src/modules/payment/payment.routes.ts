import { Router } from 'express';
import { Prisma, TransactionStatus, TransactionType } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { ah, badRequest, notFound } from '../../lib/http.js';
import { currentUser, requireAuth, type AuthRequest } from '../../middleware/auth.js';

/**
 * Modul 8 — Integrasi Pembayaran (FR-13).
 *
 * SIMULASI MURNI untuk babak penyisihan: tidak ada SDK Midtrans/Xendit, tidak
 * ada panggilan keluar sama sekali (ARCHITECTURE.md §11). Yang dibangun di
 * sini adalah infrastruktur checkout-nya, sesuai proposal §4.2 poin 4.
 *
 * PENTING: dana investasi antara UMKM dan investor TIDAK PERNAH lewat modul
 * ini. Alasannya perizinan — pemrosesan langsung berpotensi masuk ranah
 * Securities Crowdfunding (POJK No. 17/2025) atau P2P lending yang diawasi
 * OJK. Modul ini hanya untuk biaya layanan platform dan langganan Modalin Pro.
 */

export const paymentRouter = Router();
paymentRouter.use(requireAuth);

/** Katalog harga. Nominal ditentukan server, tidak pernah dikirim klien. */
export const PRODUCTS = {
  PLATFORM_FEE: {
    type: TransactionType.PLATFORM_FEE,
    amount: 49_000,
    name: 'Biaya Layanan Platform',
    description: 'Biaya pemrosesan verifikasi dan penerbitan dokumen kerja sama.',
  },
  SUBSCRIPTION_PRO: {
    type: TransactionType.SUBSCRIPTION_PRO,
    amount: 99_000,
    name: 'Langganan Modalin Pro (1 bulan)',
    description: 'Analitik lanjutan, kapasitas unggah lebih besar, laporan ekspor, dukungan prioritas.',
  },
} as const;

paymentRouter.get('/products', (_req, res) => {
  res.json(
    Object.entries(PRODUCTS).map(([key, p]) => ({
      key,
      ...p,
      // Ditandai eksplisit supaya UI wajib menampilkan label simulasi.
      simulated: true,
    })),
  );
});

/** Buat transaksi berstatus PENDING — layar checkout. */
paymentRouter.post(
  '/checkout',
  ah(async (req: AuthRequest, res) => {
    const me = currentUser(req);
    const { product } = z
      .object({ product: z.enum(['PLATFORM_FEE', 'SUBSCRIPTION_PRO']) })
      .parse(req.body);
    const item = PRODUCTS[product];

    const seq = (await prisma.transaction.count()) + 1;
    const transaction = await prisma.transaction.create({
      data: {
        userId: me.id,
        type: item.type,
        amount: new Prisma.Decimal(item.amount),
        status: TransactionStatus.PENDING,
        referenceCode: `TRX-${new Date().getFullYear()}-${String(seq).padStart(6, '0')}`,
        description: item.name,
      },
    });
    res.status(201).json({ ...transaction, amount: Number(transaction.amount), simulated: true });
  }),
);

/**
 * Konfirmasi pembayaran tersimulasi. Tidak ada panggilan ke payment gateway
 * mana pun — status langsung ditetapkan sesuai pilihan pengguna di UI simulasi,
 * termasuk jalur gagal supaya empty/reject-path bisa didemokan.
 */
paymentRouter.post(
  '/transactions/:id/confirm',
  ah(async (req: AuthRequest, res) => {
    const me = currentUser(req);
    const { outcome } = z
      .object({ outcome: z.enum(['SUCCESS', 'FAILED']).default('SUCCESS') })
      .parse(req.body);

    const transaction = await prisma.transaction.findFirst({
      where: { id: String(req.params.id), userId: me.id },
      select: { id: true, status: true },
    });
    if (!transaction) throw notFound('Transaksi tidak ditemukan.');
    if (transaction.status !== TransactionStatus.PENDING) {
      throw badRequest('Transaksi ini sudah diproses sebelumnya.');
    }

    const updated = await prisma.transaction.update({
      where: { id: transaction.id },
      data:
        outcome === 'SUCCESS'
          ? { status: TransactionStatus.SUCCESS, paidAt: new Date() }
          : { status: TransactionStatus.FAILED },
    });
    res.json({ ...updated, amount: Number(updated.amount), simulated: true });
  }),
);

paymentRouter.get(
  '/transactions',
  ah(async (req: AuthRequest, res) => {
    const me = currentUser(req);
    const rows = await prisma.transaction.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(rows.map((row) => ({ ...row, amount: Number(row.amount), simulated: true })));
  }),
);
