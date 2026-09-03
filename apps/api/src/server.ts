import 'dotenv/config';
import express, { type NextFunction, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { FundingStatus, Prisma, PrismaClient, Role } from '@prisma/client';

const env = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32).default('unset'),
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
app.use(cookieParser());

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });
const registerSchema = z.object({ email: z.string().email().max(254), password: z.string().min(8).max(128), role: z.nativeEnum(Role), fullName: z.string().trim().min(2).max(120) });
const loginSchema = z.object({ email: z.string().email().max(254), password: z.string().min(1).max(128) });
const profileSchema = z.object({ fullName: z.string().trim().min(2).max(120), phone: z.string().trim().max(30).optional(), bio: z.string().trim().max(2000).optional(), location: z.string().trim().max(120).optional() });
const fundingSchema = z.object({ name: z.string().trim().min(2).max(150), description: z.string().trim().min(30).max(5000), sector: z.string().trim().min(2).max(80), location: z.string().trim().min(2).max(120), targetAmount: z.coerce.number().positive().max(100000000000), purpose: z.string().trim().min(10).max(2000), cooperationType: z.string().trim().min(2).max(80) });
const connectionSchema = z.object({ receiverId: z.string().cuid(), fundingRequestId: z.string().cuid().optional() });
const messageSchema = z.object({ body: z.string().trim().min(1).max(4000) });
const agreementSchema = z.object({ connectionId: z.string().cuid(), amount: z.coerce.number().positive(), cooperationType: z.string().trim().min(2).max(80), startDate: z.coerce.date(), endDate: z.coerce.date().optional() });
const ratingSchema = z.object({ reviewedUserId: z.string().cuid(), score: z.number().int().min(1).max(5), review: z.string().trim().max(2000).optional() });
const preferenceSchema = z.object({ minimumAmount: z.coerce.number().nonnegative().max(100000000000).optional(), maximumAmount: z.coerce.number().nonnegative().max(100000000000).optional(), preferredLocation: z.string().trim().max(120).optional(), cooperationType: z.string().trim().max(80).optional() });
const portfolioSchema = z.object({ title: z.string().trim().min(2).max(150), description: z.string().trim().max(2000).optional(), fileUrl: z.string().url().max(500), fileType: z.string().trim().max(80) });

type TokenUser = { id: string; role: Role };
type AuthRequest = express.Request & { user?: TokenUser };
const REFRESH_COOKIE = 'modalin_refresh';
const REFRESH_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days
const ISSUE_REFRESH_SECRET = env.JWT_REFRESH_SECRET !== 'unset' ? env.JWT_REFRESH_SECRET : env.JWT_SECRET;

function issueAccessToken(user: TokenUser) {
  return jwt.sign({ role: user.role }, env.JWT_SECRET, { subject: user.id, expiresIn: '15m', issuer: env.JWT_ISSUER, audience: env.JWT_AUDIENCE, algorithm: 'HS256' });
}
function issueRefreshToken(userId: string) {
  return jwt.sign({}, ISSUE_REFRESH_SECRET, { subject: userId, expiresIn: '30d', issuer: env.JWT_ISSUER, audience: env.JWT_AUDIENCE, algorithm: 'HS256' });
}
function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: env.WEB_ORIGIN.startsWith('https://'), path: '/api/auth', maxAge: REFRESH_TTL });
}
function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, { httpOnly: true, sameSite: 'lax', secure: env.WEB_ORIGIN.startsWith('https://'), path: '/api/auth' });
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
function requireRole(...roles: Role[]) {
  return (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'modalin-api' }));

