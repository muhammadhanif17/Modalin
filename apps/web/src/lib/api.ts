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

export function friendlyError(status: number, fallback: string): string {
  if (status === 0) return 'Koneksi terputus. Periksa internetmu dan coba lagi.';
  if (status === 401) return 'Sesi berakhir. Silakan masuk lagi.';
  if (status === 403) return 'Kamu tidak punya akses untuk langkah ini.';
  if (status === 404) return 'Data yang dicari tidak ditemukan.';
  if (status >= 500) return 'Ada kendala di sistem kami. Coba lagi sebentar lagi.';
  return fallback;
}

type Options = RequestInit & { json?: unknown };

export async function api<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(opts.headers as Record<string, string> | undefined),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.json !== undefined) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      ...opts,
      headers,
      body: opts.json !== undefined ? JSON.stringify(opts.json) : opts.body,
    });
  } catch {
    throw new Error(friendlyError(0, 'Tidak dapat terhubung ke server.'));
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      (data && typeof data.error === 'string' ? data.error : '') ||
      friendlyError(
        response.status,
        'Permintaan gagal. Periksa kembali data yang kamu isi.'
      );
    throw new Error(message);
  }
  return data as T;
}
