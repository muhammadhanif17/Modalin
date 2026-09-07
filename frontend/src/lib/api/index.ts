// Re-export semua endpoint dan helper dengan namespace `endpoints` agar
// kompatibel dengan import lama: `import { endpoints } from '../lib/api'`.

import * as auth from './auth';
import * as profile from './profile';
import * as matches from './matches';
import * as chat from './chat';
import * as agreements from './agreements';
import * as payment from './payment';
import * as admin from './admin';

export * from './client';
export * from './types';

export const endpoints = {
  // auth
  register: auth.register,
  login: auth.login,
  logout: auth.logout,
  kycStatus: auth.kycStatus,
  uploadKtp: auth.uploadKtp,
  uploadNib: auth.uploadNib,

  // profile
  me: profile.me,
  updateMe: profile.updateMe,
  sectors: profile.sectors,
  business: profile.business,
  saveBusiness: profile.saveBusiness,
  createFunding: profile.createFunding,
  investorPreference: profile.investorPreference,
  savePreference: profile.savePreference,
  portfolio: profile.portfolio,
  addPortfolio: profile.addPortfolio,
  removePortfolio: profile.removePortfolio,
  publicProfile: profile.publicProfile,

  // matchmaking
  search: matches.search,
  matches: matches.matches,
  connections: matches.connections,
  createConnection: matches.createConnection,
  respondConnection: matches.respondConnection,

  // chat
  conversations: chat.conversations,
  messages: chat.messages,
  sendMessage: chat.sendMessage,
  markRead: chat.markRead,
  notifications: chat.notifications,

  // agreements & rating
  agreements: agreements.agreements,
  agreement: agreements.agreement,
  createAgreement: agreements.createAgreement,
  sign: agreements.sign,
  generatePdf: agreements.generatePdf,
  completeAgreement: agreements.completeAgreement,
  rate: agreements.rate,
  pendingRatings: agreements.pendingRatings,

  // payment
  products: payment.products,
  checkout: payment.checkout,
  confirmPayment: payment.confirmPayment,
  transactions: payment.transactions,

  // admin
  adminStats: admin.adminStats,
  verificationQueue: admin.verificationQueue,
  decideVerification: admin.decideVerification,
};
