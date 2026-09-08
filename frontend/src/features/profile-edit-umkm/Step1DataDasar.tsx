import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { endpoints, type Sector } from '../../lib/api';
import { Spinner } from '../../components/ui';

const YEAR_NOW = new Date().getFullYear();
const DESC_MAX = 280;

/** Pilihan "Lama Berjalan Usaha" (a3) dipetakan ke tahun berdiri agar payload API tidak berubah. */
const AGE_OPTIONS = [
  { id: 'lt1', label: '< 1 Tahun', year: YEAR_NOW },
  { id: 'r1-3', label: '1 - 3 Tahun', year: YEAR_NOW - 2 },
  { id: 'r3-5', label: '3 - 5 Tahun', year: YEAR_NOW - 4 },
  { id: 'gt5', label: '> 5 Tahun', year: YEAR_NOW - 7 },
] as const;

function ageIdForYear(raw: unknown): string {
  const n = Number(raw);
  if (!raw || Number.isNaN(n)) return '';
  const diff = YEAR_NOW - n;
  if (diff < 1) return 'lt1';
  if (diff <= 3) return 'r1-3';
  if (diff <= 5) return 'r3-5';
  return 'gt5';
}

/**
 * Port 1:1 dari Mockup/a3. Edit Profil Usaha-Data Dasar.html.
 * Class, copy, ikon Material Symbols dipertahankan verbatim.
 * Field terikat draf: nama usaha, sektor (API), lama usaha (dipetakan ke
 * tahun berdiri), kota (berbagi field location dengan langkah 2), deskripsi.
 * Foto, nama pemilik (read-only dari profil), alamat detail, dan peta adalah
 * placeholder visual — belum ada endpoint-nya.
 */
