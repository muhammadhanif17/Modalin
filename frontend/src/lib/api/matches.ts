import { api } from './client';
import type { Connection, MatchesResponse, SearchResponse } from './types';

export const search = (params: Record<string, string | number | undefined>) => {
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') query.set(k, String(v));
  }
  return api<SearchResponse>(`/api/search?${query.toString()}`);
};

export const matches = () => api<MatchesResponse>('/api/matches');

export const connections = () => api<Connection[]>('/api/connections');

export const createConnection = (body: { receiverId: string; fundingRequestId?: string; message?: string }) =>
  api<Connection>('/api/connections', { method: 'POST', json: body });

export const respondConnection = (id: string, status: 'ACCEPTED' | 'REJECTED' | 'CLOSED') =>
  api<Connection>(`/api/connections/${id}`, { method: 'PATCH', json: { status } });
