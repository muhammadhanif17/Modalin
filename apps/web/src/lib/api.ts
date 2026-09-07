export const API = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

const TOKEN_KEY = 'modalin_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function isAuthed(): boolean {
  return Boolean(getToken());
}

/**
 * Pesan pengganti kalau server tidak mengirim pesannya sendiri. Selalu Bahasa
 * Indonesia yang bisa dipahami pengguna awam — NFR Reliability melarang
 * menampilkan error teknis mentah (ARCHITECTURE.md §8).
 */
export function friendlyError(status: number, fallback: string): string {
  if (status === 0) return 'Koneksi terputus. Periksa internetmu dan coba lagi.';
  if (status === 401) return 'Sesi berakhir. Silakan masuk lagi.';
  if (status === 403) return 'Kamu tidak punya akses untuk langkah ini.';
  if (status === 404) return 'Data yang dicari tidak ditemukan.';
  if (status === 413) return 'Berkasnya terlalu besar. Maksimal 10 MB.';
  if (status === 429) return 'Terlalu banyak percobaan. Coba lagi sebentar lagi.';
  if (status >= 500) return 'Ada kendala di sistem kami. Coba lagi sebentar lagi.';
  return fallback;
}

type Options = Omit<RequestInit, 'body'> & { json?: unknown; body?: BodyInit | null };

