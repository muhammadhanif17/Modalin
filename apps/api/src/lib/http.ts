import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { z } from 'zod';

/**
 * Error yang aman ditampilkan ke pengguna. Pesan ditulis dalam Bahasa Indonesia
 * yang ramah — NFR Reliability menuntut pesan informatif, bukan error teknis
 * mentah (ARCHITECTURE.md §8).
 */
export class AppError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (m: string, d?: unknown) => new AppError(400, m, d);
export const unauthorized = (m = 'Sesi berakhir. Silakan masuk lagi.') => new AppError(401, m);
export const forbidden = (m = 'Kamu tidak punya akses untuk langkah ini.') => new AppError(403, m);
export const notFound = (m = 'Data yang dicari tidak ditemukan.') => new AppError(404, m);
export const conflict = (m: string) => new AppError(409, m);
export const payloadTooLarge = (m: string) => new AppError(413, m);

/** Bungkus handler async supaya rejection-nya sampai ke error middleware. */
export function ah(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

/** Ubah ZodError jadi pesan lapangan yang bisa dibaca pengguna awam. */
function zodMessage(error: z.ZodError): { message: string; fields: Record<string, string> } {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    if (!fields[key]) fields[key] = issue.message;
  }
  const first = error.issues[0];
  return {
    message: first ? `Data belum benar: ${first.message}` : 'Data yang kamu isi belum benar.',
    fields,
  };
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof AppError) {
    res.status(error.status).json({ error: error.message, details: error.details });
    return;
  }
  if (error instanceof z.ZodError) {
    const { message, fields } = zodMessage(error);
    res.status(400).json({ error: message, fields });
    return;
  }
  // Jangan bocorkan detail internal ke klien.
  console.error('request_error', error instanceof Error ? error.message : 'unknown');
  res.status(500).json({ error: 'Ada kendala di sistem kami. Coba lagi sebentar lagi.' });
}
