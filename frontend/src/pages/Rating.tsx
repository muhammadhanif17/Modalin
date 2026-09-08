import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  COOPERATION_LABEL,
  endpoints,
  type CooperationType,
  type PartySummary,
} from '../lib/api';
import { Spinner } from '../components/ui';
import { formatRupiah, initials } from '../lib/format';
import { readSession } from '../lib/session';

/**
 * Port 1:1 dari Mockup/a12. Ulasan & Rating Kemitraan Selesai.html
 * (perspektif UMKM) + Mockup/b10 (perspektif investor): judul Beri Ulasan
 * Mitra UMKM, label Pengalaman Kemitraan & Due Diligence, set tag investor,
 * banner Dampak Skor Kepercayaan Mitra, dan CTA Kirim Ulasan & Rekomendasi
 * bercabang via peran sesi. Klaim OJK mockup tidak diport (footer jujur UU ITE).
 * Section, class Tailwind, copy, dan ikon Material Symbols dipertahankan
 * verbatim. Bottom nav + <script> mockup tidak disalin: navigasi bawah sudah
 * dirender Layout global, logika bintang/tag/counter ditulis ulang sebagai
 * state React.
 *
 * Modul 7 — FR-12. Dua gerbangnya ditegakkan di server: hanya kerja sama
 * berstatus COMPLETED yang bisa dinilai, dan satu pemberi hanya boleh menilai
 * sekali. Halaman ini mengambil daftar dari /api/ratings/pending, jadi yang
 * muncul memang yang benar-benar boleh dinilai; id di luar daftar menampilkan
 * alasan tak-bisa-diulas, bukan form.
 *
 * Penyesuaian terhadap mockup (data nyata menggantikan konten statis):
 * - Foto Hendrik Kusuma diganti avatar/inisial mitra dari API.
 * - Baris metrik "18% Tahunan" / "12 Bulan (Tepat Waktu)" diganti skema,
 *   nilai pendanaan, dan nomor kesepakatan dari API (durasi tidak tersedia).
 * - Tag karakteristik yang dipilih digabungkan ke isi `review` saat submit
 *   (API hanya menerima { score, review }), teks bebas tetap opsional.
 * - Warna bintang memakai #d97706 verbatim dari mockup (amber bila mockup
 *   tak menentukan — di sini mockup sudah menentukan).
 * - Textarea maxlength 300 verbatim dari mockup (dulu 2000).
 */

type PendingRow = {
  agreementId: string;
  agreementNumber: string;
  cooperationType: CooperationType;
  amount: number;
  partner: PartySummary;
};

/** Label dinamis bintang — copy + ikon verbatim dari <script> mockup a12. */
const RATING_LABELS = [
  { text: 'Perlu Banyak Pembenahan', icon: 'sentiment_very_dissatisfied' },
  { text: 'Cukup, Ada Kendala', icon: 'sentiment_dissatisfied' },
  { text: 'Baik & Sesuai Ekspektasi', icon: 'sentiment_neutral' },
  { text: 'Memuaskan & Komunikatif', icon: 'sentiment_satisfied' },
  { text: 'Sangat Memuaskan & Profesional', icon: 'sentiment_very_satisfied' },
];

/** Tag karakteristik — copy verbatim dari mockup a12 (perspektif UMKM). */
const REVIEW_TAGS = [
  'Komunikasi Sangat Responsif',
  'Pencairan Tepat Waktu',
  'Memberi Masukan Bisnis Berharga',
  'Kemitraan Sangat Terbuka',
];

/** Tag karakteristik — copy verbatim dari mockup b10 (perspektif investor). */
const INVESTOR_TAGS = [
  'Bagi Hasil Disiplin & Tepat Waktu',
  'Laporan Keuangan Transparan',
  'Operasional & Omzet Bertumbuh',
  'Komunikasi Sangat Baik',
  'Rekomendasikan ke Pemodal Lain',
];

const REVIEW_MAX = 300;

