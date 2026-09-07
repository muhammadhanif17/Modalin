import { api } from './client';
import type { Product, Transaction } from './types';

export const products = () => api<Product[]>('/api/payments/products');

export const checkout = (product: Product['key']) =>
  api<Transaction>('/api/payments/checkout', { method: 'POST', json: { product } });

export const confirmPayment = (id: string, outcome: 'SUCCESS' | 'FAILED') =>
  api<Transaction>(`/api/payments/transactions/${id}/confirm`, { method: 'POST', json: { outcome } });

export const transactions = () => api<Transaction[]>('/api/payments/transactions');
