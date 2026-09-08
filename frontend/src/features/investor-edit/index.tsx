import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { endpoints, type Sector } from '../../lib/api';
import { useDraft } from '../../lib/useDraft';
import { Stepper } from '../../components/ui/Stepper';
import { Step1DataPemodal } from './Step1DataPemodal';
import { Step2PreferensiModal, TICKET_OPTIONS } from './Step2PreferensiModal';
import { Step3SkemaKemitraan } from './Step3SkemaKemitraan';
import { AutoSaveIndicator } from '../profile-edit-umkm/AutoSaveIndicator';
import { INITIAL, STEPS, TOTAL, validateStep, type InvestorDraft } from './schema';

/**
 * Wizard edit profil investor — port 1:1 dari Mockup/b3-b5.
 * Class, copy, ikon Material Symbols dipertahankan verbatim; tiap langkah
 * memakai header progres + pill navigasi + ringkasan Ubah dari mockupnya.
 * Logic dipertahankan: useDraft('profile:investor'), validateStep, STEPS,
 * submit updateMe/savePreference, Stepper (sr-only, aksesibilitas),
 * AutoSaveIndicator, navigasi antar-step. Render di dalam Layout (/app/*),
 * tombol aksi in-flow (bukan fixed) agar tidak menimpa BottomNav.
 * Kontrak sukses tidak berubah: ke /app/rekam-jejak dengan notice
 * (dibaca Portfolio.tsx dari location.state).
 */
const STEP_META = [
  {
    step: 'Langkah 1 dari 3 — Profil Pemodal',
    pct: 35,
    pctLabel: '35% Lengkap',
    icon: 'check_circle',
  },
  {
    step: 'Langkah 2 dari 3 — Preferensi Modal',
    pct: 70,
    pctLabel: '70% Selesai',
    icon: 'tune',
  },
  {
    step: 'Langkah 3 dari 3 — Model Kemitraan',
    pct: 90,
    pctLabel: '90% Siap Kirim',
    icon: 'check_circle',
  },
] as const;

function fmtRp(raw: string): string {
  const d = String(raw ?? '').replace(/[^0-9]/g, '');
  if (!d) return '';
  return `Rp ${Number(d).toLocaleString('id-ID')}`;
}

function ticketLabel(min: string, max: string): string {
  const a = String(min ?? '').replace(/[^0-9]/g, '');
  const b = String(max ?? '').replace(/[^0-9]/g, '');
  if (!a || !b) return '';
  const opt = TICKET_OPTIONS.find((o) => o.min === a && o.max === b);
  if (opt) return opt.short;
  if (a === b) return `Tiket ${fmtRp(b)}`;
  return `Tiket ${fmtRp(a)} - ${fmtRp(b)}`;
}

const PILLS = [
  { icon: 'person', label: '1. Data Investor' },
  { icon: 'pie_chart', label: '2. Preferensi Modal' },
  { icon: 'account_balance', label: '3. Skema Kemitraan' },
] as const;

