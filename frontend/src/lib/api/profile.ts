import { api, upload } from './client';
import type { MyProfile, Sector } from './types';

export const me = () => api<MyProfile>('/api/profile/me');

export const updateMe = (body: Partial<Pick<MyProfile, 'fullName' | 'phone' | 'bio' | 'location'>>) =>
  api<MyProfile>('/api/profile/me', { method: 'PATCH', json: body });

export const sectors = () => api<Sector[]>('/api/profile/sectors');

export const business = () => api<Record<string, unknown> | null>('/api/profile/business');

export const saveBusiness = (body: Record<string, unknown>) =>
  api('/api/profile/business', { method: 'PUT', json: body });

export const createFunding = (body: Record<string, unknown>) =>
  api('/api/profile/funding-requests', { method: 'POST', json: body });

export const investorPreference = () => api<Record<string, unknown> | null>('/api/profile/investor-preference');

export const savePreference = (body: Record<string, unknown>) =>
  api('/api/profile/investor-preference', { method: 'PUT', json: body });

export const portfolio = () =>
  api<{ id: string; title: string; description: string | null; fileUrl: string; fileType: string; fileSize: number; createdAt: string }[]>(
    '/api/profile/portfolio',
  );

export const addPortfolio = (file: File, title: string, description?: string) => {
  const form = new FormData();
  form.append('file', file);
  form.append('title', title);
  if (description) form.append('description', description);
  return upload('/api/profile/portfolio', form);
};

export const removePortfolio = (id: string) => api(`/api/profile/portfolio/${id}`, { method: 'DELETE' });

export const publicProfile = (id: string) => api<Record<string, unknown>>(`/api/profile/users/${id}`);
