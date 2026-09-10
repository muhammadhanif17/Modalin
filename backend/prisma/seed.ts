/**
 * Seeder demo Modalin.
 *
 * Menyiapkan data yang cukup untuk mendemokan alur penuh:
 *   cari mitra -> match -> tertarik -> chat -> SPK -> checkout simulasi
 *
 * Semua akun demo memakai kata sandi yang sama (lihat DEMO_PASSWORD) dan
 * didokumentasikan di README. Jalankan ulang aman: seeder ini menghapus data
 * lama lebih dulu, jadi hasilnya selalu sama.
 */
import argon2 from 'argon2';
import {
  AgreementStatus,
  ConnectionStatus,
  CooperationType,
  FundingStatus,
  PrismaClient,
  Prisma,
  Role,
  TransactionStatus,
  TransactionType,
  VerificationStatus,
} from '@prisma/client';
import { calculateTrustScore } from '../src/modules/trust-score/trust-score.calc.js';

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'Modalin2026!';

// Basis URL file contoh. Lokal default localhost; produksi diisi dari
// PUBLIC_BASE_URL Railway agar URL seed tidak menunjuk ke localhost.
const FILE_BASE = (process.env.PUBLIC_BASE_URL ?? 'http://localhost:4000').replace(/\/$/, '');

const SECTORS = [
  'Kuliner',
  'Kriya & Kerajinan',
  'Agrikultur',
  'Fesyen',
  'Teknologi',
  'Jasa',
  'Perdagangan',
  'Perikanan',
];

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const minutesAgo = (n: number) => new Date(Date.now() - n * 60 * 1000);

type UmkmSeed = {
  key: string;
  email: string;
  fullName: string;
  phone: string;
  bio: string;
  location: string;
  sector: string;
  business: { name: string; description: string; establishedYear: number; employeeCount: number; monthlyRevenue: number };
  funding: {
    title: string;
    targetAmount: number;
    purpose: string;
    cooperationTypes: CooperationType[];
    tenorMonths: number;
    estimatedRoi: number;
    status?: FundingStatus;
  };
  verification: VerificationStatus;
  rejectReason?: string;
  withKyc?: boolean;
  portfolios: number;
};

