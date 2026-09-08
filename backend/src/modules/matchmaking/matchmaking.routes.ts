import { Router } from 'express';
import { ConnectionStatus, CooperationType, FundingStatus, Prisma, Role, VerificationStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { ah, badRequest, conflict, forbidden, notFound } from '../../lib/http.js';
import { currentUser, optionalAuth, requireAuth, type AuthRequest } from '../../middleware/auth.js';
import { COOPERATION_LABEL, parseCooperationTypes } from '../../lib/cooperation.js';
import {
  MATCH_MIN_SCORE,
  rankMatches,
  scoreMatch,
  type InvestorSide,
  type MatchResult,
  type UmkmSide,
} from './matchmaking.calc.js';
import { notifyConnectionUpdate } from '../chat/chat.gateway.js';

/**
 * Modul 4 — Search & Matchmaking Engine (FR-05, FR-06, FR-07, FR-14).
 * ARCHITECTURE.md §4.1: filter manual, pencocokan dua tahap, dan pengelolaan
 * siklus status Connection. Membaca Trust Score dari Modul 2 dan data profil
 * dari Modul 3.
 */

export const matchmakingRouter = Router();

const listInclude = {
  business: {
    include: {
      sector: true,
      owner: {
        select: {
          id: true,
          role: true,
          profile: {
            select: {
              fullName: true,
              avatarUrl: true,
              location: true,
              trustScore: true,
              verificationStatus: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.FundingRequestInclude;

type ListedRequest = Prisma.FundingRequestGetPayload<{ include: typeof listInclude }>;

/** Bentuk yang dikirim ke frontend — Decimal dinormalkan jadi number. */
/**
 * `withRevenue` hanya boleh true untuk PEMODAL (dan admin).
 *
 * Omzet bulanan adalah data komersial sensitif milik UMKM, dan mockup b6
 * menampilkannya di layar due diligence milik investor. Dua pagar yang mudah
 * terlewat:
 *   - /search memakai optionalAuth dan dipanggil landing tanpa token, jadi
 *     tanpa syarat omzet setiap UMKM terbuka untuk siapa pun di internet;
 *   - "sudah masuk" saja tidak cukup — dengan syarat itu sesama UMKM bisa
 *     membaca omzet pesaingnya, padahal mereka bukan pihak yang perlu menilai.
 */
function serialize(row: ListedRequest, withRevenue = false) {
  const profile = row.business.owner.profile;
  return {
    id: row.id,
    title: row.title,
    purpose: row.purpose,
    targetAmount: Number(row.targetAmount),
    cooperationTypes: parseCooperationTypes(row.cooperationTypes),
    tenorMonths: row.tenorMonths,
    estimatedRoi: row.estimatedRoi === null ? null : Number(row.estimatedRoi),
    deadline: row.deadline,
    status: row.status,
    createdAt: row.createdAt,
    business: {
      id: row.business.id,
      name: row.business.name,
      description: row.business.description,
      location: row.business.location,
      sector: row.business.sector,
      establishedYear: row.business.establishedYear,
      // Dipakai kartu peluang ("Omzet ... /bln") — mockup b6. Lihat catatan di
      // atas: hanya untuk pemanggil yang sudah masuk.
      monthlyRevenue:
        withRevenue && row.business.monthlyRevenue !== null
          ? Number(row.business.monthlyRevenue)
          : null,
    },
    owner: {
      id: row.business.owner.id,
      fullName: profile?.fullName ?? null,
      avatarUrl: profile?.avatarUrl ?? null,
      trustScore: profile?.trustScore ?? 0,
      // Badge hanya untuk VERIFIED (FR-02).
      isVerified: profile?.verificationStatus === VerificationStatus.VERIFIED,
    },
  };
}

// ---------------------------------------------------------------------------
// FR-05 — pencarian dan filter manual
// ---------------------------------------------------------------------------

/**
 * Daftar pemodal — sisi kedua dari FR-05.
 *
 * Sebelumnya /search hanya pernah mengembalikan FundingRequest, jadi UMKM tidak
 * punya cara apa pun menemukan investor: proposal menuntut pencarian dua arah,
 * tapi separuhnya tidak ada. Yang muncul di sini hanya investor yang sudah
 * mengisi preferensi — tanpa itu tidak ada yang bisa ditampilkan maupun
 * dicocokkan, dan kartunya jadi kosong.
 */
const investorInclude = {
  profile: {
    select: {
      fullName: true,
      avatarUrl: true,
      bio: true,
      location: true,
      trustScore: true,
      verificationStatus: true,
    },
  },
  investorPreference: { include: { preferredSector: true } },
} satisfies Prisma.UserInclude;

type ListedInvestor = Prisma.UserGetPayload<{ include: typeof investorInclude }>;

function serializeInvestor(row: ListedInvestor) {
  const profile = row.profile;
  const pref = row.investorPreference;
  return {
    id: row.id,
    createdAt: row.createdAt,
    fullName: profile?.fullName ?? null,
    avatarUrl: profile?.avatarUrl ?? null,
    bio: profile?.bio ?? null,
    location: profile?.location ?? null,
    trustScore: profile?.trustScore ?? 0,
    // Badge hanya untuk VERIFIED (FR-02).
    isVerified: profile?.verificationStatus === VerificationStatus.VERIFIED,
    preference: pref
      ? {
          minimumAmount: Number(pref.minimumAmount),
          maximumAmount: Number(pref.maximumAmount),
          preferredLocation: pref.preferredLocation,
          preferredSector: pref.preferredSector,
          cooperationTypes: parseCooperationTypes(pref.cooperationTypes),
        }
      : null,
  };
}

const searchSchema = z.object({
  q: z.string().trim().max(120).optional(),
  sectorId: z.string().optional(),
  location: z.string().trim().max(120).optional(),
  minAmount: z.coerce.number().nonnegative().optional(),
  maxAmount: z.coerce.number().nonnegative().optional(),
  cooperationType: z.nativeEnum(CooperationType).optional(),
  minTrustScore: z.coerce.number().min(0).max(100).optional(),
  sort: z.enum(['terbaru', 'trust', 'dana_terkecil', 'dana_terbesar']).default('terbaru'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  /// Sisi mana yang dicari. Kalau tidak diisi, diturunkan dari peran pemanggil.
  audience: z.enum(['peluang', 'pemodal']).optional(),
});

type SearchFilters = z.infer<typeof searchSchema>;

/** Sisi UMKM: permintaan pendanaan yang sedang terbuka. */
async function searchOpportunities(
  f: SearchFilters,
  viewerId: string | null,
  viewerRole: Role | null = null,
) {
  // Hanya pihak yang memang menilai usaha yang melihat omzet.
  const forRevenue = viewerRole === Role.INVESTOR || viewerRole === Role.ADMIN;
  const where: Prisma.FundingRequestWhereInput = {
    status: FundingStatus.ACTIVE,
    ...(f.minAmount !== undefined ? { targetAmount: { gte: new Prisma.Decimal(f.minAmount) } } : {}),
    ...(f.maxAmount !== undefined
      ? { targetAmount: { ...(f.minAmount !== undefined ? { gte: new Prisma.Decimal(f.minAmount) } : {}), lte: new Prisma.Decimal(f.maxAmount) } }
      : {}),
    business: {
      ...(f.sectorId ? { sectorId: f.sectorId } : {}),
      ...(f.location ? { location: { contains: f.location } } : {}),
      ...(f.q ? { OR: [{ name: { contains: f.q } }, { description: { contains: f.q } }] } : {}),
      // Pengajuan sendiri tidak pernah masuk hasil. /matches sudah mengecualikan
      // diri sendiri sejak awal; /search tidak, sehingga UMKM melihat usahanya
      // sendiri di daftar "Cari peluang" dan terbaca seperti bug.
      owner: {
        ...(viewerId ? { id: { not: viewerId } } : {}),
        ...(f.minTrustScore !== undefined ? { profile: { trustScore: { gte: f.minTrustScore } } } : {}),
      },
    },
  };

  const orderBy: Prisma.FundingRequestOrderByWithRelationInput =
    f.sort === 'dana_terkecil'
      ? { targetAmount: 'asc' }
      : f.sort === 'dana_terbesar'
        ? { targetAmount: 'desc' }
        : { createdAt: 'desc' };

  let rows = await prisma.fundingRequest.findMany({
    where,
    include: listInclude,
    orderBy,
    // Ambil lebih banyak dulu karena filter jenis kerja sama dan urutan trust
    // dikerjakan di aplikasi (cooperationTypes disimpan sebagai Json).
    take: f.cooperationType || f.sort === 'trust' ? 200 : f.limit,
  });

  if (f.cooperationType) {
    rows = rows.filter((row) => parseCooperationTypes(row.cooperationTypes).includes(f.cooperationType!));
  }
  if (f.sort === 'trust') {
    rows.sort((a, b) => (b.business.owner.profile?.trustScore ?? 0) - (a.business.owner.profile?.trustScore ?? 0));
  }

  return {
    items: rows.slice(0, f.limit).map((row) => serialize(row, forRevenue)),
    emptyMessage:
      'Belum ada peluang yang cocok dengan filter ini. Coba longgarkan rentang dana atau hapus filter lokasi.',
  };
}

/** Sisi investor: pemodal yang sudah menyatakan kriteria investasinya. */
async function searchInvestors(f: SearchFilters, viewerId: string | null) {
  const where: Prisma.UserWhereInput = {
    role: Role.INVESTOR,
    ...(viewerId ? { id: { not: viewerId } } : {}),
    // Tanpa preferensi tidak ada yang bisa ditampilkan di kartu.
    investorPreference: {
      is: {
        ...(f.sectorId ? { preferredSectorId: f.sectorId } : {}),
        // Rentang dana investor beririsan dengan rentang yang dicari UMKM.
        ...(f.maxAmount !== undefined ? { minimumAmount: { lte: new Prisma.Decimal(f.maxAmount) } } : {}),
        ...(f.minAmount !== undefined ? { maximumAmount: { gte: new Prisma.Decimal(f.minAmount) } } : {}),
      },
    },
    profile: {
      is: {
        ...(f.minTrustScore !== undefined ? { trustScore: { gte: f.minTrustScore } } : {}),
        ...(f.q ? { OR: [{ fullName: { contains: f.q } }, { bio: { contains: f.q } }] } : {}),
      },
    },
    // Lokasi boleh cocok dengan domisili investor ATAU wilayah yang diincarnya.
    ...(f.location
      ? {
          OR: [
            { profile: { is: { location: { contains: f.location } } } },
            { investorPreference: { is: { preferredLocation: { contains: f.location } } } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.UserOrderByWithRelationInput =
    f.sort === 'dana_terkecil'
      ? { investorPreference: { minimumAmount: 'asc' } }
      : f.sort === 'dana_terbesar'
        ? { investorPreference: { maximumAmount: 'desc' } }
        : f.sort === 'trust'
          ? { profile: { trustScore: 'desc' } }
          : { createdAt: 'desc' };

  let rows = await prisma.user.findMany({
    where,
    include: investorInclude,
    orderBy,
    take: f.cooperationType ? 200 : f.limit,
  });

  if (f.cooperationType) {
    rows = rows.filter((row) =>
      parseCooperationTypes(row.investorPreference?.cooperationTypes ?? []).includes(f.cooperationType!),
    );
  }

  return {
    items: rows.slice(0, f.limit).map(serializeInvestor),
    emptyMessage:
      'Belum ada pemodal yang cocok dengan filter ini. Coba longgarkan rentang dana atau hapus filter sektor.',
  };
}

matchmakingRouter.get(
  '/search',
  optionalAuth,
  ah(async (req: AuthRequest, res) => {
    const f = searchSchema.parse(req.query);
    const viewerId = req.user?.id ?? null;

    // UMKM mencari pemodal, investor mencari peluang. Pengunjung yang belum
    // masuk melihat peluang (itu yang ditampilkan landing). Parameter eksplisit
    // tetap menang supaya kedua sisi bisa ditelusuri siapa pun dari UI.
    const audience = f.audience ?? (req.user?.role === Role.UMKM ? 'pemodal' : 'peluang');

    const result =
      audience === 'pemodal'
        ? await searchInvestors(f, viewerId)
        : await searchOpportunities(f, viewerId, req.user?.role ?? null);

    // FR-05 mewajibkan pesan yang jelas saat kombinasi filter tidak menghasilkan apa pun.
    res.json({
      audience,
      items: result.items,
      total: result.items.length,
      emptyMessage: result.items.length > 0 ? null : result.emptyMessage,
    });
  }),
);

// ---------------------------------------------------------------------------
// FR-06 + FR-07 — pencocokan otomatis
// ---------------------------------------------------------------------------

/**
 * Kalimat alasan dari sudut pandang UMKM.
 *
 * scoreMatch menghasilkan alasan dari sudut pandang investor ("sesuai fokus
 * investasimu", "masuk rentang anggaranmu"). Dibaca UMKM, kata "-mu" itu
 * menunjuk orang yang salah, jadi kalimatnya disusun ulang di sini dari
 * komponen skor yang sama. Fungsi murninya sengaja tidak disentuh supaya 19
 * unit test yang mengunci bobot tetap berlaku apa adanya.
 */
function reasonsForUmkm(
  match: { components: MatchResult['components']; matchedCooperationTypes: CooperationType[] },
  investor: { preferredLocation: string | null; trustScore: number },
  targetAmount: number,
): string[] {
  const reasons = [
    `Menerima skema ${match.matchedCooperationTypes.map((t) => COOPERATION_LABEL[t]).join(' / ')}`,
  ];
  if (match.components.sector.ratio === 1) reasons.push('Fokus investasinya sesuai sektor usahamu');
  const amount = match.components.amount.ratio;
  const nominal = `Rp${Math.round(targetAmount).toLocaleString('id-ID')}`;
  if (amount === 1) reasons.push(`Kebutuhanmu ${nominal} masuk rentang anggarannya`);
  else if (amount >= 0.7) reasons.push(`Kebutuhanmu ${nominal} mendekati rentang anggarannya`);
  if (match.components.location.ratio === 1 && investor.preferredLocation) {
    reasons.push(`Sedang mengincar wilayah ${investor.preferredLocation}`);
  }
  if (investor.trustScore >= 70) reasons.push(`Skor kepercayaan pemodal tinggi (${investor.trustScore}/100)`);
  return reasons;
}

/**
 * FR-06/FR-07 dari sisi UMKM: peringkat pemodal untuk satu permintaan pendanaan.
 *
 * Mesin skornya sama persis — hard filter irisan skema lalu bobot 40/30/10/20.
 * Yang ditukar hanya arah bacanya: komponen trust menilai LAWAN bicara, jadi
 * dari sisi investor yang dinilai UMKM, dan dari sisi UMKM yang dinilai pemodal.
 */
async function matchesForUmkm(userId: string) {
  const business = await prisma.business.findUnique({
    where: { ownerId: userId },
    include: { fundingRequests: { where: { status: FundingStatus.ACTIVE }, orderBy: { createdAt: 'desc' }, take: 1 } },
  });
  const request = business?.fundingRequests[0];

  if (!business || !request) {
    return {
      audience: 'pemodal' as const,
      needsSetup: true,
      recommended: [],
      alternatives: [],
      rejectedByHardFilter: 0,
      emptyMessage:
        'Buat permintaan pendanaan dulu supaya kami bisa mencarikan pemodal yang cocok dengan kebutuhanmu.',
    };
  }

  const investors = await prisma.user.findMany({
    where: { role: Role.INVESTOR, id: { not: userId }, investorPreference: { isNot: null } },
    include: investorInclude,
    take: 200,
  });

  const targetAmount = Number(request.targetAmount);
  const myTypes = parseCooperationTypes(request.cooperationTypes);

  let rejectedByHardFilter = 0;
  const scored: { row: (typeof investors)[number]; match: MatchResult }[] = [];

  for (const row of investors) {
    const pref = row.investorPreference!;
    const investorSide: InvestorSide = {
      minimumAmount: Number(pref.minimumAmount),
      maximumAmount: Number(pref.maximumAmount),
      preferredLocation: pref.preferredLocation,
      preferredSectorId: pref.preferredSectorId,
      cooperationTypes: parseCooperationTypes(pref.cooperationTypes),
    };
    const trustScore = row.profile?.trustScore ?? 0;
    const match = scoreMatch(investorSide, {
      fundingRequestId: request.id,
      sectorId: business.sectorId,
      location: business.location,
      targetAmount,
      cooperationTypes: myTypes,
      // Yang dinilai komponen trust adalah calon mitra — di sini pemodalnya.
      trustScore,
    });
    if (!match) {
      rejectedByHardFilter += 1;
      continue;
    }
    scored.push({
      row,
      match: { ...match, reasons: reasonsForUmkm(match, { preferredLocation: pref.preferredLocation, trustScore }, targetAmount) },
    });
  }

  scored.sort((a, b) => b.match.score - a.match.score || a.row.id.localeCompare(b.row.id));
  const attach = (e: (typeof scored)[number]) => ({ ...serializeInvestor(e.row), match: e.match });
  const recommended = scored.filter((e) => e.match.isRecommended);
  const alternatives = scored.filter((e) => !e.match.isRecommended);

  return {
    audience: 'pemodal' as const,
    needsSetup: false,
    minScore: MATCH_MIN_SCORE,
    recommended: recommended.map(attach),
    // FR-07: alternatif informatif, bukan layar kosong.
    alternatives: alternatives.slice(0, 10).map(attach),
    rejectedByHardFilter,
    emptyMessage:
      recommended.length > 0
        ? null
        : alternatives.length > 0
          ? `Belum ada yang mencapai skor ${MATCH_MIN_SCORE}. Ini beberapa pemodal yang paling mendekati kebutuhanmu.`
          : 'Belum ada pemodal dengan skema kerja sama yang beririsan dengan pengajuanmu. Coba tambahkan skema lain di permintaan pendanaanmu.',
  };
}

matchmakingRouter.get(
  '/matches',
  requireAuth,
  ah(async (req: AuthRequest, res) => {
    const me = currentUser(req);

    // Pencocokan dua arah. Sebelumnya rute ini menolak semua yang bukan
    // INVESTOR, sehingga UMKM yang membukanya dilempar balik tanpa penjelasan —
    // padahal proposal menuntut matchmaking dua arah, dan pencarian manual
    // sudah lebih dulu dibuat dua arah.
    if (me.role === Role.UMKM) {
      res.json(await matchesForUmkm(me.id));
      return;
    }
    if (me.role !== Role.INVESTOR) {
      throw forbidden('Rekomendasi otomatis tersedia untuk akun Pengusaha dan Pemodal.');
    }

    const pref = await prisma.investorPreference.findUnique({ where: { userId: me.id } });
    if (!pref) {
      res.json({
        audience: 'peluang',
        needsSetup: true,
        recommended: [],
        alternatives: [],
        rejectedByHardFilter: 0,
        emptyMessage: 'Atur preferensi investasimu dulu supaya kami bisa mencarikan mitra yang cocok.',
      });
      return;
    }

    const investor: InvestorSide = {
      minimumAmount: Number(pref.minimumAmount),
      maximumAmount: Number(pref.maximumAmount),
      preferredLocation: pref.preferredLocation,
      preferredSectorId: pref.preferredSectorId,
      cooperationTypes: parseCooperationTypes(pref.cooperationTypes),
    };

    const rows = await prisma.fundingRequest.findMany({
      where: { status: FundingStatus.ACTIVE, business: { owner: { id: { not: me.id } } } },
      include: listInclude,
      take: 200,
    });

    const byId = new Map(rows.map((row) => [row.id, row]));
    const candidates: UmkmSide[] = rows.map((row) => ({
      fundingRequestId: row.id,
      sectorId: row.business.sectorId,
      location: row.business.location,
      targetAmount: Number(row.targetAmount),
      cooperationTypes: parseCooperationTypes(row.cooperationTypes),
      trustScore: row.business.owner.profile?.trustScore ?? 0,
    }));

    const { recommended, alternatives, rejectedByHardFilter } = rankMatches(investor, candidates);
    const attach = (m: (typeof recommended)[number]) => {
      const row = byId.get(m.fundingRequestId)!;
      return { ...serialize(row, true), match: m };
    };

    res.json({
      audience: 'peluang',
      needsSetup: false,
      minScore: MATCH_MIN_SCORE,
      recommended: recommended.map(attach),
      // FR-07: alternatif informatif, bukan layar kosong.
      alternatives: alternatives.slice(0, 10).map(attach),
      rejectedByHardFilter,
      emptyMessage:
        recommended.length > 0
          ? null
          : alternatives.length > 0
            ? `Belum ada yang mencapai skor ${MATCH_MIN_SCORE}. Ini beberapa yang paling mendekati preferensimu.`
            : 'Belum ada UMKM dengan skema kerja sama yang beririsan dengan preferensimu. Coba tambahkan skema lain di preferensi.',
    });
  }),
);

// ---------------------------------------------------------------------------
// FR-14 — siklus status Connection
// ---------------------------------------------------------------------------

const connectionInclude = {
  sender: { select: { id: true, role: true, profile: { select: { fullName: true, avatarUrl: true, trustScore: true, verificationStatus: true } } } },
  receiver: { select: { id: true, role: true, profile: { select: { fullName: true, avatarUrl: true, trustScore: true, verificationStatus: true } } } },
  fundingRequest: { include: { business: { include: { sector: true } } } },
  conversation: { select: { id: true } },
} satisfies Prisma.ConnectionInclude;

matchmakingRouter.get(
  '/connections',
  requireAuth,
  ah(async (req: AuthRequest, res) => {
    const me = currentUser(req);
    const rows = await prisma.connection.findMany({
      where: { OR: [{ senderId: me.id }, { receiverId: me.id }] },
      include: connectionInclude,
      orderBy: { updatedAt: 'desc' },
    });
    res.json(rows.map((row) => ({ ...row, direction: row.senderId === me.id ? 'keluar' : 'masuk' })));
  }),
);

matchmakingRouter.post(
  '/connections',
  requireAuth,
  ah(async (req: AuthRequest, res) => {
    const me = currentUser(req);
    const input = z
      .object({
        receiverId: z.string().min(1),
        fundingRequestId: z.string().optional(),
        message: z.string().trim().max(500).optional(),
      })
      .parse(req.body);

    if (input.receiverId === me.id) throw badRequest('Tidak bisa mengirim ketertarikan ke diri sendiri.');
    const receiver = await prisma.user.findUnique({ where: { id: input.receiverId }, select: { id: true, role: true } });
    if (!receiver) throw notFound('Pengguna tujuan tidak ditemukan.');
    if (receiver.role === Role.ADMIN) throw forbidden();

    const existing = await prisma.connection.findFirst({
      where: {
        senderId: me.id,
        receiverId: input.receiverId,
        fundingRequestId: input.fundingRequestId ?? null,
      },
      select: { id: true, status: true },
    });
    if (existing) {
      throw conflict(
        existing.status === ConnectionStatus.PENDING
          ? 'Kamu sudah mengirim ketertarikan ke mitra ini. Tunggu responsnya ya.'
          : 'Riwayat koneksi dengan mitra ini sudah ada.',
      );
    }

    const connection = await prisma.connection.create({
      data: {
        senderId: me.id,
        receiverId: input.receiverId,
        fundingRequestId: input.fundingRequestId ?? null,
        message: input.message ?? null,
      },
      include: connectionInclude,
    });

    // FR-09 — pemberitahuan in-app untuk update status koneksi.
    notifyConnectionUpdate(connection.receiverId, connection.id, ConnectionStatus.PENDING);
    res.status(201).json(connection);
  }),
);

/**
 * FR-14 state machine. Aturan yang ditegakkan di sini:
 *   PENDING  -> ACCEPTED / REJECTED : HANYA penerima
 *   ACCEPTED -> CLOSED              : sender ATAU receiver
 *   REJECTED / CLOSED               : terminal, tidak bisa diubah lagi
 */
matchmakingRouter.patch(
  '/connections/:id',
  requireAuth,
  ah(async (req: AuthRequest, res) => {
    const me = currentUser(req);
    const { status } = z
      .object({ status: z.enum(['ACCEPTED', 'REJECTED', 'CLOSED']) })
      .parse(req.body);

    const existing = await prisma.connection.findUnique({
      where: { id: String(req.params.id) },
      select: { id: true, senderId: true, receiverId: true, status: true },
    });
    if (!existing || (existing.senderId !== me.id && existing.receiverId !== me.id)) {
      throw notFound('Koneksi tidak ditemukan.');
    }
    if (existing.status === ConnectionStatus.REJECTED || existing.status === ConnectionStatus.CLOSED) {
      throw badRequest('Koneksi ini sudah berakhir dan tidak bisa diubah lagi.');
    }

    if (status === 'ACCEPTED' || status === 'REJECTED') {
      if (existing.status !== ConnectionStatus.PENDING) {
        throw badRequest('Koneksi ini sudah pernah direspons.');
      }
      // Hanya penerima yang boleh menerima atau menolak.
      if (existing.receiverId !== me.id) {
        throw forbidden('Hanya penerima yang bisa menerima atau menolak ketertarikan.');
      }
    } else if (existing.status !== ConnectionStatus.ACCEPTED) {
      throw badRequest('Hanya koneksi yang sudah diterima yang bisa diakhiri.');
    }

    const connection = await prisma.connection.update({
      where: { id: existing.id },
      data:
        status === 'ACCEPTED'
          ? {
              status: ConnectionStatus.ACCEPTED,
              respondedAt: new Date(),
              // Conversation dibuka TEPAT saat diterima (ARCHITECTURE.md §5.3).
              conversation: { create: {} },
            }
          : status === 'REJECTED'
            ? { status: ConnectionStatus.REJECTED, respondedAt: new Date() }
            : { status: ConnectionStatus.CLOSED, closedAt: new Date(), closedById: me.id },
      include: connectionInclude,
    });

    const other = connection.senderId === me.id ? connection.receiverId : connection.senderId;
    notifyConnectionUpdate(other, connection.id, connection.status);
    res.json(connection);
  }),
);
