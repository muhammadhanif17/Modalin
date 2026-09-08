import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { ALLOWED_UPLOAD_MIME, MAX_UPLOAD_BYTES } from '../config/scoring.js';
import { badRequest, payloadTooLarge } from '../lib/http.js';

/**
 * FR-04 — validasi format dan ukuran unggahan (PDF/gambar, maksimal 10MB),
 * lalu simpan secara aman.
 *
 * Dokumen KYC dan tanda tangan disimpan di folder terpisah dan TIDAK pernah
 * dilayani sebagai static file publik; aksesnya lewat rute ber-auth
 * (ARCHITECTURE.md §8 Security: "dokumen sensitif terisolasi aman").
 */

export type UploadScope = 'kyc' | 'portfolio' | 'signature' | 'agreement' | 'avatar';

/** Scope yang isinya sensitif — hanya pemilik dan ADMIN yang boleh membacanya. */
export const PRIVATE_SCOPES: ReadonlySet<UploadScope> = new Set(['kyc', 'signature', 'agreement']);

const EXT_BY_MIME: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export function scopeDir(scope: UploadScope): string {
  const dir = path.join(path.resolve(env.UPLOAD_DIR), scope);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function storageFor(scope: UploadScope) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, scopeDir(scope)),
    // Nama file diacak: nama asli dari klien tidak pernah dipakai, jadi tidak
    // ada jalan untuk path traversal atau menimpa berkas milik orang lain.
    filename: (_req, file, cb) => {
      const ext = EXT_BY_MIME[file.mimetype] ?? '';
      cb(null, `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${ext}`);
    },
  });
}

export function uploader(scope: UploadScope, field: string) {
  const instance = multer({
    storage: storageFor(scope),
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
    fileFilter: (_req, file, cb) => {
      if (!(ALLOWED_UPLOAD_MIME as readonly string[]).includes(file.mimetype)) {
        cb(badRequest('Format berkas harus PDF, JPG, PNG, atau WebP.'));
        return;
      }
      cb(null, true);
    },
  }).single(field);

  // Bungkus supaya MulterError jadi pesan Bahasa Indonesia yang ramah.
  return (req: Request, res: Response, next: NextFunction): void => {
    instance(req, res, (error: unknown) => {
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return next(payloadTooLarge('Ukuran berkas maksimal 10 MB. Coba kompres dulu ya.'));
        }
        return next(badRequest('Berkas gagal diunggah. Coba lagi.'));
      }
      if (error) return next(error);
      next();
    });
  };
}

/** URL yang disimpan ke database. Dilayani lewat rute /api/files yang ber-auth. */
export function fileUrlFor(scope: UploadScope, filename: string): string {
  return `${env.PUBLIC_BASE_URL}/api/files/${scope}/${filename}`;
}

/** Ambil nama file dari URL yang tersimpan, tanpa mempercayai isinya. */
export function filenameFromUrl(url: string): string | null {
  const raw = url.split('/').pop();
  if (!raw) return null;
  // Tolak apa pun yang bisa keluar dari direktori scope.
  if (raw.includes('..') || raw.includes('/') || raw.includes('\\')) return null;
  return raw;
}

export function requireFile(req: Request): Express.Multer.File {
  if (!req.file) throw badRequest('Berkas belum dipilih.');
  return req.file;
}
