import { useQuery } from '@tanstack/react-query';
import { endpoints, type Sector } from '../../lib/api';
import { TextInput, Select } from '../../components/ui/forms';
import { Spinner } from '../../components/ui';

/** b4 — Preferensi modal: range dana, lokasi, sektor. */
export function Step2PreferensiModal({
  values,
  set,
  errors,
}: {
  values: Record<string, unknown>;
  set: <K extends string>(k: K, v: unknown) => void;
  errors: Record<string, string>;
}) {
  const { data: sectors, isLoading } = useQuery({ queryKey: ['sectors'], queryFn: endpoints.sectors });
  if (isLoading) return <Spinner />;
  const list = (sectors ?? []) as Sector[];

  return (
    <>
      <TextInput
        label="Dana minimum (Rp)"
        required
        inputMode="numeric"
        placeholder="cth. 50000000"
        value={(values.minimumAmount as string) ?? ''}
        onChange={(e) => set('minimumAmount', e.target.value)}
        error={errors.minimumAmount}
      />
      <TextInput
        label="Dana maksimum (Rp)"
        required
        inputMode="numeric"
        placeholder="cth. 500000000"
        value={(values.maximumAmount as string) ?? ''}
        onChange={(e) => set('maximumAmount', e.target.value)}
        error={errors.maximumAmount}
      />
      <TextInput
        label="Lokasi preferensi"
        placeholder="cth. Jawa Tengah (kosongkan untuk semua lokasi)"
        value={(values.preferredLocation as string) ?? ''}
        onChange={(e) => set('preferredLocation', e.target.value)}
        hint="Jika kosong, bobot lokasi tidak dihitung (FR-07)."
      />
      <Select
        label="Sektor preferensi"
        value={(values.preferredSectorId as string) ?? ''}
        onChange={(e) => set('preferredSectorId', e.target.value)}
        hint="Opsional. Jika kosong, semua sektor dipertimbangkan."
      >
        <option value="">Semua sektor</option>
        {list.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </Select>
    </>
  );
}
