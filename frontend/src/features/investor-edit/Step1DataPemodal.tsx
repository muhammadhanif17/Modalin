import { useQuery } from '@tanstack/react-query';
import { endpoints, type Sector } from '../../lib/api';
import { Spinner } from '../../components/ui';

/** Pilihan "Pengalaman Investasi" (b3) dipetakan ke tahun pengalaman agar payload API tidak berubah. */
const EXP_OPTIONS = [
  { id: 'lt1', label: '< 1 Tahun', year: '0' },
  { id: 'r1-3', label: '1 - 3 Tahun', year: '2' },
  { id: 'r3-5', label: '3 - 5 Tahun', year: '4' },
  { id: 'gt5', label: '> 5 Tahun', year: '7' },
] as const;

const BIO_MAX = 280;

/**
 * Port 1:1 dari Mockup/b3. Edit Profil Investor - Data Pemodal.html.
 * Class, copy, ikon Material Symbols dipertahankan verbatim.
 * Field terikat draf: nama lengkap, sektor fokus (berbagi preferredSectorId
 * dengan langkah 2), pengalaman (dipetakan ke tahun), domisili (berbagi
 * preferredLocation dengan langkah 2), bio. Foto, tipe entitas, dan klaim
 * sinkronisasi Dukcapil adalah placeholder visual — belum ada endpoint-nya.
 */
