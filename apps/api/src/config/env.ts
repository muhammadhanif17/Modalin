import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32).default('unset'),
  JWT_ISSUER: z.string().min(1),
  JWT_AUDIENCE: z.string().min(1),
  WEB_ORIGIN: z.string().url(),
  API_PORT: z.coerce.number().int().positive().default(4000),
  /// Root penyimpanan berkas. Produksi diarahkan ke Cloud Storage (ARCHITECTURE.md §3).
  UPLOAD_DIR: z.string().default('uploads'),
  /// Base URL publik untuk berkas yang sudah diunggah.
  PUBLIC_BASE_URL: z.string().url().default('http://localhost:4000'),
});

export const env = schema.parse(process.env);

export const REFRESH_SECRET =
  env.JWT_REFRESH_SECRET !== 'unset' ? env.JWT_REFRESH_SECRET : env.JWT_SECRET;

export const isHttps = env.WEB_ORIGIN.startsWith('https://');
