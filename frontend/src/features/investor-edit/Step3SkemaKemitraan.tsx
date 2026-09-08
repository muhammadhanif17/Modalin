import { useState } from 'react';
import type { CooperationType } from '../../lib/api';

type SchemeKey = CooperationType;

const SCHEMES: {
  key: SchemeKey;
  title: string;
  badge: string;
  badgeClass: string;
  sub: string;
  subClass: string;
  desc: string;
  footIcon: string;
  footText: string;
  footClass: string;
}[] = [
  {
    key: 'BAGI_HASIL',
    title: 'Bagi Hasil (Revenue / Profit Sharing)',
    badge: 'Dipilih',
    badgeClass: 'bg-secondary-container text-on-secondary-container',
    sub: 'Sistem Syirkah / Bagi Hasil Bersih Transparan',
    subClass: 'text-secondary',
    desc: 'Menerima nisbah bagi hasil proporsional dari keuntungan bersih atau omzet mitra UMKM setiap bulan tanpa bunga/riba. Sangat ideal untuk bisnis ritel, kafe, dan F&B dengan arus kas lancar.',
    footIcon: 'verified_user',
    footText: 'Sesuai Kaidah Syirkah & Bebas Riba',
    footClass: 'text-secondary',
  },
  {
    key: 'PENYERTAAN_MODAL',
    title: 'Penyertaan Modal',
    badge: 'Jangka Panjang',
    badgeClass: 'bg-surface-container text-on-surface-variant',
    sub: 'Kepemilikan Saham Minoritas (5% - 20%)',
    subClass: 'text-on-surface-variant',
    desc: 'Menyuntikkan modal untuk pertumbuhan jangka panjang dengan keterlibatan strategis: mentorship manajerial, jejaring distribusi, dan tata kelola usaha.',
    footIcon: 'handshake',
    footText: 'Kemitraan Strategis & Valuasi Saham',
    footClass: 'text-on-surface-variant',
  },
  {
    key: 'PINJAMAN',
    title: 'Pembiayaan Modal Kerja Bertahap',
    badge: 'Tempo Terjadwal',
    badgeClass: 'bg-surface-container text-on-surface-variant',
    sub: 'Pengembalian Pokok + Imbal Jasa Bertahap',
    subClass: 'text-on-surface-variant',
    desc: 'Modal dikembalikan bertahap dalam tenor pasti (6–24 bulan) dengan bagi hasil terukur tanpa mengambil porsi kepemilikan saham usaha UMKM.',
    footIcon: 'calendar_month',
    footText: 'Tenor Terstruktur & Pengembalian Terjadwal',
    footClass: 'text-on-surface-variant',
  },
];

/**
 * Port 1:1 dari Mockup/b5. Edit Profil Investor - Skema Kemitraan.html.
 * Class, copy, ikon Material Symbols dipertahankan verbatim.
 * Nilai tersimpan sebagai cooperationTypes agar validasi dan payload API
 * tidak berubah. Panel slider Bagi Hasil, tombol "Pelajari Skema", dan
 * pilihan Pasif/Aktif adalah visual — belum ada endpoint-nya.
 */
