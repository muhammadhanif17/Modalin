import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { endpoints, type Product, type Transaction } from '../lib/api';
import { Notice, EmptyState, Spinner, Badge, type BadgeTone } from '../components/ui';
import { formatRupiah, formatTanggal } from '../lib/format';

/**
 * Modul 8 — FR-13, alur checkout TERSIMULASI.
 *
 * Tidak ada SDK Midtrans/Xendit dan tidak ada panggilan keluar sama sekali
 * (ARCHITECTURE.md §11). Label "Simulasi" ditampilkan mencolok supaya penilai
 * maupun pengguna tidak salah mengira ini pembayaran sungguhan.
 *
 * PENTING: dana investasi UMKM-investor TIDAK PERNAH lewat sini. Halaman ini
 * hanya untuk biaya layanan platform dan langganan Modalin Pro.
 */

const STATUS: Record<Transaction['status'], { text: string; tone: BadgeTone }> = {
  PENDING: { text: 'Menunggu', tone: 'warning' },
  SUCCESS: { text: 'Berhasil', tone: 'success' },
  // Pembayaran gagal butuh warna alert, bukan abu-abu netral.
  FAILED: { text: 'Gagal', tone: 'danger' },
};

export function CheckoutPage() {
  const qc = useQueryClient();
  const [active, setActive] = useState<Transaction | null>(null);
  const [error, setError] = useState('');

  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: endpoints.products,
    staleTime: 600_000,
  });
  const { data: transactions } = useQuery({
    queryKey: ['transactions'],
    queryFn: endpoints.transactions,
    staleTime: 15_000,
  });

  const checkout = useMutation({
    mutationFn: (key: Product['key']) => endpoints.checkout(key),
    onSuccess: (trx) => {
      setActive(trx);
      setError('');
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Gagal memulai checkout.'),
  });

  const confirm = useMutation({
    mutationFn: ({ id, outcome }: { id: string; outcome: 'SUCCESS' | 'FAILED' }) =>
      endpoints.confirmPayment(id, outcome),
    onSuccess: () => {
      setActive(null);
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Gagal memproses pembayaran.'),
  });

  return (
    <div className="shell page-bottom">
      <div className="page-head">
        <h1>Pembayaran</h1>
        <p>Biaya layanan platform dan langganan Modalin Pro.</p>
      </div>

      <Notice tone="info">
        Mode simulasi. Tidak ada dana sungguhan yang berpindah. Dana investasi antara UMKM dan pemodal
        disalurkan langsung di luar platform.
      </Notice>

      {error && <Notice tone="error" onClose={() => setError('')}>{error}</Notice>}
      {isLoading && <Spinner />}

      <div className="stack" style={{ marginTop: 16 }}>
        {(products ?? []).map((product) => (
          <div className="card card-pad stack" key={product.key}>
            <div className="opp-top">
              <div style={{ minWidth: 0 }}>
                <h3>{product.name}</h3>
                <p className="opp-desc">{product.description}</p>
              </div>
              <Badge tone="warning">Simulasi</Badge>
            </div>
            <div className="opp-foot">
              <div className="opp-amount" data-money>
                {formatRupiah(product.amount)}
                {/* Langganan ditagih berulang — jangan pukul rata "sekali bayar" */}
                <small>{product.key === 'SUBSCRIPTION_PRO' ? 'per bulan' : 'sekali bayar'}</small>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                disabled={checkout.isPending}
                onClick={() => checkout.mutate(product.key)}
              >
                Pilih
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Lembar konfirmasi — jalur sukses DAN gagal keduanya bisa didemokan */}
      {active && (
        <div className="backdrop" role="dialog" aria-modal="true">
          <div className="sheet stack">
            <h2>Konfirmasi pembayaran</h2>
            <Badge tone="warning">Simulasi — tanpa gateway sungguhan</Badge>

            <div className="num-grid">
              <div>
                <small>Nominal</small>
                <b data-money>{formatRupiah(active.amount)}</b>
              </div>
              <div>
                <small>Kode</small>
                <b>{active.referenceCode}</b>
              </div>
              <div>
                <small>Status</small>
                <b>{STATUS[active.status].text}</b>
              </div>
            </div>
            <p className="field-hint">{active.description}</p>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                className="btn btn-soft"
                style={{ flex: 1 }}
                disabled={confirm.isPending}
                onClick={() => confirm.mutate({ id: active.id, outcome: 'FAILED' })}
              >
                Simulasikan gagal
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={confirm.isPending}
                onClick={() => confirm.mutate({ id: active.id, outcome: 'SUCCESS' })}
              >
                {confirm.isPending ? 'Memproses…' : 'Bayar sekarang'}
              </button>
            </div>
            <button type="button" className="btn btn-ghost btn-block" onClick={() => setActive(null)}>
              Nanti saja
            </button>
          </div>
        </div>
      )}

      <div className="section-head" style={{ marginTop: 24 }}>
        <h2>Riwayat transaksi</h2>
      </div>
      {(transactions ?? []).length === 0 ? (
        <EmptyState icon="receipt" title="Belum ada transaksi" message="Riwayat pembayaranmu akan muncul di sini." />
      ) : (
        <div className="stack">
          {(transactions ?? []).map((trx) => (
            <div className="card card-pad" key={trx.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong>{trx.description}</strong>
                  <div className="opp-meta">
                    {trx.referenceCode} · {formatTanggal(trx.createdAt)}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flex: 'none' }}>
                  <div className="opp-amount" data-money style={{ fontSize: 15 }}>
                    {formatRupiah(trx.amount)}
                  </div>
                  <Badge tone={STATUS[trx.status].tone}>{STATUS[trx.status].text}</Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
