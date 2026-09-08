import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { COOPERATION_LABEL, endpoints, type Agreement } from '../lib/api';
import { readSession } from '../lib/session';
import { formatRupiah, formatTanggal } from '../lib/format';
import { EmptyState, Spinner } from '../components/ui';

/** Status masa berlaku yang dibaca pengguna awam, diturunkan dari status SPK. */
function validity(a: Agreement): { text: string; sub: string; pill: string; live: boolean } {
  switch (a.status) {
    case 'ACTIVE':
      return {
        text: 'Masih berlaku',
        sub: a.endDate ? `Berlaku sampai ${formatTanggal(a.endDate)}` : 'Sedang berjalan',
        pill: 'bg-secondary-container text-on-secondary-container',
        live: true,
      };
    case 'SIGNED':
      return {
        text: 'Segera berlaku',
        sub: a.documentUrl ? 'Sah UU ITE — menunggu penerbitan' : 'Kedua pihak sudah TTD',
        pill: 'bg-primary-container text-on-primary',
        live: true,
      };
    case 'WAITING_SIGNATURE': {
      const n = a.signatures.length;
      return {
        text: 'Belum berlaku',
        sub: `Menunggu tanda tangan (${n}/2)`,
        pill: 'bg-[#FBEFD2] text-[#8A5A00]',
        live: false,
      };
    }
    case 'DRAFT':
      return {
        text: 'Belum berlaku',
        sub: 'Masih draf — belum ditandatangani',
        pill: 'bg-surface-container-high text-on-surface-variant',
        live: false,
      };
    case 'COMPLETED':
      return {
        text: 'Sudah selesai',
        sub: 'Masa berlaku habis — arsip',
        pill: 'bg-surface-container-high text-on-surface-variant',
        live: false,
      };
    case 'CANCELLED':
      return {
        text: 'Tidak berlaku',
        sub: 'Dokumen dibatalkan',
        pill: 'bg-surface-container-high text-on-surface-variant',
        live: false,
      };
  }
}

/**
 * Riwayat dokumen perjanjian (route /app/dokumen, dari baris "Dokumen
 * Perjanjian & SPK Digital" di Profil UMKM). Ringkas per SPK: nomor, skema,
 * mitra, nilai, periode, dan apakah masih berlaku. Seluruhnya dari
 * endpoint perjanjian yang sudah ada; kelola/TTD tetap di /app/agreements.
 */
export function DocumentsPage() {
  const session = readSession();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['agreements'],
    queryFn: endpoints.agreements,
    staleTime: 15_000,
  });
  const list = [...(data ?? [])].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  return (
    <div className="flex flex-col w-full px-gutter-mobile pt-4 pb-6 max-w-md mx-auto">
      <div className="flex flex-col gap-1 pt-1">
        <h1 className="font-headline-sm text-headline-sm text-on-surface">Dokumen perjanjian</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Riwayat SPK yang kamu sepakati dan status masa berlakunya.
        </p>
      </div>

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
      {!isLoading && !isError && list.length === 0 && (
        <div className="mt-space-md">
          <EmptyState
            icon="document"
            title="Belum ada dokumen"
            message="SPK muncul di sini setelah kamu dan mitra menyusun kesepakatan."
            action={
              <Link
                className="h-touch-target-min px-space-md bg-surface-container-lowest text-on-surface rounded-lg font-label-md text-label-md inline-flex items-center justify-center gap-1.5 shadow-sm"
                to="/app/agreements"
              >
                <span className="material-symbols-outlined text-[18px] text-secondary">description</span>
                <span>Ke halaman kesepakatan</span>
              </Link>
            }
          />
        </div>
      )}

      {list.length > 0 && (
        <div className="mt-space-md flex flex-col gap-space-xs">
          {list.map((a) => {
            const v = validity(a);
            const partner =
              a.connection.senderId === session?.id ? a.connection.receiver : a.connection.sender;
            return (
              <Link
                key={a.id}
                to="/app/agreements"
                className="flex items-center justify-between gap-2 p-space-md bg-surface-container-lowest rounded-2xl shadow-sm active:scale-[0.99] transition-transform"
              >
                <div className="flex items-center gap-space-sm min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary shrink-0">
                    <span className="material-symbols-outlined text-[20px]">history_edu</span>
                  </div>
                  <div className="min-w-0">
                    <div className="font-title-md text-title-md text-primary font-semibold truncate">
                      {a.agreementNumber}
                    </div>
                    <div className="font-body-sm text-body-sm text-on-surface-variant truncate">
                      {COOPERATION_LABEL[a.cooperationType]} • {partner.profile?.fullName ?? 'Mitra'} •{' '}
                      {formatRupiah(Number(a.amount))}
                    </div>
                    <div className="font-body-sm text-body-sm text-on-surface-variant truncate">
                      {formatTanggal(a.startDate)}
                      {a.endDate ? ` – ${formatTanggal(a.endDate)}` : ''}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-sm text-label-sm font-bold ${v.pill}`}
                  >
                    {v.live && <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>}
                    {v.text}
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant text-right">{v.sub}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {list.length > 0 && (
        <p className="mt-space-md font-body-sm text-body-sm text-on-surface-variant">
          Butuh menandatangani atau mengunduh PDF? Buka{' '}
          <Link className="text-secondary font-semibold" to="/app/agreements">
            halaman kesepakatan
          </Link>
          .
        </p>
      )}
    </div>
  );
}
