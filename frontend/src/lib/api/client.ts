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

/**
 * Pesan pengganti kalau server tidak mengirim pesannya sendiri. Selalu Bahasa
 * Indonesia yang bisa dipahami pengguna awam — NFR Reliability melarang
 * menampilkan error teknis mentah (ARCHITECTURE.md §8).
 */
export function friendlyError(status: number, fallback: string): string {
  if (status === 0) return 'Koneksi terputus. Periksa internetmu dan coba lagi.';
  if (status === 401) return 'Sesi berakhir. Silakan masuk lagi.';
  if (status === 403) return 'Kamu tidak punya akses untuk langkah ini.';
  if (status === 404) return 'Data yang dicari tidak ditemukan.';
  if (status === 413) return 'Berkasnya terlalu besar. Maksimal 10 MB.';
  if (status === 429) return 'Terlalu banyak percobaan. Coba lagi sebentar lagi.';
  if (status >= 500) return 'Ada kendala di sistem kami. Coba lagi sebentar lagi.';
  return fallback;
}

type Options = Omit<RequestInit, 'body'> & { json?: unknown; body?: BodyInit | null };

/** Access token berumur 15 menit; sekali coba perbarui diam-diam sebelum menyerah. */
let refreshing: Promise<boolean> | null = null;
async function tryRefresh(): Promise<boolean> {
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${API}/api/auth/refresh`, { method: 'POST', credentials: 'include' });
      if (!res.ok) return false;
      const data = (await res.json()) as { accessToken?: string };
      if (!data.accessToken) return false;
      setToken(data.accessToken);
      return true;
    } catch {
      return false;
    } finally {
      setTimeout(() => {
        refreshing = null;
      }, 0);
    }
  })();
  return refreshing;
}

async function request<T>(path: string, opts: Options, retry = true): Promise<T> {
  const headers: Record<string, string> = { ...(opts.headers as Record<string, string> | undefined) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  // FormData harus membawa boundary-nya sendiri, jangan set Content-Type.
  if (opts.json !== undefined) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      ...opts,
      headers,
      credentials: 'include',
      body: opts.json !== undefined ? JSON.stringify(opts.json) : opts.body,
    });
  } catch {
    throw new Error(friendlyError(0, 'Tidak dapat terhubung ke server.'));
  }

  if (response.status === 401 && retry && (await tryRefresh())) {
    return request<T>(path, opts, false);
  }

  if (response.status === 204) return undefined as T;

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const record = data as { error?: unknown } | null;
    const message =
      (record && typeof record.error === 'string' ? record.error : '') ||
      friendlyError(response.status, 'Permintaan gagal. Periksa kembali data yang kamu isi.');
    throw new Error(message);
  }
  return data as T;
}

export function api<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  return request<T>(path, opts);
}

/** Unggahan berkas: multipart, dipakai untuk KYC, portofolio, avatar, tanda tangan. */
export function upload<T = unknown>(path: string, form: FormData): Promise<T> {
  return request<T>(path, { method: 'POST', body: form });
}
