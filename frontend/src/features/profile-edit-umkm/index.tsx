import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { COOPERATION_LABEL, endpoints, type Sector } from '../../lib/api';
import { useDraft } from '../../lib/useDraft';
import { Stepper } from '../../components/ui/Stepper';
import { Step1DataDasar } from './Step1DataDasar';
import { Step2KebutuhanDana } from './Step2KebutuhanDana';
import { Step3JenisKerjaSama } from './Step3JenisKerjaSama';
import { Step4Portofolio } from './Step4Portofolio';
import { AutoSaveIndicator } from './AutoSaveIndicator';
import { INITIAL, STEPS, validateStep, type UmkmDraft } from './schema';

const TOTAL = STEPS.length;

/**
 * Wizard edit profil usaha — port 1:1 dari Mockup/a3-a7 (a5+a6 satu langkah).
 * Class, copy, ikon Material Symbols dipertahankan verbatim; tiap langkah
 * memakai header progres + pill navigasi + ringkasan Ubah dari mockupnya.
 * Logic dipertahankan: useDraft('profile:umkm'), validateStep, STEPS,
 * submit updateMe/saveBusiness/createFunding, Stepper (sr-only, aksesibilitas),
 * AutoSaveIndicator, navigasi antar-step. Render di dalam Layout (/app/*),
 * tombol aksi in-flow (bukan fixed) agar tidak menimpa BottomNav.
 */
const STEP_META = [
  {
    step: 'Langkah 1 dari 4 — Data Dasar',
    pct: 25,
    pctLabel: '25% Lengkap',
    icon: 'check_circle',
  },
  {
    step: 'Langkah 2 dari 4 — Target Permodalan',
    pct: 50,
    pctLabel: '50% Selesai',
    icon: 'tune',
  },
  {
    step: 'Langkah 3 dari 4 — Jenis Kerja Sama',
    pct: 75,
    pctLabel: '75% Siap Kirim',
    icon: 'check_circle',
  },
  {
    step: 'Langkah 4 dari 4 — Berkas & Portofolio',
    pct: 100,
    pctLabel: '100% Siap Kirim',
    icon: 'task_alt',
  },
] as const;

function ageShort(raw: string): string {
  const n = Number(raw);
  if (!raw || Number.isNaN(n)) return '';
  const diff = new Date().getFullYear() - n;
  if (diff < 1) return '<1 Thn';
  if (diff <= 3) return '1–3 Thn';
  if (diff <= 5) return '3–5 Thn';
  return '>5 Thn';
}

