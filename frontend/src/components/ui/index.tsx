import { Icon, type IconName } from './Icon';
import type { VerificationStatus } from '../../lib/api';

export function Spinner() {
  return (
    <div className="center-wrap">
      <div className="spinner" role="status" aria-label="Memuat" />
    </div>
  );
}

export function EmptyState({
  icon = 'sprout',
  title,
  message,
  action,
}: {
  icon?: IconName;
  title: string;
  message?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon name={icon} size={30} />
      </div>
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {action && <div style={{ marginTop: 18 }}>{action}</div>}
    </div>
  );
}

export function Notice({
  tone,
  children,
  onClose,
}: {
  tone: 'success' | 'error' | 'info';
  children: React.ReactNode;
  onClose?: () => void;
}) {
  return (
    <div className={`notice notice-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <span>{children}</span>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Tutup">
          <Icon name="close" size={16} />
        </button>
      )}
    </div>
  );
}

export type BadgeTone = 'soft' | 'primary' | 'warning' | 'success' | 'danger';

export function Badge({ tone = 'soft', children }: { tone?: BadgeTone; children: React.ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

/**
 * Satu sumber kebenaran untuk warna status verifikasi, dipakai Beranda, halaman
 * Verifikasi, panel Admin, dan detail mitra.
 *
 * REJECTED wajib merah: sebelumnya dipetakan ke abu-abu di tiga tempat, sehingga
 * akun yang ditolak terlihat netral padahal butuh tindakan. DESIGN.md §9.1 juga
 * melarang warna status bertabrakan dengan warna brand — makanya tidak ada satu
 * pun status yang memakai hijau hutan/pine.
 */
export const VERIFICATION_TONE: Record<VerificationStatus, BadgeTone> = {
  VERIFIED: 'success',
  PENDING: 'warning',
  REJECTED: 'danger',
  UNVERIFIED: 'soft',
};

export function Score({ value, suffix = '%' }: { value: number | string; suffix?: string }) {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  const shown = Number.isFinite(num) ? Math.round(num) : 0;
  return <span className="score">{shown}{suffix}</span>;
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {hint && !error && <small className="hint">{hint}</small>}
      {error && <small className="error-text">{error}</small>}
    </div>
  );
}

export function Stars({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange?: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="stars" role={onChange ? 'radiogroup' : undefined}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          className={n <= value ? 'filled' : ''}
          aria-label={`${n} bintang`}
          onClick={onChange ? () => onChange(n) : undefined}
        >
          {/* Glyph teks terakhir di aplikasi; disamakan dengan ikon lain */}
          <Icon name="star" size={28} />
        </button>
      ))}
    </div>
  );
}
