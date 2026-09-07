import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { endpoints } from '../../lib/api';
import { useDraft } from '../../lib/useDraft';
import { Stepper } from '../../components/ui/Stepper';
import { Notice } from '../../components/ui';
import { Step1DataPemodal } from './Step1DataPemodal';
import { Step2PreferensiModal } from './Step2PreferensiModal';
import { Step3SkemaKemitraan } from './Step3SkemaKemitraan';
import { AutoSaveIndicator } from '../profile-edit-umkm/AutoSaveIndicator';
import { INITIAL, STEPS, TOTAL, validateStep, type InvestorDraft } from './schema';

/** Wizard edit profil investor (mockup b3-b5) — 3 langkah, auto-save ke localStorage. */
export function InvestorEditPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const draft = useDraft<InvestorDraft>('profile:investor', INITIAL, TOTAL);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: async () => {
      await endpoints.updateMe({
        fullName: draft.values.fullName || undefined,
        bio: draft.values.bio || undefined,
        location: draft.values.preferredLocation || undefined,
      });
      await endpoints.savePreference({
        minimumAmount: Number(draft.values.minimumAmount),
        maximumAmount: Number(draft.values.maximumAmount),
        preferredLocation: draft.values.preferredLocation || null,
        preferredSectorId: draft.values.preferredSectorId || null,
        cooperationTypes: draft.values.cooperationTypes,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      qc.invalidateQueries({ queryKey: ['matches'] });
      draft.reset();
      navigate('/app/rekam-jejak', { state: { notice: 'Preferensi modal berhasil disimpan.' } });
    },
    onError: (e: Error) => setSubmitError(e.message),
  });

  const goNext = () => {
    const errs = validateStep(draft.step, draft.values);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    if (draft.step === TOTAL) submit.mutate();
    else draft.setStep(draft.step + 1);
  };

  const goBack = () => {
    setErrors({});
    draft.setStep(draft.step - 1);
  };

  return (
    <div className="shell page-bottom">
      <header className="wizard-head">
        <h1>Edit preferensi modal</h1>
        <AutoSaveIndicator savedAt={draft.lastSaved} isDirty={draft.isDirty} />
      </header>

      <Stepper steps={[...STEPS]} current={draft.step} />

      {submitError && (
        <div style={{ marginTop: 16 }}>
          <Notice tone="error">{submitError}</Notice>
        </div>
      )}

      <form
        className="wizard-body"
        onSubmit={(e) => {
          e.preventDefault();
          goNext();
        }}
      >
        {draft.step === 1 && <Step1DataPemodal values={draft.values} set={draft.setValue} errors={errors} />}
        {draft.step === 2 && <Step2PreferensiModal values={draft.values} set={draft.setValue} errors={errors} />}
        {draft.step === 3 && <Step3SkemaKemitraan values={draft.values} set={draft.setValue} errors={errors} />}

        <div className="wizard-actions">
          {draft.step > 1 ? (
            <button type="button" className="btn btn-soft" onClick={goBack} disabled={submit.isPending}>
              Kembali
            </button>
          ) : (
            <button type="button" className="btn btn-soft" onClick={() => navigate('/app/rekam-jejak')}>
              Batal
            </button>
          )}
          <button type="submit" className="btn btn-primary" disabled={submit.isPending}>
            {draft.step === TOTAL
              ? submit.isPending
                ? 'Menyimpan…'
                : 'Selesaikan'
              : 'Lanjut'}
          </button>
        </div>
      </form>
    </div>
  );
}
