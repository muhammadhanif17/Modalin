import type { CooperationType, Sector } from '../../lib/api';

export type InvestorDraft = {
  fullName: string;
  experienceYears: string;
  bio: string;
  minimumAmount: string;
  maximumAmount: string;
  preferredLocation: string;
  preferredSectorId: string;
  cooperationTypes: CooperationType[];
};

export const INITIAL: InvestorDraft = {
  fullName: '',
  experienceYears: '',
  bio: '',
  minimumAmount: '',
  maximumAmount: '',
  preferredLocation: '',
  preferredSectorId: '',
  cooperationTypes: [],
};

export const STEPS = [
  { label: 'Data pemodal', description: 'Nama, pengalaman, bio' },
  { label: 'Preferensi modal', description: 'Rentang dana & lokasi' },
  { label: 'Skema kemitraan', description: 'Jenis kerja sama' },
] as const;

export const TOTAL = STEPS.length;

type StepErrors = Partial<Record<keyof InvestorDraft, string>>;

export function validateStep(step: number, values: InvestorDraft): StepErrors {
  const errors: StepErrors = {};
  if (step === 1) {
    if (!values.fullName.trim()) errors.fullName = 'Nama lengkap wajib diisi.';
    if (values.bio.length > 280) errors.bio = 'Maks 280 karakter.';
  }
  if (step === 2) {
    const min = Number(values.minimumAmount);
    const max = Number(values.maximumAmount);
    if (!min || min <= 0) errors.minimumAmount = 'Masukkan minimum yang valid.';
    if (!max || max <= 0) errors.maximumAmount = 'Masukkan maksimum yang valid.';
    if (min && max && min > max) errors.maximumAmount = 'Maksimum harus lebih besar dari minimum.';
  }
  if (step === 3) {
    if (values.cooperationTypes.length === 0)
      errors.cooperationTypes = 'Pilih minimal satu jenis kerja sama.';
  }
  return errors;
}
