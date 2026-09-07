/** Skema nilai awal + aturan ringan per langkah (Zod-like inline). */

import type { CooperationType } from '../../lib/api';

export type UmkmDraft = {
  businessName: string;
  sectorId: string;
  establishedYear: string;
  description: string;
  targetAmount: string;
  tenorMonths: string;
  location: string;
  estimatedRoi: string;
  cooperationTypes: CooperationType[];
  portfolioValid: boolean;
};

export const INITIAL: UmkmDraft = {
  businessName: '',
  sectorId: '',
  establishedYear: '',
  description: '',
  targetAmount: '',
  tenorMonths: '',
  location: '',
  estimatedRoi: '',
  cooperationTypes: [],
  portfolioValid: false,
};

export const STEPS = [
  { label: 'Data dasar', description: 'Nama, sektor, deskripsi' },
  { label: 'Kebutuhan dana', description: 'Jumlah, tenor, lokasi' },
  { label: 'Jenis kerja sama', description: 'Pilih yang kamu buka' },
  { label: 'Portofolio', description: 'Unggah berkas pendukung' },
] as const;

type StepErrors = Partial<Record<keyof UmkmDraft, string>>;

export function validateStep(step: number, values: UmkmDraft): StepErrors {
  const errors: StepErrors = {};
  if (step === 1) {
    if (!values.businessName.trim()) errors.businessName = 'Nama usaha wajib diisi.';
    if (!values.sectorId) errors.sectorId = 'Pilih sektor usaha.';
    if (values.description.length > 280) errors.description = 'Maks 280 karakter.';
  }
  if (step === 2) {
    if (!values.targetAmount || Number(values.targetAmount) <= 0)
      errors.targetAmount = 'Masukkan jumlah dana yang valid.';
    if (!values.tenorMonths) errors.tenorMonths = 'Pilih tenor.';
    if (!values.location.trim()) errors.location = 'Lokasi wajib diisi.';
  }
  if (step === 3) {
    if (values.cooperationTypes.length === 0)
      errors.cooperationTypes = 'Pilih minimal satu jenis kerja sama.';
  }
  return errors;
}
