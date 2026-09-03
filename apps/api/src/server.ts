import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { FundingStatus, PrismaClient, Role } from '@prisma/client';

const env = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_ISSUER: z.string().min(1),
  JWT_AUDIENCE: z.string().min(1),
  WEB_ORIGIN: z.string().url(),
  API_PORT: z.coerce.number().int().positive().default(4000)
}).parse(process.env);

const prisma = new PrismaClient();
const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
app.use(express.json({ limit: '20kb' }));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });
const registerSchema = z.object({ email: z.string().email().max(254), password: z.string().min(8).max(128), role: z.nativeEnum(Role), fullName: z.string().trim().min(2).max(120) });
const loginSchema = z.object({ email: z.string().email().max(254), password: z.string().min(1).max(128) });
const profileSchema = z.object({ fullName: z.string().trim().min(2).max(120), phone: z.string().trim().max(30).optional(), bio: z.string().trim().max(2000).optional(), location: z.string().trim().max(120).optional() });
const fundingSchema = z.object({ name: z.string().trim().min(2).max(150), description: z.string().trim().min(30).max(5000), sector: z.string().trim().min(2).max(80), location: z.string().trim().min(2).max(120), targetAmount: z.coerce.number().positive().max(100000000000), purpose: z.string().trim().min(10).max(2000), cooperationType: z.string().trim().min(2).max(80) });
const connectionSchema = z.object({ receiverId: z.string().cuid(), fundingRequestId: z.string().cuid().optional() });
const messageSchema = z.object({ body: z.string().trim().min(1).max(4000) });
const agreementSchema = z.object({ connectionId: z.string().cuid(), amount: z.coerce.number().positive(), cooperationType: z.string().trim().min(2).max(80), startDate: z.coerce.date(), endDate: z.coerce.date().optional() });
const ratingSchema = z.object({ reviewedUserId: z.string().cuid(), score: z.number().int().min(1).max(5), review: z.string().trim().max(2000).optional() });

type AuthRequest = express.Request & { user?: { id: string; role: Role } };
function issueToken(user: { id: string; role: Role }) {
  return jwt.sign({ role: user.role }, env.JWT_SECRET, { subject: user.id, expiresIn: '15m', issuer: env.JWT_ISSUER, audience: env.JWT_AUDIENCE, algorithm: 'HS256' });
}
function requireAuth(req: AuthRequest, res: express.Response, next: express.NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });
  try {
    const payload = jwt.verify(header.slice(7), env.JWT_SECRET, { algorithms: ['HS256'], issuer: env.JWT_ISSUER, audience: env.JWT_AUDIENCE });
    if (typeof payload === 'string' || !payload.sub || !payload.role) throw new Error('invalid');
    req.user = { id: payload.sub, role: payload.role as Role };
    next();
  } catch { return res.status(401).json({ error: 'Invalid or expired token' }); }
}

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'modalin-api' }));
app.post('/api/auth/register', authLimiter, async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const exists = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (exists) return res.status(409).json({ error: 'Unable to create account with these details' });
    const user = await prisma.user.create({ data: { email: input.email.toLowerCase(), passwordHash: await argon2.hash(input.password), role: input.role, profile: { create: { fullName: input.fullName } } }, select: { id: true, email: true, role: true } });
    return res.status(201).json({ user, accessToken: issueToken(user) });
  } catch (error) { next(error); }
});
app.post('/api/auth/login', authLimiter, async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() }, select: { id: true, email: true, passwordHash: true, role: true } });
    if (!user || !(await argon2.verify(user.passwordHash, input.password))) return res.status(401).json({ error: 'Invalid credentials' });
    return res.json({ user: { id: user.id, email: user.email, role: user.role }, accessToken: issueToken(user) });
  } catch (error) { next(error); }
});
app.get('/api/profile/me', requireAuth, async (req: AuthRequest, res, next) => {
  try { const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id }, include: { user: { select: { email: true, role: true } } } }); return res.json(profile); } catch (error) { next(error); }
});
app.patch('/api/profile/me', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const input = profileSchema.parse(req.body);
    const profile = await prisma.profile.update({ where: { userId: req.user!.id }, data: input, include: { user: { select: { email: true, role: true } } } });
    return res.json(profile);
  } catch (error) { next(error); }
});

