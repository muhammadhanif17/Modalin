import { useMemo } from 'react';

export type Session = {
  id: string;
  email: string;
  role: 'UMKM' | 'INVESTOR' | 'ADMIN';
} | null;

let cached: Session | null = null;
let cacheValid = false;

export function readSession(): Session {
  if (cacheValid) return cached;
  try {
    const raw = sessionStorage.getItem('modalin_session');
    cached = raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    cached = null;
  }
  cacheValid = true;
  return cached;
}

export function saveSession(session: Session) {
  cached = session;
  cacheValid = true;
  if (session) sessionStorage.setItem('modalin_session', JSON.stringify(session));
  else sessionStorage.removeItem('modalin_session');
}

export function useSession() {
  return useMemo(() => readSession(), []);
}
