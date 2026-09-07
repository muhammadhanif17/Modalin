import { api } from './client';
import type { ChatMessage, ConversationSummary, NotificationSummary } from './types';

export const conversations = () => api<ConversationSummary[]>('/api/chat/conversations');

export const messages = (id: string) => api<ChatMessage[]>(`/api/chat/conversations/${id}/messages`);

export const sendMessage = (id: string, body: string) =>
  api<ChatMessage>(`/api/chat/conversations/${id}/messages`, { method: 'POST', json: { body } });

export const markRead = (id: string) => api(`/api/chat/conversations/${id}/read`, { method: 'POST' });

export const notifications = () => api<NotificationSummary>('/api/chat/notifications/summary');