app.get('/api/funding-requests', async (req, res, next) => {
  try {
    const query = z.object({ search: z.string().trim().max(80).optional(), location: z.string().trim().max(120).optional(), limit: z.coerce.number().int().min(1).max(50).default(20) }).parse(req.query);
    const requests = await prisma.fundingRequest.findMany({ where: { status: FundingStatus.ACTIVE, business: { name: query.search ? { contains: query.search } : undefined, location: query.location ? { contains: query.location } : undefined } }, include: { business: { include: { sector: true, owner: { select: { id: true, role: true, profile: true } } } } }, orderBy: { createdAt: 'desc' }, take: query.limit });
    return res.json(requests);
  } catch (error) { next(error); }
});
app.post('/api/funding-requests', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    if (req.user!.role !== Role.UMKM) return res.status(403).json({ error: 'Only UMKM can publish funding requests' });
    const input = fundingSchema.parse(req.body);
    const sector = await prisma.sector.upsert({ where: { name: input.sector }, update: {}, create: { name: input.sector } });
    const business = await prisma.business.upsert({ where: { ownerId: req.user!.id }, update: { name: input.name, description: input.description, location: input.location, sectorId: sector.id }, create: { ownerId: req.user!.id, name: input.name, description: input.description, location: input.location, sectorId: sector.id } });
    const request = await prisma.fundingRequest.create({ data: { businessId: business.id, targetAmount: input.targetAmount, purpose: input.purpose, cooperationType: input.cooperationType, status: FundingStatus.ACTIVE }, include: { business: { include: { sector: true } } } });
    return res.status(201).json(request);
  } catch (error) { next(error); }
});
app.get('/api/matches', requireAuth, async (_req: AuthRequest, res, next) => {
  try {
    const matches = await prisma.fundingRequest.findMany({ where: { status: FundingStatus.ACTIVE }, include: { business: { include: { sector: true, owner: { select: { id: true, role: true, profile: true } } } } }, orderBy: { createdAt: 'desc' }, take: 20 });
    return res.json(matches.map((item, index) => ({ ...item, matchScore: Math.max(72, 94 - index * 5) })));
  } catch (error) { next(error); }
});
app.get('/api/connections', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const rows = await prisma.connection.findMany({ where: { OR: [{ senderId: req.user!.id }, { receiverId: req.user!.id }] }, include: { sender: { select: { id: true, role: true, profile: true } }, receiver: { select: { id: true, role: true, profile: true } }, fundingRequest: { include: { business: true } }, conversation: true }, orderBy: { id: 'desc' } });
    return res.json(rows);
  } catch (error) { next(error); }
});
app.post('/api/connections', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const input = connectionSchema.parse(req.body);
    if (input.receiverId === req.user!.id) return res.status(400).json({ error: 'Cannot connect with yourself' });
    const connection = await prisma.connection.create({ data: { senderId: req.user!.id, receiverId: input.receiverId, fundingRequestId: input.fundingRequestId }, include: { receiver: { select: { id: true, role: true, profile: true } } } });
    return res.status(201).json(connection);
  } catch (error) { next(error); }
});
app.patch('/api/connections/:id', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const status = z.object({ status: z.enum(['ACCEPTED', 'REJECTED', 'CLOSED']) }).parse(req.body).status;
    const existing = await prisma.connection.findUnique({ where: { id: String(req.params.id) } });
    if (!existing || existing.receiverId !== req.user!.id) return res.status(404).json({ error: 'Connection not found' });
    const connection = await prisma.connection.update({ where: { id: existing.id }, data: { status, conversation: status === 'ACCEPTED' ? { create: {} } : undefined } });
    return res.json(connection);
  } catch (error) { next(error); }
});
app.get('/api/conversations/:id/messages', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const conversation = await prisma.conversation.findFirst({ where: { id: String(req.params.id), connection: { OR: [{ senderId: req.user!.id }, { receiverId: req.user!.id }], status: 'ACCEPTED' } } });
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    const messages = await prisma.message.findMany({ where: { conversationId: conversation.id }, include: { sender: { include: { profile: true } } }, orderBy: { createdAt: 'asc' } });
    return res.json(messages);
  } catch (error) { next(error); }
});
app.post('/api/conversations/:id/messages', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const input = messageSchema.parse(req.body);
    const conversation = await prisma.conversation.findFirst({ where: { id: String(req.params.id), connection: { OR: [{ senderId: req.user!.id }, { receiverId: req.user!.id }], status: 'ACCEPTED' } } });
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    const message = await prisma.message.create({ data: { conversationId: conversation.id, senderId: req.user!.id, body: input.body } });
    return res.status(201).json(message);
  } catch (error) { next(error); }
});
app.post('/api/agreements', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const input = agreementSchema.parse(req.body);
    const connection = await prisma.connection.findFirst({ where: { id: input.connectionId, status: 'ACCEPTED', OR: [{ senderId: req.user!.id }, { receiverId: req.user!.id }] } });
    if (!connection) return res.status(404).json({ error: 'Accepted connection not found' });
    const agreement = await prisma.agreement.create({ data: { ...input, agreementNumber: `MLN-${Date.now()}` } });
    return res.status(201).json(agreement);
  } catch (error) { next(error); }
});
app.get('/api/agreements', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const agreements = await prisma.agreement.findMany({ where: { connection: { OR: [{ senderId: req.user!.id }, { receiverId: req.user!.id }] } }, include: { connection: { include: { sender: { select: { id: true, role: true, profile: true } }, receiver: { select: { id: true, role: true, profile: true } } } }, signatures: true, ratings: true }, orderBy: { createdAt: 'desc' } });
    return res.json(agreements);
  } catch (error) { next(error); }
});
app.post('/api/agreements/:id/ratings', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const input = ratingSchema.parse(req.body);
    const agreement = await prisma.agreement.findFirst({ where: { id: String(req.params.id), status: 'COMPLETED', connection: { OR: [{ senderId: req.user!.id }, { receiverId: req.user!.id }] } } });
    if (!agreement) return res.status(404).json({ error: 'Completed agreement not found' });
    const rating = await prisma.rating.create({ data: { agreementId: agreement.id, reviewerId: req.user!.id, ...input } });
    return res.status(201).json(rating);
  } catch (error) { next(error); }
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof z.ZodError) return res.status(400).json({ error: 'Invalid request data' });
  console.error('request_error', error instanceof Error ? error.message : 'unknown');
  return res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(env.API_PORT, () => console.log(`Modalin API listening on :${env.API_PORT}`));
const shutdown = async () => { server.close(); await prisma.$disconnect(); };
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
