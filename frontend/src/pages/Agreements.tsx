import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  COOPERATION_HELP,
  COOPERATION_LABEL,
  endpoints,
  type Agreement,
  type CooperationType,
} from '../lib/api';
import { EmptyState, Spinner } from '../components/ui';
import { SignaturePad } from '../components/SignaturePad';
import { formatRupiah, formatTanggal } from '../lib/format';
import { readSession } from '../lib/session';

/**
 * Port 1:1 dari Mockup/a11. Form Kesepakatan & Tanda Tangan Digital.html
 * (perspektif UMKM) + Mockup/b9 (perspektif investor): label TTD Pemodal,
 * Ringkasan Komitmen Investasi, Plafon Komitmen Modal, Pihak 1 (Mitra Usaha)
/ Pihak 2 (Pemodal), dan Lihat Dokumen Penuh bercabang via peran sesi.
 * Klaim OJK/PSrE mockup tidak diport (disclaimer jujur UU ITE dipertahankan).
 * (route /app/agreements). Section, class Tailwind, copy, dan ikon Material
 * Symbols dipertahankan verbatim; angka, nama pihak, status, dan aksi diisi
 * dari API.
 *
 * Modul 6 di sisi klien — FR-10 dan FR-11. Gerbang "tolak generate kalau
 * salah satu pihak belum tanda tangan" ditegakkan di server; halaman ini
 * menjelaskan alasannya supaya pengguna tahu apa yang ditunggu, bukan
 * sekadar menyembunyikan tombol.
 */

const STATUS_LABEL: Record<Agreement['status'], { text: string; tone: 'soft' | 'warning' | 'success' | 'primary' }> = {
  DRAFT: { text: 'Draf', tone: 'soft' },
  WAITING_SIGNATURE: { text: 'Menunggu Tanda Tangan', tone: 'warning' },
  SIGNED: { text: 'Siap Terbit', tone: 'primary' },
  ACTIVE: { text: 'Berjalan', tone: 'success' },
  COMPLETED: { text: 'Selesai', tone: 'success' },
  CANCELLED: { text: 'Dibatalkan', tone: 'soft' },
};

const STATUS_PILL: Record<'soft' | 'warning' | 'success' | 'primary', string> = {
  soft: 'bg-surface-container-high text-on-surface-variant',
  warning: 'bg-[#FBEFD2] text-[#8A5A00]',
  primary: 'bg-primary-container text-on-primary',
  success: 'bg-secondary-container text-on-secondary-container',
};

const TYPES: CooperationType[] = ['BAGI_HASIL', 'PENYERTAAN_MODAL', 'PINJAMAN'];

const DOC_SUBTITLE: Record<CooperationType, string> = {
  BAGI_HASIL: "(AKAD KEMITRAAN SYIRKAH 'INAN)",
  PENYERTAAN_MODAL: '(AKAD PENYERTAAN MODAL USAHA)',
  PINJAMAN: '(AKAD PINJAMAN MODAL USAHA)',
};

/** Angka pokok yang relevan dengan skemanya saja. */
function schemeExtra(agreement: Agreement): { label: string; value: string; short: string } | null {
  if (agreement.cooperationType === 'BAGI_HASIL' && agreement.profitSharingRatio != null) {
    return {
      label: 'Nisbah / Bagi Hasil',
      value: `${Number(agreement.profitSharingRatio)}% dari penjualan bersih`,
      short: `${Number(agreement.profitSharingRatio)}%`,
    };
  }
  if (agreement.cooperationType === 'PENYERTAAN_MODAL' && agreement.equityPercentage != null) {
    return {
      label: 'Kepemilikan Pemodal',
      value: `${Number(agreement.equityPercentage)}% kepemilikan usaha`,
      short: `${Number(agreement.equityPercentage)}%`,
    };
  }
  if (agreement.cooperationType === 'PINJAMAN' && agreement.interestRate != null) {
    return {
      label: 'Imbal Hasil / Tahun',
      value: `${Number(agreement.interestRate)}% imbal hasil per tahun`,
      short: `${Number(agreement.interestRate)}%`,
    };
  }
  return null;
}

