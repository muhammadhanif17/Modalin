import { Router } from 'express';
import { AgreementStatus, ConnectionStatus, CooperationType, FundingStatus, Prisma, Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { ah, badRequest, conflict, forbidden, notFound } from '../../lib/http.js';
import { currentUser, requireAuth, type AuthRequest } from '../../middleware/auth.js';
import { fileUrlFor, requireFile, uploader } from '../../middleware/upload.js';
import { notifyAgreementUpdate } from '../chat/chat.gateway.js';
import { renderAgreementPdf } from './agreement.pdf.js';

/**
 * Modul 6 — Otomatisasi Dokumen Perjanjian (FR-10, FR-11).
 * ARCHITECTURE.md §4.1: mengompilasi hasil negosiasi (Modul 5) jadi dokumen
 * sesuai jenis kerja sama, lalu menyimpan PDF final.
 */

export const agreementRouter = Router();
agreementRouter.use(requireAuth);

const agreementInclude = {
  connection: {
    select: {
      id: true,
      senderId: true,
      receiverId: true,
      sender: { select: { id: true, email: true, role: true, profile: { select: { fullName: true } } } },
      receiver: { select: { id: true, email: true, role: true, profile: { select: { fullName: true } } } },
      fundingRequest: { select: { id: true, title: true, business: { select: { id: true, name: true } } } },
    },
  },
  signatures: { select: { id: true, userId: true, signedAt: true, signatureUrl: true } },
  ratings: { select: { id: true, reviewerId: true, score: true } },
} satisfies Prisma.AgreementInclude;

const createSchema = z
  .object({
    connectionId: z.string().min(1),
    cooperationType: z.nativeEnum(CooperationType),
    amount: z.coerce.number().positive('Nominal harus lebih dari 0').max(100_000_000_000),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    profitSharingRatio: z.coerce.number().min(0).max(100).optional(),
    equityPercentage: z.coerce.number().min(0).max(100).optional(),
    interestRate: z.coerce.number().min(0).max(100).optional(),
    tenorMonths: z.coerce.number().int().min(1).max(240).optional(),
    terms: z.string().trim().max(5000).optional(),
  })
  // Tiap skema mensyaratkan angka pokoknya sendiri — form tidak boleh lolos
  // tanpa itu, karena template PDF akan mencetak "0%" yang menyesatkan.
  .refine((v) => v.cooperationType !== CooperationType.BAGI_HASIL || v.profitSharingRatio !== undefined, {
    message: 'Isi porsi bagi hasil untuk skema Bagi Hasil',
    path: ['profitSharingRatio'],
  })
  .refine((v) => v.cooperationType !== CooperationType.PENYERTAAN_MODAL || v.equityPercentage !== undefined, {
    message: 'Isi persentase kepemilikan untuk skema Penyertaan Modal',
    path: ['equityPercentage'],
  })
  .refine((v) => v.cooperationType !== CooperationType.PINJAMAN || v.interestRate !== undefined, {
    message: 'Isi imbal hasil per tahun untuk skema Pinjaman',
    path: ['interestRate'],
  });

async function loadMine(agreementId: string, userId: string) {
  const agreement = await prisma.agreement.findUnique({ where: { id: agreementId }, include: agreementInclude });
  if (!agreement) throw notFound('Dokumen kesepakatan tidak ditemukan.');
  const { senderId, receiverId } = agreement.connection;
  if (senderId !== userId && receiverId !== userId) throw notFound('Dokumen kesepakatan tidak ditemukan.');
  return agreement;
}

agreementRouter.get(
  '/',
  ah(async (req: AuthRequest, res) => {
    const me = currentUser(req);
    const rows = await prisma.agreement.findMany({
      where: { connection: { OR: [{ senderId: me.id }, { receiverId: me.id }] } },
      include: agreementInclude,
      orderBy: { createdAt: 'desc' },
    });
    res.json(rows);
  }),
);

agreementRouter.get(
  '/:id',
  ah(async (req: AuthRequest, res) => {
    const me = currentUser(req);
    res.json(await loadMine(String(req.params.id), me.id));
  }),
);

/** Form kesepakatan hanya bisa dibuat dari koneksi yang sudah ACCEPTED. */
agreementRouter.post(
  '/',
  ah(async (req: AuthRequest, res) => {
    const me = currentUser(req);
    const input = createSchema.parse(req.body);

    const connection = await prisma.connection.findFirst({
      where: {
        id: input.connectionId,
        status: ConnectionStatus.ACCEPTED,
        OR: [{ senderId: me.id }, { receiverId: me.id }],
      },
      select: { id: true, senderId: true, receiverId: true, fundingRequestId: true },
    });
    if (!connection) throw notFound('Koneksi yang sudah diterima tidak ditemukan.');

    const open = await prisma.agreement.findFirst({
      where: { connectionId: connection.id, status: { notIn: [AgreementStatus.CANCELLED, AgreementStatus.COMPLETED] } },
      select: { id: true },
    });
    if (open) throw conflict('Masih ada dokumen kesepakatan berjalan untuk koneksi ini.');

    const year = new Date().getFullYear();
    const seq = (await prisma.agreement.count()) + 1;

    const agreement = await prisma.agreement.create({
      data: {
        connectionId: connection.id,
        agreementNumber: `MLN-${year}-${String(seq).padStart(6, '0')}`,
        cooperationType: input.cooperationType,
        amount: new Prisma.Decimal(input.amount),
        startDate: input.startDate,
        endDate: input.endDate ?? null,
        profitSharingRatio:
          input.profitSharingRatio !== undefined ? new Prisma.Decimal(input.profitSharingRatio) : null,
        equityPercentage: input.equityPercentage !== undefined ? new Prisma.Decimal(input.equityPercentage) : null,
        interestRate: input.interestRate !== undefined ? new Prisma.Decimal(input.interestRate) : null,
        tenorMonths: input.tenorMonths ?? null,
        terms: input.terms ?? null,
        status: AgreementStatus.DRAFT,
      },
      include: agreementInclude,
    });

    if (connection.fundingRequestId) {
      await prisma.fundingRequest.update({
        where: { id: connection.fundingRequestId },
        data: { status: FundingStatus.NEGOTIATION },
      });
    }

    const other = connection.senderId === me.id ? connection.receiverId : connection.senderId;
    notifyAgreementUpdate(other, agreement.id, agreement.status);
    res.status(201).json(agreement);
  }),
);

/** Bubuhkan tanda tangan. Satu per pengguna per dokumen (unique key di DB). */
agreementRouter.post(
  '/:id/signature',
  uploader('signature', 'file'),
  ah(async (req: AuthRequest, res) => {
    const me = currentUser(req);
    const agreement = await loadMine(String(req.params.id), me.id);

    if (agreement.status === AgreementStatus.CANCELLED) {
      throw badRequest('Dokumen ini sudah dibatalkan.');
    }
    if (agreement.signatures.some((s) => s.userId === me.id)) {
      throw conflict('Kamu sudah menandatangani dokumen ini.');
    }

    const file = requireFile(req);
    await prisma.agreementSignature.create({
      data: {
        agreementId: agreement.id,
        userId: me.id,
        signatureUrl: fileUrlFor('signature', file.filename),
        signedIp: req.ip ?? null,
      },
    });

    // Dua tanda tangan lengkap -> SIGNED, kurang dari itu -> WAITING_SIGNATURE.
    const total = agreement.signatures.length + 1;
    const status = total >= 2 ? AgreementStatus.SIGNED : AgreementStatus.WAITING_SIGNATURE;
    const updated = await prisma.agreement.update({
      where: { id: agreement.id },
      data: { status },
      include: agreementInclude,
    });

    const other =
      agreement.connection.senderId === me.id ? agreement.connection.receiverId : agreement.connection.senderId;
    notifyAgreementUpdate(other, agreement.id, status);
    res.status(201).json(updated);
  }),
);

/**
 * FR-10 + FR-11 — terbitkan PDF final.
 *
 * Gerbang utamanya di sini: permintaan DITOLAK selama salah satu pihak belum
 * menandatangani. Ini aturan yang diminta eksplisit oleh FR-10, jadi ceknya
 * dilakukan di server, bukan sekadar menyembunyikan tombol di UI.
 */
agreementRouter.post(
  '/:id/generate',
  ah(async (req: AuthRequest, res) => {
    const me = currentUser(req);
    const agreement = await loadMine(String(req.params.id), me.id);

    if (agreement.signatures.length < 2) {
      const pending =
        agreement.signatures.length === 0
          ? 'Kedua pihak belum menandatangani.'
          : 'Masih menunggu tanda tangan satu pihak lagi.';
      throw badRequest(`Dokumen belum bisa diterbitkan. ${pending}`);
    }

    // Idempoten: sudah terbit, kembalikan yang ada.
    if (agreement.documentUrl) {
      res.json(agreement);
      return;
    }

    const c = agreement.connection;
    const byId = new Map([
      [c.sender.id, c.sender],
      [c.receiver.id, c.receiver],
    ]);
    const parties = agreement.signatures
      .map((sig) => {
        const user = byId.get(sig.userId);
        return {
          role: user?.role === Role.UMKM ? 'PIHAK PERTAMA (Pengusaha)' : 'PIHAK KEDUA (Pemodal)',
          fullName: user?.profile?.fullName ?? 'Tidak diketahui',
          email: user?.email ?? '',
          signedAt: sig.signedAt,
          signatureUrl: sig.signatureUrl,
        };
      })
      // Pihak Pertama selalu di kolom kiri.
      .sort((a, b) => a.role.localeCompare(b.role));

    const filename = await renderAgreementPdf({
      agreementNumber: agreement.agreementNumber,
      cooperationType: agreement.cooperationType,
      amount: Number(agreement.amount),
      startDate: agreement.startDate,
      endDate: agreement.endDate,
      profitSharingRatio: agreement.profitSharingRatio === null ? null : Number(agreement.profitSharingRatio),
      equityPercentage: agreement.equityPercentage === null ? null : Number(agreement.equityPercentage),
      interestRate: agreement.interestRate === null ? null : Number(agreement.interestRate),
      tenorMonths: agreement.tenorMonths,
      terms: agreement.terms,
      businessName: c.fundingRequest?.business.name ?? null,
      parties,
    });

    const updated = await prisma.agreement.update({
      where: { id: agreement.id },
      data: { documentUrl: fileUrlFor('agreement', filename), status: AgreementStatus.ACTIVE },
      include: agreementInclude,
    });

    if (c.fundingRequest?.id) {
      await prisma.fundingRequest.update({
        where: { id: c.fundingRequest.id },
        data: { status: FundingStatus.FUNDED },
      });
    }

    // FR-11: dokumen otomatis masuk rekam jejak kedua pihak — keduanya membaca
    // agreement yang sama lewat Connection, jadi cukup beri tahu keduanya.
    notifyAgreementUpdate(c.senderId, agreement.id, AgreementStatus.ACTIVE);
    notifyAgreementUpdate(c.receiverId, agreement.id, AgreementStatus.ACTIVE);
    res.json(updated);
  }),
);

/** Tandai kerja sama selesai — prasyarat rating (FR-12). */
agreementRouter.post(
  '/:id/complete',
  ah(async (req: AuthRequest, res) => {
    const me = currentUser(req);
    const agreement = await loadMine(String(req.params.id), me.id);
    if (agreement.status !== AgreementStatus.ACTIVE) {
      throw badRequest('Hanya kerja sama yang sedang berjalan yang bisa ditandai selesai.');
    }
    const updated = await prisma.agreement.update({
      where: { id: agreement.id },
      data: { status: AgreementStatus.COMPLETED },
      include: agreementInclude,
    });
    if (agreement.connection.fundingRequest?.id) {
      await prisma.fundingRequest.update({
        where: { id: agreement.connection.fundingRequest.id },
        data: { status: FundingStatus.COMPLETED },
      });
    }
    notifyAgreementUpdate(agreement.connection.senderId, agreement.id, AgreementStatus.COMPLETED);
    notifyAgreementUpdate(agreement.connection.receiverId, agreement.id, AgreementStatus.COMPLETED);
    res.json(updated);
  }),
);

agreementRouter.post(
  '/:id/cancel',
  ah(async (req: AuthRequest, res) => {
    const me = currentUser(req);
    const agreement = await loadMine(String(req.params.id), me.id);
    if (agreement.documentUrl) {
      throw forbidden('Dokumen yang sudah terbit tidak bisa dibatalkan sepihak.');
    }
    const updated = await prisma.agreement.update({
      where: { id: agreement.id },
      data: { status: AgreementStatus.CANCELLED },
      include: agreementInclude,
    });
    res.json(updated);
  }),
);
