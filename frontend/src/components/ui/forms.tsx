import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

type FieldShellProps = {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
};

export function FieldShell({ label, hint, error, required, children }: FieldShellProps) {
  return (
    <div className="field">
      <label>
        {label}
        {required && <span className="required-mark" aria-hidden="true">*</span>}
      </label>
      {children}
      {hint && !error && <small className="hint">{hint}</small>}
      {error && <small className="error-text" role="alert">{error}</small>}
    </div>
  );
}

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
};

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { label, hint, error, required, id, ...rest },
  ref,
) {
  const inputId = id ?? `in-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <FieldShell label={label} hint={hint} error={error} required={required}>
      <input ref={ref} id={inputId} className="input" aria-invalid={!!error} required={required} {...rest} />
    </FieldShell>
  );
});

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: string;
  error?: string;
};

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, hint, error, required, id, rows = 4, ...rest },
  ref,
) {
  const inputId = id ?? `ta-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <FieldShell label={label} hint={hint} error={error} required={required}>
      <textarea ref={ref} id={inputId} className="input" rows={rows} aria-invalid={!!error} required={required} {...rest} />
    </FieldShell>
  );
});

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, required, id, children, ...rest },
  ref,
) {
  const inputId = id ?? `sel-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <FieldShell label={label} hint={hint} error={error} required={required}>
      <select ref={ref} id={inputId} className="input" aria-invalid={!!error} required={required} {...rest}>
        {children}
      </select>
    </FieldShell>
  );
});

export function Checkbox({
  label,
  checked,
  onChange,
  hint,
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="check-row">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="check-label">{label}</span>
        {hint && <small className="hint">{hint}</small>}
      </span>
    </label>
  );
}

export function RadioGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
  name,
}: {
  label: string;
  options: { value: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (v: T) => void;
  name: string;
}) {
  return (
    <fieldset className="radio-group">
      <legend>{label}</legend>
      <div className="radio-options">
        {options.map((opt) => (
          <label key={String(opt.value)} className={`radio-option ${value === opt.value ? 'selected' : ''}`}>
            <input
              type="radio"
              name={name}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
            />
            {opt.icon && <Icon name={opt.icon} size={18} />}
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
