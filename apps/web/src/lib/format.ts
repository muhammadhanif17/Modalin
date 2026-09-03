export function formatRupiah(value: number | string | undefined | null): string {
  const num = Number(value ?? 0);
  if (Number.isNaN(num)) return 'Rp 0';
  return 'Rp ' + new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(num);
}

export function formatTanggal(value: string | Date | undefined | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatWaktu(value: string | Date): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function initials(name: string | undefined | null): string {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

const AVATAR_CLASSES = [
  'avatar-t1',
  'avatar-t2',
  'avatar-t3',
  'avatar-t4',
  'avatar-t5',
  'avatar-t6',
];

export function avatarTone(seed: string | undefined | null): string {
  if (!seed) return AVATAR_CLASSES[0]!;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_CLASSES[hash % AVATAR_CLASSES.length]!;
}

export const SECTORS = [
  'Food & Beverage',
  'Fashion',
  'Agritech',
  'Technology',
  'Kriya & Kerajinan',
  'Lainnya',
];
