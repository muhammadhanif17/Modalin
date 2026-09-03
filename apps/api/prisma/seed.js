import argon2 from 'argon2';
import { PrismaClient, Role, FundingStatus } from '@prisma/client';

const prisma = new PrismaClient();
const sectors = ['Food & Beverage', 'Fashion', 'Agritech', 'Technology'];

async function main() {
  const sectorRows = await Promise.all(sectors.map((name) => prisma.sector.upsert({ where: { name }, update: {}, create: { name } })));
  const passwordHash = await argon2.hash('modalin-demo-2026');
  const umkm = await prisma.user.upsert({ where: { email: 'umkm@modalin.local' }, update: {}, create: { email: 'umkm@modalin.local', passwordHash, role: Role.UMKM, profile: { create: { fullName: 'Nadia Pratama', bio: 'Pemilik usaha yang membangun rantai pasok lokal.', location: 'Bandung', isVerified: true } } } });
  await prisma.user.upsert({ where: { email: 'investor@modalin.local' }, update: {}, create: { email: 'investor@modalin.local', passwordHash, role: Role.INVESTOR, profile: { create: { fullName: 'Raka Wijaya', bio: 'Mencari bisnis lokal dengan dampak terukur.', location: 'Jakarta', isVerified: true } }, investorPreference: { create: { minimumAmount: 50000000, maximumAmount: 500000000, preferredLocation: 'Jawa', cooperationType: 'Bagi hasil' } } } });
  await prisma.user.upsert({ where: { email: 'admin@modalin.local' }, update: {}, create: { email: 'admin@modalin.local', passwordHash, role: Role.ADMIN, profile: { create: { fullName: 'Admin Modalin', bio: 'Administrator platform Modalin.', location: 'Jakarta', isVerified: true } } } });
  const existing = await prisma.business.findUnique({ where: { ownerId: umkm.id } });
  if (!existing) {
    const business = await prisma.business.create({ data: { ownerId: umkm.id, name: 'Kopi Rindang', description: 'Kedai kopi lokal dengan bahan baku petani sekitar dan model subscription untuk kantor.', location: 'Bandung', sectorId: sectorRows[0].id } });
    await prisma.fundingRequest.create({ data: { businessId: business.id, targetAmount: 180000000, purpose: 'Pembukaan dua titik pick-up dan penguatan rantai pasok.', cooperationType: 'Bagi hasil', status: FundingStatus.ACTIVE } });
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
