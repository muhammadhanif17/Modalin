import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { endpoints, type Sector } from '../../lib/api';
import { TextInput, TextArea, Select } from '../../components/ui/forms';
import { Spinner } from '../../components/ui';

/** a3 — Data Dasar: nama usaha, sektor, deskripsi singkat. */
export function Step1DataDasar({
  values,
  set,
  errors,
}: {
  values: Record<string, unknown>;
  set: <K extends string>(k: K, v: unknown) => void;
  errors: Record<string, string>;
}) {
  const { data: sectors, isLoading } = useQuery({ queryKey: ['sectors'], queryFn: endpoints.sectors });
  const [search, setSearch] = useState('');

  if (isLoading) return <Spinner />;
  const list = (sectors ?? []) as Sector[];

  return (
    <>
      <TextInput
        label="Nama usaha"
        required
        placeholder="cth. Dapur Bunda Catering"
        value={(values.businessName as string) ?? ''}
        onChange={(e) => set('businessName', e.target.value)}
        error={errors.businessName}
      />
      <Select
        label="Sektor usaha"
        required
        value={(values.sectorId as string) ?? ''}
        onChange={(e) => set('sectorId', e.target.value)}
        error={errors.sectorId}
      >
        <option value="">Pilih sektor…</option>
        {list.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </Select>
      <TextInput
        label="Tahun berdiri"
        type="number"
        inputMode="numeric"
        min={1990}
        max={new Date().getFullYear()}
        placeholder="cth. 2019"
        value={(values.establishedYear as string) ?? ''}
        onChange={(e) => set('establishedYear', e.target.value)}
        error={errors.establishedYear}
      />
      <TextArea
        label="Deskripsi singkat"
        rows={4}
        placeholder="Ceritakan apa yang dijual, siapa pelanggan utamamu, dan kenapa usahamu menarik."
        value={(values.description as string) ?? ''}
        onChange={(e) => set('description', e.target.value)}
        error={errors.description}
        hint="Maks 280 karakter. Ditampilkan di kartu eksplorasi."
      />
    </>
  );
}
