import { useEffect, useRef, useState, useCallback } from 'react';

const DRAFT_PREFIX = 'modalin:draft:';
const STEP_KEY = (key: string) => `${DRAFT_PREFIX}${key}:step`;
const DATA_KEY = (key: string) => `${DRAFT_PREFIX}${key}`;
const SAVED_KEY = (key: string) => `${DRAFT_PREFIX}${key}:saved`;

/**
 * useDraft — auto-save nilai form multi-langkah ke localStorage.
 *
 * - Mount: muat nilai & step terakhir (langsung ke langkah terakhir, sesuai keputusan desain).
 * - Perubahan: debounce 300ms, simpan ke localStorage + catat timestamp.
 * - Reset: hapus semua data + kembali ke step 1.
 *
 * @param key nama unik (mis. 'profile:umkm')
 * @param initial nilai awal setiap field (Zod schema memberi default valid)
 * @param totalSteps jumlah langkah (untuk clamp saat resume)
 */
export function useDraft<T extends Record<string, unknown>>(
  key: string,
  initial: T,
  totalSteps: number,
) {
  const [values, setValues] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(DATA_KEY(key));
      if (!raw) return initial;
      const parsed = JSON.parse(raw) as Partial<T>;
      return { ...initial, ...parsed };
    } catch {
      return initial;
    }
  });

  const [step, setStepState] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(STEP_KEY(key));
      const n = raw ? parseInt(raw, 10) : 1;
      if (Number.isNaN(n) || n < 1) return 1;
      return Math.min(n, totalSteps);
    } catch {
      return 1;
    }
  });

  const [lastSaved, setLastSaved] = useState<number | null>(() => {
    try {
      const raw = localStorage.getItem(SAVED_KEY(key));
      return raw ? parseInt(raw, 10) : null;
    } catch {
      return null;
    }
  });

  const [isDirty, setIsDirty] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-save debounced saat `values` berubah.
  useEffect(() => {
    setIsDirty(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        localStorage.setItem(DATA_KEY(key), JSON.stringify(values));
        const now = Date.now();
        localStorage.setItem(SAVED_KEY(key), String(now));
        setLastSaved(now);
        setIsDirty(false);
      } catch {
        // localStorage penuh / dinonaktifkan — simpan dibatalkan, data tetap di state.
      }
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [values, key]);

  // Simpan step ke localStorage setiap kali berubah.
  const setStep = useCallback(
    (n: number) => {
      const clamped = Math.max(1, Math.min(n, totalSteps));
      setStepState(clamped);
      try {
        localStorage.setItem(STEP_KEY(key), String(clamped));
      } catch {
        // diabaikan, step tetap di state.
      }
    },
    [key, totalSteps],
  );

  const setValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  const setMany = useCallback((patch: Partial<T>) => {
    setValues((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(DATA_KEY(key));
      localStorage.removeItem(STEP_KEY(key));
      localStorage.removeItem(SAVED_KEY(key));
    } catch {
      // diabaikan
    }
    setValues(initial);
    setStepState(1);
    setLastSaved(null);
    setIsDirty(false);
  }, [key, initial]);

  const isStepValid = useCallback(
    (stepData: Partial<T>): boolean => {
      // Pemeriksaan ringan: tidak ada field string yang required dan kosong.
      // Validasi penuh (Zod) dilakukan di submit per langkah.
      for (const [k, v] of Object.entries(stepData)) {
        if (typeof v === 'string' && v.trim() === '' && initial[k as keyof T] === '') {
          return false;
        }
      }
      return true;
    },
    [initial],
  );

  return { values, setValue, setMany, step, setStep, isStepValid, reset, lastSaved, isDirty };
}

/** Format "14:32" dari timestamp. */
export function formatSavedAt(ts: number | null): string {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}
