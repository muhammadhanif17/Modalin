import { TextInput, Select } from '../../components/ui/forms';

/** a4 — Kebutuhan Dana: jumlah, tenor, lokasi, kecamatan. */
export function Step2KebutuhanDana({
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
        label="Jumlah dana yang dibutuhkan"
        required
        inputMode="numeric"
        placeholder="cth. 150000000"
        value={(values.targetAmount as string) ?? ''}
        onChange={(e) => set('targetAmount', e.target.value)}
        error={errors.targetAmount}
        hint="Tulis tanpa titik. Tampil sebagai Rp 150.000.000 di kartu."
      />
      <Select
        label="Tenor yang diharapkan"
        required
        value={(values.tenorMonths as string) ?? ''}
        onChange={(e) => set('tenorMonths', e.target.value)}
        error={errors.tenorMonths}
      >
        <option value="">Pilih tenor…</option>
        <option value="6">6 bulan</option>
        <option value="12">12 bulan</option>
        <option value="24">24 bulan</option>
        <option value="36">36 bulan</option>
        <option value="48">48 bulan</option>
      </Select>
      <TextInput
        label="Kota/kabupaten"
        required
        placeholder="cth. Kota Semarang"
        value={(values.location as string) ?? ''}
        onChange={(e) => set('location', e.target.value)}
        error={errors.location}
      />
      <TextInput
        label="Estimasi imbal hasil (%)"
        type="number"
        inputMode="decimal"
        placeholder="cth. 12"
        value={(values.estimatedRoi as string) ?? ''}
        onChange={(e) => set('estimatedRoi', e.target.value)}
        error={errors.estimatedRoi}
        hint="Hanya untuk Bagi Hasil & Pinjaman. Opsional."
      />
    </>
  );
}
