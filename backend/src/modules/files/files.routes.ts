import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ah, forbidden, notFound } from '../../lib/http.js';
import { currentUser, requireAuth, type AuthRequest } from '../../middleware/auth.js';
import { PRIVATE_SCOPES, scopeDir, type UploadScope } from '../../middleware/upload.js';

/**
 * Penyajian berkas ber-otorisasi.
 *
 * Dokumen sensitif (KTP, NIB, tanda tangan, PDF perjanjian) TIDAK pernah
 * dilayani sebagai static file publik — NFR Security mensyaratkan dokumen
 * identitas dan tanda tangan tersimpan terisolasi (ARCHITECTURE.md §8).
 * Tebakan URL saja tidak cukup untuk membukanya.
 */

export const filesRouter = Router();
filesRouter.use(requireAuth);

const SCOPES: readonly UploadScope[] = ['kyc', 'portfolio', 'signature', 'agreement', 'avatar'];

/** Siapa yang boleh membuka berkas di scope privat. */
async function canRead(scope: UploadScope, url: string, user: { id: string; role: Role }): Promise<boolean> {
  if (user.role === Role.ADMIN) return true;

  if (scope === 'kyc') {
    // Hanya pemilik dokumen (dan ADMIN di atas).
    const owner = await prisma.profile.findFirst({
      where: { OR: [{ ktpUrl: url }, { nibUrl: url }] },
      select: { userId: true },
    });
    return owner?.userId === user.id;
  }

  if (scope === 'signature') {
    const sig = await prisma.agreementSignature.findFirst({
      where: { signatureUrl: url },
      select: { agreement: { select: { connection: { select: { senderId: true, receiverId: true } } } } },
    });
    const c = sig?.agreement.connection;
    return c ? c.senderId === user.id || c.receiverId === user.id : false;
  }

  if (scope === 'agreement') {
    const agreement = await prisma.agreement.findFirst({
      where: { documentUrl: url },
      select: { connection: { select: { senderId: true, receiverId: true } } },
    });
    const c = agreement?.connection;
    return c ? c.senderId === user.id || c.receiverId === user.id : false;
  }

  return true;
}

filesRouter.get(
  '/:scope/:filename',
  ah(async (req: AuthRequest, res) => {
    const me = currentUser(req);
    const scope = String(req.params.scope) as UploadScope;
    const filename = String(req.params.filename);

    if (!SCOPES.includes(scope)) throw notFound('Berkas tidak ditemukan.');
    // Nama berkas selalu hasil generate kita sendiri; tolak apa pun yang bisa
    // keluar dari direktori scope.
    if (!/^[A-Za-z0-9._-]+$/.test(filename) || filename.includes('..')) {
      throw notFound('Berkas tidak ditemukan.');
    }

    const dir = scopeDir(scope);
    const target = path.join(dir, filename);
    if (!target.startsWith(dir) || !fs.existsSync(target)) throw notFound('Berkas tidak ditemukan.');

    if (PRIVATE_SCOPES.has(scope)) {
      const url = `${req.protocol}://${req.get('host')}/api/files/${scope}/${filename}`;
      // URL yang tersimpan di database memakai PUBLIC_BASE_URL, jadi cocokkan
      // berdasarkan akhiran path supaya tetap jalan di balik proxy.
      const stored = await findStoredUrl(scope, filename);
      if (!stored || !(await canRead(scope, stored, me))) {
        throw forbidden('Kamu tidak punya akses ke dokumen ini.');
      }
      void url;
      res.setHeader('Cache-Control', 'private, no-store');
    } else {
      res.setHeader('Cache-Control', 'private, max-age=3600');
    }

    res.sendFile(target);
  }),
);

/** Cari URL persis seperti yang tersimpan di database untuk berkas ini. */
async function findStoredUrl(scope: UploadScope, filename: string): Promise<string | null> {
  const suffix = `/api/files/${scope}/${filename}`;
  if (scope === 'kyc') {
    const row = await prisma.profile.findFirst({
      where: { OR: [{ ktpUrl: { endsWith: suffix } }, { nibUrl: { endsWith: suffix } }] },
      select: { ktpUrl: true, nibUrl: true },
    });
    return row?.ktpUrl?.endsWith(suffix) ? row.ktpUrl : (row?.nibUrl ?? null);
  }
  if (scope === 'signature') {
    const row = await prisma.agreementSignature.findFirst({
      where: { signatureUrl: { endsWith: suffix } },
      select: { signatureUrl: true },
    });
    return row?.signatureUrl ?? null;
  }
  if (scope === 'agreement') {
    const row = await prisma.agreement.findFirst({
      where: { documentUrl: { endsWith: suffix } },
      select: { documentUrl: true },
    });
    return row?.documentUrl ?? null;
  }
  return null;
}
