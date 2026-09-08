import { describe, expect, it } from 'vitest';
import { CooperationType } from '@prisma/client';
import { MATCH_WEIGHTS } from '../../config/scoring.js';
import { rankMatches, scoreMatch, type InvestorSide, type UmkmSide } from './matchmaking.calc.js';

const SEKTOR_KULINER = 'sector-kuliner';
const SEKTOR_KRIYA = 'sector-kriya';

function investor(overrides: Partial<InvestorSide> = {}): InvestorSide {
  return {
    minimumAmount: 50_000_000,
    maximumAmount: 200_000_000,
    preferredLocation: 'Bandung',
    preferredSectorId: SEKTOR_KULINER,
    cooperationTypes: [CooperationType.BAGI_HASIL, CooperationType.PENYERTAAN_MODAL],
    ...overrides,
  };
}

function umkm(overrides: Partial<UmkmSide> = {}): UmkmSide {
  return {
    fundingRequestId: 'fr-1',
    sectorId: SEKTOR_KULINER,
    location: 'Bandung, Jawa Barat',
    targetAmount: 100_000_000,
    cooperationTypes: [CooperationType.BAGI_HASIL],
    trustScore: 100,
    ...overrides,
  };
}

describe('FR-06 hard filter jenis kerja sama', () => {
  it('menolak pasangan yang skemanya sama sekali tidak beririsan', () => {
    const result = scoreMatch(
      investor({ cooperationTypes: [CooperationType.PINJAMAN] }),
      umkm({ cooperationTypes: [CooperationType.BAGI_HASIL] }),
    );
    expect(result).toBeNull();
  });

  it('meloloskan pasangan yang beririsan meski hanya satu skema', () => {
    const result = scoreMatch(
      investor({ cooperationTypes: [CooperationType.PINJAMAN, CooperationType.BAGI_HASIL] }),
      umkm({ cooperationTypes: [CooperationType.BAGI_HASIL] }),
    );
    expect(result).not.toBeNull();
    expect(result?.matchedCooperationTypes).toEqual([CooperationType.BAGI_HASIL]);
  });

  it('hard filter berjalan SEBELUM skoring: kandidat sempurna pun ditolak kalau skema tak beririsan', () => {
    const sempurna = umkm({ trustScore: 100, cooperationTypes: [CooperationType.PINJAMAN] });
    expect(scoreMatch(investor({ cooperationTypes: [CooperationType.BAGI_HASIL] }), sempurna)).toBeNull();
  });

  it('daftar skema kosong di salah satu sisi tidak pernah lolos', () => {
    expect(scoreMatch(investor({ cooperationTypes: [] }), umkm())).toBeNull();
    expect(scoreMatch(investor(), umkm({ cooperationTypes: [] }))).toBeNull();
  });

  it('rankMatches menghitung berapa kandidat yang tersaring hard filter', () => {
    const { recommended, alternatives, rejectedByHardFilter } = rankMatches(
      investor({ cooperationTypes: [CooperationType.BAGI_HASIL] }),
      [
        umkm({ fundingRequestId: 'a', cooperationTypes: [CooperationType.BAGI_HASIL] }),
        umkm({ fundingRequestId: 'b', cooperationTypes: [CooperationType.PINJAMAN] }),
        umkm({ fundingRequestId: 'c', cooperationTypes: [CooperationType.PENYERTAAN_MODAL] }),
      ],
    );
    expect(rejectedByHardFilter).toBe(2);
    expect([...recommended, ...alternatives].map((m) => m.fundingRequestId)).toEqual(['a']);
  });
});