const UMKM: UmkmSeed[] = [
  {
    key: 'sambal',
    email: 'dapur.bunda@modalin.id',
    fullName: 'Siti Rahmawati',
    phone: '081234567801',
    bio: 'Pengelola dapur sambal rumahan yang sudah melayani reseller di enam kota.',
    location: 'Bandung, Jawa Barat',
    sector: 'Kuliner',
    business: {
      name: 'Dapur Bunda Sambal Nusantara',
      description:
        'Produsen sambal kemasan dengan resep warisan keluarga. Saat ini memproduksi 4.000 botol per bulan dan sudah masuk 12 toko oleh-oleh di Jawa Barat. Dana dipakai untuk menambah mesin pengisian otomatis dan sertifikasi BPOM untuk dua varian baru.',
      establishedYear: 2019,
      employeeCount: 12,
      monthlyRevenue: 85_000_000,
    },
    funding: {
      title: 'Tambah lini produksi sambal kemasan',
      targetAmount: 150_000_000,
      purpose:
        'Pembelian mesin pengisian otomatis (Rp95 juta), sertifikasi BPOM dua varian (Rp25 juta), dan tambahan modal bahan baku tiga bulan (Rp30 juta).',
      cooperationTypes: [CooperationType.BAGI_HASIL, CooperationType.PENYERTAAN_MODAL],
      tenorMonths: 24,
      estimatedRoi: 18,
    },
    verification: VerificationStatus.VERIFIED,
    withKyc: true,
    portfolios: 2,
  },
  {
    key: 'rotan',
    email: 'rotan.cirebon@modalin.id',
    fullName: 'Bambang Prasetyo',
    phone: '081234567802',
    bio: 'Perajin rotan generasi ketiga, fokus ekspor furnitur ke Asia Tenggara.',
    location: 'Cirebon, Jawa Barat',
    sector: 'Kriya & Kerajinan',
    business: {
      name: 'Rotan Jaya Cirebon',
      description:
        'Workshop furnitur rotan dengan 18 perajin tetap. Sudah tiga kali mengirim kontainer ke Malaysia dan Singapura. Dana dipakai untuk memenuhi pesanan ekspor yang tertahan karena keterbatasan modal bahan baku.',
      establishedYear: 2015,
      employeeCount: 18,
      monthlyRevenue: 120_000_000,
    },
    funding: {
      title: 'Modal kerja pesanan ekspor furnitur rotan',
      targetAmount: 200_000_000,
      purpose: 'Pembelian bahan baku rotan (Rp140 juta) dan biaya kontainer serta dokumen ekspor (Rp60 juta).',
      cooperationTypes: [CooperationType.BAGI_HASIL, CooperationType.PINJAMAN],
      tenorMonths: 12,
      estimatedRoi: 15,
    },
    verification: VerificationStatus.VERIFIED,
    withKyc: true,
    portfolios: 2,
  },
  {
    key: 'kopi',
    email: 'kopi.gayo@modalin.id',
    fullName: 'Muhammad Iqbal',
    phone: '081234567803',
    bio: 'Petani sekaligus pengepul kopi arabika Gayo dari 40 kepala keluarga.',
    location: 'Takengon, Aceh',
    sector: 'Agrikultur',
    business: {
      name: 'Koperasi Kopi Gayo Lestari',
      description:
        'Koperasi pengolahan kopi arabika yang menaungi 40 petani. Memiliki unit huller sendiri dan sudah memasok tiga roastery di Jakarta. Dana untuk membangun tempat jemur terkendali agar mutu tetap terjaga di musim hujan.',
      establishedYear: 2017,
      employeeCount: 40,
      monthlyRevenue: 95_000_000,
    },
    funding: {
      title: 'Bangun rumah jemur terkendali dan tambah stok green bean',
      targetAmount: 120_000_000,
      purpose: 'Konstruksi rumah jemur (Rp70 juta) dan pembelian green bean musim panen (Rp50 juta).',
      cooperationTypes: [CooperationType.BAGI_HASIL],
      tenorMonths: 18,
      estimatedRoi: 16,
    },
    verification: VerificationStatus.VERIFIED,
    withKyc: true,
    portfolios: 1,
  },
  {
    key: 'batik',
    email: 'batik.pekalongan@modalin.id',
    fullName: 'Dewi Anggraini',
    phone: '081234567804',
    bio: 'Pemilik rumah batik tulis dengan pewarna alam.',
    location: 'Pekalongan, Jawa Tengah',
    sector: 'Fesyen',
    business: {
      name: 'Batik Sekar Arum',
      description:
        'Rumah batik tulis pewarna alam dengan 9 pembatik. Melayani pesanan seragam korporat dan butik. Dana untuk menambah kapasitas produksi dan membuka gerai daring sendiri.',
      establishedYear: 2020,
      employeeCount: 9,
      monthlyRevenue: 48_000_000,
    },
    funding: {
      title: 'Tambah pembatik dan buka toko daring',
      targetAmount: 80_000_000,
      purpose: 'Rekrutmen dan pelatihan 5 pembatik (Rp35 juta), stok kain dan pewarna (Rp30 juta), toko daring (Rp15 juta).',
      cooperationTypes: [CooperationType.PENYERTAAN_MODAL, CooperationType.PINJAMAN],
      tenorMonths: 18,
      estimatedRoi: 14,
    },
    verification: VerificationStatus.PENDING,
    withKyc: true,
    portfolios: 1,
  },
  {
    key: 'kasir',
    email: 'warung.pintar@modalin.id',
    fullName: 'Andi Wijaya',
    phone: '081234567805',
    bio: 'Membangun aplikasi kasir sederhana untuk warung kelontong.',
    location: 'Yogyakarta, DI Yogyakarta',
    sector: 'Teknologi',
    business: {
      name: 'Warung Pintar Digital',
      description:
        'Aplikasi kasir dan pencatatan stok untuk warung kelontong, sudah dipakai 340 warung di DIY. Model langganan Rp25 ribu per bulan. Dana untuk pengembangan fitur pembayaran dan perluasan ke Jawa Tengah.',
      establishedYear: 2022,
      employeeCount: 6,
      monthlyRevenue: 22_000_000,
    },
    funding: {
      title: 'Perluasan pasar aplikasi kasir warung',
      targetAmount: 300_000_000,
      purpose: 'Pengembangan produk (Rp150 juta), tim penjualan lapangan (Rp100 juta), operasional (Rp50 juta).',
      cooperationTypes: [CooperationType.PENYERTAAN_MODAL],
      tenorMonths: 36,
      estimatedRoi: 25,
    },
    verification: VerificationStatus.VERIFIED,
    withKyc: true,
    portfolios: 2,
  },
  {
    key: 'laundry',
    email: 'laundry.kilat@modalin.id',
    fullName: 'Rina Kusumawati',
    phone: '081234567806',
    bio: 'Pemilik dua gerai laundry kiloan dekat kawasan kampus.',
    location: 'Semarang, Jawa Tengah',
    sector: 'Jasa',
    business: {
      name: 'Laundry Kilat Semarang',
      description:
        'Dua gerai laundry kiloan dengan pelanggan tetap mahasiswa dan kos-kosan. Dana untuk membuka gerai ketiga dan menambah mesin kapasitas besar.',
      establishedYear: 2021,
      employeeCount: 7,
      monthlyRevenue: 32_000_000,
    },
    funding: {
      title: 'Buka gerai ketiga dan tambah mesin',
      targetAmount: 90_000_000,
      purpose: 'Sewa tempat setahun (Rp40 juta), dua mesin cuci kapasitas besar (Rp38 juta), renovasi (Rp12 juta).',
      cooperationTypes: [CooperationType.PINJAMAN, CooperationType.BAGI_HASIL],
      tenorMonths: 24,
      estimatedRoi: 13,
    },
    verification: VerificationStatus.UNVERIFIED,
    portfolios: 0,
  },
  {
    key: 'ikan',
    email: 'budidaya.nila@modalin.id',
    fullName: 'Hendra Gunawan',
    phone: '081234567807',
    bio: 'Pembudidaya ikan nila sistem bioflok.',
    location: 'Bogor, Jawa Barat',
    sector: 'Perikanan',
    business: {
      name: 'Nila Bioflok Bogor',
      description:
        'Budidaya ikan nila sistem bioflok dengan 24 kolam terpal. Memasok pasar basah dan rumah makan di Bogor dan Depok. Dana untuk menambah 20 kolam dan gudang pakan.',
      establishedYear: 2020,
      employeeCount: 8,
      monthlyRevenue: 55_000_000,
    },
    funding: {
      title: 'Tambah 20 kolam bioflok dan gudang pakan',
      targetAmount: 110_000_000,
      purpose: 'Konstruksi 20 kolam (Rp70 juta), gudang pakan (Rp25 juta), bibit dan pakan awal (Rp15 juta).',
      cooperationTypes: [CooperationType.BAGI_HASIL, CooperationType.PINJAMAN],
      tenorMonths: 18,
      estimatedRoi: 17,
    },
    verification: VerificationStatus.REJECTED,
    rejectReason: 'Foto NIB buram dan nomor tidak terbaca. Mohon unggah ulang dengan pencahayaan yang cukup.',
    withKyc: true,
    portfolios: 1,
  },
  {
    key: 'grosir',
    email: 'grosir.sembako@modalin.id',
    fullName: 'Yusuf Maulana',
    phone: '081234567808',
    bio: 'Pedagang grosir sembako yang melayani 60 warung di Surabaya Timur.',
    location: 'Surabaya, Jawa Timur',
    sector: 'Perdagangan',
    business: {
      name: 'Sumber Rejeki Grosir',
      description:
        'Distributor sembako untuk 60 warung kelontong. Dana untuk menambah armada pengantaran dan memperbesar stok menjelang musim ramai.',
      establishedYear: 2016,
      employeeCount: 11,
      monthlyRevenue: 210_000_000,
    },
    funding: {
      title: 'Tambah armada pengantaran dan stok musiman',
      targetAmount: 250_000_000,
      purpose: 'Dua kendaraan pengantar bekas (Rp150 juta) dan penambahan stok (Rp100 juta).',
      cooperationTypes: [CooperationType.PINJAMAN],
      tenorMonths: 24,
      estimatedRoi: 12,
    },
    verification: VerificationStatus.VERIFIED,
    withKyc: true,
    portfolios: 1,
  },
];

