import { describe, expect, it } from 'vitest';
import { Role, VerificationStatus } from '@prisma/client';
import { calculateTrustScore, type TrustScoreInput } from './trust-score.calc.js';

/** Akun UMKM yang baru daftar: hanya nama yang terisi. */
function baseUmkm(overrides: Partial<TrustScoreInput> = {}): TrustScoreInput {
  return {
    role: Role.UMKM,
    verificationStatus: VerificationStatus.UNVERIFIED,
    profile: {
      fullName: true,
      phone: false,
      avatarUrl: false,
      bio: false,
      location: false,
      ktpUrl: false,
      nibUrl: false,
    },
    hasBusiness: false,
    hasFundingRequest: false,
    hasInvestorPreference: false,
    portfolioCount: 0,
    averageRating: null,
    ratingCount: 0,
    ...overrides,
  };
}

function fullUmkm(overrides: Partial<TrustScoreInput> = {}): TrustScoreInput {
  return baseUmkm({
    profile: {
      fullName: true,
      phone: true,
      avatarUrl: true,
      bio: true,
      location: true,
      ktpUrl: true,
      nibUrl: true,
    },
    hasBusiness: true,
    hasFundingRequest: true,
    portfolioCount: 2,
    ...overrides,
  });
}

describe('FR-03 Trust Score', () => {
  it('selalu berada di skala 0-100', () => {
    const cases = [
      baseUmkm(),
      fullUmkm({ verificationStatus: VerificationStatus.VERIFIED, averageRating: 5, ratingCount: 9 }),
      fullUmkm({ averageRating: 1, ratingCount: 1 }),
    ];
    for (const input of cases) {
      const { total } = calculateTrustScore(input);
      expect(total).toBeGreaterThanOrEqual(0);
      expect(total).toBeLessThanOrEqual(100);
    }
  });

  it('akun baru tanpa perlakuan cold-start: skor rendah, bukan bonus', () => {
    const { total, verification, rating } = calculateTrustScore(baseUmkm());
    expect(verification).toBe(0);
    expect(rating).toBe(0);
    expect(total).toBeLessThan(10);
  });

  it('profil lengkap + terverifikasi + rating sempurna = 100', () => {
    const { total } = calculateTrustScore(
      fullUmkm({ verificationStatus: VerificationStatus.VERIFIED, averageRating: 5, ratingCount: 4 }),
    );
    expect(total).toBe(100);
  });

  it('badge terverifikasi menaikkan skor sebesar bobot verifikasi (30)', () => {
    const before = calculateTrustScore(fullUmkm()).total;
    const after = calculateTrustScore(fullUmkm({ verificationStatus: VerificationStatus.VERIFIED })).total;
    expect(after - before).toBe(30);
  });

  it('PENDING dapat kredit sebagian, REJECTED tidak dapat apa-apa', () => {
    const pending = calculateTrustScore(fullUmkm({ verificationStatus: VerificationStatus.PENDING }));
    const rejected = calculateTrustScore(fullUmkm({ verificationStatus: VerificationStatus.REJECTED }));
    const unverified = calculateTrustScore(fullUmkm());
    expect(pending.verification).toBeGreaterThan(rejected.verification);
    expect(rejected.verification).toBe(0);
    expect(rejected.total).toBe(unverified.total);
  });

  it('rating memetakan 1-5 secara linear: rating 1 tidak memberi poin, rating 3 memberi setengah', () => {
    const satu = calculateTrustScore(fullUmkm({ averageRating: 1, ratingCount: 2 }));
    const tiga = calculateTrustScore(fullUmkm({ averageRating: 3, ratingCount: 2 }));
    const lima = calculateTrustScore(fullUmkm({ averageRating: 5, ratingCount: 2 }));
    expect(satu.rating).toBe(0);
    expect(tiga.rating).toBe(15);
    expect(lima.rating).toBe(30);
  });

  it('belum ada rating diperlakukan 0, bukan netral 3/5', () => {
    const belum = calculateTrustScore(fullUmkm({ averageRating: null, ratingCount: 0 }));
    const netral = calculateTrustScore(fullUmkm({ averageRating: 3, ratingCount: 1 }));
    expect(belum.rating).toBe(0);
    expect(belum.total).toBeLessThan(netral.total);
  });

  it('syarat kelengkapan berbeda per peran: NIB hanya diminta ke UMKM', () => {
    const umkm = calculateTrustScore(baseUmkm());
    const investor = calculateTrustScore(baseUmkm({ role: Role.INVESTOR }));
    expect(umkm.missing).toContain('Dokumen NIB');
    expect(investor.missing).not.toContain('Dokumen NIB');
    expect(investor.missing).toContain('Preferensi investasi');
  });

  it('daftar "missing" kosong ketika semua syarat peran terpenuhi', () => {
    const { missing } = calculateTrustScore(fullUmkm());
    expect(missing).toEqual([]);
  });

  it('melengkapi profil menaikkan skor secara monoton', () => {
    const step0 = calculateTrustScore(baseUmkm()).total;
    const step1 = calculateTrustScore(
      baseUmkm({ profile: { ...baseUmkm().profile, phone: true, location: true } }),
    ).total;
    const step2 = calculateTrustScore(fullUmkm()).total;
    expect(step1).toBeGreaterThan(step0);
    expect(step2).toBeGreaterThan(step1);
  });

  it('rating di luar rentang dijepit, tidak membuat skor meledak', () => {
    const { total } = calculateTrustScore(
      fullUmkm({ verificationStatus: VerificationStatus.VERIFIED, averageRating: 99, ratingCount: 1 }),
    );
    expect(total).toBe(100);
  });
});