describe('FR-07 weighted scoring 40/30/10/20', () => {
  it('kecocokan sempurna di semua komponen menghasilkan skor 100', () => {
    const result = scoreMatch(investor(), umkm());
    expect(result?.score).toBe(100);
  });

  it('bobot tiap komponen persis sesuai proposal', () => {
    expect(MATCH_WEIGHTS).toEqual({ sector: 40, amount: 30, location: 10, trustScore: 20 });
  });

  it('sektor tidak cocok memotong tepat 40 poin', () => {
    const cocok = scoreMatch(investor(), umkm())!.score;
    const beda = scoreMatch(investor(), umkm({ sectorId: SEKTOR_KRIYA }))!.score;
    expect(cocok - beda).toBe(MATCH_WEIGHTS.sector);
  });

  it('lokasi tidak cocok memotong tepat 10 poin', () => {
    const cocok = scoreMatch(investor(), umkm())!.score;
    const beda = scoreMatch(investor(), umkm({ location: 'Surabaya' }))!.score;
    expect(cocok - beda).toBe(MATCH_WEIGHTS.location);
  });

  it('trust score nol memotong tepat 20 poin', () => {
    const penuh = scoreMatch(investor(), umkm())!.score;
    const nol = scoreMatch(investor(), umkm({ trustScore: 0 }))!.score;
    expect(penuh - nol).toBe(MATCH_WEIGHTS.trustScore);
  });

  it('lokasi dicocokkan longgar: "Bandung" cocok dengan "Bandung, Jawa Barat"', () => {
    const result = scoreMatch(investor({ preferredLocation: 'Bandung' }), umkm({ location: 'Bandung, Jawa Barat' }));
    expect(result?.components.location.ratio).toBe(1);
  });

  it('bobot lokasi hanya dipakai kalau investor mengisi preferensi lokasi', () => {
    const tanpaPref = scoreMatch(investor({ preferredLocation: null }), umkm({ location: 'Surabaya' }));
    expect(tanpaPref?.components.location.weight).toBe(0);
    // 10 poin lokasi dibagi ulang, jadi kandidat lain tetap bisa mencapai 100.
    expect(tanpaPref?.score).toBe(100);
  });

  it('modal di dalam rentang bernilai penuh, di luar rentang meluruh bertahap', () => {
    const di_dalam = scoreMatch(investor(), umkm({ targetAmount: 100_000_000 }))!;
    const sedikit_lebih = scoreMatch(investor(), umkm({ targetAmount: 250_000_000 }))!;
    const jauh_lebih = scoreMatch(investor(), umkm({ targetAmount: 2_000_000_000 }))!;
    expect(di_dalam.components.amount.ratio).toBe(1);
    expect(sedikit_lebih.components.amount.ratio).toBeCloseTo(0.8, 5);
    expect(jauh_lebih.components.amount.ratio).toBeCloseTo(0.1, 5);
    expect(sedikit_lebih.score).toBeGreaterThan(jauh_lebih.score);
  });

  it('sektor netral saat investor tidak menetapkan sektor: tidak mengubah urutan', () => {
    const inv = investor({ preferredSectorId: null });
    const a = scoreMatch(inv, umkm({ fundingRequestId: 'a', sectorId: SEKTOR_KULINER }))!;
    const b = scoreMatch(inv, umkm({ fundingRequestId: 'b', sectorId: SEKTOR_KRIYA }))!;
    expect(a.components.sector.points).toBe(b.components.sector.points);
    expect(a.score).toBe(b.score);
  });

  it('skor selalu berada di 0-100', () => {
    const kasus = [
      umkm({ trustScore: 0, sectorId: SEKTOR_KRIYA, location: 'Medan', targetAmount: 1 }),
      umkm({ trustScore: 100 }),
      umkm({ trustScore: 999 }),
    ];
    for (const c of kasus) {
      const r = scoreMatch(investor(), c)!;
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
    }
  });
});

describe('FR-07 alternatif informatif', () => {
  it('kandidat di bawah ambang tetap dikembalikan sebagai alternatif, bukan dibuang', () => {
    const lemah = umkm({
      fundingRequestId: 'lemah',
      sectorId: SEKTOR_KRIYA,
      location: 'Medan',
      trustScore: 0,
      targetAmount: 5_000_000_000,
    });
    const { recommended, alternatives } = rankMatches(investor(), [lemah]);
    expect(recommended).toHaveLength(0);
    expect(alternatives).toHaveLength(1);
    expect(alternatives[0]!.isRecommended).toBe(false);
  });

  it('hasil diurutkan skor menurun', () => {
    const { recommended } = rankMatches(investor(), [
      umkm({ fundingRequestId: 'sedang', sectorId: SEKTOR_KRIYA }),
      umkm({ fundingRequestId: 'terbaik' }),
      umkm({ fundingRequestId: 'lemah', sectorId: SEKTOR_KRIYA, location: 'Medan', trustScore: 30 }),
    ]);
    const skor = recommended.map((m) => m.score);
    expect([...skor].sort((a, b) => b - a)).toEqual(skor);
    expect(recommended[0]!.fundingRequestId).toBe('terbaik');
  });

  it('urutan stabil ketika skor seri', () => {
    const { recommended } = rankMatches(investor(), [
      umkm({ fundingRequestId: 'b' }),
      umkm({ fundingRequestId: 'a' }),
    ]);
    expect(recommended.map((m) => m.fundingRequestId)).toEqual(['a', 'b']);
  });

  it('menjelaskan alasan kecocokan dalam Bahasa Indonesia', () => {
    const result = scoreMatch(investor(), umkm())!;
    expect(result.reasons[0]).toContain('Bagi Hasil');
    expect(result.reasons.join(' ')).toContain('Sektor usaha sesuai');
  });
});
