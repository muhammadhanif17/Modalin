import { api, upload } from './client';
import type { Agreement, CooperationType, PartySummary } from './types';

export const agreements = () => api<Agreement[]>('/api/agreements');

export const agreement = (id: string) => api<Agreement>(`/api/agreements/${id}`);

export const createAgreement = (body: Record<string, unknown>) =>
  api<Agreement>('/api/agreements', { method: 'POST', json: body });

export const sign = (id: string, file: File) => {
  const form = new FormData();
  form.append('file', file);
  return upload<Agreement>(`/api/agreements/${id}/signature`, form);
};

export const generatePdf = (id: string) => api<Agreement>(`/api/agreements/${id}/generate`, { method: 'POST' });

export const completeAgreement = (id: string) => api<Agreement>(`/api/agreements/${id}/complete`, { method: 'POST' });

export const rate = (agreementId: string, body: { score: number; review?: string }) =>
  api(`/api/agreements/${agreementId}/ratings`, { method: 'POST', json: body });

export const pendingRatings = () =>
  api<
    { agreementId: string; agreementNumber: string; cooperationType: CooperationType; amount: number; partner: PartySummary }[]
  >('/api/ratings/pending');