export function AgreementsPage() {
  const [params] = useSearchParams();
  const fromConversation = params.get('conversation');
  const [creating, setCreating] = useState(Boolean(fromConversation));

  const { data, isLoading, isError } = useQuery({
    queryKey: ['agreements'],
    queryFn: endpoints.agreements,
    staleTime: 15_000,
  });

  const list = data ?? [];

  return (
    <div className="flex flex-col w-full px-gutter-mobile pt-4 pb-6 max-w-md mx-auto">
      <div className="flex flex-col gap-1 pt-1">
        <h1 className="font-headline-sm text-headline-sm text-on-surface">Dokumen kesepakatan</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Susun, tandatangani, dan terbitkan surat perjanjian kerja sama.
        </p>
      </div>

      {creating && (
        <div className="mt-space-md">
          <CreateForm conversationId={fromConversation} onDone={() => setCreating(false)} />
        </div>
      )}

      {isLoading && (
        <div className="mt-space-md">
          <Spinner />
        </div>
      )}
      {isError && (
        <div className="mt-space-md">
          <EmptyState icon="warning" title="Gagal memuat dokumen" message="Coba lagi sebentar lagi." />
        </div>
      )}
      {!isLoading && !isError && list.length === 0 && !creating && (
        <div className="mt-space-md">
          <EmptyState
            icon="document"
            title="Belum ada dokumen"
            message="Kesepakatan disusun setelah negosiasi di ruang chat menemui titik temu."
            action={
              <Link
                className="h-touch-target-min px-space-md bg-surface-container-lowest text-on-surface rounded-lg font-label-md text-label-md inline-flex items-center justify-center gap-1.5 shadow-sm"
                to="/app/chat"
              >
                <span className="material-symbols-outlined text-[18px] text-secondary">chat</span>
                <span>Buka percakapan</span>
              </Link>
            }
          />
        </div>
      )}

      {list.length > 0 && (
        <div className="mt-space-md flex flex-col gap-space-xl">
          {list.map((agreement) => (
            <AgreementCard key={agreement.id} agreement={agreement} />
          ))}
        </div>
      )}

      {/* Action shelf ala Stitch: CTA utama di zona jempol, di atas bottom nav. */}
      <div className="sticky bottom-[76px] z-30 mt-space-xl bg-surface/95 backdrop-blur-md p-space-md rounded-xl shadow-[0_-4px_16px_rgba(15,36,25,0.08)] flex flex-col gap-space-2xs">
        <div className="flex items-center justify-center gap-1 text-on-surface-variant mb-1">
          <span className="material-symbols-outlined text-[14px] text-secondary">lock</span>
          <span className="font-label-sm text-label-sm">Enkripsi 256-bit SHA2 &amp; Stempel Waktu Resmi</span>
        </div>
        {creating ? (
          <button
            className="w-full h-touch-target-min bg-surface-container-high text-on-surface rounded-xl font-headline-sm text-headline-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            type="button"
            onClick={() => setCreating(false)}
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
            <span>Tutup Formulir</span>
          </button>
        ) : (
          <button
            className="w-full h-touch-target-min bg-primary-container hover:bg-secondary text-on-primary rounded-xl font-headline-sm text-headline-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98]"
            type="button"
            onClick={() => setCreating(true)}
          >
            <span className="material-symbols-outlined text-[20px]">post_add</span>
            <span>Susun Kesepakatan Baru</span>
          </button>
        )}
      </div>
    </div>
  );
}