app.post('/api/auth/register', authLimiter, async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    if (input.role === Role.ADMIN) return res.status(403).json({ error: 'Cannot self-register as admin' });
    const exists = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (exists) return res.status(409).json({ error: 'Unable to create account with these details' });
    const user = await prisma.user.create({ data: { email: input.email.toLowerCase(), passwordHash: await argon2.hash(input.password), role: input.role, profile: { create: { fullName: input.fullName } } }, select: { id: true, email: true, role: true } });
    setRefreshCookie(res, issueRefreshToken(user.id));
    return res.status(201).json({ user, accessToken: issueAccessToken(user) });
  } catch (error) { next(error); }
});
app.post('/api/auth/login', authLimiter, async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() }, select: { id: true, email: true, passwordHash: true, role: true } });
    if (!user || !(await argon2.verify(user.passwordHash, input.password))) return res.status(401).json({ error: 'Invalid credentials' });
    setRefreshCookie(res, issueRefreshToken(user.id));
    return res.json({ user: { id: user.id, email: user.email, role: user.role }, accessToken: issueAccessToken(user) });
  } catch (error) { next(error); }
});
app.post('/api/auth/refresh', async (req, res, next) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (typeof token !== 'string') return res.status(401).json({ error: 'Refresh token missing' });
    const payload = jwt.verify(token, ISSUE_REFRESH_SECRET, { algorithms: ['HS256'], issuer: env.JWT_ISSUER, audience: env.JWT_AUDIENCE });
    if (typeof payload === 'string' || !payload.sub) return res.status(401).json({ error: 'Invalid refresh token' });
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, email: true, role: true } });
    if (!user) { clearRefreshCookie(res); return res.status(401).json({ error: 'User no longer exists' }); }
    return res.json({ user, accessToken: issueAccessToken(user) });
  } catch { clearRefreshCookie(res); return res.status(401).json({ error: 'Invalid or expired refresh token' }); }
});
app.post('/api/auth/logout', (_req, res) => {
  clearRefreshCookie(res);
  return res.json({ ok: true });
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
app.post('/api/funding-requests', requireAuth, requireRole(Role.UMKM), async (req: AuthRequest, res, next) => {
  try {
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

app.get('/api/investor/preference', requireAuth, requireRole(Role.INVESTOR), async (req: AuthRequest, res, next) => {
  try {
    const preference = await prisma.investorPreference.findUnique({ where: { userId: req.user!.id } });
    return res.json(preference);
  } catch (error) { next(error); }
});
app.put('/api/investor/preference', requireAuth, requireRole(Role.INVESTOR), async (req: AuthRequest, res, next) => {
  try {
    const input = preferenceSchema.parse(req.body);
    if (input.minimumAmount !== undefined && input.maximumAmount !== undefined && input.minimumAmount > input.maximumAmount) {
      return res.status(400).json({ error: 'minimumAmount cannot exceed maximumAmount' });
    }
    type PrefData = { minimumAmount?: Prisma.Decimal; maximumAmount?: Prisma.Decimal; preferredLocation?: string; cooperationType?: string };
    const data: PrefData = {
      ...(input.minimumAmount !== undefined ? { minimumAmount: new Prisma.Decimal(input.minimumAmount) } : {}),
      ...(input.maximumAmount !== undefined ? { maximumAmount: new Prisma.Decimal(input.maximumAmount) } : {}),
      ...(input.preferredLocation !== undefined ? { preferredLocation: input.preferredLocation } : {}),
      ...(input.cooperationType !== undefined ? { cooperationType: input.cooperationType } : {}),
    };
    const preference = await prisma.investorPreference.upsert({
      where: { userId: req.user!.id },
      update: data,
      create: {
        userId: req.user!.id,
        minimumAmount: data.minimumAmount ?? new Prisma.Decimal(0),
        maximumAmount: data.maximumAmount ?? new Prisma.Decimal(0),
        preferredLocation: data.preferredLocation ?? null,
        cooperationType: data.cooperationType ?? null,
      },
    });
    return res.json(preference);
  } catch (error) { next(error); }
});
app.get('/api/portfolio', requireAuth, requireRole(Role.INVESTOR), async (req: AuthRequest, res, next) => {
  try {
    const items = await prisma.portfolio.findMany({ where: { ownerId: req.user!.id }, orderBy: { createdAt: 'desc' } });
    return res.json(items);
  } catch (error) { next(error); }
});
app.post('/api/portfolio', requireAuth, requireRole(Role.INVESTOR), async (req: AuthRequest, res, next) => {
  try {
    const input = portfolioSchema.parse(req.body);
    const item = await prisma.portfolio.create({ data: { ownerId: req.user!.id, ...input } });
    return res.status(201).json(item);
  } catch (error) { next(error); }
});
app.delete('/api/portfolio/:id', requireAuth, requireRole(Role.INVESTOR), async (req: AuthRequest, res, next) => {
  try {
    const item = await prisma.portfolio.findFirst({ where: { id: String(req.params.id), ownerId: req.user!.id } });
    if (!item) return res.status(404).json({ error: 'Portfolio item not found' });
    await prisma.portfolio.delete({ where: { id: item.id } });
    return res.json({ ok: true });
  } catch (error) { next(error); }
});

app.get('/api/admin/stats', requireAuth, requireRole(Role.ADMIN), async (_req: AuthRequest, res, next) => {
  try {
    const [totalUsers, umkmCount, investorCount, adminCount, totalRequests, activeRequests, fundedRequests, totalConnections, totalAgreements, totalRatings] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: Role.UMKM } }),
      prisma.user.count({ where: { role: Role.INVESTOR } }),
      prisma.user.count({ where: { role: Role.ADMIN } }),
      prisma.fundingRequest.count(),
      prisma.fundingRequest.count({ where: { status: FundingStatus.ACTIVE } }),
      prisma.fundingRequest.count({ where: { status: FundingStatus.FUNDED } }),
      prisma.connection.count(),
      prisma.agreement.count(),
      prisma.rating.count(),
    ]);
    return res.json({ totalUsers, umkmCount, investorCount, adminCount, totalRequests, activeRequests, fundedRequests, totalConnections, totalAgreements, totalRatings });
  } catch (error) { next(error); }
});
app.get('/api/admin/users', requireAuth, requireRole(Role.ADMIN), async (req: AuthRequest, res, next) => {
  try {
    const query = z.object({ role: z.nativeEnum(Role).optional(), search: z.string().trim().max(80).optional(), limit: z.coerce.number().int().min(1).max(100).default(50) }).parse(req.query);
    const users = await prisma.user.findMany({ where: { role: query.role, email: query.search ? { contains: query.search } : undefined }, select: { id: true, email: true, role: true, createdAt: true, profile: { select: { fullName: true, isVerified: true, location: true } } }, orderBy: { createdAt: 'desc' }, take: query.limit });
    return res.json(users);
  } catch (error) { next(error); }
});
app.patch('/api/admin/users/:id/verify', requireAuth, requireRole(Role.ADMIN), async (req: AuthRequest, res, next) => {
  try {
    const body = z.object({ isVerified: z.boolean() }).parse(req.body);
    const profile = await prisma.profile.update({ where: { userId: String(req.params.id) }, data: { isVerified: body.isVerified } });
    return res.json(profile);
  } catch (error) { next(error); }
});
app.patch('/api/admin/funding-requests/:id/status', requireAuth, requireRole(Role.ADMIN), async (req: AuthRequest, res, next) => {
  try {
    const body = z.object({ status: z.nativeEnum(FundingStatus) }).parse(req.body);
    const existing = await prisma.fundingRequest.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) return res.status(404).json({ error: 'Funding request not found' });
    const request = await prisma.fundingRequest.update({ where: { id: existing.id }, data: { status: body.status } });
    return res.json(request);
  } catch (error) { next(error); }
});
app.get('/api/admin/funding-requests', requireAuth, requireRole(Role.ADMIN), async (req: AuthRequest, res, next) => {
  try {
    const query = z.object({ status: z.nativeEnum(FundingStatus).optional(), limit: z.coerce.number().int().min(1).max(100).default(50) }).parse(req.query);
    const requests = await prisma.fundingRequest.findMany({ where: { status: query.status }, include: { business: { include: { owner: { select: { id: true, email: true, profile: { select: { fullName: true, isVerified: true } } } } } } }, orderBy: { createdAt: 'desc' }, take: query.limit });
    return res.json(requests);
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

export default app;