import { api, upload } from './client';
import type { Role, VerificationStatus, MyProfile } from './types';

export const register = (body: { email: string; password: string; role: Role; fullName: string }) =>
  api<{ user: { id: string; email: string; role: Role }; accessToken: string }>('/api/auth/register', {
    method: 'POST',
    json: body,
  });

export const login = (body: { email: string; password: string }) =>
  api<{ user: { id: string; email: string; role: Role }; accessToken: string }>('/api/auth/login', {
    method: 'POST',
    json: body,
  });

export const logout = () => api('/api/auth/logout', { method: 'POST' });

export const kycStatus = () =>
  api<{
    verificationStatus: VerificationStatus;
    kycSubmittedAt: string | null;
    verifiedAt: string | null;
    rejectReason: string | null;
    ktpUrl: string | null;
    nibUrl: string | null;
    requiresNib: boolean;
    isVerified: boolean;
  }>('/api/auth/kyc/status');

export const uploadKtp = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return upload<MyProfile>('/api/auth/kyc/ktp', form);
};

export const uploadNib = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return upload<MyProfile>('/api/auth/kyc/nib', form);
};
