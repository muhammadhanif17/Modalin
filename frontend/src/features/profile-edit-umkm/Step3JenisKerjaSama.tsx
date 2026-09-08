import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { endpoints, type CooperationType } from '../../lib/api';

type SchemeKey = CooperationType;

const SCHEMES: {
  key: SchemeKey;
  title: string;
  badge: string;
  sub: string;
  desc: string;
  footIcon: string;
  footText: string;
}[] = [
  {
    key: 'BAGI_HASIL',
    title: 'Bagi Hasil',
    badge: 'Dipilih',
    sub: 'Sistem Syirkah / Pendapatan Bersama',
    desc: 'Investor menerima bagi hasil dari laba bersih bulanan, tanpa bunga tetap. Sangat cocok bila omzet penjualan warung atau kafe Anda fluktuatif mengikuti musim.',
    footIcon: 'verified_user',
    footText: 'Prinsip Adil & Tanpa Agunan Sita',
  },
  {
    key: 'PENYERTAAN_MODAL',
    title: 'Penyertaan Modal',
    badge: 'Ekuitas',
    sub: 'Bermitra Jangka Panjang',
    desc: 'Investor menyuntik dana untuk porsi kepemilikan minoritas (5%-20%) & bersedia membantu mentoring manajemen, jejaring supplier, serta ekspansi cabang baru.',
    footIcon: 'handshake',
    footText: 'Kemitraan Strategis',
  },
  {
    key: 'PINJAMAN',
    title: 'Pinjaman Usaha',
    badge: 'Tempo',
    sub: 'Pengembalian Bertahap Terjadwal',
    desc: 'Modal dikembalikan dalam tempo tetap (misal 6-24 bulan) dengan bagi hasil atau margin yang disepakati di awal tanpa mengorbankan kepemilikan usaha sama sekali.',
    footIcon: 'event_repeat',
    footText: 'Tenor Terstruktur',
  },
];

/**
 * Port 1:1 dari Mockup/a5 (kondisi default) + a6 (bottom sheet edukasi).
 * Class, copy, ikon Material Symbols dipertahankan verbatim. Kedua mockup
 * adalah langkah 3 yang sama: kartu multi-pilih + panel detail saat Bagi
 * Hasil dipilih + modal "Pelajari Skema". Nilai tersimpan sebagai
 * cooperationTypes agar validasi dan payload API tidak berubah.
 */
