import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { endpoints } from '../../lib/api';
import { useDraft } from '../../lib/useDraft';
import { Stepper } from '../../components/ui/Stepper';
import { Notice } from '../../components/ui';
import { Step1DataDasar } from './Step1DataDasar';
import { Step2KebutuhanDana } from './Step2KebutuhanDana';
import { Step3JenisKerjaSama } from './Step3JenisKerjaSama';
import { Step4Portofolio } from './Step4Portofolio';
import { AutoSaveIndicator } from './AutoSaveIndicator';
import { INITIAL, STEPS, validateStep, type UmkmDraft } from './schema';

const TOTAL = STEPS.length;

/** Wizard edit profil usaha (mockup a3-a7) — 4 langkah, auto-save ke localStorage. */
export function ProfileEditUmkmPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const draft = useDraft<UmkmDraft>('profile:umkm', INITIAL, TOTAL);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: async () => {
      // Step 1: profil dasar + business.
      await endpoints.updateMe({
        fullName: undefined,
        phone: undefined,
        bio: draft.values.description || undefined,
        location: draft.values.location || undefined,
      });
      await endpoints.saveBusiness({
        name: draft.values.businessName,
        sectorId: draft.values.sectorId,
        establishedYear: draft.values.establishedYear ? Number(draft.values.establishedYear) : null,
        description: draft.values.description,
        location: draft.values.location,
      });
      // Step 2-3: funding request (bisa diupdate, buat baru jika belum ada).
      await endpoints.createFunding({
        targetAmount: Number(draft.values.targetAmount),
        tenorMonths: Number(draft.values.tenorMonths),
        estimatedRoi: draft.values.estimatedRoi ? Number(draft.values.estimatedRoi) : null,
        cooperationTypes: draft.values.cooperationTypes,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      qc.invalidateQueries({ queryKey: ['matches'] });
      draft.reset();
      navigate('/app/profile', { state: { notice: 'Profil usaha berhasil disimpan.' } });
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
    if (draft.step === TOTAL) {
      submit.mutate();
    } else {
      draft.setStep(draft.step + 1);
    }
  };

  const goBack = () => {
    setErrors({});
    draft.setStep(draft.step - 1);
  };

  return (
    <div className="shell page-bottom">
      <header className="wizard-head">
        <h1>Edit profil usaha</h1>
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
        {draft.step === 1 && <Step1DataDasar values={draft.values} set={draft.setValue} errors={errors} />}
        {draft.step === 2 && <Step2KebutuhanDana values={draft.values} set={draft.setValue} errors={errors} />}
        {draft.step === 3 && <Step3JenisKerjaSama values={draft.values} set={draft.setValue} errors={errors} />}
        {draft.step === 4 && <Step4Portofolio errors={errors} />}

        <div className="wizard-actions">
          {draft.step > 1 ? (
            <button type="button" className="btn btn-soft" onClick={goBack} disabled={submit.isPending}>
              Kembali
            </button>
          ) : (
            <button type="button" className="btn btn-soft" onClick={() => navigate('/app/profile')}>
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
