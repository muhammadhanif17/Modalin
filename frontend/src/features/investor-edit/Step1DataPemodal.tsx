import { TextInput, TextArea } from '../../components/ui/forms';

/** b3 — Data pemodal. */
export function Step1DataPemodal({
  values,
  set,
  errors,
}: {
  values: Record<string, unknown>;
  set: <K extends string>(k: K, v: unknown) => void;
  errors: Record<string, string>;
}) {
  return (
    <>
      <TextInput
        label="Nama lengkap"
        required
        placeholder="cth. Sari Rahmadani"
        value={(values.fullName as string) ?? ''}
        onChange={(e) => set('fullName', e.target.value)}
        error={errors.fullName}
      />
      <TextInput
        label="Pengalaman investasi (tahun)"
        type="number"
        inputMode="numeric"
        min={0}
        placeholder="cth. 5"
        value={(values.experienceYears as string) ?? ''}
        onChange={(e) => set('experienceYears', e.target.value)}
        error={errors.experienceYears}
      />
      <TextArea
        label="Bio singkat"
        rows={4}
        placeholder="Ceritakan fokus investasimu dan mengapa kamu tertarik mendanai UMKM."
        value={(values.bio as string) ?? ''}
        onChange={(e) => set('bio', e.target.value)}
        error={errors.bio}
        hint="Maks 280 karakter. Ditampilkan di kartu eksplorasi UMKM."
      />
    </>
  );
}