export function Step1DataDasar({
  values,
  set,
  errors,
  onGoPhotos,
}: {
  values: Record<string, unknown>;
  set: <K extends string>(k: K, v: unknown) => void;
  errors: Record<string, string>;
  onGoPhotos: () => void;
}) {
  const { data: sectors, isLoading } = useQuery({ queryKey: ['sectors'], queryFn: endpoints.sectors });
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: endpoints.me });
  const [address, setAddress] = useState('');
  const cityRef = useRef<HTMLInputElement>(null);

  if (isLoading) return <Spinner />;
  const list = (sectors ?? []) as Sector[];

  const businessName = (values.businessName as string) ?? '';
  const sectorId = (values.sectorId as string) ?? '';
  const establishedYear = (values.establishedYear as string) ?? '';
  const description = (values.description as string) ?? '';
  const location = (values.location as string) ?? '';
  const activeAge = ageIdForYear(establishedYear);
  const initial = (businessName.trim()[0] ?? 'U').toUpperCase();

  return (
    <>
      {/* Brand Visual / Profile Slot */}
      <div className="flex flex-col gap-space-xs bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
        <label className="font-label-lg text-label-lg text-on-surface font-semibold flex items-center justify-between">
          <span>Foto Profil &amp; Logo Usaha</span>
          <span className="font-label-sm text-label-sm text-secondary font-bold">Rasio 1:1 Rekomendasi</span>
        </label>
        <div className="flex items-center gap-space-md mt-1">
          <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-surface-container shrink-0 shadow-inner flex items-center justify-center">
            <span className="font-headline-lg text-headline-lg text-secondary font-extrabold">{initial}</span>
            <div className="absolute bottom-0 inset-x-0 bg-primary-container/80 text-on-primary text-[10px] text-center py-0.5 font-label-sm">
              Aktif
            </div>
          </div>
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-secondary">
              <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                verified
              </span>
              <span className="font-label-sm text-label-sm font-bold uppercase tracking-wide">
                Logo Terverifikasi
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
              {businessName || 'Nama usaha Anda'}
            </p>
            <button
              className="w-fit px-space-sm py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high active:scale-95 text-on-surface font-label-md text-label-md flex items-center gap-1.5 transition-all"
              type="button"
              onClick={onGoPhotos}
            >
              <span className="material-symbols-outlined text-[18px]">photo_camera</span>
              <span>Ubah Foto</span>
            </button>
          </div>
        </div>
      </div>

      {/* Nama Brand / Usaha */}
      <div className="flex flex-col gap-1.5 bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
        <label
          className="font-label-lg text-label-lg text-on-surface font-semibold flex items-center justify-between"
          htmlFor="brand-name"
        >
          <span>Nama Brand / Merek Usaha</span>
          <span className="font-label-sm text-label-sm text-on-surface-variant">Wajib</span>
        </label>
        <div className="relative flex items-center">
          <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant text-[20px]">
            coffee
          </span>
          <input
            className="w-full h-12 bg-surface-container-low rounded-lg pl-10 pr-space-md font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary transition-all"
            id="brand-name"
            placeholder="Misal: Sambal Bu Lurah"
            type="text"
            value={businessName}
            onChange={(e) => set('businessName', e.target.value)}
          />
        </div>
        {errors.businessName ? (
          <span className="font-body-sm text-body-sm text-error" role="alert">
            {errors.businessName}
          </span>
        ) : (
          <span className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">info</span>
            Gunakan nama komersial yang dikenal luas oleh pelanggan setia Anda.
          </span>
        )}
      </div>

      {/* Nama Pemilik / Penanggung Jawab — read-only dari profil, sinkron otomatis */}
      <div className="flex flex-col gap-1.5 bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
        <label
          className="font-label-lg text-label-lg text-on-surface font-semibold flex items-center justify-between"
          htmlFor="owner-name"
        >
          <span>Nama Pemilik / Penanggung Jawab</span>
          <span className="font-label-sm text-label-sm text-on-surface-variant">Sesuai KTP</span>
        </label>
        <div className="relative flex items-center">
          <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant text-[20px]">
            badge
          </span>
          <input
            className="w-full h-12 bg-surface-container-low rounded-lg pl-10 pr-space-md font-body-md text-body-md text-on-surface focus:outline-none transition-all"
            id="owner-name"
            placeholder="Nama Lengkap"
            type="text"
            value={profile?.fullName ?? ''}
            readOnly
          />
        </div>
        <span className="font-body-sm text-body-sm text-secondary flex items-center gap-1 font-medium">
          <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            shield
          </span>
          Telah tersinkronisasi otomatis dengan profil pemrakarsa proposal.
        </span>
      </div>

      {/* Sektor Usaha */}
      <div className="flex flex-col gap-1.5 bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
        <div className="flex items-center justify-between">
          <label className="font-label-lg text-label-lg text-on-surface font-semibold" htmlFor="sector-select">
            Sektor Usaha
          </label>
          <span className="inline-flex items-center gap-1 bg-secondary-container/50 text-on-secondary-container font-label-sm text-label-sm px-2 py-0.5 rounded-full font-bold">
            <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              trending_up
            </span>
            Paling diminati 38% investor bulan ini
          </span>
        </div>
        <div className="relative flex items-center">
          <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant text-[20px]">
            restaurant
          </span>
          <select
            className="w-full h-12 bg-surface-container-low rounded-lg pl-10 pr-10 font-body-md text-body-md text-on-surface appearance-none focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary transition-all"
            id="sector-select"
            value={sectorId}
            onChange={(e) => set('sectorId', e.target.value)}
          >
            <option value="">Pilih sektor usaha…</option>
            {list.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <span className="material-symbols-outlined absolute right-3 text-on-surface-variant text-[20px] pointer-events-none">
            expand_more
          </span>
        </div>
        {errors.sectorId && (
          <span className="font-body-sm text-body-sm text-error" role="alert">
            {errors.sectorId}
          </span>
        )}
      </div>

      {/* Lama Berjalan Usaha */}
      <div className="flex flex-col gap-2 bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
        <label className="font-label-lg text-label-lg text-on-surface font-semibold flex items-center justify-between">
          <span>Lama Berjalan Usaha</span>
          <span className="font-label-sm text-label-sm text-secondary font-bold">Track Record</span>
        </label>
        <div aria-label="Lama Berjalan Usaha" className="grid grid-cols-2 gap-2" role="radiogroup">
          {AGE_OPTIONS.map((opt) => {
            const active = activeAge === opt.id;
            return (
              <button
                key={opt.id}
                className={
                  active
                    ? 'h-11 px-3 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md flex items-center justify-center gap-1.5 shadow-sm'
                    : 'h-11 px-3 rounded-lg bg-surface-container text-on-surface-variant font-label-md text-label-md flex items-center justify-center gap-1.5 transition-all hover:bg-surface-container-high'
                }
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => set('establishedYear', String(opt.year))}
              >
                {active && (
                  <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check
                  </span>
                )}
                <span className={active ? 'font-bold' : ''}>{opt.label}</span>
              </button>
            );
          })}
        </div>
        {errors.establishedYear && (
          <span className="font-body-sm text-body-sm text-error" role="alert">
            {errors.establishedYear}
          </span>
        )}
      </div>

      {/* Lokasi & Alamat Operasional */}
      <div className="flex flex-col gap-space-sm bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
        <div className="flex items-center justify-between">
          <label className="font-label-lg text-label-lg text-on-surface font-semibold">
            Lokasi &amp; Alamat Operasional
          </label>
          <span className="inline-flex items-center gap-1 bg-secondary-container/40 text-secondary font-label-sm text-label-sm px-2 py-0.5 rounded-full font-bold">
            <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              pin_drop
            </span>
            Titik Lokasi Terverifikasi di Peta
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="city-location">
            Kota / Kabupaten
          </label>
          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant text-[20px]">
              location_city
            </span>
            <input
              className="w-full h-12 bg-surface-container-low rounded-lg pl-10 pr-space-md font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary transition-all"
              id="city-location"
              ref={cityRef}
              type="text"
              placeholder="cth. Kota Semarang"
              value={location}
              onChange={(e) => set('location', e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="full-address">
            Alamat Lengkap Usaha
          </label>
          <div className="relative flex items-start">
            <span className="material-symbols-outlined absolute left-3.5 top-3.5 text-on-surface-variant text-[20px]">
              store
            </span>
            <textarea
              className="w-full bg-surface-container-low rounded-lg pl-10 pr-space-md py-3 font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary transition-all resize-none"
              id="full-address"
              rows={2}
              placeholder="Jl. ..., Kecamatan, ..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
        </div>
        <div className="w-full h-28 rounded-lg overflow-hidden relative shadow-inner bg-surface-container flex items-end p-2.5">
          <div className="w-full bg-surface-bright/90 backdrop-blur-md rounded-lg px-2.5 py-1.5 flex items-center justify-between shadow-sm">
            <span className="font-body-sm text-body-sm text-on-surface truncate flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-secondary">explore</span>
              {location ? `${location} • Radius Pusat Bisnis` : 'Lokasi usaha • Radius Pusat Bisnis'}
            </span>
            <button
              className="text-secondary font-label-sm text-label-sm font-bold shrink-0 hover:underline"
              type="button"
              onClick={() => cityRef.current?.focus()}
            >
              Sesuaikan
            </button>
          </div>
        </div>
      </div>

      {/* Deskripsi Singkat Bisnis (Elevator Pitch) */}
      <div className="flex flex-col gap-1.5 bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
        <div className="flex items-center justify-between">
          <label className="font-label-lg text-label-lg text-on-surface font-semibold" htmlFor="pitch-desc">
            Deskripsi Singkat Usaha (Pitch)
          </label>
          <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
            {description.length} / {DESC_MAX} karakter
          </span>
        </div>
        <textarea
          className="w-full bg-surface-container-low rounded-lg p-space-sm font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary transition-all resize-none"
          id="pitch-desc"
          maxLength={DESC_MAX}
          placeholder="Tuliskan keunikan produk, target pasar, serta pencapaian usaha Anda dalam 2-3 kalimat ringkas..."
          rows={4}
          value={description}
          onChange={(e) => set('description', e.target.value)}
        />
        {errors.description && (
          <span className="font-body-sm text-body-sm text-error" role="alert">
            {errors.description}
          </span>
        )}
        <div className="flex items-center justify-between pt-1">
          <span className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px] text-secondary">auto_awesome</span>
            Saran: Sertakan keunikan produk dan profil pembeli utama.
          </span>
        </div>
      </div>

      {/* Trust & Privacy Micro-Card */}
      <div className="w-full bg-surface-container-low rounded-xl p-space-sm flex items-center gap-space-xs text-on-surface-variant">
        <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">lock</span>
        <p className="font-body-sm text-body-sm leading-tight">
          Data usaha Anda dilindungi enkripsi standar institusional dan diverifikasi tim kurasi UMKM.
        </p>
      </div>
    </>
  );
}