export function ProfileEditUmkmPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const draft = useDraft<UmkmDraft>('profile:umkm', INITIAL, TOTAL);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { data: sectors } = useQuery({ queryKey: ['sectors'], queryFn: endpoints.sectors });

  const meta = STEP_META[draft.step - 1]!;
  const v = draft.values;
  const sectorName = (sectors as Sector[] | undefined)?.find((s) => s.id === v.sectorId)?.name ?? '';
  const targetNum = Number(v.targetAmount);
  const targetLabel = v.targetAmount && Number.isFinite(targetNum) && targetNum > 0
    ? `Rp ${targetNum.toLocaleString('id-ID')}`
    : '';
  const schemeLabels = v.cooperationTypes.map((t) => COOPERATION_LABEL[t]);

  const submit = useMutation({
    mutationFn: async () => {
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

  const goDraft = () => navigate('/app/profile');

  return (
    <div className="flex flex-col w-full space-y-space-md px-gutter-mobile pt-4 pb-6 max-w-md mx-auto">
      {/* Progress header + step pills mengikuti mockup tiap langkah */}
      {draft.step === 1 && (
        <>
          <div className="w-full bg-surface-container-low rounded-xl p-space-md shadow-sm flex flex-col gap-space-xs">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">
                {meta.step}
              </span>
              <span className="inline-flex items-center gap-1 font-label-md text-label-md text-primary font-bold bg-secondary-container/60 px-2.5 py-0.5 rounded-full text-on-secondary-container">
                <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>
                {meta.pctLabel}
              </span>
            </div>
            <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden mt-1">
              <div className="h-full bg-secondary rounded-full transition-all duration-500" style={{ width: `${meta.pct}%` }}></div>
            </div>
          </div>
          <div className="flex items-center gap-space-xs overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
            <div className="shrink-0 flex items-center gap-1.5 px-space-md py-2 rounded-full bg-primary-container text-on-primary shadow-sm">
              <span className="material-symbols-outlined text-[16px]">storefront</span>
              <span className="font-label-md text-label-md font-bold whitespace-nowrap">1. Data Dasar</span>
            </div>
            <div className="shrink-0 flex items-center gap-1.5 px-space-md py-2 rounded-full bg-surface-container text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px]">monetization_on</span>
              <span className="font-label-md text-label-md whitespace-nowrap">2. Dana</span>
            </div>
            <div className="shrink-0 flex items-center gap-1.5 px-space-md py-2 rounded-full bg-surface-container text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px]">handshake</span>
              <span className="font-label-md text-label-md whitespace-nowrap">3. Kerja Sama</span>
            </div>
            <div className="shrink-0 flex items-center gap-1.5 px-space-md py-2 rounded-full bg-surface-container text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px]">folder_shared</span>
              <span className="font-label-md text-label-md whitespace-nowrap">4. Berkas</span>
            </div>
          </div>
          <div className="w-full bg-secondary-container/30 rounded-xl p-space-md flex items-start gap-space-sm shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-secondary/15 flex items-center justify-center shrink-0 text-secondary">
              <span className="material-symbols-outlined text-[24px]">storefront</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <h2 className="font-title-md text-title-md text-on-surface">Informasi Pokok Usaha</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-snug">
                Isi detail identitas bisnis Anda agar calon investor memahami bidang dan legalitas operasional
                usaha.
              </p>
            </div>
          </div>
        </>
      )}

      {draft.step === 2 && (
        <section className="flex flex-col gap-space-xs">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm">
              <span className="material-symbols-outlined text-[14px]">tune</span>
              <span>{meta.step}</span>
            </div>
            <span className="font-label-md text-label-md text-secondary font-bold">{meta.pctLabel}</span>
          </div>
          <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden flex">
            <div className="h-full bg-secondary w-1/2 rounded-full transition-all duration-500"></div>
          </div>
          <div className="flex items-center gap-space-xs overflow-x-auto no-scrollbar pt-1">
            <button
              className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-high text-secondary font-label-sm text-label-sm font-semibold"
              type="button"
              onClick={() => draft.setStep(1)}
            >
              <span className="material-symbols-outlined text-[14px]">check_circle</span>
              <span>1. Data Dasar</span>
            </button>
            <div className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary-fixed"></span>
              <span>2. Dana</span>
            </div>
            <div className="shrink-0 px-3 py-1.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
              3. Kerja Sama
            </div>
            <div className="shrink-0 px-3 py-1.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
              4. Berkas
            </div>
          </div>
        </section>
      )}

      {draft.step === 3 && (
        <section className="w-full bg-surface-container-lowest p-space-md rounded-2xl shadow-sm">
          <div className="flex items-center justify-between gap-space-xs mb-space-sm">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold">
              <span className="material-symbols-outlined text-[15px]">check_circle</span>
              <span>{meta.step}</span>
            </div>
            <span className="font-label-md text-label-md text-secondary font-bold text-right leading-tight">
              {meta.pctLabel}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden flex mb-space-sm">
            <div className="h-full rounded-full bg-secondary w-3/4 transition-all duration-500"></div>
          </div>
          <div className="flex items-center gap-space-xs overflow-x-auto no-scrollbar pt-1">
            <button
              className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-high text-secondary font-label-sm text-label-sm font-semibold"
              type="button"
              onClick={() => draft.setStep(1)}
            >
              <span className="material-symbols-outlined text-[14px]">check_circle</span>
              <span>1. Data Dasar</span>
            </button>
            <button
              className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-high text-secondary font-label-sm text-label-sm font-semibold"
              type="button"
              onClick={() => draft.setStep(2)}
            >
              <span className="material-symbols-outlined text-[14px]">check_circle</span>
              <span>2. Dana</span>
            </button>
            <div className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm font-semibold shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary-fixed"></span>
              <span>3. Kerja Sama</span>
            </div>
            <div className="shrink-0 px-3 py-1.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
              4. Portofolio
            </div>
          </div>
        </section>
      )}

      {draft.step === 4 && (
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm space-y-space-xs">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm">
              <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                task_alt
              </span>
              {meta.step}
            </span>
            <span className="font-label-md text-label-md text-secondary font-bold">{meta.pctLabel}</span>
          </div>
          <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
            <div className="bg-secondary h-full rounded-full transition-all duration-700 w-full"></div>
          </div>
          <div className="flex items-center gap-space-xs overflow-x-auto no-scrollbar pt-1">
            <button
              className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container text-secondary font-label-sm text-label-sm"
              type="button"
              onClick={() => draft.setStep(1)}
            >
              <span className="material-symbols-outlined text-[14px]">check_circle</span>
              <span>1. Data Dasar</span>
            </button>
            <button
              className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container text-secondary font-label-sm text-label-sm"
              type="button"
              onClick={() => draft.setStep(2)}
            >
              <span className="material-symbols-outlined text-[14px]">check_circle</span>
              <span>2. Dana</span>
            </button>
            <button
              className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container text-secondary font-label-sm text-label-sm"
              type="button"
              onClick={() => draft.setStep(3)}
            >
              <span className="material-symbols-outlined text-[14px]">check_circle</span>
              <span>3. Kerja Sama</span>
            </button>
            <div className="shrink-0 flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm shadow-sm">
              <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                folder_open
              </span>
              <span>4. Portofolio</span>
            </div>
          </div>
        </div>
      )}

      {/* Stepper dipertahankan sebagai penanda aksesibilitas (tak terlihat, tetap terbaca pembaca layar). */}
      <div className="sr-only">
        <Stepper steps={[...STEPS]} current={draft.step} />
      </div>

      {submitError && (
        <div
          className="px-3.5 py-3 rounded-xl bg-error-container border border-error/30 text-[13px] font-semibold text-on-error-container"
          role="alert"
        >
          {submitError}
        </div>
      )}

      {/* Ringkasan langkah selesai mengikuti mockup tiap langkah */}
      {draft.step === 2 && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-container-low shadow-sm">
          <div className="flex items-center gap-space-xs min-w-0">
            <div className="w-8 h-8 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[18px]">storefront</span>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-label-sm text-label-sm text-secondary font-semibold">Langkah 1 Terverifikasi</span>
                <span className="material-symbols-outlined text-secondary text-[12px]">verified</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface truncate">
                {v.businessName || 'Usaha Anda'}
                {sectorName ? ` • ${sectorName}` : ''}
              </p>
            </div>
          </div>
          <button
            className="shrink-0 ml-2 px-2.5 py-1 rounded-lg text-secondary font-label-md text-label-md hover:bg-surface-container active:scale-95 transition-all"
            type="button"
            onClick={() => draft.setStep(1)}
          >
            Ubah
          </button>
        </div>
      )}

      {draft.step === 3 && (
        <section className="flex flex-col gap-space-xs">
          <div className="w-full p-space-sm rounded-xl bg-surface-container-lowest shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-space-xs min-w-0">
              <span className="material-symbols-outlined text-secondary text-[20px] shrink-0">check</span>
              <div className="min-w-0">
                <p className="font-label-sm text-label-sm text-on-surface-variant">Langkah 1 Selesai</p>
                <p className="font-body-sm text-body-sm text-on-surface truncate">
                  {v.businessName || 'Usaha Anda'}
                  {sectorName ? ` • ${sectorName}` : ''}
                  {ageShort(v.establishedYear) ? ` • ${ageShort(v.establishedYear)}` : ''}
                </p>
              </div>
            </div>
            <button
              className="font-label-md text-label-md text-secondary shrink-0 ml-2 px-2 py-1 rounded hover:bg-surface-container"
              type="button"
              onClick={() => draft.setStep(1)}
            >
              Ubah
            </button>
          </div>
          <div className="w-full p-space-sm rounded-xl bg-surface-container-lowest shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-space-xs min-w-0">
              <span className="material-symbols-outlined text-secondary text-[20px] shrink-0">check</span>
              <div className="min-w-0">
                <p className="font-label-sm text-label-sm text-on-surface-variant">Langkah 2 Selesai</p>
                <p className="font-body-sm text-body-sm text-on-surface truncate">
                  {targetLabel || 'Target dana'}
                  {v.tenorMonths ? ` • ${v.tenorMonths} Bln` : ''}
                </p>
              </div>
            </div>
            <button
              className="font-label-md text-label-md text-secondary shrink-0 ml-2 px-2 py-1 rounded hover:bg-surface-container"
              type="button"
              onClick={() => draft.setStep(2)}
            >
              Ubah
            </button>
          </div>
        </section>
      )}

      {draft.step === 4 && (
        <div className="bg-surface-container-low rounded-xl p-space-sm space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
              Ringkasan Validasi Profil
            </span>
            <span className="text-secondary font-label-sm text-label-sm font-semibold flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[14px]">verified</span> Terisi Lengkap
            </span>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            <div className="flex items-center justify-between bg-surface-container-lowest px-3 py-2 rounded-lg">
              <div className="flex items-center gap-2 min-w-0">
                <span className="material-symbols-outlined text-secondary text-[16px]">check</span>
                <span className="font-body-sm text-body-sm text-on-surface truncate">
                  Langkah 1: {v.businessName || 'Nama usaha'}
                </span>
              </div>
              <span className="shrink-0 font-label-sm text-label-sm text-on-surface-variant bg-surface-container px-2 py-0.5 rounded">
                {sectorName || 'Sektor'}
              </span>
            </div>
            <div className="flex items-center justify-between bg-surface-container-lowest px-3 py-2 rounded-lg">
              <div className="flex items-center gap-2 min-w-0">
                <span className="material-symbols-outlined text-secondary text-[16px]">check</span>
                <span className="font-body-sm text-body-sm text-on-surface truncate">
                  Langkah 2: Target {targetLabel || '-'}
                </span>
              </div>
              <span className="shrink-0 font-label-sm text-label-sm text-on-surface-variant bg-surface-container px-2 py-0.5 rounded">
                {v.tenorMonths ? `${v.tenorMonths} Bln` : 'Tenor'}
              </span>
            </div>
            <div className="flex items-center justify-between bg-surface-container-lowest px-3 py-2 rounded-lg">
              <div className="flex items-center gap-2 min-w-0">
                <span className="material-symbols-outlined text-secondary text-[16px]">check</span>
                <span className="font-body-sm text-body-sm text-on-surface truncate">
                  Langkah 3: {schemeLabels.length > 0 ? schemeLabels.join(', ') : 'Skema kerja sama'}
                </span>
              </div>
              <span className="shrink-0 font-label-sm text-label-sm text-on-surface-variant bg-surface-container px-2 py-0.5 rounded">
                {schemeLabels.length > 0 ? `${schemeLabels.length} Skema` : 'Skema'}
              </span>
            </div>
          </div>
        </div>
      )}

      <form
        className="flex flex-col gap-space-md"
        onSubmit={(e) => {
          e.preventDefault();
          goNext();
        }}
      >
        {draft.step === 1 && (
          <Step1DataDasar values={draft.values} set={draft.setValue} errors={errors} onGoPhotos={() => draft.setStep(4)} />
        )}
        {draft.step === 2 && <Step2KebutuhanDana values={draft.values} set={draft.setValue} errors={errors} />}
        {draft.step === 3 && <Step3JenisKerjaSama values={draft.values} set={draft.setValue} errors={errors} />}
        {draft.step === 4 && <Step4Portofolio errors={errors} />}

        {/* Rak aksi bawah mengikuti mockup tiap langkah */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-center">
            <AutoSaveIndicator savedAt={draft.lastSaved} isDirty={draft.isDirty} />
          </div>
          {draft.step === 1 && (
            <div className="flex items-center gap-space-sm w-full">
              <button
                className="h-12 px-space-md rounded-xl bg-surface-container text-on-surface font-label-lg text-label-lg hover:bg-surface-container-high active:scale-95 transition-all flex items-center justify-center gap-1 shrink-0"
                type="button"
                onClick={goDraft}
              >
                <span className="material-symbols-outlined text-[18px]">bookmark_border</span>
                <span>Simpan Draf</span>
              </button>
              <button
                className="flex-1 h-12 rounded-xl bg-primary-container text-on-primary font-label-lg text-label-lg hover:bg-secondary active:scale-95 transition-all flex items-center justify-center gap-2 shadow-md"
                type="submit"
                disabled={submit.isPending}
              >
                <span>Lanjut ke Kebutuhan Dana</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          )}
          {draft.step === 2 && (
            <div className="flex items-center gap-space-sm w-full">
              <button
                className="flex-1 h-12 rounded-xl bg-surface-container text-on-surface font-label-lg text-label-lg hover:bg-surface-container-high active:scale-95 transition-all flex items-center justify-center"
                type="button"
                onClick={goDraft}
              >
                Simpan Draf
              </button>
              <button
                className="flex-1 h-12 rounded-xl bg-primary-container text-on-primary font-label-lg text-label-lg hover:bg-secondary active:scale-95 transition-all flex items-center justify-center"
                type="submit"
                disabled={submit.isPending}
              >
                Lanjutkan
              </button>
            </div>
          )}
          {draft.step === 3 && (
            <div className="flex items-center gap-space-xs">
              <button
                className="h-[50px] px-4 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md font-semibold flex items-center justify-center gap-1 hover:bg-surface-container-highest shrink-0 transition-colors"
                type="button"
                onClick={goBack}
                disabled={submit.isPending}
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Kebutuhan Dana
              </button>
              <button
                className="flex-1 h-[50px] rounded-xl bg-primary-container text-on-primary font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 shadow-md hover:bg-secondary transition-all active:scale-[0.98]"
                type="submit"
                disabled={submit.isPending}
              >
                <span>Lanjut ke Portofolio</span>
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </button>
            </div>
          )}
          {draft.step === 4 && (
            <>
              <button
                className="w-full h-13 py-3 rounded-xl bg-primary-container text-on-primary font-label-lg text-label-lg shadow-md hover:bg-secondary active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                type="submit"
                disabled={submit.isPending}
              >
                <span>{submit.isPending ? 'Menyimpan…' : 'Publikasikan Profil Bisnis'}</span>
                <span className="material-symbols-outlined text-[20px]">check_circle</span>
              </button>
              <button
                className="w-full h-11 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-all flex items-center justify-center"
                type="button"
                onClick={goDraft}
                disabled={submit.isPending}
              >
                Simpan Sebagai Draf Rahasia
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