export function Step3SkemaKemitraan({
  values,
  set,
  errors,
}: {
  values: Record<string, unknown>;
  set: <K extends string>(k: K, v: unknown) => void;
  errors: Record<string, string>;
}) {
  const [info, setInfo] = useState<SchemeKey | null>(null);
  const selected = (values.cooperationTypes as CooperationType[]) ?? [];

  const toggle = (type: CooperationType) => {
    if (selected.includes(type)) {
      set('cooperationTypes', selected.filter((t) => t !== type));
    } else {
      set('cooperationTypes', [...selected, type]);
    }
  };

  return (
    <>
      {errors.cooperationTypes && (
        <div
          className="px-3.5 py-3 rounded-xl bg-error-container border border-error/30 text-[13px] font-semibold text-on-error-container"
          role="alert"
        >
          {errors.cooperationTypes}
        </div>
      )}

      <div className="flex flex-col gap-space-sm" role="group" aria-label="Skema kemitraan">
        {SCHEMES.map((scheme) => {
          const active = selected.includes(scheme.key);
          const showLearn = info === scheme.key;
          return (
            <div
              key={scheme.key}
              className={
                active
                  ? 'relative w-full p-space-md rounded-2xl bg-surface-container-lowest shadow-md transition-all duration-200'
                  : 'relative w-full p-space-md rounded-2xl bg-surface-container-lowest shadow-sm transition-all duration-200'
              }
            >
              <div className="flex items-start justify-between gap-space-xs mb-space-xs">
                <label className="flex items-start gap-space-sm cursor-pointer flex-1">
                  <input
                    className="mt-1 w-5 h-5 accent-secondary shrink-0 cursor-pointer"
                    type="checkbox"
                    checked={active}
                    onChange={() => toggle(scheme.key)}
                  />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-title-md text-title-md text-on-surface">{scheme.title}</h3>
                      {active && (
                        <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold">
                          Dipilih
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm ${scheme.badgeClass}`}>
                        {scheme.key === 'BAGI_HASIL' ? 'Paling Diminati' : scheme.badge}
                      </span>
                    </div>
                    <p className={`font-label-md text-label-md mt-0.5 font-semibold ${scheme.subClass}`}>
                      {scheme.sub}
                    </p>
                  </div>
                </label>
                <button
                  aria-label={`Pelajari skema ${scheme.title}`}
                  className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-secondary hover:bg-secondary-container transition-colors shrink-0"
                  type="button"
                  onClick={() => setInfo(showLearn ? null : scheme.key)}
                  title="Segera hadir"
                >
                  <span className="material-symbols-outlined text-[18px]">info</span>
                </button>
              </div>

              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed mb-space-sm pl-8">
                {scheme.desc}
              </p>

              <div className="flex items-center justify-between pl-8 pt-2">
                <span className={`inline-flex items-center gap-1 font-label-sm text-label-sm font-semibold ${scheme.footClass}`}>
                  <span className="material-symbols-outlined text-[15px]">{scheme.footIcon}</span>
                  {scheme.footText}
                </span>
                <button
                  className={`font-label-md text-label-md font-semibold hover:underline ${scheme.key === 'BAGI_HASIL' ? 'text-secondary' : 'text-on-surface-variant'}`}
                  type="button"
                  onClick={() => setInfo(showLearn ? null : scheme.key)}
                  title="Segera hadir"
                >
                  Pelajari Skema →
                </button>
              </div>

              {showLearn && (
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed pl-8 pt-2" role="note">
                  Detail panduan skema menyusul. Pilihan di atas sudah tersimpan sebagai draf.
                </p>
              )}

              {scheme.key === 'BAGI_HASIL' && active && (
                <div className="mt-space-sm pt-space-sm border-t border-surface-container flex flex-col gap-space-sm pl-8">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      Ekspektasi Porsi Bagi Hasil Investor
                    </span>
                    <span className="font-label-md text-label-md text-secondary font-bold">
                      15% - 25% dari Laba Bersih
                    </span>
                  </div>
                  <div className="w-full flex items-center gap-space-xs">
                    <span className="font-label-sm text-label-sm text-outline">10%</span>
                    <div className="flex-1 h-2 rounded-full bg-surface-container-highest relative">
                      <div className="h-full rounded-full bg-secondary" style={{ width: '60%' }}></div>
                      <div
                        className="w-4 h-4 rounded-full bg-secondary shadow-sm absolute top-1/2 -translate-y-1/2 -ml-2"
                        style={{ left: '60%' }}
                      ></div>
                    </div>
                    <span className="font-label-sm text-label-sm text-outline">40%</span>
                  </div>
                  <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm pt-1">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px] text-secondary">event_repeat</span>
                      Siklus Pembagian: Tiap Tgl 5
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px] text-secondary">verified</span>
                      Audit: Modalin Escrow
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Preferensi partisipasi — visual, belum ada field-nya di API */}
      <div className="w-full p-space-md rounded-2xl bg-surface-container-lowest shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="font-label-sm text-label-sm text-secondary font-bold uppercase tracking-wider flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">tune</span>
            Preferensi Partisipasi Pemodal
          </span>
        </div>
        <h4 className="font-title-md text-title-md text-on-surface mb-1">Kriteria Keterlibatan Pemodal</h4>
        <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-sm">
          Tentukan sejauh mana Anda ingin terlibat dalam operasional maupun konsultasi mitra UMKM.
        </p>
        <div className="flex flex-col sm:flex-row gap-space-xs">
          <div className="flex items-center gap-2 p-space-sm rounded-xl border border-secondary bg-secondary-container/20 text-on-surface">
            <span className="material-symbols-outlined text-secondary text-[20px]">check_circle</span>
            <div>
              <p className="font-label-md text-label-md font-bold text-on-surface">Investor Pasif</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Laporan &amp; arus kas rutin transparan
              </p>
            </div>
          </div>
          <div
            className="flex items-center gap-2 p-space-sm rounded-xl border border-surface-container bg-surface-container text-on-surface opacity-70"
            title="Segera hadir"
          >
            <span className="material-symbols-outlined text-outline text-[20px]">radio_button_unchecked</span>
            <div>
              <p className="font-label-md text-label-md font-semibold text-on-surface">
                Investor Aktif / Mentor Bisnis
              </p>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Sedia bimbingan operasional &amp; relasi bisnis
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
