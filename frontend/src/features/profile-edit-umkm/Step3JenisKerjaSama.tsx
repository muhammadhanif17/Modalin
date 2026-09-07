import { Checkbox } from '../../components/ui/forms';
import { COOPERATION_LABEL, COOPERATION_HELP, type CooperationType } from '../../lib/api';

/** a5 + a6 — Pilihan jenis kerja sama: multi-select checkbox. */
export function Step3JenisKerjaSama({
  values,
  set,
  errors,
}: {
  values: Record<string, unknown>;
  set: <K extends string>(k: K, v: unknown) => void;
  errors: Record<string, string>;
}) {
  const selected = (values.cooperationTypes as CooperationType[]) ?? [];

  const toggle = (type: CooperationType) => {
    if (selected.includes(type)) {
      set('cooperationTypes', selected.filter((t) => t !== type));
    } else {
      set('cooperationTypes', [...selected, type]);
    }
  };

  return (
    <>
      <p className="step-intro">
        Pilih jenis kerja sama yang kamu buka. Investor akan menyesuaikan dengan apa yang mereka tawarkan.
      </p>
      {(errors.cooperationTypes as string | undefined) && (
        <p className="error-text" role="alert">{errors.cooperationTypes}</p>
      )}
      <div className="coop-options">
        {(['BAGI_HASIL', 'PENYERTAAN_MODAL', 'PINJAMAN'] as CooperationType[]).map((type) => (
          <Checkbox
            key={type}
            label={
              <span>
                <strong>{COOPERATION_LABEL[type]}</strong>
                <br />
                <small>{COOPERATION_HELP[type]}</small>
              </span>
            }
            checked={selected.includes(type)}
            onChange={() => toggle(type)}
          />
        ))}
      </div>
    </>
  );
}