export function RatingPage() {
  const { agreementId } = useParams();
  const isInvestor = readSession()?.role === 'INVESTOR';

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['pending-ratings'],
    queryFn: endpoints.pendingRatings,
    staleTime: 15_000,
  });

  if (isLoading) {
    return (
      <div className="px-gutter-mobile py-space-md max-w-md mx-auto w-full">
        <Spinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-gutter-mobile py-space-md flex flex-col gap-space-lg max-w-md mx-auto w-full">
        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col items-center text-center gap-space-xs">
          <span className="material-symbols-outlined text-error text-[32px]">warning</span>
          <h2 className="font-title-md text-title-md text-on-surface font-bold">Gagal memuat</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Coba lagi sebentar lagi.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-2 px-4 h-11 rounded-lg bg-primary-container text-on-primary font-label-lg text-label-lg font-semibold flex items-center gap-1.5 active:scale-[0.98] transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            <span>Muat ulang</span>
          </button>
        </div>
      </div>
    );
  }

  // Tanpa id: daftar kerja sama selesai yang menunggu ulasan, dengan bahasa
  // visual yang sama dengan kartu ringkasan mockup a12.
  if (!agreementId) {
    return <PendingList rows={(data ?? []) as PendingRow[]} isInvestor={isInvestor} />;
  }

  const target = (data as PendingRow[] | undefined)?.find(
    (row) => row.agreementId === agreementId,
  );

  // FR-12: id yang tidak ada di /api/ratings/pending berarti belum selesai
  // atau sudah pernah diulas oleh pemberi ini — jelaskan alasannya.
  if (!target) {
    return (
      <div className="px-gutter-mobile py-space-md flex flex-col gap-space-lg max-w-md mx-auto w-full">
        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col items-center text-center gap-space-xs">
          <span className="material-symbols-outlined text-secondary text-[32px]">check_circle</span>
          <h2 className="font-title-md text-title-md text-on-surface font-bold">
            Kerja sama ini tidak bisa diulas
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Mungkin belum selesai, atau kamu sudah pernah memberi ulasan untuknya.
          </p>
          <Link
            to="/app/agreements"
            className="mt-2 px-4 h-11 rounded-lg bg-primary-container text-on-primary font-label-lg text-label-lg font-semibold flex items-center gap-1.5 active:scale-[0.98] transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Kembali</span>
          </Link>
        </div>
      </div>
    );
  }

  return <ReviewForm key={target.agreementId} target={target} isInvestor={isInvestor} />;
}

/* ---------------- Daftar pending ---------------- */

function PendingList({ rows, isInvestor }: { rows: PendingRow[]; isInvestor: boolean }) {
  const navigate = useNavigate();

  return (
    <div className="px-gutter-mobile py-space-md flex flex-col gap-space-lg max-w-md mx-auto w-full">
      <div className="flex items-start justify-between gap-space-md">
        <div className="flex flex-col gap-space-2xs">
          <div className="inline-flex items-center gap-space-2xs px-space-xs py-0.5 rounded-full bg-secondary-container w-fit">
            <span className="material-symbols-outlined text-on-secondary-container text-[14px]">
              verified
            </span>
            <span className="font-label-sm text-label-sm text-on-secondary-container font-semibold tracking-wider uppercase">
              Penyelesaian Resmi
            </span>
          </div>
          <h2 className="font-headline-md text-headline-md text-on-surface font-bold tracking-tight">
            {isInvestor ? 'Beri Ulasan Mitra UMKM' : 'Beri Ulasan Kemitraan'}
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {rows.length > 0
              ? `${rows.length} kemitraan selesai menunggu ulasanmu. ` +
                (isInvestor
                  ? 'Ulasanmu selaku investor terverifikasi langsung meningkatkan Skor Kepercayaan mitra.'
                  : 'Ulasanmu memperbarui skor kepercayaan mitra.')
              : isInvestor
                ? 'Ulasanmu selaku investor terverifikasi langsung meningkatkan Skor Kepercayaan mitra.'
                : 'Ulasanmu memperbarui skor kepercayaan mitra.'}
          </p>
        </div>
        <button
          aria-label="Tutup"
          className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-colors flex-shrink-0 active:scale-95"
          type="button"
          onClick={() => navigate('/app/agreements')}
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col items-center text-center gap-space-xs">
          <span className="material-symbols-outlined text-secondary text-[32px]">star</span>
          <h2 className="font-title-md text-title-md text-on-surface font-bold">
            Belum ada yang perlu diulas
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Ulasan bisa diberikan setelah kerja sama ditandai selesai.
          </p>
          <Link
            to="/app/agreements"
            className="mt-2 px-4 h-11 rounded-lg bg-surface-container-high text-on-surface font-label-lg text-label-lg font-semibold flex items-center gap-1.5 active:scale-[0.98] transition-all"
          >
            <span>Lihat kesepakatan</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-space-sm">
          {rows.map((row) => {
            const name = row.partner.fullName ?? 'Mitra';
            return (
              <Link
                key={row.agreementId}
                to={`/app/rating/${row.agreementId}`}
                className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex items-center justify-between gap-space-xs hover:shadow-md active:scale-[0.99] transition-all"
              >
                <div className="flex items-center gap-space-sm min-w-0">
                  <PartnerAvatar name={name} avatarUrl={row.partner.avatarUrl} />
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-title-md text-title-md text-on-surface font-bold truncate">
                        {name}
                      </span>
                      <span
                        className="material-symbols-outlined text-secondary text-[16px] flex-shrink-0"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        verified
                      </span>
                    </div>
                    <span className="font-label-md text-label-md text-on-surface-variant truncate">
                      {row.agreementNumber} · {COOPERATION_LABEL[row.cooperationType]} ·{' '}
                      <span data-money>{formatRupiah(row.amount)}</span>
                    </span>
                  </div>
                </div>
                <span className="px-3 py-1.5 rounded-full bg-primary-container text-on-primary font-label-md text-label-md font-semibold flex items-center gap-1 flex-shrink-0">
                  <span>Ulas</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </span>
              </Link>
            );
          })}
        </div>
      )}

      <TrustBanner isInvestor={isInvestor} />
    </div>
  );
}

