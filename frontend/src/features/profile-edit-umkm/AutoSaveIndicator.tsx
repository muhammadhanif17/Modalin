import { useEffect, useState } from 'react';
import { formatSavedAt } from '../../lib/useDraft';

/** Indikator "Tersimpan otomatis · 14:32" ala Google Docs. */
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
    <span className="autosave" aria-live="polite">
      <span className={`autosave-dot ${isDirty ? 'autosave-dot-pending' : ''}`} aria-hidden="true" />
      {label}
    </span>
  );
}