type InvestorSeed = {
  key: string;
  email: string;
  fullName: string;
  phone: string;
  bio: string;
  location: string;
  pref: {
    minimumAmount: number;
    maximumAmount: number;
    preferredLocation: string | null;
    preferredSector: string | null;
    cooperationTypes: CooperationType[];
  };
  verification: VerificationStatus;
  portfolios: number;
};

const INVESTORS: InvestorSeed[] = [
  {
    key: 'sari',
    email: 'sari.investor@modalin.id',
    fullName: 'Sari Dewanti',
    phone: '081298765401',
    bio: 'Angel investor fokus pangan olahan dan kuliner di Jawa Barat. Lebih suka skema bagi hasil dengan pendampingan operasional.',
    location: 'Bandung, Jawa Barat',
    pref: {
      minimumAmount: 50_000_000,
      maximumAmount: 250_000_000,
      preferredLocation: 'Bandung',
      preferredSector: 'Kuliner',
      cooperationTypes: [CooperationType.BAGI_HASIL, CooperationType.PENYERTAAN_MODAL],
    },
    verification: VerificationStatus.VERIFIED,
    portfolios: 2,
  },
  {
    key: 'gunawan',
    email: 'gunawan.capital@modalin.id',
    fullName: 'Gunawan Halim',
    phone: '081298765402',
    bio: 'Pemodal dengan latar belakang manufaktur, tertarik usaha kriya dan ekspor.',
    location: 'Jakarta Selatan, DKI Jakarta',
    pref: {
      minimumAmount: 100_000_000,
      maximumAmount: 500_000_000,
      preferredLocation: null,
      preferredSector: 'Kriya & Kerajinan',
      cooperationTypes: [CooperationType.BAGI_HASIL, CooperationType.PINJAMAN],
    },
    verification: VerificationStatus.VERIFIED,
    portfolios: 2,
  },
  {
    key: 'lestari',
    email: 'lestari.impact@modalin.id',
    fullName: 'Lestari Handayani',
    phone: '081298765403',
    bio: 'Impact investor untuk agrikultur dan perikanan berkelanjutan.',
    location: 'Yogyakarta, DI Yogyakarta',
    pref: {
      minimumAmount: 75_000_000,
      maximumAmount: 200_000_000,
      preferredLocation: null,
      preferredSector: 'Agrikultur',
      cooperationTypes: [CooperationType.BAGI_HASIL],
    },
    verification: VerificationStatus.VERIFIED,
    portfolios: 1,
  },
  {
    key: 'rizky',
    email: 'rizky.ventures@modalin.id',
    fullName: 'Rizky Ramadhan',
    phone: '081298765404',
    bio: 'Berfokus pada usaha berbasis teknologi tahap awal dengan skema penyertaan modal.',
    location: 'Jakarta Pusat, DKI Jakarta',
    pref: {
      minimumAmount: 200_000_000,
      maximumAmount: 1_000_000_000,
      preferredLocation: null,
      preferredSector: 'Teknologi',
      cooperationTypes: [CooperationType.PENYERTAAN_MODAL],
    },
    verification: VerificationStatus.VERIFIED,
    portfolios: 1,
  },
  {
    key: 'putra',
    email: 'putra.pinjaman@modalin.id',
    fullName: 'Adi Putra Nugroho',
    phone: '081298765405',
    bio: 'Menyediakan pembiayaan jangka pendek untuk modal kerja perdagangan.',
    location: 'Surabaya, Jawa Timur',
    pref: {
      minimumAmount: 100_000_000,
      maximumAmount: 400_000_000,
      preferredLocation: 'Surabaya',
      preferredSector: 'Perdagangan',
      cooperationTypes: [CooperationType.PINJAMAN],
    },
    verification: VerificationStatus.PENDING,
    portfolios: 1,
  },
];