function AgreementCard({ agreement }: { agreement: Agreement }) {
  const session = readSession();
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const [signing, setSigning] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);

  const c = agreement.connection;
  const partner = c.senderId === session?.id ? c.receiver : c.sender;
  const senderName = c.sender.profile?.fullName ?? 'Pihak 1';
  const receiverName = c.receiver.profile?.fullName ?? 'Mitra';
  const mySignature = agreement.signatures.find((s) => s.userId === session?.id);
  // b9 (perspektif investor): label TTD, ringkasan komitmen, dan penanda
  // pihak mengikuti copy mockup investor; alur FR-10/FR-11 tidak berubah.
  const isInvestor = session?.role === 'INVESTOR';
  const signatureCount = agreement.signatures.length;
  const status = STATUS_LABEL[agreement.status];
  const canPublish = signatureCount >= 2;
  const extra = schemeExtra(agreement);
  const needsRating =
    agreement.status === 'COMPLETED' && !agreement.ratings.some((r) => r.reviewerId === session?.id);

  // Susun → Detail → Pratinjau → TTD, dibaca dari status yang ada.
  const doneCount = agreement.documentUrl ? 4 : signatureCount > 0 ? 3 : 2;

  const sign = useMutation({
    mutationFn: () => endpoints.sign(agreement.id, new File([blob!], 'ttd.png', { type: 'image/png' })),
    onSuccess: () => {
      setSigning(false);
      setBlob(null);
      setError('');
      qc.invalidateQueries({ queryKey: ['agreements'] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Tanda tangan gagal disimpan.'),
  });

  const generate = useMutation({
    mutationFn: () => endpoints.generatePdf(agreement.id),
    onSuccess: () => {
      setError('');
      qc.invalidateQueries({ queryKey: ['agreements'] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Dokumen gagal diterbitkan.'),
  });

  const complete = useMutation({
    mutationFn: () => endpoints.completeAgreement(agreement.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agreements'] });
      qc.invalidateQueries({ queryKey: ['pending-ratings'] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Gagal menandai selesai.'),
  });

  const parties = [
    { key: '1', userId: c.sender.id, name: senderName },
    { key: '2', userId: c.receiver.id, name: receiverName },
  ];

  return (
    <article className="flex flex-col gap-space-md" aria-label={`Kesepakatan ${agreement.agreementNumber}`}>
      {/* Reference bar */}
      <div className="px-space-md py-space-xs bg-surface-container-low rounded-full flex items-center justify-between">
        <div className="flex items-center gap-space-2xs min-w-0">
          <span className="material-symbols-outlined text-secondary text-[18px]">verified_user</span>
          <span className="font-label-md text-label-md text-on-surface truncate">Ref: {agreement.agreementNumber}</span>
        </div>
        <div className="flex items-center gap-1 bg-surface-container-high px-space-xs py-0.5 rounded-full shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            {agreement.documentUrl ? 'Sah UU ITE' : status.text}
          </span>
        </div>
      </div>

      {/* Step progress indicator */}
      <div className="px-space-md pt-space-md pb-space-sm bg-surface-container-lowest rounded-xl shadow-[0_2px_8px_-2px_rgba(15,36,25,0.05),0_8px_16px_-4px_rgba(15,36,25,0.03)]">
        <div className="flex items-center justify-between relative mb-space-sm">
          <div className="absolute top-3.5 left-3 right-3 h-0.5 bg-surface-container-high"></div>
          <div
            className="absolute top-3.5 left-3 h-0.5 bg-secondary transition-all duration-500"
            style={{ width: `calc(${(doneCount / 4) * 100}% - ${(doneCount / 4) * 24}px)` }}
          ></div>
          {[
            { label: '1. Skema', icon: null as string | null },
            { label: '2. Detail', icon: null as string | null },
            { label: '3. Pratinjau', icon: null as string | null },
            { label: isInvestor ? '4. TTD Pemodal' : '4. TTD', icon: 'draw' as string | null },
          ].map((step, idx) => {
            const done = idx < doneCount;
            const current = idx === doneCount && doneCount < 4;
            return (
              <div key={step.label} className="flex flex-col items-center gap-1 z-10">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shadow-sm ${
                    done
                      ? 'bg-secondary text-on-secondary'
                      : current
                        ? 'bg-primary-container text-on-primary shadow-md'
                        : 'bg-secondary-container text-on-secondary-container'
                  }`}
                >
                  {done ? (
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  ) : current || !step.icon ? (
                    <span className="font-label-sm text-label-sm">{idx + 1}</span>
                  ) : (
                    <span className="material-symbols-outlined text-[16px]">{step.icon}</span>
                  )}
                </div>
                <span
                  className={`font-label-sm text-label-sm font-bold ${
                    done ? 'text-secondary' : current ? 'text-primary' : 'text-on-secondary-container'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-space-xs overflow-x-auto py-1">
          <div className="flex items-center gap-1 bg-surface-container-low px-2 py-1 rounded-full shrink-0">
            <span className="material-symbols-outlined text-secondary text-[14px]">check_circle</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              {COOPERATION_LABEL[agreement.cooperationType]}
              {extra ? ` (${extra.short})` : ''}
            </span>
          </div>
          <div className="flex items-center gap-1 bg-surface-container-low px-2 py-1 rounded-full shrink-0">
            <span className="material-symbols-outlined text-secondary text-[14px]">check_circle</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              {formatRupiah(Number(agreement.amount))}
              {agreement.tenorMonths ? ` / ${agreement.tenorMonths} Bln` : ''}
            </span>
          </div>
          <div className="flex items-center gap-1 bg-secondary-container px-2 py-1 rounded-full shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
            <span className="font-label-sm text-label-sm text-on-secondary-container font-bold">{status.text}</span>
          </div>
        </div>
      </div>

      {/* Card 1: Ringkasan poin akad */}
      <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-[0_2px_8px_-2px_rgba(15,36,25,0.05),0_8px_16px_-4px_rgba(15,36,25,0.03)] flex flex-col gap-space-sm">
        <div className="flex items-center justify-between">
          <span className="font-label-sm text-label-sm text-secondary font-bold uppercase tracking-wider">
            {isInvestor ? 'Ringkasan Komitmen Investasi' : 'Ringkasan Poin Akad'}
          </span>
          <span className="font-label-sm text-label-sm bg-surface-container-low px-2 py-0.5 rounded text-on-surface-variant">
            Auto-Generated
          </span>
        </div>
        <div className="grid grid-cols-2 gap-space-xs bg-surface-container-low p-space-xs rounded-lg">
          <div className="flex flex-col p-1.5">
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              {isInvestor ? 'Plafon Komitmen Modal' : 'Plafon Modal'}
            </span>
            <span className="font-headline-sm text-headline-sm text-on-surface mt-0.5" data-money>
              {formatRupiah(Number(agreement.amount))}
            </span>
          </div>
          <div className="flex flex-col p-1.5">
            <span className="font-label-sm text-label-sm text-on-surface-variant">{extra?.label ?? 'Skema'}</span>
            <span className="font-title-md text-title-md text-secondary mt-0.5">
              {extra?.value ?? COOPERATION_LABEL[agreement.cooperationType]}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-space-2xs pt-1">
          <div className="flex items-center justify-between py-1 bg-surface-container-lowest">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant shrink-0">store</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
                {isInvestor ? 'Pihak 1 (Mitra Usaha):' : 'Pihak 1:'}
              </span>
            </div>
            <span className="font-label-md text-label-md text-on-surface font-semibold shrink-0">{senderName}</span>
          </div>
          <div className="flex items-center justify-between py-1 bg-surface-container-lowest">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant shrink-0">
                account_balance_wallet
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
                {isInvestor ? 'Pihak 2 (Pemodal):' : 'Pihak 2:'}
              </span>
            </div>
            <span className="font-label-md text-label-md text-on-surface font-semibold shrink-0">{receiverName}</span>
          </div>
          <div className="flex items-center justify-between py-1 bg-surface-container-lowest">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant shrink-0">handshake</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
                {COOPERATION_LABEL[agreement.cooperationType]} · dengan {partner.profile?.fullName ?? 'Mitra'}
              </span>
            </div>
            <span className={`font-label-sm text-label-sm px-2 py-0.5 rounded-full font-semibold ${STATUS_PILL[status.tone]}`}>
              {status.text}
            </span>
          </div>
        </div>
      </div>

      {/* Card 2: Pratinjau dokumen */}
      <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-[0_2px_8px_-2px_rgba(15,36,25,0.05),0_8px_16px_-4px_rgba(15,36,25,0.03)] flex flex-col gap-space-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-2xs">
            <span className="material-symbols-outlined text-primary text-[20px]">description</span>
            <h2 className="font-title-md text-title-md text-on-surface">Pratinjau Dokumen SPK</h2>
          </div>
          <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-semibold">
            Tahap 3
          </span>
        </div>
        <div className="relative bg-surface-container-low rounded-lg p-space-md shadow-inner overflow-hidden flex flex-col gap-space-xs">
          <div className="absolute -right-4 -bottom-4 rotate-[-18deg] pointer-events-none opacity-80 flex flex-col items-center justify-center p-3 rounded-xl bg-surface-container-high shadow-sm">
            <div className="flex items-center gap-1 text-secondary">
              <span className="material-symbols-outlined text-[18px]">verified</span>
              <span className="font-label-sm text-label-sm font-extrabold uppercase tracking-widest text-secondary">
                {agreement.documentUrl ? 'SAH MODALIN' : 'DRAF SAH MODALIN'}
              </span>
            </div>
            <span className="font-label-sm text-[9px] text-on-surface-variant">INTEGRITAS HUKUM RI</span>
          </div>
          <div className="flex flex-col items-center text-center pb-space-xs">
            <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center mb-1">
              <span className="material-symbols-outlined text-[18px]">gavel</span>
            </div>
            <h3 className="font-label-md text-label-md text-on-surface font-bold uppercase tracking-tight">
              Surat Perjanjian Kerjasama Pembiayaan Modal Usaha
            </h3>
            <p className="font-label-sm text-label-sm text-secondary font-semibold mt-0.5">
              {DOC_SUBTITLE[agreement.cooperationType]}
            </p>
            <span className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
              Nomor: {agreement.agreementNumber}
            </span>
          </div>
          <div className="flex flex-col gap-space-2xs bg-surface-container-lowest p-space-xs rounded text-on-surface">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm font-bold text-primary">Skema &amp; Nilai Kesepakatan</span>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed mt-0.5 line-clamp-2">
                {COOPERATION_LABEL[agreement.cooperationType]} senilai {formatRupiah(Number(agreement.amount))}
                {extra ? ` — ${extra.value.toLowerCase()}` : ''}.
              </p>
            </div>
            <div className="flex flex-col pt-1">
              <span className="font-label-sm text-label-sm font-bold text-primary">Jangka Waktu &amp; Tanda Tangan</span>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed mt-0.5 line-clamp-2">
                Mulai {formatTanggal(agreement.startDate)}
                {agreement.endDate ? ` sampai ${formatTanggal(agreement.endDate)}` : ''}
                {agreement.tenorMonths ? `, tenor ${agreement.tenorMonths} bulan` : ''}. Tanda tangan
                terkumpul {signatureCount}/2.
              </p>
            </div>
            {agreement.terms && (
              <div className="flex flex-col pt-1">
                <span className="font-label-sm text-label-sm font-bold text-primary">Ketentuan Tambahan</span>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed mt-0.5 line-clamp-2">
                  {agreement.terms}
                </p>
              </div>
            )}
          </div>

          {error && (
            <div
              className="px-3.5 py-3 rounded-xl bg-[#ffdad6] border border-[#ba1a1a]/30 text-[13px] font-semibold text-[#93000a] flex items-start justify-between gap-2"
              role="alert"
            >
              <span>{error}</span>
              <button type="button" onClick={() => setError('')} aria-label="Tutup" className="shrink-0">
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          )}

          {/* FR-10/FR-11 — terbitkan PDF hanya kalau dua tanda tangan lengkap. */}
          {agreement.documentUrl ? (
            <div className="flex items-center gap-space-xs pt-1">
              <a
                className="flex-1 h-touch-target-min bg-surface-container-lowest hover:bg-surface text-on-surface rounded-lg font-label-md text-label-md flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                href={agreement.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="material-symbols-outlined text-[18px] text-secondary">download</span>
                <span>Unduh Draf PDF</span>
              </a>
              <a
                className="flex-1 h-touch-target-min bg-surface-container-lowest hover:bg-surface text-on-surface rounded-lg font-label-md text-label-md flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                href={agreement.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant">open_in_full</span>
                <span>{isInvestor ? 'Lihat Dokumen Penuh' : 'Layar Penuh'}</span>
              </a>
            </div>
          ) : (
            agreement.status !== 'CANCELLED' && (
              <div className="flex items-center gap-space-xs pt-1">
                <button
                  className="flex-1 h-touch-target-min bg-surface-container-lowest hover:bg-surface text-on-surface rounded-lg font-label-md text-label-md flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all disabled:opacity-50"
                  type="button"
                  disabled={generate.isPending || !canPublish}
                  onClick={() => generate.mutate()}
                >
                  <span className="material-symbols-outlined text-[18px] text-secondary">picture_as_pdf</span>
                  <span>{generate.isPending ? 'Menerbitkan…' : 'Terbitkan PDF final'}</span>
                </button>
                {agreement.status === 'ACTIVE' ? (
                  <button
                    className="flex-1 h-touch-target-min bg-surface-container-lowest hover:bg-surface text-on-surface rounded-lg font-label-md text-label-md flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all disabled:opacity-50"
                    type="button"
                    disabled={complete.isPending}
                    onClick={() => complete.mutate()}
                  >
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant">check_circle</span>
                    <span>Tandai selesai</span>
                  </button>
                ) : needsRating ? (
                  <Link
                    className="flex-1 h-touch-target-min bg-surface-container-lowest hover:bg-surface text-on-surface rounded-lg font-label-md text-label-md flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                    to={`/app/rating/${agreement.id}`}
                  >
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant">star</span>
                    <span>Beri ulasan</span>
                  </Link>
                ) : (
                  <span className="flex-1 h-touch-target-min bg-surface-container text-on-surface-variant rounded-lg font-label-md text-label-md flex items-center justify-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px]">hourglass_top</span>
                    <span>{signatureCount}/2 TTD</span>
                  </span>
                )}
              </div>
            )
          )}
          {!agreement.documentUrl && agreement.status !== 'CANCELLED' && !canPublish && (
            <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
              Menunggu tanda tangan mitra ({signatureCount}/2). Dokumen terbit setelah kedua pihak menandatangani.
            </p>
          )}
        </div>
      </div>

      {/* Card 3: Tanda tangan digital */}
      <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-[0_2px_8px_-2px_rgba(15,36,25,0.05),0_8px_16px_-4px_rgba(15,36,25,0.03)] flex flex-col gap-space-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-2xs">
            <span className="material-symbols-outlined text-secondary text-[20px]">gesture</span>
            <h2 className="font-title-md text-title-md text-on-surface">
              {isInvestor ? 'Tanda Tangan Digital Pemodal' : 'Tanda Tangan Digital'}
            </h2>
          </div>
          <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-semibold">
            Tahap 4
          </span>
        </div>

        <div className="flex flex-col gap-space-xs">
          {parties.map((party) => {
            const sig = agreement.signatures.find((s) => s.userId === party.userId);
            const isMe = party.userId === session?.id;
            if (sig) {
              return (
                <div key={party.key} className="p-space-xs bg-surface-container-low rounded-lg flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center mt-0.5 shrink-0">
                      <span className="material-symbols-outlined text-[14px]">check</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-md text-label-md text-on-surface font-semibold">
                        Pihak {party.key} ({party.name}){isMe ? ' · Kamu' : ''}
                      </span>
                      <span className="font-body-sm text-body-sm text-secondary">Telah ditandatangani digital</span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        {formatTanggal(sig.signedAt)} · via Modalin
                      </span>
                    </div>
                  </div>
                  <span className="font-label-sm text-label-sm bg-secondary text-on-secondary px-2 py-0.5 rounded font-bold">
                    Sah
                  </span>
                </div>
              );
            }
            return (
              <div key={party.key} className="p-space-xs bg-surface-container-high rounded-lg flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center justify-center mt-0.5 shrink-0">
                  <span className="material-symbols-outlined text-[14px]">hourglass_top</span>
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-label-md text-label-md text-on-surface font-semibold">
                      Pihak {party.key} ({party.name}){isMe ? ' · Kamu' : ''}
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">Menunggu</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 leading-tight">
                    {isMe
                      ? 'Giliranmu — ketuk kanvas di bawah untuk membubuhkan tanda tangan.'
                      : `Menunggu ${party.name} menandatangani dari akunnya. Dokumen terbit setelah kedua pihak menandatangani.`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {!mySignature && agreement.status !== 'CANCELLED' && !agreement.documentUrl && (
          <div className="flex flex-col gap-space-xs mt-1">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-on-surface font-bold uppercase">
                Goreskan Spesimen / Verifikasi Ulang
              </span>
              <span className="font-label-sm text-label-sm text-secondary">Layar Sentuh Aktif</span>
            </div>
            {!signing ? (
              <button
                type="button"
                onClick={() => setSigning(true)}
                className="relative w-full h-36 bg-surface-container-low rounded-xl overflow-hidden shadow-inner flex flex-col justify-end p-space-sm cursor-crosshair text-left active:scale-[0.99] transition-transform"
                aria-label="Bubuhkan tanda tangan"
              >
                <span className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                  <span className="font-label-md text-label-md text-on-surface-variant tracking-widest">
                    TAP / USAP UNTUK TTD
                  </span>
                </span>
                <span className="w-full flex items-center justify-between pt-1">
                  <span className="flex items-center gap-1 text-secondary">
                    <span className="material-symbols-outlined text-[14px]">draw</span>
                    <span className="font-label-sm text-label-sm">Bubuhkan tanda tangan</span>
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Baseline Tanda Tangan</span>
                </span>
              </button>
            ) : (
              <div className="flex flex-col gap-space-xs">
                <div className="bg-surface-container-low rounded-xl p-space-sm shadow-inner">
                  <SignaturePad onChange={setBlob} />
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  Tanda tangan elektronik ini sah menurut Pasal 11 UU ITE, namun belum tersertifikasi PSrE
                  sehingga kekuatan pembuktiannya di bawah dokumen bersertifikat dan tidak setara akta notaris.
                </p>
                <div className="flex items-center justify-between gap-space-xs">
                  <button
                    className="h-touch-target-min px-space-sm bg-surface-container text-on-surface-variant hover:text-on-surface rounded-lg font-label-md text-label-md flex items-center gap-1 active:scale-95 transition-all"
                    type="button"
                    onClick={() => {
                      setSigning(false);
                      setBlob(null);
                    }}
                  >
                    <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                    <span>Batal</span>
                  </button>
                  <button
                    className="h-touch-target-min px-space-md bg-secondary-container hover:bg-secondary text-on-secondary-container hover:text-on-secondary rounded-lg font-label-md text-label-md flex items-center gap-1.5 active:scale-95 transition-all shadow-sm disabled:opacity-50"
                    type="button"
                    disabled={!blob || sign.isPending}
                    onClick={() => sign.mutate()}
                  >
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    <span>{sign.isPending ? 'Menyimpan…' : 'Simpan tanda tangan'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {mySignature && !agreement.documentUrl && (
          <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
            Kamu sudah menandatangani {formatTanggal(mySignature.signedAt)}.
            {signatureCount < 2 && ' Menunggu tanda tangan mitra.'}
          </p>
        )}
      </div>

      {/* Legal & security trust card */}
      <div className="bg-surface-container-low rounded-xl p-space-sm flex items-center gap-space-sm">
        <div className="w-10 h-10 rounded-full bg-surface-container-highest text-secondary flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[22px]">policy</span>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-label-md text-label-md text-on-surface font-bold">Kekuatan Pembuktian Hukum</span>
          <p className="font-body-sm text-body-sm text-on-surface-variant leading-tight mt-0.5">
            Sah menurut Pasal 11 UU ITE, namun belum tersertifikasi PSrE dan bukan pengawasan OJK.
          </p>
        </div>
      </div>
    </article>
  );
}

/** Form kesepakatan — field yang diminta berbeda per skema. */
function CreateForm({ conversationId, onDone }: { conversationId: string | null; onDone: () => void }) {
  const qc = useQueryClient();
  const [type, setType] = useState<CooperationType>('BAGI_HASIL');
  const [error, setError] = useState('');

  const { data: conversations } = useQuery({ queryKey: ['conversations'], queryFn: endpoints.conversations });
  const { data: connections } = useQuery({ queryKey: ['connections'], queryFn: endpoints.connections });

  // Kalau datang dari ruang chat, koneksinya sudah diketahui.
  const preselected = conversationId
    ? conversations?.find((c) => c.id === conversationId)?.connectionId ?? ''
    : '';
  const acceptedConnections = (connections ?? []).filter((c) => c.status === 'ACCEPTED');

  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) => endpoints.createAgreement(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agreements'] });
      onDone();
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Gagal menyusun kesepakatan.'),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const raw = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    if (!raw.connectionId) return setError('Pilih koneksi yang akan dibuatkan kesepakatan.');

    create.mutate({
      connectionId: raw.connectionId,
      cooperationType: type,
      amount: Number(raw.amount || 0),
      startDate: raw.startDate,
      endDate: raw.endDate || undefined,
      tenorMonths: raw.tenorMonths ? Number(raw.tenorMonths) : undefined,
      profitSharingRatio: type === 'BAGI_HASIL' ? Number(raw.profitSharingRatio || 0) : undefined,
      equityPercentage: type === 'PENYERTAAN_MODAL' ? Number(raw.equityPercentage || 0) : undefined,
      interestRate: type === 'PINJAMAN' ? Number(raw.interestRate || 0) : undefined,
      terms: raw.terms || undefined,
    });
  }

  const inputCls =
    'w-full h-[52px] px-4 rounded-xl bg-surface-container-low text-on-surface placeholder:text-outline font-body-md text-body-md shadow-sm focus:outline-none focus:bg-surface-bright transition-all';

  return (
    <form
      className="bg-surface-container-lowest rounded-xl p-space-md shadow-[0_2px_8px_-2px_rgba(15,36,25,0.05),0_8px_16px_-4px_rgba(15,36,25,0.03)] flex flex-col gap-space-md"
      onSubmit={onSubmit}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-space-2xs">
          <span className="material-symbols-outlined text-primary text-[20px]">description</span>
          <h2 className="font-title-md text-title-md text-on-surface">Susun kesepakatan</h2>
        </div>
        <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-semibold">
          Tahap 1–2
        </span>
      </div>

      {conversationId && (
        <div className="flex items-center gap-2 px-3.5 py-3 rounded-xl bg-secondary-container/50 text-[12px] font-medium text-on-secondary-container">
          <span className="material-symbols-outlined text-[18px]">chat</span>
          <span>Disusun dari percakapan — koneksi sudah dipilih otomatis.</span>
        </div>
      )}
      {error && (
        <div
          className="px-3.5 py-3 rounded-xl bg-[#ffdad6] border border-[#ba1a1a]/30 text-[13px] font-semibold text-[#93000a]"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="font-label-md text-label-md text-on-surface font-semibold" htmlFor="ag-connection">
          Kerja sama dengan
        </label>
        <div className="relative flex items-center">
          <select id="ag-connection" className={`${inputCls} pr-10 appearance-none`} name="connectionId" defaultValue={preselected}>
            <option value="">Pilih mitra…</option>
            {acceptedConnections.map((c) => {
              const partner = c.direction === 'keluar' ? c.receiver : c.sender;
              return (
                <option key={c.id} value={c.id}>
                  {partner.profile?.fullName ?? 'Mitra'}
                  {c.fundingRequest ? ` — ${c.fundingRequest.title}` : ''}
                </option>
              );
            })}
          </select>
          <span className="material-symbols-outlined absolute right-3 text-on-surface-variant text-[20px] pointer-events-none">
            expand_more
          </span>
        </div>
      </div>

      <fieldset>
        <legend className="font-label-md text-label-md text-on-surface font-semibold mb-1.5">Skema kerja sama</legend>
        <div className="flex flex-col gap-space-xs">
          {TYPES.map((t) => (
            <label
              key={t}
              className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                type === t ? 'border-secondary bg-secondary-container/40' : 'border-outline-variant bg-surface-container-low'
              }`}
            >
              <input
                type="radio"
                name="cooperationType"
                value={t}
                checked={type === t}
                onChange={() => setType(t)}
                className="w-5 h-5 mt-0.5 accent-[#2c694e] shrink-0"
              />
              <span className="flex flex-col">
                <strong className="font-label-md text-label-md text-on-surface">{COOPERATION_LABEL[t]}</strong>
                <small className="font-body-sm text-body-sm text-on-surface-variant leading-snug">
                  {COOPERATION_HELP[t]}
                </small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label className="font-label-md text-label-md text-on-surface font-semibold" htmlFor="ag-amount">
          Nilai kerja sama
        </label>
        <div className="relative flex items-center">
          <span className="absolute left-4 font-label-md text-label-md text-on-surface-variant">Rp</span>
          <input
            id="ag-amount"
            className={`${inputCls} pl-11`}
            name="amount"
            inputMode="numeric"
            placeholder="150.000.000"
            required
          />
        </div>
      </div>

      {type === 'BAGI_HASIL' && (
        <div className="flex flex-col gap-1.5">
          <label className="font-label-md text-label-md text-on-surface font-semibold" htmlFor="ag-ratio">
            Porsi bagi hasil untuk pemodal (%)
          </label>
          <input
            id="ag-ratio"
            className={inputCls}
            name="profitSharingRatio"
            type="number"
            min={0}
            max={100}
            step="0.5"
            required
          />
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Bagian keuntungan bersih yang diterima pemodal.
          </p>
        </div>
      )}
      {type === 'PENYERTAAN_MODAL' && (
        <div className="flex flex-col gap-1.5">
          <label className="font-label-md text-label-md text-on-surface font-semibold" htmlFor="ag-equity">
            Persentase kepemilikan pemodal (%)
          </label>
          <input
            id="ag-equity"
            className={inputCls}
            name="equityPercentage"
            type="number"
            min={0}
            max={100}
            step="0.5"
            required
          />
          <p className="font-body-sm text-body-sm text-on-surface-variant">Porsi kepemilikan usaha yang diberikan.</p>
        </div>
      )}
      {type === 'PINJAMAN' && (
        <div className="flex flex-col gap-1.5">
          <label className="font-label-md text-label-md text-on-surface font-semibold" htmlFor="ag-rate">
            Imbal hasil per tahun (%)
          </label>
          <input
            id="ag-rate"
            className={inputCls}
            name="interestRate"
            type="number"
            min={0}
            max={100}
            step="0.5"
            required
          />
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Besaran imbal hasil yang disepakati di awal.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-space-sm">
        <div className="flex flex-col gap-1.5">
          <label className="font-label-md text-label-md text-on-surface font-semibold" htmlFor="ag-start">
            Tanggal mulai
          </label>
          <input id="ag-start" className={inputCls} name="startDate" type="date" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="font-label-md text-label-md text-on-surface font-semibold" htmlFor="ag-tenor">
            Tenor (bulan)
          </label>
          <input id="ag-tenor" className={inputCls} name="tenorMonths" type="number" min={1} max={240} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="font-label-md text-label-md text-on-surface font-semibold" htmlFor="ag-terms">
          Ketentuan tambahan (opsional)
        </label>
        <textarea
          id="ag-terms"
          className="w-full min-h-[96px] p-4 rounded-xl bg-surface-container-low text-on-surface placeholder:text-outline font-body-md text-body-md shadow-sm focus:outline-none focus:bg-surface-bright transition-all"
          name="terms"
          placeholder="mis. laporan hasil usaha disampaikan tiap kuartal"
        />
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Hasil negosiasi yang perlu ikut tercatat di dokumen.
        </p>
      </div>

      <div className="flex items-center gap-space-xs">
        <button
          type="button"
          className="flex-1 h-touch-target-min bg-surface-container text-on-surface-variant rounded-lg font-label-md text-label-md flex items-center justify-center active:scale-95 transition-all"
          onClick={onDone}
        >
          Batal
        </button>
        <button
          type="submit"
          className="flex-1 h-touch-target-min bg-primary-container text-on-primary rounded-xl font-label-md text-label-md flex items-center justify-center gap-1.5 shadow-md active:scale-[0.98] transition-all disabled:opacity-60"
          disabled={create.isPending}
        >
          <span className="material-symbols-outlined text-[18px]">send_and_archive</span>
          <span>{create.isPending ? 'Menyimpan…' : 'Susun dokumen'}</span>
        </button>
      </div>
    </form>
  );
}
