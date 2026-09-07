/**
 * Set ikon garis, digambar inline sebagai SVG.
 *
 * Sengaja TIDAK memakai font ikon (Material Symbols dsb.): font ikon merender
 * teks ligaturnya apa adanya sampai fontnya selesai diunduh, jadi di jaringan
 * lambat bottom nav sempat terbaca "home search chat_bubble person". Inline SVG
 * tidak punya masalah itu, tidak menambah request, dan mewarisi `currentColor`
 * sehingga state aktif/nonaktif ikut token warna tanpa aturan CSS tambahan.
 *
 * Semua glyph digambar di kanvas 24×24 dengan tebal garis seragam supaya
 * terlihat satu keluarga saat dipakai berdampingan.
 */

export type IconName =
  | 'home'
  | 'search'
  | 'chat'
  | 'person'
  | 'shield'
  | 'location'
  | 'document'
  | 'edit'
  | 'folder'
  | 'receipt'
  | 'target'
  | 'warning'
  | 'sprout'
  | 'users'
  | 'star'
  | 'check'
  | 'lock'
  | 'verified'
  | 'close'
  | 'chevron'
  | 'trend'
  | 'handshake'
  | 'image'
  | 'trash'
  | 'bell';

/** Glyph bergaris — mewarisi tebal garis dan warna dari elemen svg. */
const STROKE: Partial<Record<IconName, React.ReactNode>> = {
  home: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.8V19a2 2 0 0 0 2 2H10v-5.5h4V21h2.5a2 2 0 0 0 2-2V9.8" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m15.8 15.8 5 5" />
    </>
  ),
  chat: (
    <path d="M7 3h10a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-6l-4.5 4v-4H7a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z" />
  ),
  person: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  shield: <path d="M12 3.2 19.5 6v6c0 4.4-3.1 8.3-7.5 9.6C7.6 20.3 4.5 16.4 4.5 12V6Z" />,
  location: (
    <>
      <path d="M12 21.2s7-6.2 7-11.2a7 7 0 1 0-14 0c0 5 7 11.2 7 11.2Z" />
      <circle cx="12" cy="10" r="2.6" />
    </>
  ),
  document: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
      <path d="M14 3v5h5" />
      <path d="M9 13.5h6M9 17h4" />
    </>
  ),
  folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />,
  edit: (
    <>
      <path d="M4 20h4l10.5-10.5a2 2 0 0 0 0-2.8l-1.7-1.7a2 2 0 0 0-2.8 0L3.5 15.5V20Z" />
      <path d="m13 7 4 4" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3h12v18l-3-1.8-3 1.8-3-1.8L6 21Z" />
      <path d="M9.5 8.5h5M9.5 12.5h5" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <circle cx="12" cy="12" r="4.4" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  warning: (
    <>
      <path d="M12 4.4 21 19.6H3Z" />
      <path d="M12 10.2v4M12 17.3v.1" />
    </>
  ),
  sprout: (
    <>
      <path d="M12 21v-7.2" />
      <path d="M12 13.8c0-3.3 2.7-6 6-6 0 3.3-2.7 6-6 6Z" />
      <path d="M12 13.8c0-2.8-2.2-5-5-5 0 2.8 2.2 5 5 5Z" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 5.2a3.5 3.5 0 0 1 0 5.6" />
      <path d="M17.6 14.3A6.5 6.5 0 0 1 21.5 20" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.3 12.2 2.6 2.6 4.9-5.4" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10" width="15" height="11" rx="2.5" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />,
  chevron: <path d="m9.5 5 7 7-7 7" />,
  /* Sparkline naik — lambang merek di mockup welcome screen, bukan huruf "M" */
  trend: (
    <>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </>
  ),
  handshake: (
    <>
      <path d="M11 6.5 8.8 4.3a2 2 0 0 0-2.8 0l-3 3a2 2 0 0 0 0 2.8l3.5 3.5" />
      <path d="m13 6.5 2.2-2.2a2 2 0 0 1 2.8 0l3 3a2 2 0 0 1 0 2.8l-3.5 3.5" />
      <path d="m8.5 13.6 2.1 2.1a1.5 1.5 0 0 0 2.1 0l.4-.4" />
      <path d="m13.1 15.3 1.7 1.7a1.5 1.5 0 0 0 2.1-2.1" />
    </>
  ),
  image: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <circle cx="9" cy="10" r="1.8" />
      <path d="m5.5 18 4.5-4.5 3 3 2.5-2.5 3 3" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
      <path d="M6.5 7l1 12a1.5 1.5 0 0 0 1.5 1.4h6a1.5 1.5 0 0 0 1.5-1.4l1-12" />
      <path d="M10 11.5v5M14 11.5v5" />
    </>
  ),
  bell: (
    <>
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </>
  ),
};

/** Glyph padat — dipakai saat ikon berfungsi sebagai lencana, bukan simbol. */
const FILLED: Partial<Record<IconName, React.ReactNode>> = {
  star: <path d="m12 3.6 2.6 5.5 6 .9-4.3 4.2 1 6-5.3-2.8-5.3 2.8 1-6L3.4 10l6-.9Z" />,
  verified: (
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.8 7.3-5.7 6.2a1 1 0 0 1-1.46.02L6.9 12.75a1 1 0 1 1 1.42-1.4l1.98 2 5.02-5.4a1 1 0 0 1 1.48 1.35Z"
    />
  ),
};

export function Icon({
  name,
  size = 20,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  const filled = FILLED[name];

  return (
    <svg
      className={className ? `icon ${className}` : 'icon'}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      {...(filled
        ? { fill: 'currentColor' }
        : {
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: 1.75,
            strokeLinecap: 'round' as const,
            strokeLinejoin: 'round' as const,
          })}
    >
      {filled ?? STROKE[name]}
    </svg>
  );
}