async function reset() {
  // Urutan penting: anak dulu, induk belakangan.
  await prisma.rating.deleteMany();
  await prisma.agreementSignature.deleteMany();
  await prisma.agreement.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.connection.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.portfolio.deleteMany();
  await prisma.fundingRequest.deleteMany();
  await prisma.business.deleteMany();
  await prisma.investorPreference.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.sector.deleteMany();
}

async function main() {
  console.log('Membersihkan data lama...');
  await reset();

  const hash = await argon2.hash(DEMO_PASSWORD);
  const placeholder = (name: string) => `${FILE_BASE}/api/files/portfolio/contoh-${name}.pdf`;

  console.log('Membuat sektor...');
  const sectors = new Map<string, string>();
  for (const name of SECTORS) {
    const row = await prisma.sector.create({ data: { name, slug: slugify(name) } });
    sectors.set(name, row.id);
  }

  console.log('Membuat admin...');
  const admin = await prisma.user.create({
    data: {
      email: 'admin@modalin.id',
      passwordHash: hash,
      role: Role.ADMIN,
      profile: {
        create: {
          fullName: 'Admin Modalin',
          location: 'Semarang, Jawa Tengah',
          verificationStatus: VerificationStatus.VERIFIED,
          verifiedAt: daysAgo(60),
        },
      },
    },
  });

  const kycFor = (seed: { withKyc?: boolean; verification: VerificationStatus; rejectReason?: string }, isUmkm: boolean, idx: number) => {
    if (!seed.withKyc) return {};
    const submitted = daysAgo(10 - (idx % 7));
    return {
      ktpUrl: `${FILE_BASE}/api/files/kyc/contoh-ktp-${idx}.jpg`,
      ...(isUmkm ? { nibUrl: `${FILE_BASE}/api/files/kyc/contoh-nib-${idx}.jpg` } : {}),
      kycSubmittedAt: submitted,
      ...(seed.verification === VerificationStatus.VERIFIED
        ? { verifiedAt: daysAgo(5), verifiedById: admin.id }
        : {}),
      ...(seed.verification === VerificationStatus.REJECTED
        ? { verifiedAt: daysAgo(3), verifiedById: admin.id, rejectReason: seed.rejectReason }
        : {}),
    };
  };

  console.log('Membuat akun UMKM...');
  const umkmIds = new Map<string, { userId: string; fundingRequestId: string }>();
  for (const [idx, seed] of UMKM.entries()) {
    const user = await prisma.user.create({
      data: {
        email: seed.email,
        passwordHash: hash,
        role: Role.UMKM,
        createdAt: daysAgo(45 - idx),
        profile: {
          create: {
            fullName: seed.fullName,
            phone: seed.phone,
            bio: seed.bio,
            location: seed.location,
            avatarUrl: null,
            verificationStatus: seed.verification,
            ...kycFor(seed, true, idx),
          },
        },
        business: {
          create: {
            name: seed.business.name,
            description: seed.business.description,
            sectorId: sectors.get(seed.sector)!,
            location: seed.location,
            establishedYear: seed.business.establishedYear,
            employeeCount: seed.business.employeeCount,
            monthlyRevenue: new Prisma.Decimal(seed.business.monthlyRevenue),
          },
        },
      },
      include: { business: true },
    });

    const funding = await prisma.fundingRequest.create({
      data: {
        businessId: user.business!.id,
        title: seed.funding.title,
        targetAmount: new Prisma.Decimal(seed.funding.targetAmount),
        purpose: seed.funding.purpose,
        cooperationTypes: seed.funding.cooperationTypes,
        tenorMonths: seed.funding.tenorMonths,
        estimatedRoi: new Prisma.Decimal(seed.funding.estimatedRoi),
        status: seed.funding.status ?? FundingStatus.ACTIVE,
        createdAt: daysAgo(30 - idx),
      },
    });

    for (let i = 0; i < seed.portfolios; i += 1) {
      await prisma.portfolio.create({
        data: {
          ownerId: user.id,
          title: i === 0 ? 'Proposal usaha dan proyeksi keuangan' : 'Foto produk dan legalitas usaha',
          description: i === 0 ? 'Rencana penggunaan dana dan proyeksi arus kas 24 bulan.' : 'Dokumentasi produk serta salinan izin usaha.',
          fileUrl: placeholder(`${seed.key}-${i}`),
          fileType: 'application/pdf',
          fileSize: 480_000 + i * 120_000,
          createdAt: daysAgo(28 - idx),
        },
      });
    }

    umkmIds.set(seed.key, { userId: user.id, fundingRequestId: funding.id });
  }

  console.log('Membuat akun investor...');
  const investorIds = new Map<string, string>();
  for (const [idx, seed] of INVESTORS.entries()) {
    const user = await prisma.user.create({
      data: {
        email: seed.email,
        passwordHash: hash,
        role: Role.INVESTOR,
        createdAt: daysAgo(50 - idx),
        profile: {
          create: {
            fullName: seed.fullName,
            phone: seed.phone,
            bio: seed.bio,
            location: seed.location,
            verificationStatus: seed.verification,
            ...kycFor({ withKyc: true, verification: seed.verification }, false, 100 + idx),
          },
        },
        investorPreference: {
          create: {
            minimumAmount: new Prisma.Decimal(seed.pref.minimumAmount),
            maximumAmount: new Prisma.Decimal(seed.pref.maximumAmount),
            preferredLocation: seed.pref.preferredLocation,
            preferredSectorId: seed.pref.preferredSector ? sectors.get(seed.pref.preferredSector)! : null,
            cooperationTypes: seed.pref.cooperationTypes,
          },
        },
      },
    });

    for (let i = 0; i < seed.portfolios; i += 1) {
      await prisma.portfolio.create({
        data: {
          ownerId: user.id,
          title: i === 0 ? 'Rekam jejak pendanaan sebelumnya' : 'Profil dan tesis investasi',
          description: i === 0 ? 'Ringkasan kerja sama yang pernah dijalankan beserta hasilnya.' : 'Kriteria dan fokus investasi.',
          fileUrl: placeholder(`inv-${seed.key}-${i}`),
          fileType: 'application/pdf',
          fileSize: 320_000,
          createdAt: daysAgo(26 - idx),
        },
      });
    }

    investorIds.set(seed.key, user.id);
  }

  // -------------------------------------------------------------------------
  // Koneksi dalam berbagai status (FR-14)
  // -------------------------------------------------------------------------
  console.log('Membuat koneksi, percakapan, dan kesepakatan...');

  const sari = investorIds.get('sari')!;
  const gunawan = investorIds.get('gunawan')!;
  const lestari = investorIds.get('lestari')!;
  const rizky = investorIds.get('rizky')!;
  const sambal = umkmIds.get('sambal')!;
  const rotan = umkmIds.get('rotan')!;
  const kopi = umkmIds.get('kopi')!;
  const kasir = umkmIds.get('kasir')!;
  const batik = umkmIds.get('batik')!;

  // 1. PENDING — menunggu respons UMKM (untuk demo "ada ketertarikan masuk").
  await prisma.connection.create({
    data: {
      senderId: lestari,
      receiverId: kopi.userId,
      fundingRequestId: kopi.fundingRequestId,
      status: ConnectionStatus.PENDING,
      message: 'Halo, saya tertarik dengan rumah jemur terkendalinya. Boleh diskusi soal proyeksi panen?',
      createdAt: minutesAgo(90),
    },
  });

  // 2. REJECTED — pernah ditolak (bukan CLOSED; tidak pernah diterima).
  await prisma.connection.create({
    data: {
      senderId: rizky,
      receiverId: batik.userId,
      fundingRequestId: batik.fundingRequestId,
      status: ConnectionStatus.REJECTED,
      message: 'Apakah terbuka untuk penyertaan modal dengan target ekspansi nasional?',
      respondedAt: daysAgo(6),
      createdAt: daysAgo(8),
    },
  });

  // 3. ACCEPTED + chat aktif — inti alur demo, siap dibuatkan SPK.
  const negosiasi = await prisma.connection.create({
    data: {
      senderId: sari,
      receiverId: sambal.userId,
      fundingRequestId: sambal.fundingRequestId,
      status: ConnectionStatus.ACCEPTED,
      message: 'Saya tertarik dengan rencana penambahan lini produksinya. Boleh ngobrol lebih lanjut?',
      respondedAt: daysAgo(2),
      createdAt: daysAgo(3),
      conversation: { create: { createdAt: daysAgo(2) } },
    },
    include: { conversation: true },
  });

  const percakapan = [
    [sari, 'Halo Bu Siti, saya Sari. Saya tertarik dengan rencana penambahan mesin pengisian otomatisnya.', 200],
    [sambal.userId, 'Halo Bu Sari, terima kasih sudah menghubungi. Betul, mesin ini bisa menaikkan kapasitas dari 4.000 jadi sekitar 11.000 botol per bulan.', 190],
    [sari, 'Menarik. Untuk skema bagi hasil, kira-kira porsi seperti apa yang Ibu rasa wajar?', 170],
    [sambal.userId, 'Saya terbuka di kisaran 20 sampai 25 persen dari laba bersih untuk pemodal, dengan pelaporan tiap kuartal.', 150],
    [sari, 'Saya bisa di 22 persen untuk 24 bulan, dengan dana Rp150 juta sesuai pengajuan. Bagaimana?', 120],
    [sambal.userId, 'Setuju Bu. Kalau begitu saya siapkan dokumen kesepakatannya ya.', 100],
  ] as const;
  for (const [senderId, body, minutes] of percakapan) {
    await prisma.message.create({
      data: {
        conversationId: negosiasi.conversation!.id,
        senderId,
        body,
        createdAt: minutesAgo(minutes),
        // Pesan terakhir dari investor sengaja dibiarkan belum dibaca supaya
        // indikator notifikasi FR-09 kelihatan saat demo.
        readAt: minutes > 110 ? minutesAgo(minutes - 5) : null,
      },
    });
  }

  // 4. ACCEPTED + kesepakatan SIGNED lengkap dua tanda tangan (FR-10/FR-11).
  const kerjaSamaAktif = await prisma.connection.create({
    data: {
      senderId: gunawan,
      receiverId: rotan.userId,
      fundingRequestId: rotan.fundingRequestId,
      status: ConnectionStatus.ACCEPTED,
      message: 'Saya punya jaringan buyer di Malaysia. Tertarik membiayai pesanan ekspornya.',
      respondedAt: daysAgo(20),
      createdAt: daysAgo(22),
      conversation: { create: { createdAt: daysAgo(20) } },
    },
    include: { conversation: true },
  });
  await prisma.message.createMany({
    data: [
      { conversationId: kerjaSamaAktif.conversation!.id, senderId: gunawan, body: 'Pak Bambang, saya siap membiayai dua kontainer pertama.', createdAt: daysAgo(19), readAt: daysAgo(19) },
      { conversationId: kerjaSamaAktif.conversation!.id, senderId: rotan.userId, body: 'Siap Pak Gunawan, saya kirim rincian biayanya.', createdAt: daysAgo(19), readAt: daysAgo(18) },
    ],
  });

  const agreementAktif = await prisma.agreement.create({
    data: {
      connectionId: kerjaSamaAktif.id,
      agreementNumber: 'MLN-2026-000001',
      cooperationType: CooperationType.BAGI_HASIL,
      amount: new Prisma.Decimal(200_000_000),
      startDate: daysAgo(15),
      profitSharingRatio: new Prisma.Decimal(20),
      tenorMonths: 12,
      terms: 'Pelaporan hasil usaha disampaikan setiap kuartal disertai bukti pengiriman ekspor.',
      status: AgreementStatus.ACTIVE,
      createdAt: daysAgo(17),
    },
  });
  await prisma.agreementSignature.createMany({
    data: [
      { agreementId: agreementAktif.id, userId: rotan.userId, signatureUrl: `${FILE_BASE}/api/files/signature/contoh-ttd-1.png`, signedAt: daysAgo(16) },
      { agreementId: agreementAktif.id, userId: gunawan, signatureUrl: `${FILE_BASE}/api/files/signature/contoh-ttd-2.png`, signedAt: daysAgo(15) },
    ],
  });
  await prisma.fundingRequest.update({
    where: { id: rotan.fundingRequestId },
    data: { status: FundingStatus.FUNDED },
  });

  // 5. COMPLETED + rating dua arah (FR-12) — memberi Trust Score yang bermakna.
  const kerjaSamaSelesai = await prisma.connection.create({
    data: {
      senderId: rizky,
      receiverId: kasir.userId,
      fundingRequestId: kasir.fundingRequestId,
      status: ConnectionStatus.ACCEPTED,
      message: 'Tertarik dengan traksi 340 warung. Mau bahas penyertaan modal?',
      respondedAt: daysAgo(75),
      createdAt: daysAgo(78),
      conversation: { create: { createdAt: daysAgo(75) } },
    },
    include: { conversation: true },
  });
  await prisma.message.createMany({
    data: [
      { conversationId: kerjaSamaSelesai.conversation!.id, senderId: rizky, body: 'Saya tertarik masuk di tahap ini. Valuasinya bagaimana?', createdAt: daysAgo(74), readAt: daysAgo(74) },
      { conversationId: kerjaSamaSelesai.conversation!.id, senderId: kasir.userId, body: 'Terima kasih Pak. Saya kirim deck dan proyeksinya.', createdAt: daysAgo(74), readAt: daysAgo(73) },
    ],
  });

  const agreementSelesai = await prisma.agreement.create({
    data: {
      connectionId: kerjaSamaSelesai.id,
      agreementNumber: 'MLN-2026-000002',
      cooperationType: CooperationType.PENYERTAAN_MODAL,
      amount: new Prisma.Decimal(300_000_000),
      startDate: daysAgo(70),
      endDate: daysAgo(5),
      equityPercentage: new Prisma.Decimal(12),
      terms: 'Pemodal memperoleh hak informasi bulanan dan satu kursi penasihat tanpa hak suara.',
      status: AgreementStatus.COMPLETED,
      documentUrl: `${FILE_BASE}/api/files/agreement/MLN-2026-000002.pdf`,
      createdAt: daysAgo(72),
    },
  });
  await prisma.agreementSignature.createMany({
    data: [
      { agreementId: agreementSelesai.id, userId: kasir.userId, signatureUrl: `${FILE_BASE}/api/files/signature/contoh-ttd-3.png`, signedAt: daysAgo(71) },
      { agreementId: agreementSelesai.id, userId: rizky, signatureUrl: `${FILE_BASE}/api/files/signature/contoh-ttd-4.png`, signedAt: daysAgo(70) },
    ],
  });
  await prisma.rating.createMany({
    data: [
      { agreementId: agreementSelesai.id, reviewerId: rizky, reviewedUserId: kasir.userId, score: 5, review: 'Pelaporan rapi dan tepat waktu. Target pengguna tercapai lebih cepat dari rencana.', createdAt: daysAgo(4) },
      { agreementId: agreementSelesai.id, reviewerId: kasir.userId, reviewedUserId: rizky, score: 5, review: 'Pendampingan sangat membantu, terutama untuk rekrutmen tim penjualan.', createdAt: daysAgo(4) },
    ],
  });
  await prisma.fundingRequest.update({
    where: { id: kasir.fundingRequestId },
    data: { status: FundingStatus.COMPLETED },
  });

  // 6. CLOSED — pernah diterima lalu diakhiri, berbeda dari REJECTED.
  await prisma.connection.create({
    data: {
      senderId: sari,
      receiverId: batik.userId,
      status: ConnectionStatus.CLOSED,
      message: 'Halo, saya tertarik dengan batik pewarna alamnya.',
      respondedAt: daysAgo(40),
      closedAt: daysAgo(30),
      closedById: batik.userId,
      createdAt: daysAgo(42),
      conversation: { create: { createdAt: daysAgo(40) } },
    },
  });

  // -------------------------------------------------------------------------
  // Transaksi simulasi (FR-13)
  // -------------------------------------------------------------------------
  await prisma.transaction.createMany({
    data: [
      { userId: sari, type: TransactionType.SUBSCRIPTION_PRO, amount: new Prisma.Decimal(99_000), status: TransactionStatus.SUCCESS, referenceCode: 'TRX-2026-000001', description: 'Langganan Modalin Pro (1 bulan)', paidAt: daysAgo(12), createdAt: daysAgo(12) },
      { userId: rotan.userId, type: TransactionType.PLATFORM_FEE, amount: new Prisma.Decimal(49_000), status: TransactionStatus.SUCCESS, referenceCode: 'TRX-2026-000002', description: 'Biaya Layanan Platform', paidAt: daysAgo(15), createdAt: daysAgo(15) },
      { userId: gunawan, type: TransactionType.SUBSCRIPTION_PRO, amount: new Prisma.Decimal(99_000), status: TransactionStatus.PENDING, referenceCode: 'TRX-2026-000003', description: 'Langganan Modalin Pro (1 bulan)', createdAt: minutesAgo(30) },
    ],
  });

  // -------------------------------------------------------------------------
  // Trust Score (FR-03) — dihitung dengan fungsi yang sama seperti runtime,
  // bukan angka karangan, supaya peringkat matchmaking di demo jujur.
  // -------------------------------------------------------------------------
  console.log('Menghitung Trust Score...');
  const users = await prisma.user.findMany({
    where: { role: { in: [Role.UMKM, Role.INVESTOR] } },
    select: {
      id: true,
      role: true,
      profile: {
        select: {
          fullName: true, phone: true, avatarUrl: true, bio: true, location: true,
          ktpUrl: true, nibUrl: true, verificationStatus: true,
        },
      },
      business: { select: { id: true, fundingRequests: { select: { id: true }, take: 1 } } },
      investorPreference: { select: { id: true } },
    },
  });

  for (const user of users) {
    if (!user.profile) continue;
    const [agg, portfolioCount] = await Promise.all([
      prisma.rating.aggregate({ where: { reviewedUserId: user.id }, _avg: { score: true }, _count: { _all: true } }),
      prisma.portfolio.count({ where: { ownerId: user.id } }),
    ]);
    const p = user.profile;
    const { total } = calculateTrustScore({
      role: user.role,
      verificationStatus: p.verificationStatus,
      profile: {
        fullName: Boolean(p.fullName), phone: Boolean(p.phone), avatarUrl: Boolean(p.avatarUrl),
        bio: Boolean(p.bio), location: Boolean(p.location), ktpUrl: Boolean(p.ktpUrl), nibUrl: Boolean(p.nibUrl),
      },
      hasBusiness: Boolean(user.business),
      hasFundingRequest: (user.business?.fundingRequests.length ?? 0) > 0,
      hasInvestorPreference: Boolean(user.investorPreference),
      portfolioCount,
      averageRating: agg._avg.score ?? null,
      ratingCount: agg._count._all,
    });
    await prisma.profile.update({
      where: { userId: user.id },
      data: { trustScore: total, trustScoreUpdatedAt: new Date() },
    });
  }

  const counts = {
    sektor: await prisma.sector.count(),
    umkm: await prisma.user.count({ where: { role: Role.UMKM } }),
    investor: await prisma.user.count({ where: { role: Role.INVESTOR } }),
    peluang: await prisma.fundingRequest.count(),
    koneksi: await prisma.connection.count(),
    pesan: await prisma.message.count(),
    kesepakatan: await prisma.agreement.count(),
    ulasan: await prisma.rating.count(),
    transaksi: await prisma.transaction.count(),
  };
  console.log('Selesai:', counts);
  console.log(`\nSemua akun demo memakai kata sandi: ${DEMO_PASSWORD}`);
  console.log('  admin@modalin.id           (ADMIN, antrean verifikasi)');
  console.log('  sari.investor@modalin.id   (INVESTOR, alur match -> chat -> SPK)');
  console.log('  dapur.bunda@modalin.id     (UMKM, lawan bicara Sari)');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