/* ---------------- Form ulasan (detail a12) ---------------- */

function ReviewForm({ target, isInvestor }: { target: PendingRow; isInvestor: boolean }) {
  const { agreementId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const tagOptions = isInvestor ? INVESTOR_TAGS : REVIEW_TAGS;

  const [score, setScore] = useState(0);
  const [review, setReview] = useState('');
  const [tags, setTags] = useState<string[]>(tagOptions.slice(0, 3));
  const [error, setError] = useState('');

  const name = target.partner.fullName ?? 'Mitra';
  const firstName = name.split(' ')[0] || 'mitra';

  const submit = useMutation({
    mutationFn: () => {
      const parts = [...tags, review.trim()].filter(Boolean);
      return endpoints.rate(agreementId!, {
        score,
        review: parts.join('. ') || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pending-ratings'] });
      qc.invalidateQueries({ queryKey: ['agreements'] });
      qc.invalidateQueries({ queryKey: ['profile'] });
      navigate('/app/agreements');
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Gagal mengirim ulasan.'),
  });

  function toggleTag(tag: string) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  const label = score >= 1 ? RATING_LABELS[score - 1]! : null;

  return (
    <div className="px-gutter-mobile py-space-md flex flex-col gap-space-lg max-w-md mx-auto w-full">
      {/* Top Action & Title Header */}
      <div className="flex items-start justify-between gap-space-md">
        <div className="flex flex-col gap-space-2xs">
          <div className="inline-flex items-center gap-space-2xs px-space-xs py-0.5 rounded-full bg-secondary-container w-fit">
            <span className="material-symbols-outlined text-on-secondary-container text-[14px]">
              verified
            </span>
            <span className="font-label-sm text-label-sm text-on-secondary-container font-semibold tracking-wider uppercase">
              Penyelesaian Resmi
            </span>
          </div>
          <h2 className="font-headline-md text-headline-md text-on-surface font-bold tracking-tight">
            {isInvestor ? 'Beri Ulasan Mitra UMKM' : 'Beri Ulasan Kemitraan'}
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {isInvestor
              ? `Siklus investasi ${target.agreementNumber} telah tuntas dengan hasil memuaskan.`
              : `Kerja sama ${target.agreementNumber} telah selesai dengan sukses.`}
          </p>
        </div>
        <button
          aria-label="Tutup"
          className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-colors flex-shrink-0 active:scale-95"
          type="button"
          onClick={() => navigate('/app/agreements')}
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>

      {/* Partnership Completed Summary Card */}
      <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-space-sm">
        <div className="flex items-center justify-between gap-space-xs">
          <div className="flex items-center gap-space-sm min-w-0">
            <PartnerAvatar name={name} avatarUrl={target.partner.avatarUrl} />
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-title-md text-title-md text-on-surface font-bold truncate">
                  {name}
                </span>
                <span
                  className="material-symbols-outlined text-secondary text-[16px] flex-shrink-0"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  verified
                </span>
              </div>
              <span className="font-label-md text-label-md text-on-surface-variant truncate">
                {target.agreementNumber} · {COOPERATION_LABEL[target.cooperationType]}
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-semibold flex items-center gap-1 flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
            Sukses 100%
          </span>
        </div>
        {/* Financial Metrics Pill Matrix */}
        <div className="bg-surface-container-low rounded-lg p-space-sm flex flex-col gap-space-2xs">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              Skema Kerja Sama
            </span>
            <span className="font-label-md text-label-md text-on-surface font-bold">
              {COOPERATION_LABEL[target.cooperationType]}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              Nilai Pendanaan
            </span>
            <span className="font-label-md text-label-md text-on-surface font-bold" data-money>
              {formatRupiah(target.amount)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              Status Penyelesaian
            </span>
            <span className="font-label-md text-label-md text-secondary font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">event_available</span>
              Selesai 100%
            </span>
          </div>
        </div>
      </div>

      {/* Rating Form Sheet Container */}
      <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-space-lg">
        {error && (
          <div
            role="alert"
            className="px-3.5 py-3 rounded-xl bg-error-container border border-error/30 text-body-sm font-semibold text-on-error-container flex items-start gap-2"
          >
            <span className="material-symbols-outlined text-[18px] flex-shrink-0">error</span>
            <span className="flex-1">{error}</span>
            <button
              type="button"
              onClick={() => setError('')}
              aria-label="Tutup"
              className="flex-shrink-0 flex items-center"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        )}

        {/* Interactive Star Rating Block */}
        <div className="flex flex-col items-center text-center gap-space-xs">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">
            {isInvestor ? 'Pengalaman Kemitraan & Due Diligence' : 'Pengalaman Kerja Sama'}
          </span>
          {/* Stars Row */}
          <div
            aria-label="Beri Nilai Bintang"
            className="flex items-center gap-1.5 py-space-xs"
            role="radiogroup"
          >
            {[1, 2, 3, 4, 5].map((n) => {
              const active = n <= score;
              return (
                <button
                  key={n}
                  aria-label={`${n} Bintang`}
                  aria-checked={score === n}
                  role="radio"
                  className={`w-11 h-11 rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-transform ${
                    active ? 'text-[#d97706]' : 'text-outline-variant'
                  }`}
                  type="button"
                  onClick={() => setScore(n)}
                >
                  <span
                    className="material-symbols-outlined text-[34px]"
                    style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    star
                  </span>
                </button>
              );
            })}
          </div>
          {/* Dynamic Feedback Label Pill */}
          <div className="inline-flex items-center gap-1.5 px-space-sm py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-md text-label-md font-semibold transition-all">
            <span className="material-symbols-outlined text-[16px]">
              {label ? label.icon : 'star'}
            </span>
            <span>{label ? label.text : 'Ketuk bintang untuk menilai'}</span>
          </div>
        </div>

        {/* Quick Option Pill Tags */}
        <div className="flex flex-col gap-space-xs">
          <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
            Karakteristik Kemitraan (Pilih yang relevan):
          </span>
          <div className="flex flex-wrap gap-space-xs">
            {tagOptions.map((tag) => {
              const selected = tags.includes(tag);
              return (
                <button
                  key={tag}
                  className={`px-3.5 py-2 rounded-full font-label-md text-label-md font-medium flex items-center gap-1.5 transition-all active:scale-95 ${
                    selected
                      ? 'bg-primary-container text-on-primary shadow-sm'
                      : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container'
                  }`}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleTag(tag)}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {selected ? 'check' : 'add'}
                  </span>
                  <span>{tag}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Review Textarea Input */}
        <div className="flex flex-col gap-space-2xs">
          <div className="flex justify-between items-center">
            <label
              className="font-label-md text-label-md text-on-surface font-semibold flex items-center gap-1"
              htmlFor="review-text"
            >
              <span>Ulasan Teks Singkat</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant font-normal">
                (Opsional)
              </span>
            </label>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              {review.length} / {REVIEW_MAX}
            </span>
          </div>
          <div className="relative bg-surface-container-lowest rounded-xl p-space-sm shadow-sm focus-within:shadow-md transition-shadow">
            <textarea
              className="w-full bg-transparent font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none resize-none"
              id="review-text"
              maxLength={REVIEW_MAX}
              placeholder={`Bagaimana pengalaman kerja sama Anda bersama ${firstName}? (Contoh: pembagian hasil lancar, komunikasi suportif, dll.)`}
              rows={3}
              value={review}
              onChange={(e) => setReview(e.target.value)}
            />
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">lock</span>
            Data terenkripsi dan diverifikasi oleh sistem Modalin.
          </p>
        </div>
      </div>

      <TrustBanner isInvestor={isInvestor} />

      {/* Submit Action Button Shelf */}
      <div className="flex flex-col gap-space-xs pt-space-xs pb-space-sm">
        <button
          className="w-full h-touch-target-min min-h-[52px] rounded-xl bg-primary-container text-on-primary font-label-lg text-label-lg font-bold flex items-center justify-center gap-space-xs shadow-md hover:bg-secondary active:scale-[0.98] transition-all disabled:opacity-60"
          type="button"
          disabled={score < 1 || submit.isPending}
          onClick={() => submit.mutate()}
        >
          {submit.isPending ? (
            <>
              <span className="material-symbols-outlined text-[20px] animate-spin">
                progress_activity
              </span>
              <span>Menyimpan Ulasan...</span>
            </>
          ) : (
            <>
              <span>{isInvestor ? 'Kirim Ulasan & Rekomendasi' : 'Kirim Ulasan & Rating'}</span>
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </>
          )}
        </button>
        {score < 1 && (
          <p className="font-body-sm text-body-sm text-on-surface-variant text-center">
            Pilih dulu jumlah bintangnya.
          </p>
        )}
        <div className="flex items-center justify-center gap-1 text-center">
          <span className="material-symbols-outlined text-secondary text-[14px]">policy</span>
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            Sesuai UU ITE &amp; Tata Kelola Modalin
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Potongan mockup bersama ---------------- */

function PartnerAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  if (avatarUrl) {
    return (
      <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 shadow-sm bg-surface-container">
        <img className="w-full h-full object-cover" src={avatarUrl} alt={name} />
      </div>
    );
  }
  return (
    <div
      className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 shadow-sm bg-primary-container text-on-primary flex items-center justify-center font-bold font-title-md text-title-md"
      aria-hidden="true"
    >
      {initials(name)}
    </div>
  );
}

function TrustBanner({ isInvestor }: { isInvestor: boolean }) {
  return (
    <div className="bg-surface-container rounded-xl p-space-md flex gap-space-sm items-start">
      <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-on-secondary flex-shrink-0 mt-0.5">
        <span className="material-symbols-outlined text-[20px]">shield_with_heart</span>
      </div>
      <div className="flex flex-col gap-1 min-w-0">
        <h3 className="font-title-md text-title-md text-on-surface font-bold">
          {isInvestor ? 'Dampak Skor Kepercayaan Mitra (Modalin Trust Index™)' : 'Dampak Skor Reputasi Komunitas'}
        </h3>
        <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
          {isInvestor
            ? 'Ulasan dari Anda selaku investor terverifikasi akan langsung meningkatkan Skor Kepercayaan (Trust Score) mitra dan membuka akses pendanaan skala lebih besar. Penilaian bersifat permanen guna menjaga transparansi.'
            : 'Ulasan Anda akan langsung memperbarui Skor Kepercayaan & Reputasi mitra di ekosistem Modalin. Penilaian bersifat permanen guna menjaga transparansi antara pengusaha dan pemodal dampak.'}
        </p>
      </div>
    </div>
  );
}