export function Step3JenisKerjaSama({
  values,
  set,
  errors,
}: {
  values: Record<string, unknown>;
  set: <K extends string>(k: K, v: unknown) => void;
  errors: Record<string, string>;
}) {
  const [info, setInfo] = useState<SchemeKey | null>(null);
  const { data: portfolio } = useQuery({ queryKey: ['portfolio'], queryFn: endpoints.portfolio });

  const selected = (values.cooperationTypes as CooperationType[]) ?? [];
  const estimatedRoi = String(values.estimatedRoi ?? '').trim();
  const tenorMonths = String(values.tenorMonths ?? '').trim();

  const toggle = (type: CooperationType) => {
    if (selected.includes(type)) {
      set('cooperationTypes', selected.filter((t) => t !== type));
    } else {
      set('cooperationTypes', [...selected, type]);
    }
  };

  const photoCount = (portfolio ?? []).filter((p) => p.fileType.startsWith('image/')).length;
  const docCount = (portfolio ?? []).length - photoCount;
  const infoScheme = SCHEMES.find((s) => s.key === info) ?? null;

  // Lebar slider panel Bagi Hasil mengikuti ROI langkah 2 (tampilan saja).
  const roiNum = Number(estimatedRoi);
  const sliderPct = estimatedRoi && Number.isFinite(roiNum) ? Math.min(100, Math.max(5, ((roiNum - 10) / 30) * 100)) : 60;

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

      <div className="flex flex-col gap-space-sm" role="group" aria-label="Jenis kerja sama">
        {SCHEMES.map((scheme) => {
          const active = selected.includes(scheme.key);
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
                    <div className="flex items-center gap-2">
                      <h3 className="font-title-md text-title-md text-on-surface">{scheme.title}</h3>
                      <span
                        className={
                          active
                            ? 'px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm'
                            : 'px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm'
                        }
                      >
                        {scheme.badge}
                      </span>
                    </div>
                    <p
                      className={
                        active
                          ? 'font-label-md text-label-md text-secondary mt-0.5'
                          : 'font-label-md text-label-md text-on-surface-variant mt-0.5'
                      }
                    >
                      {scheme.sub}
                    </p>
                  </div>
                </label>
                <button
                  aria-label={`Pelajari Skema ${scheme.title}`}
                  className={
                    active
                      ? 'w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-secondary hover:bg-secondary-container transition-colors shrink-0'
                      : 'w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors shrink-0'
                  }
                  type="button"
                  onClick={() => setInfo(scheme.key)}
                >
                  <span className="material-symbols-outlined text-[18px]">info</span>
                </button>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed pl-8">
                {scheme.desc}
              </p>
              <div className="flex items-center justify-between pl-8 pt-2">
                <span
                  className={
                    active
                      ? 'inline-flex items-center gap-1 font-label-sm text-label-sm text-secondary'
                      : 'inline-flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant'
                  }
                >
                  <span className="material-symbols-outlined text-[15px]">{scheme.footIcon}</span>
                  {scheme.footText}
                </span>
                <button
                  className={
                    active
                      ? 'font-label-md text-label-md text-secondary font-semibold hover:underline'
                      : 'font-label-md text-label-md text-on-surface-variant font-semibold hover:underline'
                  }
                  type="button"
                  onClick={() => setInfo(scheme.key)}
                >
                  Pelajari Skema →
                </button>
              </div>

              {scheme.key === 'BAGI_HASIL' && active && (
                <div className="mt-space-sm pt-space-sm border-t border-surface-container flex flex-col gap-space-sm pl-8">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      Tawaran Porsi Bagi Hasil Investor
                    </span>
                    <span className="font-label-md text-label-md text-secondary font-bold">
                      {estimatedRoi ? `${estimatedRoi}%` : '25%'} dari Laba Bersih
                    </span>
                  </div>
                  <div className="w-full flex items-center gap-space-xs">
                    <span className="font-label-sm text-label-sm text-outline">10%</span>
                    <div className="flex-1 h-2 rounded-full bg-surface-container-highest relative">
                      <div className="h-full rounded-full bg-secondary" style={{ width: `${sliderPct}%` }}></div>
                      <div
                        className="w-4 h-4 rounded-full bg-secondary shadow-sm absolute top-1/2 -translate-y-1/2 -ml-2"
                        style={{ left: `${sliderPct}%` }}
                      ></div>
                    </div>
                    <span className="font-label-sm text-label-sm text-outline">40%</span>
                  </div>
                  <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px] text-secondary">schedule</span>
                      Proyeksi Siklus: {tenorMonths || '12'} Bulan
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px] text-secondary">payments</span>
                      Penyaluran Tiap Akhir Bulan
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Peek at Next Step (Step 4) */}
      <section className="w-full p-space-md rounded-2xl bg-surface-container">
        <div className="flex items-center justify-between mb-2">
          <span className="font-label-sm text-label-sm text-secondary font-bold uppercase tracking-wider">
            Langkah Berikutnya
          </span>
          <span className="material-symbols-outlined text-[18px] text-on-surface-variant">arrow_forward</span>
        </div>
        <h4 className="font-title-md text-title-md text-on-surface mb-1">Portofolio &amp; Berkas Usaha</h4>
        <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-xs">
          Siapkan foto suasana kedai, produk terlaris, serta bukti laporan keuangan sederhana buku kas.
        </p>
        <div className="flex items-center gap-space-xs">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface-container-lowest text-on-surface font-label-sm text-label-sm shadow-sm">
            <span className="material-symbols-outlined text-[14px] text-secondary">photo_camera</span>
            {photoCount} Foto Terunggah
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface-container-lowest text-on-surface font-label-sm text-label-sm shadow-sm">
            <span className="material-symbols-outlined text-[14px] text-secondary">description</span>
            {docCount} Berkas Siap
          </span>
        </div>
      </section>

      {/* Educational Bottom Sheet (a6) */}
      {infoScheme && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-primary-container/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`Panduan skema ${infoScheme.title}`}
          onClick={() => setInfo(null)}
        >
          <div
            className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-t-3xl bg-surface-container-lowest p-space-lg shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 rounded-full bg-surface-container-highest mx-auto mb-space-md shrink-0"></div>
            <div className="flex items-start justify-between gap-space-sm mb-space-md">
              <div className="flex items-center gap-space-sm">
                <div className="w-12 h-12 rounded-2xl bg-secondary-container flex items-center justify-center text-on-secondary-container shadow-sm shrink-0">
                  <span className="material-symbols-outlined text-[28px]">
                    {infoScheme.key === 'BAGI_HASIL' ? 'eco' : infoScheme.footIcon}
                  </span>
                </div>
                <div>
                  <span className="font-label-sm text-label-sm text-secondary uppercase font-bold tracking-wider">
                    Panduan Modalin
                  </span>
                  <h3 className="font-headline-md text-headline-md text-on-surface">
                    Apa itu Skema {infoScheme.title}?
                  </h3>
                </div>
              </div>
              <button
                aria-label="Tutup Dialog"
                className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-colors"
                type="button"
                onClick={() => setInfo(null)}
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            {infoScheme.key === 'BAGI_HASIL' ? (
              <>
                <div className="p-space-md rounded-2xl bg-surface-container-low mb-space-md">
                  <div className="flex items-start gap-space-xs mb-1">
                    <span className="material-symbols-outlined text-secondary text-[20px] shrink-0">
                      lightbulb
                    </span>
                    <p className="font-label-lg text-label-lg text-on-surface font-semibold">
                      Analogi Sederhana Pohon Mangga
                    </p>
                  </div>
                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                    Bayangkan seperti menitipkan bibit pohon mangga ke tetangga: saat musim panen berbuah lebat,
                    keuntungan dinikmati bersama secara proporsional. Saat musim hujan badai buah sedikit, beban
                    dibagi secara adil tanpa ancaman bunga bergulung ataupun denda mencekik.
                  </p>
                </div>
                <div className="flex flex-wrap gap-space-xs mb-space-md">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary-container/50 text-on-secondary-container font-label-md text-label-md">
                    <span className="material-symbols-outlined text-[16px]">volunteer_activism</span>
                    Tanpa Bunga Ribawi
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary-container/50 text-on-secondary-container font-label-md text-label-md">
                    <span className="material-symbols-outlined text-[16px]">show_chart</span>
                    Fleksibel Sesuai Omzet
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary-container/50 text-on-secondary-container font-label-md text-label-md">
                    <span className="material-symbols-outlined text-[16px]">storefront</span>
                    Tetap Pemilik Penuh Kedai
                  </div>
                </div>
                <div className="p-space-md rounded-xl bg-surface-container-high mb-space-lg">
                  <div className="flex items-start gap-space-xs">
                    <span className="material-symbols-outlined text-secondary text-[20px] shrink-0 mt-0.5">
                      menu_book
                    </span>
                    <div>
                      <h5 className="font-label-lg text-label-lg text-on-surface font-semibold mb-1">
                        Yang Perlu Diperhatikan:
                      </h5>
                      <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                        <strong className="font-semibold text-on-surface">Catatan Penjualan Terbuka:</strong>{' '}
                        Anda perlu mencatat pemasukan &amp; pengeluaran harian kedai secara teratur tiap akhir
                        bulan di fitur Buku Kas Modalin, agar perhitungan persentase laba bersih berjalan
                        transparan dan berkah bagi kedua belah pihak.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-space-md rounded-2xl bg-surface-container-low mb-space-md">
                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                  {infoScheme.desc}
                </p>
              </div>
            )}
            <div className="flex flex-col gap-space-xs mt-auto pt-2">
              <button
                className="w-full h-[52px] rounded-xl bg-primary-container text-on-primary font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
                type="button"
                onClick={() => {
                  if (!selected.includes(infoScheme.key)) toggle(infoScheme.key);
                  setInfo(null);
                }}
              >
                <span className="material-symbols-outlined text-[20px]">check</span>
                Paham, Pilih Skema Ini
              </button>
              <button
                className="w-full h-11 rounded-xl bg-surface-container text-on-surface-variant font-label-md text-label-md font-semibold flex items-center justify-center hover:bg-surface-container-highest transition-colors"
                type="button"
                onClick={() => setInfo(null)}
              >
                Tutup &amp; Lihat Skema Lain
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