export function InvestorEditPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const draft = useDraft<InvestorDraft>('profile:investor', INITIAL, TOTAL);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { data: sectors } = useQuery({ queryKey: ['sectors'], queryFn: endpoints.sectors });

  const meta = STEP_META[draft.step - 1]!;
  const v = draft.values;
  const sectorName =
    (sectors as Sector[] | undefined)?.find((s) => s.id === v.preferredSectorId)?.name ?? '';
  const maxLabel = fmtRp(v.maximumAmount);
  const ticket = ticketLabel(v.minimumAmount, v.maximumAmount);

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

  const goDraft = () => navigate('/app/rekam-jejak');

  const pillRow = (active: number) => (
    <div className="flex items-center gap-space-xs overflow-x-auto no-scrollbar pt-1">
      {PILLS.map((p, i) => {
        const n = i + 1;
        if (n === active) {
          return (
            <div
              key={p.label}
              className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm font-semibold shadow-sm"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-secondary-fixed"></span>
              <span>{p.label}</span>
            </div>
          );
        }
        if (n < active) {
          return (
            <button
              key={p.label}
              className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-high text-secondary font-label-sm text-label-sm font-semibold"
              type="button"
              onClick={() => draft.setStep(n)}
            >
              <span className="material-symbols-outlined text-[14px]">check_circle</span>
              <span>{p.label}</span>
            </button>
          );
        }
        return (
          <div
            key={p.label}
            className="shrink-0 px-3 py-1.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm"
          >
            {p.label}
          </div>
        );
      })}
    </div>
  );

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
              <span className="material-symbols-outlined text-[16px]">person</span>
              <span className="font-label-md text-label-md font-bold whitespace-nowrap">1. Data Investor</span>
            </div>
            <div className="shrink-0 flex items-center gap-1.5 px-space-md py-2 rounded-full bg-surface-container text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px]">pie_chart</span>
              <span className="font-label-md text-label-md whitespace-nowrap">2. Preferensi Modal</span>
            </div>
            <div className="shrink-0 flex items-center gap-1.5 px-space-md py-2 rounded-full bg-surface-container text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px]">account_balance</span>
              <span className="font-label-md text-label-md whitespace-nowrap">3. Skema Kemitraan</span>
            </div>
          </div>
          <div className="w-full bg-secondary-container/30 rounded-xl p-space-md flex items-start gap-space-sm shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-secondary/15 flex items-center justify-center shrink-0 text-secondary">
              <span className="material-symbols-outlined text-[24px]">work</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <h2 className="font-title-md text-title-md text-on-surface">Informasi Dasar Pemodal</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-snug">
                Lengkapi identitas dan kriteria investasi Anda agar algoritma matchmaking Modalin
                merekomendasikan UMKM yang paling sesuai.
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
            <div className="h-full bg-secondary rounded-full transition-all duration-500" style={{ width: `${meta.pct}%` }}></div>
          </div>
          {pillRow(2)}
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
            <div className="h-full rounded-full bg-secondary transition-all duration-500" style={{ width: `${meta.pct}%` }}></div>
          </div>
          {pillRow(3)}
        </section>
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
              <span className="material-symbols-outlined text-[18px]">verified_user</span>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-label-sm text-label-sm text-secondary font-semibold">Langkah 1 Terverifikasi</span>
                <span className="material-symbols-outlined text-secondary text-[12px]">verified</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface truncate">
                {v.fullName || 'Nama belum diisi'} • Investor Individu / Angel
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
              <span className="material-symbols-outlined text-secondary text-[20px] shrink-0">check_circle</span>
              <div className="min-w-0">
                <p className="font-label-sm text-label-sm text-on-surface-variant">Langkah 1 Selesai</p>
                <p className="font-body-sm text-body-sm text-on-surface truncate font-semibold">
                  {v.fullName || 'Nama belum diisi'} • Angel Investor
                </p>
              </div>
            </div>
            <button
              className="font-label-md text-label-md text-secondary shrink-0 ml-2 px-2 py-1 rounded hover:bg-surface-container font-semibold"
              type="button"
              onClick={() => draft.setStep(1)}
            >
              Ubah
            </button>
          </div>
          <div className="w-full p-space-sm rounded-xl bg-surface-container-lowest shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-space-xs min-w-0">
              <span className="material-symbols-outlined text-secondary text-[20px] shrink-0">check_circle</span>
              <div className="min-w-0">
                <p className="font-label-sm text-label-sm text-on-surface-variant">Langkah 2 Selesai</p>
                <p className="font-body-sm text-body-sm text-on-surface truncate font-semibold">
                  {maxLabel ? `Alokasi ${maxLabel}` : 'Alokasi belum diisi'}
                  {ticket ? ` • ${ticket}` : ''}
                </p>
              </div>
            </div>
            <button
              className="font-label-md text-label-md text-secondary shrink-0 ml-2 px-2 py-1 rounded hover:bg-surface-container font-semibold"
              type="button"
              onClick={() => draft.setStep(2)}
            >
              Ubah
            </button>
          </div>
        </section>
      )}

      <form
        className="flex flex-col gap-space-md"
        onSubmit={(e) => {
          e.preventDefault();
          goNext();
        }}
      >
        {draft.step === 1 && (
          <Step1DataPemodal values={draft.values} set={draft.setValue} errors={errors} />
        )}
        {draft.step === 2 && (
          <Step2PreferensiModal values={draft.values} set={draft.setValue} errors={errors} />
        )}
        {draft.step === 3 && (
          <Step3SkemaKemitraan values={draft.values} set={draft.setValue} errors={errors} />
        )}

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
                <span>Draf</span>
              </button>
              <button
                className="flex-1 h-12 rounded-xl bg-primary-container text-on-primary font-label-lg text-label-lg hover:bg-secondary active:scale-95 transition-all flex items-center justify-center gap-2 shadow-md"
                type="submit"
                disabled={submit.isPending}
              >
                <span>Lanjut ke Preferensi Modal</span>
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
                Lanjut ke Skema Kemitraan
              </button>
            </div>
          )}
          {draft.step === 3 && (
            <div className="flex items-center gap-space-xs">
              <button
                className="h-[50px] px-4 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md font-semibold flex items-center justify-center gap-1.5 hover:bg-surface-container-highest shrink-0 transition-colors"
                type="button"
                onClick={goDraft}
                disabled={submit.isPending}
              >
                <span className="material-symbols-outlined text-[18px]">bookmark_border</span>
                Simpan Draf
              </button>
              <button
                className="flex-1 h-[50px] rounded-xl bg-primary-container text-on-primary font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 shadow-md hover:bg-secondary transition-all active:scale-[0.98] disabled:opacity-60"
                type="submit"
                disabled={submit.isPending}
              >
                <span>{submit.isPending ? 'Menyimpan…' : 'Tinjau & Selesaikan Profil Investor'}</span>
                {!submit.isPending && <span className="material-symbols-outlined text-[20px]">arrow_forward</span>}
              </button>
            </div>
          )}
          {draft.step > 1 && (
            <button
              className="w-full h-11 rounded-xl bg-transparent text-on-surface-variant font-label-md text-label-md hover:bg-surface-container transition-all flex items-center justify-center gap-1"
              type="button"
              onClick={goBack}
              disabled={submit.isPending}
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>Kembali ke langkah sebelumnya</span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
