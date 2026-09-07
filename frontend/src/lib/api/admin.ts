import { api } from './client';
import type { Role, VerificationStatus } from './types';

export const adminStats = () => api<Record<string, number>>('/api/admin/stats');

export const verificationQueue = (status: VerificationStatus = 'PENDING') =>
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
  >(`/api/admin/verifications?status=${status}`);

export const decideVerification = (
  userId: string,
  body: { decision: 'APPROVE' } | { decision: 'REJECT'; reason: string },
) => api(`/api/admin/verifications/${userId}`, { method: 'PATCH', json: body });