export function Step1DataPemodal({
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

  const fullName = (values.fullName as string) ?? '';
  const experienceYears = (values.experienceYears as string) ?? '';
  const bio = (values.bio as string) ?? '';
  const preferredLocation = (values.preferredLocation as string) ?? '';
  const preferredSectorId = (values.preferredSectorId as string) ?? '';
  const initial = (fullName.trim()[0] ?? 'I').toUpperCase();

  return (
    <>
      {/* Foto Profil Pemodal */}
      <div className="flex flex-col gap-space-xs bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
        <label className="font-label-lg text-label-lg text-on-surface font-semibold flex items-center justify-between">
          <span>Foto Profil Investor</span>
          <span className="font-label-sm text-label-sm text-secondary font-bold">Format Formal</span>
        </label>
        <div className="flex items-center gap-space-md mt-1">
          <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-surface-container shrink-0 shadow-inner flex items-center justify-center">
            <span className="font-headline-lg text-headline-lg text-secondary font-extrabold">{initial}</span>
            <div className="absolute bottom-0 inset-x-0 bg-primary-container/80 text-on-primary text-[10px] text-center py-0.5 font-label-sm">
              Terverifikasi
            </div>
          </div>
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-secondary">
              <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                verified
              </span>
              <span className="font-label-sm text-label-sm font-bold uppercase tracking-wide">
                Investor Terverifikasi
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
              OJK &amp; KYC Terhubung (E-KTP Valid)
            </p>
            <button
              className="w-fit px-space-sm py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high active:scale-95 text-on-surface font-label-md text-label-md flex items-center gap-1.5 transition-all disabled:opacity-60"
              type="button"
              disabled
              title="Segera hadir"
            >
              <span className="material-symbols-outlined text-[18px]">photo_camera</span>
              <span>Ubah Foto</span>
            </button>
          </div>
        </div>
      </div>

      {/* Nama Lengkap Pemodal */}
      <div className="flex flex-col gap-1.5 bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
        <label
          className="font-label-lg text-label-lg text-on-surface font-semibold flex items-center justify-between"
          htmlFor="investor-name"
        >
          <span>Nama Lengkap Pemodal</span>
          <span className="font-label-sm text-label-sm text-on-surface-variant">Sesuai KTP (Wajib)</span>
        </label>
        <div className="relative flex items-center">
          <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant text-[20px]">
            badge
          </span>
          <input
            className="w-full h-12 bg-surface-container-low rounded-lg pl-10 pr-space-md font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary transition-all"
            id="investor-name"
            placeholder="Nama Lengkap Beserta Gelar"
            type="text"
            value={fullName}
            onChange={(e) => set('fullName', e.target.value)}
          />
        </div>
        {errors.fullName && (
          <span className="font-body-sm text-body-sm text-error" role="alert">
            {errors.fullName}
          </span>
        )}
        <span className="font-body-sm text-body-sm text-secondary flex items-center gap-1 font-medium">
          <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            verified_user
          </span>
          Telah tersinkronisasi dengan data Ditjen Dukcapil &amp; SID KSEI.
        </span>
      </div>

      {/* Tipe Entitas Investor — visual saja, belum ada field-nya di API */}
      <div className="flex flex-col gap-2 bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
        <label className="font-label-lg text-label-lg text-on-surface font-semibold flex items-center justify-between">
          <span>Tipe Entitas Investor</span>
          <span className="font-label-sm text-label-sm text-secondary font-bold">Struktur Akun</span>
        </label>
        <div aria-label="Tipe Entitas Investor" className="grid grid-cols-1 gap-2" role="radiogroup">
          <button
            className="h-12 px-3 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md flex items-center justify-between shadow-sm disabled:opacity-100"
            type="button"
            disabled
            title="Segera hadir"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">person</span>
              <span className="font-bold">Individu / Angel Investor</span>
            </div>
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
          </button>
          <button
            className="h-12 px-3 rounded-lg bg-surface-container text-on-surface-variant font-label-md text-label-md flex items-center justify-between transition-all hover:bg-surface-container-high disabled:opacity-70"
            type="button"
            disabled
            title="Segera hadir"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">corporate_fare</span>
              <span>Institusi / Modal Ventura / Family Office</span>
            </div>
            <span className="material-symbols-outlined text-[18px]">radio_button_unchecked</span>
          </button>
        </div>
      </div>

      {/* Sektor Fokus Utama — terikat preferredSectorId (dipakai juga langkah 2) */}
      <div className="flex flex-col gap-1.5 bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
        <div className="flex items-center justify-between">
          <label className="font-label-lg text-label-lg text-on-surface font-semibold" htmlFor="sector-focus">
            Sektor Fokus Utama
          </label>
          <span className="inline-flex items-center gap-1 bg-secondary-container/50 text-on-secondary-container font-label-sm text-label-sm px-2 py-0.5 rounded-full font-bold">
            <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              trending_up
            </span>
            Sektor Paling Diminati
          </span>
        </div>
        <div className="relative flex items-center">
          <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant text-[20px]">
            category
          </span>
          <select
            className="w-full h-12 bg-surface-container-low rounded-lg pl-10 pr-10 font-body-md text-body-md text-on-surface appearance-none focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary transition-all"
            id="sector-focus"
            value={preferredSectorId}
            onChange={(e) => set('preferredSectorId', e.target.value)}
          >
            <option value="">Semua sektor</option>
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
      </div>

      {/* Pengalaman Investasi — pilihan mockup dipetakan ke tahun */}
      <div className="flex flex-col gap-2 bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
        <label className="font-label-lg text-label-lg text-on-surface font-semibold flex items-center justify-between">
          <span>Pengalaman Investasi</span>
          <span className="font-label-sm text-label-sm text-secondary font-bold">Track Record</span>
        </label>
        <div aria-label="Pengalaman Investasi" className="grid grid-cols-2 gap-2" role="radiogroup">
          {EXP_OPTIONS.map((opt) => {
            const active = experienceYears === opt.year;
            return (
              <button
                key={opt.id}
                className={
                  active
                    ? 'h-11 px-3 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md flex items-center justify-center gap-1.5 shadow-sm'
                    : 'h-11 px-3 rounded-lg bg-surface-container text-on-surface-variant font-label-md text-label-md flex items-center justify-center gap-1.5 transition-all hover:bg-surface-container-high'
                }
                type="button"
                onClick={() => set('experienceYears', opt.year)}
                aria-pressed={active}
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
      </div>

      {/* Kota Domisili — terikat preferredLocation (dipakai juga langkah 2) */}
      <div className="flex flex-col gap-space-sm bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
        <div className="flex items-center justify-between">
          <label className="font-label-lg text-label-lg text-on-surface font-semibold">
            Kota Domisili / Basis Operasional
          </label>
          <span className="inline-flex items-center gap-1 bg-secondary-container/40 text-secondary font-label-sm text-label-sm px-2 py-0.5 rounded-full font-bold">
            <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              pin_drop
            </span>
            Lokasi Terverifikasi
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="investor-domicile">
            Kota / Kabupaten Domisili
          </label>
          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant text-[20px]">
              location_city
            </span>
            <input
              className="w-full h-12 bg-surface-container-low rounded-lg pl-10 pr-space-md font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary transition-all"
              id="investor-domicile"
              type="text"
              placeholder="cth. Bandung, Jawa Barat"
              value={preferredLocation}
              onChange={(e) => set('preferredLocation', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Bio / Pernyataan Fokus Investasi */}
      <div className="flex flex-col gap-1.5 bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
        <div className="flex items-center justify-between">
          <label className="font-label-lg text-label-lg text-on-surface font-semibold" htmlFor="pitch-desc">
            Bio / Pernyataan Fokus Investasi
          </label>
          <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
            {bio.length} / {BIO_MAX} karakter
          </span>
        </div>
        <textarea
          className="w-full bg-surface-container-low rounded-lg p-space-sm font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-secondary transition-all resize-none"
          id="pitch-desc"
          maxLength={BIO_MAX}
          placeholder="Deskripsikan filosofi investasi dan nilai tambah yang Anda bawa untuk mitra binaan..."
          rows={4}
          value={bio}
          onChange={(e) => set('bio', e.target.value)}
        />
        {errors.bio && (
          <span className="font-body-sm text-body-sm text-error" role="alert">
            {errors.bio}
          </span>
        )}
        <div className="flex items-center justify-between pt-1">
          <span className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px] text-secondary">auto_awesome</span>
            Saran: Jelaskan kesiapan permodalan &amp; kriteria profit sharing yang Anda cari.
          </span>
        </div>
      </div>

      {/* Banner Keamanan */}
      <div className="w-full bg-surface-container-low rounded-xl p-space-sm flex items-center gap-space-xs text-on-surface-variant">
        <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">lock</span>
        <p className="font-body-sm text-body-sm leading-tight">
          Data pemodal dilindungi enkripsi standar perbankan dan tunduk pada kerahasiaan OJK Sandboxing.
        </p>
      </div>
    </>
  );
}