/** Access token berumur 15 menit; sekali coba perbarui diam-diam sebelum menyerah. */
let refreshing: Promise<boolean> | null = null;
async function tryRefresh(): Promise<boolean> {
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${API}/api/auth/refresh`, { method: 'POST', credentials: 'include' });
      if (!res.ok) return false;
      const data = (await res.json()) as { accessToken?: string };
      if (!data.accessToken) return false;
      setToken(data.accessToken);
      return true;
    } catch {
      return false;
    } finally {
      // Biarkan percobaan berikutnya memulai putaran baru.
      setTimeout(() => {
        refreshing = null;
      }, 0);
    }
  })();
  return refreshing;
}

async function request<T>(path: string, opts: Options, retry = true): Promise<T> {
  const headers: Record<string, string> = { ...(opts.headers as Record<string, string> | undefined) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  // FormData harus membawa boundary-nya sendiri, jangan set Content-Type.
  if (opts.json !== undefined) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      ...opts,
      headers,
      credentials: 'include',
      body: opts.json !== undefined ? JSON.stringify(opts.json) : opts.body,
    });
  } catch {
    throw new Error(friendlyError(0, 'Tidak dapat terhubung ke server.'));
  }

  if (response.status === 401 && retry && (await tryRefresh())) {
    return request<T>(path, opts, false);
  }

  if (response.status === 204) return undefined as T;

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const record = data as { error?: unknown } | null;
    const message =
      (record && typeof record.error === 'string' ? record.error : '') ||
      friendlyError(response.status, 'Permintaan gagal. Periksa kembali data yang kamu isi.');
    throw new Error(message);
  }
  return data as T;
}

export function api<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  return request<T>(path, opts);
}

/** Unggahan berkas: multipart, dipakai untuk KYC, portofolio, avatar, tanda tangan. */
export function upload<T = unknown>(path: string, form: FormData): Promise<T> {
  return request<T>(path, { method: 'POST', body: form });
}

// ---------------------------------------------------------------------------
// Tipe bersama
// ---------------------------------------------------------------------------

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

/** Pemodal yang sudah mengisi kriteria investasinya — sisi kedua FR-05. */
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

/** Sisi mana yang sedang dicari: peluang usaha, atau pemodal. */
export type SearchAudience = 'peluang' | 'pemodal';

/**
 * Union terdiskriminasi supaya `items` tidak pernah dibaca sebagai tipe yang
 * salah — `audience` menentukan kartu mana yang dirender.
 */
export type SearchResponse =
  | { audience: 'peluang'; items: Opportunity[]; total: number; emptyMessage: string | null }
  | { audience: 'pemodal'; items: InvestorListing[]; total: number; emptyMessage: string | null };

export type MatchesResponse = {
  needsPreference: boolean;
  minScore?: number;
  recommended: MatchedOpportunity[];
  alternatives: MatchedOpportunity[];
  rejectedByHardFilter: number;
  emptyMessage: string | null;
};

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

// ---------------------------------------------------------------------------
// Endpoint, dikelompokkan per modul domain (ARCHITECTURE.md §4.1)
// ---------------------------------------------------------------------------

export const endpoints = {
  // Modul 1
  register: (body: { email: string; password: string; role: Role; fullName: string }) =>
    api<{ user: { id: string; email: string; role: Role }; accessToken: string }>('/api/auth/register', {
      method: 'POST',
      json: body,
    }),
  login: (body: { email: string; password: string }) =>
    api<{ user: { id: string; email: string; role: Role }; accessToken: string }>('/api/auth/login', {
      method: 'POST',
      json: body,
    }),
  logout: () => api('/api/auth/logout', { method: 'POST' }),
  kycStatus: () =>
    api<{
      verificationStatus: VerificationStatus;
      kycSubmittedAt: string | null;
      verifiedAt: string | null;
      rejectReason: string | null;
      ktpUrl: string | null;
      nibUrl: string | null;
      requiresNib: boolean;
      isVerified: boolean;
    }>('/api/auth/kyc/status'),
  uploadKtp: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return upload<MyProfile>('/api/auth/kyc/ktp', form);
  },
  uploadNib: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return upload<MyProfile>('/api/auth/kyc/nib', form);
  },

  // Modul 3
  me: () => api<MyProfile>('/api/profile/me'),
  updateMe: (body: Partial<Pick<MyProfile, 'fullName' | 'phone' | 'bio' | 'location'>>) =>
    api<MyProfile>('/api/profile/me', { method: 'PATCH', json: body }),
  sectors: () => api<Sector[]>('/api/profile/sectors'),
  business: () => api<Record<string, unknown> | null>('/api/profile/business'),
  saveBusiness: (body: Record<string, unknown>) =>
    api('/api/profile/business', { method: 'PUT', json: body }),
  createFunding: (body: Record<string, unknown>) =>
    api('/api/profile/funding-requests', { method: 'POST', json: body }),
  investorPreference: () => api<Record<string, unknown> | null>('/api/profile/investor-preference'),
  savePreference: (body: Record<string, unknown>) =>
    api('/api/profile/investor-preference', { method: 'PUT', json: body }),
  portfolio: () => api<{ id: string; title: string; description: string | null; fileUrl: string; fileType: string; fileSize: number; createdAt: string }[]>('/api/profile/portfolio'),
  addPortfolio: (file: File, title: string, description?: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('title', title);
    if (description) form.append('description', description);
    return upload('/api/profile/portfolio', form);
  },
  removePortfolio: (id: string) => api(`/api/profile/portfolio/${id}`, { method: 'DELETE' }),
  publicProfile: (id: string) => api<Record<string, unknown>>(`/api/profile/users/${id}`),

  // Modul 4
  search: (params: Record<string, string | number | undefined>) => {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') query.set(k, String(v));
    }
    return api<SearchResponse>(`/api/search?${query.toString()}`);
  },
  matches: () => api<MatchesResponse>('/api/matches'),
  connections: () => api<Connection[]>('/api/connections'),
  createConnection: (body: { receiverId: string; fundingRequestId?: string; message?: string }) =>
    api<Connection>('/api/connections', { method: 'POST', json: body }),
  respondConnection: (id: string, status: 'ACCEPTED' | 'REJECTED' | 'CLOSED') =>
    api<Connection>(`/api/connections/${id}`, { method: 'PATCH', json: { status } }),

  // Modul 5
  conversations: () => api<ConversationSummary[]>('/api/chat/conversations'),
  messages: (id: string) => api<ChatMessage[]>(`/api/chat/conversations/${id}/messages`),
  sendMessage: (id: string, body: string) =>
    api<ChatMessage>(`/api/chat/conversations/${id}/messages`, { method: 'POST', json: { body } }),
  markRead: (id: string) => api(`/api/chat/conversations/${id}/read`, { method: 'POST' }),
  notifications: () => api<NotificationSummary>('/api/chat/notifications/summary'),

  // Modul 6
  agreements: () => api<Agreement[]>('/api/agreements'),
  agreement: (id: string) => api<Agreement>(`/api/agreements/${id}`),
  createAgreement: (body: Record<string, unknown>) =>
    api<Agreement>('/api/agreements', { method: 'POST', json: body }),
  sign: (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return upload<Agreement>(`/api/agreements/${id}/signature`, form);
  },
  generatePdf: (id: string) => api<Agreement>(`/api/agreements/${id}/generate`, { method: 'POST' }),
  completeAgreement: (id: string) => api<Agreement>(`/api/agreements/${id}/complete`, { method: 'POST' }),

  // Modul 7
  rate: (agreementId: string, body: { score: number; review?: string }) =>
    api(`/api/agreements/${agreementId}/ratings`, { method: 'POST', json: body }),
  pendingRatings: () =>
    api<{ agreementId: string; agreementNumber: string; cooperationType: CooperationType; amount: number; partner: PartySummary }[]>(
      '/api/ratings/pending',
    ),

  // Modul 8
  products: () => api<Product[]>('/api/payments/products'),
  checkout: (product: Product['key']) =>
    api<Transaction>('/api/payments/checkout', { method: 'POST', json: { product } }),
  confirmPayment: (id: string, outcome: 'SUCCESS' | 'FAILED') =>
    api<Transaction>(`/api/payments/transactions/${id}/confirm`, { method: 'POST', json: { outcome } }),
  transactions: () => api<Transaction[]>('/api/payments/transactions'),

  // Admin
  adminStats: () => api<Record<string, number>>('/api/admin/stats'),
  verificationQueue: (status: VerificationStatus = 'PENDING') =>
    api<
      {
        userId: string;
        fullName: string;
        location: string | null;
        ktpUrl: string | null;
        nibUrl: string | null;
        verificationStatus: VerificationStatus;
        kycSubmittedAt: string | null;
        rejectReason: string | null;
        trustScore: number;
        user: { email: string; role: Role; createdAt: string };
      }[]
    >(`/api/admin/verifications?status=${status}`),
  decideVerification: (userId: string, body: { decision: 'APPROVE' } | { decision: 'REJECT'; reason: string }) =>
    api(`/api/admin/verifications/${userId}`, { method: 'PATCH', json: body }),
};
