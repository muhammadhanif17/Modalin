export function Spinner() {
  return (
    <div className="center-wrap">
      <div className="spinner" role="status" aria-label="Memuat" />
    </div>
  );
}

export function EmptyState({
  icon = '🌱',
  title,
  message,
  action,
}: {
  icon?: string;
  title: string;
  message?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon" aria-hidden="true">{icon}</div>
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
          ✕
        </button>
      )}
    </div>
  );
}

export function Badge({
  tone = 'soft',
  children,
}: {
  tone?: 'soft' | 'primary' | 'accent' | 'warning' | 'success';
  children: React.ReactNode;
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

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
          ★
        </button>
      ))}
    </div>
  );
}
