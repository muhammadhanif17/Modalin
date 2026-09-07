import http from 'node:http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { errorHandler } from './lib/http.js';

// Delapan modul domain — ARCHITECTURE.md §4.1. Berkas ini hanya merakit;
// seluruh aturan bisnis tinggal di dalam modulnya masing-masing.
import { authRouter, adminVerificationRouter } from './modules/auth/auth.routes.js'; // Modul 1
// Modul 2 (Trust Score) tidak punya rute sendiri: dipicu modul lain.
import { profileRouter } from './modules/profile/profile.routes.js'; // Modul 3
import { matchmakingRouter } from './modules/matchmaking/matchmaking.routes.js'; // Modul 4
import { chatRouter } from './modules/chat/chat.routes.js'; // Modul 5
import { initChatGateway, closeChatGateway } from './modules/chat/chat.gateway.js';
import { agreementRouter } from './modules/agreement/agreement.routes.js'; // Modul 6
import { ratingRouter } from './modules/rating/rating.routes.js'; // Modul 7
import { paymentRouter } from './modules/payment/payment.routes.js'; // Modul 8
import { filesRouter } from './modules/files/files.routes.js';
import { adminRouter } from './modules/admin/admin.routes.js';

export const app = express();
app.disable('x-powered-by');
// crossOriginResourcePolicy dilonggarkan supaya frontend di origin lain bisa
// menampilkan gambar/PDF dari /api/files; otorisasinya tetap dijaga rute itu.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
app.use(express.json({ limit: '64kb' }));
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'modalin-api' });
});

app.use('/api/auth', authRouter); // Modul 1
app.use('/api/profile', profileRouter); // Modul 3
app.use('/api', matchmakingRouter); // Modul 4 — /search, /matches, /connections
app.use('/api/chat', chatRouter); // Modul 5
app.use('/api/agreements', agreementRouter); // Modul 6
app.use('/api', ratingRouter); // Modul 7 — /agreements/:id/ratings, /ratings/pending
app.use('/api/payments', paymentRouter); // Modul 8
app.use('/api/files', filesRouter);
app.use('/api/admin', adminVerificationRouter); // antrean KYC, milik Modul 1
app.use('/api/admin', adminRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint tidak ditemukan.' });
});
app.use(errorHandler);

const server = http.createServer(app);
// Socket.io KHUSUS chat (ARCHITECTURE.md §3); modul lain tetap REST.
initChatGateway(server);

if (process.env.NODE_ENV !== 'test') {
  server.listen(env.API_PORT, () => {
    console.log(`Modalin API listening on :${env.API_PORT}`);
  });
}

async function shutdown(): Promise<void> {
  await closeChatGateway();
  server.close();
  await prisma.$disconnect();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;
