// Tipe bersama lintas modul — dipisah agar file endpoint tipis.

export type Role = 'UMKM' | 'INVESTOR' | 'ADMIN';
export type VerificationStatus = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
export type CooperationType = 'BAGI_HASIL' | 'PENYERTAAN_MODAL' | 'PINJAMAN';
export type ConnectionStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CLOSED';
export type AgreementStatus =
  | 'DRAFT'
  | 'WAITING_SIGNATURE'
  | 'SIGNED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED';

export const COOPERATION_LABEL: Record<CooperationType, string> = {
  BAGI_HASIL: 'Bagi Hasil',
  PENYERTAAN_MODAL: 'Penyertaan Modal',
  PINJAMAN: 'Pinjaman',
};

/** Penjelasan awam untuk ikon info (NFR Usability: istilah keuangan disertai penjelasan). */
export const COOPERATION_HELP: Record<CooperationType, string> = {
  BAGI_HASIL:
    'Pemodal ikut menanggung untung-rugi usaha. Keuntungan dibagi sesuai porsi yang disepakati, tidak ada bunga tetap.',
  PENYERTAAN_MODAL:
    'Pemodal menjadi pemilik sebagian usahamu. Ia berhak atas persentase kepemilikan dan ikut menanggung risiko jangka panjang.',
  PINJAMAN:
    'Dana dikembalikan bertahap dalam jangka waktu tertentu beserta imbal hasil yang sudah disepakati di awal.',
};

export const VERIFICATION_LABEL: Record<VerificationStatus, string> = {
  UNVERIFIED: 'Belum Terverifikasi',
  PENDING: 'Sedang Ditinjau',
  VERIFIED: 'Terverifikasi',
  REJECTED: 'Perlu Diperbaiki',
};

export type Sector = { id: string; name: string; slug: string };

export type OpportunityOwner = {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  trustScore: number;
  isVerified: boolean;
};

export type Opportunity = {
  id: string;
  title: string;
  purpose: string;
  targetAmount: number;
  cooperationTypes: CooperationType[];
  tenorMonths: number | null;
  estimatedRoi: number | null;
  deadline: string | null;
  status: string;
  createdAt: string;
  business: {
    id: string;
    name: string;
    description: string;
    location: string;
    sector: Sector;
    establishedYear: number | null;
    monthlyRevenue: number | null;
  };
  owner: OpportunityOwner;
};

export type MatchResult = {
  fundingRequestId: string;
  score: number;
  matchedCooperationTypes: CooperationType[];
  components: Record<'sector' | 'amount' | 'location' | 'trustScore', { ratio: number; weight: number; points: number }>;
  reasons: string[];
  isRecommended: boolean;
};

export type MatchedOpportunity = Opportunity & { match: MatchResult };

export type InvestorListing = {
  id: string;
  createdAt: string;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  trustScore: number;
  isVerified: boolean;
  preference: {
    minimumAmount: number;
    maximumAmount: number;
    preferredLocation: string | null;
    preferredSector: Sector | null;
    cooperationTypes: CooperationType[];
  } | null;
};

export type SearchAudience = 'peluang' | 'pemodal';

export type SearchResponse =
  | { audience: 'peluang'; items: Opportunity[]; total: number; emptyMessage: string | null }
  | { audience: 'pemodal'; items: InvestorListing[]; total: number; emptyMessage: string | null };

export type MatchedInvestor = InvestorListing & { match: MatchResult };

type MatchesBase = {
  needsSetup: boolean;
  minScore?: number;
  rejectedByHardFilter: number;
  emptyMessage: string | null;
};

export type MatchesResponse =
  | (MatchesBase & {
      audience: 'peluang';
      recommended: MatchedOpportunity[];
      alternatives: MatchedOpportunity[];
    })
  | (MatchesBase & {
      audience: 'pemodal';
      recommended: MatchedInvestor[];
      alternatives: MatchedInvestor[];
    });

export type TrustBreakdown = {
  total: number;
  profileCompleteness: number;
  verification: number;
  rating: number;
  missing: string[];
};

export type MyProfile = {
  id: string;
  userId: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  ktpUrl: string | null;
  nibUrl: string | null;
  verificationStatus: VerificationStatus;
  kycSubmittedAt: string | null;
  rejectReason: string | null;
  trustScore: number;
  isVerified: boolean;
  trustScoreBreakdown: TrustBreakdown | null;
  user: { email: string; role: Role };
};

export type PartySummary = { id: string; fullName?: string | null; avatarUrl?: string | null };

export type Connection = {
  id: string;
  senderId: string;
  receiverId: string;
  status: ConnectionStatus;
  message: string | null;
  direction: 'masuk' | 'keluar';
  createdAt: string;
  sender: { id: string; role: Role; profile: PartySummary | null };
  receiver: { id: string; role: Role; profile: PartySummary | null };
  fundingRequest: { id: string; title: string; business: { name: string } } | null;
  conversation: { id: string } | null;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  sender?: { id: string; profile: PartySummary | null };
};

export type ConversationSummary = {
  id: string;
  connectionId: string;
  fundingRequest: { id: string; title: string } | null;
  partner: PartySummary;
  lastMessage: ChatMessage | null;
  unreadCount: number;
};

export type Agreement = {
  id: string;
  agreementNumber: string;
  cooperationType: CooperationType;
  amount: string | number;
  startDate: string;
  endDate: string | null;
  profitSharingRatio: string | number | null;
  equityPercentage: string | number | null;
  interestRate: string | number | null;
  tenorMonths: number | null;
  terms: string | null;
  status: AgreementStatus;
  documentUrl: string | null;
  createdAt: string;
  connection: {
    id: string;
    senderId: string;
    receiverId: string;
    sender: { id: string; email: string; role: Role; profile: PartySummary | null };
    receiver: { id: string; email: string; role: Role; profile: PartySummary | null };
    fundingRequest: { id: string; title: string; business: { id: string; name: string } } | null;
  };
  signatures: { id: string; userId: string; signedAt: string; signatureUrl: string }[];
  ratings: { id: string; reviewerId: string; score: number }[];
};

export type NotificationSummary = {
  unreadMessages: number;
  pendingConnections: number;
  acceptedConnections: number;
};

export type Product = {
  key: 'PLATFORM_FEE' | 'SUBSCRIPTION_PRO';
  type: string;
  amount: number;
  name: string;
  description: string;
  simulated: true;
};

export type Transaction = {
  id: string;
  type: string;
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  referenceCode: string;
  description: string | null;
  paidAt: string | null;
  createdAt: string;
  simulated: true;
};
