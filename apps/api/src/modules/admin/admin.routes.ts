import { Router } from 'express';
import { AgreementStatus, ConnectionStatus, FundingStatus, Role, VerificationStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { ah } from '../../lib/http.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

/**
 * Panel internal Admin. Bukan modul domain tersendiri di ARCHITECTURE.md §4.1
 * — antrean verifikasi KYC ada di Modul 1 (lihat auth.routes.ts); di sini
 * hanya ringkasan operasional untuk memantau demo.
 */

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole(Role.ADMIN));

adminRouter.get(
  '/stats',
  ah(async (_req, res) => {
    const [
      totalUsers,
      umkm,
      investor,
      pendingVerification,
      verified,
      activeRequests,
      pendingConnections,
      acceptedConnections,
      signedAgreements,
      ratings,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: Role.UMKM } }),
      prisma.user.count({ where: { role: Role.INVESTOR } }),
      prisma.profile.count({ where: { verificationStatus: VerificationStatus.PENDING } }),
      prisma.profile.count({ where: { verificationStatus: VerificationStatus.VERIFIED } }),
      prisma.fundingRequest.count({ where: { status: FundingStatus.ACTIVE } }),
      prisma.connection.count({ where: { status: ConnectionStatus.PENDING } }),
      prisma.connection.count({ where: { status: ConnectionStatus.ACCEPTED } }),
      prisma.agreement.count({ where: { status: { in: [AgreementStatus.SIGNED, AgreementStatus.ACTIVE, AgreementStatus.COMPLETED] } } }),
      prisma.rating.count(),
    ]);
    res.json({
      totalUsers,
      umkm,
      investor,
      pendingVerification,
      verified,
      activeRequests,
      pendingConnections,
      acceptedConnections,
      signedAgreements,
      ratings,
    });
  }),
);

adminRouter.get(
  '/users',
  ah(async (req, res) => {
    const query = z
      .object({
        role: z.nativeEnum(Role).optional(),
        search: z.string().trim().max(80).optional(),
        limit: z.coerce.number().int().min(1).max(100).default(50),
      })
      .parse(req.query);

    const users = await prisma.user.findMany({
      where: {
        role: query.role,
        ...(query.search ? { email: { contains: query.search } } : {}),
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        profile: {
          select: { fullName: true, location: true, verificationStatus: true, trustScore: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit,
    });
    res.json(users);
  }),
);
