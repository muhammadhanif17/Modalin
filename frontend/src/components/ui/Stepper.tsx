import { Icon } from './Icon';

export type Step = { label: string; description?: string };

/**
 * Stepper sesuai mockup a3-a7, b3-b5: angka dalam lingkaran + label di bawahnya.
 * - Lingkaran aktif: primary, teks putih.
 * - Lingkaran selesai: primary, centang.
 * - Lingkaran belum: surface, teks redup.
 */
export function Stepper({ steps, current }: { steps: Step[]; current: number }) {
  return (
    <ol className="stepper" aria-label="Langkah formulir">
      {steps.map((s, i) => {
        const n = i + 1;
        const status = n < current ? 'done' : n === current ? 'active' : 'upcoming';
        return (
          <li key={n} className={`stepper-item stepper-${status}`} aria-current={status === 'active' ? 'step' : undefined}>
            <div className="stepper-marker" aria-hidden="true">
              {status === 'done' ? <Icon name="check" size={16} /> : n}
            </div>
            <div className="stepper-text">
              <span className="stepper-label">{s.label}</span>
              {s.description && <span className="stepper-desc">{s.description}</span>}
            </div>
            {i < steps.length - 1 && <div className="stepper-line" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}
