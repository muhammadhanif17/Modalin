import { useEffect, useState } from 'react';
import { formatSavedAt } from '../../lib/useDraft';

/** Indikator draf otomatis — logika sama, visual mengikuti mockup a3-a7 (ikon cloud_done + teks). */
export function AutoSaveIndicator({ savedAt, isDirty }: { savedAt: number | null; isDirty: boolean }) {
  const [, force] = useState(0);
  // Perbarui label "Baru saja" setiap 30 detik tanpa membuat hook lain.
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  let label: string;
  if (isDirty) {
    label = 'Menyimpan…';
  } else if (!savedAt) {
    label = 'Belum ada perubahan';
  } else {
    const diff = Date.now() - savedAt;
    if (diff < 60_000) label = 'Tersimpan otomatis · Baru saja';
    else label = `Tersimpan otomatis · ${formatSavedAt(savedAt)}`;
  }

  return (
    <span
      className="inline-flex items-center justify-center gap-1.5 font-body-sm text-body-sm text-on-surface-variant"
      aria-live="polite"
    >
      <span className="material-symbols-outlined text-[16px] text-secondary">cloud_done</span>
      <span>{label}</span>
    </span>
  );
}
