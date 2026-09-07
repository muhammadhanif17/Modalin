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
import { Field, Notice, EmptyState, Spinner, Badge } from '../components/ui';
import { SignaturePad } from '../components/SignaturePad';
import { formatRupiah, formatTanggal } from '../lib/format';
import { readSession } from '../lib/session';

/**
 * Modul 6 di sisi klien — FR-10 dan FR-11.
 *
 * Gerbang "tolak generate kalau salah satu pihak belum tanda tangan" ditegakkan
 * di server; halaman ini menjelaskan alasannya supaya pengguna tahu apa yang
 * ditunggu, bukan sekadar menyembunyikan tombol.
 */

const STATUS_LABEL: Record<Agreement['status'], { text: string; tone: 'soft' | 'warning' | 'success' | 'primary' }> = {
  DRAFT: { text: 'Draf', tone: 'soft' },
  WAITING_SIGNATURE: { text: 'Menunggu Tanda Tangan', tone: 'warning' },
  SIGNED: { text: 'Siap Terbit', tone: 'primary' },
  ACTIVE: { text: 'Berjalan', tone: 'success' },
  COMPLETED: { text: 'Selesai', tone: 'success' },
  CANCELLED: { text: 'Dibatalkan', tone: 'soft' },
};

const TYPES: CooperationType[] = ['BAGI_HASIL', 'PENYERTAAN_MODAL', 'PINJAMAN'];

export function AgreementsPage() {
  const [params] = useSearchParams();
  const fromConversation = params.get('conversation');
  const [creating, setCreating] = useState(Boolean(fromConversation));

  const { data, isLoading, isError } = useQuery({
    queryKey: ['agreements'],
    queryFn: endpoints.agreements,
    staleTime: 15_000,
  });

  return (
    <div className="shell page-bottom">
      <div className="page-head">
        <h1>Dokumen kesepakatan</h1>
        <p>Susun, tandatangani, dan terbitkan surat perjanjian kerja sama.</p>
      </div>

      {creating ? (
        <CreateForm conversationId={fromConversation} onDone={() => setCreating(false)} />
      ) : (
        <button type="button" className="btn btn-primary btn-block" onClick={() => setCreating(true)}>
          Susun kesepakatan baru
        </button>
      )}

      {isLoading && <Spinner />}
      {isError && <EmptyState icon="warning" title="Gagal memuat dokumen" message="Coba lagi sebentar lagi." />}
      {!isLoading && !isError && (data ?? []).length === 0 && !creating && (
        <EmptyState
          icon="document"
          title="Belum ada dokumen"
          message="Kesepakatan disusun setelah negosiasi di ruang chat menemui titik temu."
          action={
            <Link className="btn btn-outline" to="/app/chat">
              Buka percakapan
            </Link>
          }
        />
      )}

      <div className="stack" style={{ marginTop: 20 }}>
        {(data ?? []).map((agreement) => (
          <AgreementCard key={agreement.id} agreement={agreement} />
        ))}
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
  const mySignature = agreement.signatures.find((s) => s.userId === session?.id);
  const signatureCount = agreement.signatures.length;
  const status = STATUS_LABEL[agreement.status];
  const canPublish = signatureCount >= 2;

  // Susun → Tanda tangan → Terbit, dibaca dari status yang ada, bukan state baru.
  const step = agreement.documentUrl ? 3 : signatureCount > 0 ? 2 : 1;

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

  return (
    <div className="card card-pad stack">
      <div className="opp-top">
        <div style={{ minWidth: 0 }}>
          <h3>{agreement.agreementNumber}</h3>
          <div className="opp-meta">
            {COOPERATION_LABEL[agreement.cooperationType]} · dengan{' '}
            {partner.profile?.fullName ?? 'Mitra'}
          </div>
        </div>
        <Badge tone={status.tone}>{status.text}</Badge>
      </div>

      <div className="steps" aria-label={`Progres kesepakatan: langkah ${step} dari 3`}>
        <span className={step > 1 ? 'done' : 'now'} />
        <span className={step > 2 ? 'done' : step === 2 ? 'now' : ''} />
        <span className={step === 3 ? 'done' : ''} />
      </div>
      <div className="steps-legend" aria-hidden="true">
        <span>Susun</span>
        <span>Tanda tangan</span>
        <span>Terbit</span>
      </div>

      <div className="num-grid">
        <div>
          <small>Nilai</small>
          <b data-money>{formatRupiah(Number(agreement.amount))}</b>
        </div>
        <div>
          <small>Mulai</small>
          <b>{formatTanggal(agreement.startDate)}</b>
        </div>
        <div>
          <small>Tanda Tangan</small>
          <b data-money>{signatureCount}/2</b>
        </div>
      </div>

      {/* Angka pokok yang relevan dengan skemanya saja */}
      {agreement.cooperationType === 'BAGI_HASIL' && agreement.profitSharingRatio != null && (
        <p className="field-hint">Porsi bagi hasil untuk pemodal: {Number(agreement.profitSharingRatio)}%</p>
      )}
      {agreement.cooperationType === 'PENYERTAAN_MODAL' && agreement.equityPercentage != null && (
        <p className="field-hint">Kepemilikan pemodal: {Number(agreement.equityPercentage)}%</p>
      )}
      {agreement.cooperationType === 'PINJAMAN' && agreement.interestRate != null && (
        <p className="field-hint">
          Imbal hasil: {Number(agreement.interestRate)}% per tahun
          {agreement.tenorMonths ? `, tenor ${agreement.tenorMonths} bulan` : ''}
        </p>
      )}

      {error && <Notice tone="error" onClose={() => setError('')}>{error}</Notice>}

      {/* Tanda tangan */}
      {!mySignature && agreement.status !== 'CANCELLED' && !agreement.documentUrl && (
        <>
          {!signing ? (
            <button type="button" className="btn btn-primary btn-block" onClick={() => setSigning(true)}>
              Bubuhkan tanda tangan
            </button>
          ) : (
            <div className="stack">
              <SignaturePad onChange={setBlob} />
              <p className="field-hint">
                Tanda tangan elektronik ini sah menurut Pasal 11 UU ITE, namun belum tersertifikasi PSrE
                sehingga kekuatan pembuktiannya di bawah dokumen bersertifikat dan tidak setara akta notaris.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" className="btn btn-soft" style={{ flex: 1 }} onClick={() => setSigning(false)}>
                  Batal
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={!blob || sign.isPending}
                  onClick={() => sign.mutate()}
                >
                  {sign.isPending ? 'Menyimpan…' : 'Simpan tanda tangan'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {mySignature && !agreement.documentUrl && (
        <p className="field-hint">
          Kamu sudah menandatangani {formatTanggal(mySignature.signedAt)}.
          {signatureCount < 2 && ' Menunggu tanda tangan mitra.'}
        </p>
      )}

      {/*
        FR-10/FR-11 — terbitkan PDF, hanya kalau dua tanda tangan lengkap.
        Gerbangnya ditegakkan server, tapi tombolnya ikut dinonaktifkan: dulu
        tetap bisa diklik dan baru gagal di server, dan `title` tidak terbaca
        sama sekali di layar sentuh. Alasannya ditulis di bawah tombol.
      */}
      {!agreement.documentUrl && agreement.status !== 'CANCELLED' && (
        <>
          <button
            type="button"
            className="btn btn-outline btn-block"
            disabled={generate.isPending || !canPublish}
            onClick={() => generate.mutate()}
          >
            {generate.isPending ? 'Menerbitkan…' : 'Terbitkan PDF final'}
          </button>
          {!canPublish && (
            <p className="field-hint">
              Menunggu tanda tangan mitra ({signatureCount}/2). Dokumen terbit setelah kedua pihak
              menandatangani.
            </p>
          )}
        </>
      )}

      {agreement.documentUrl && (
        <div style={{ display: 'flex', gap: 12 }}>
          <a
            className="btn btn-primary"
            style={{ flex: 1 }}
            href={agreement.documentUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Lihat dokumen PDF
          </a>
          {agreement.status === 'ACTIVE' && (
            <button
              type="button"
              className="btn btn-outline"
              style={{ flex: 1 }}
              disabled={complete.isPending}
              onClick={() => complete.mutate()}
            >
              Tandai selesai
            </button>
          )}
        </div>
      )}

      {agreement.status === 'COMPLETED' && !agreement.ratings.some((r) => r.reviewerId === session?.id) && (
        <Link className="btn btn-primary btn-block" to={`/app/rating/${agreement.id}`}>
          Beri ulasan
        </Link>
      )}
    </div>
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

  return (
    <form className="card card-pad stack" onSubmit={onSubmit}>
      <h2>Susun kesepakatan</h2>
      {error && <Notice tone="error">{error}</Notice>}

      <Field label="Kerja sama dengan">
        <select className="input" name="connectionId" defaultValue={preselected}>
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
      </Field>

      {/*
        Bukan chip-row: skema menentukan isi dokumen dan sifatnya pilihan tunggal
        yang penting, bukan filter cepat. Deretan horizontal juga meluap keluar
        layar di 360px tanpa isyarat apa pun bahwa ada opsi tersembunyi.
      */}
      <fieldset className="choice-set">
        <legend>Skema kerja sama</legend>
        <div className="choice-list">
          {TYPES.map((t) => (
            <label className="choice" key={t}>
              <input
                type="radio"
                name="cooperationType"
                value={t}
                checked={type === t}
                onChange={() => setType(t)}
              />
              <span>
                <strong>{COOPERATION_LABEL[t]}</strong>
                <small>{COOPERATION_HELP[t]}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="Nilai kerja sama">
        <label className="input-money">
          <input className="input" name="amount" inputMode="numeric" placeholder="150.000.000" required />
        </label>
      </Field>

      {/* Angka pokok berbeda per skema — menutup Keputusan Terbuka ARCHITECTURE.md §12 */}
      {type === 'BAGI_HASIL' && (
        <Field label="Porsi bagi hasil untuk pemodal (%)" hint="Bagian keuntungan bersih yang diterima pemodal.">
          <input className="input" name="profitSharingRatio" type="number" min={0} max={100} step="0.5" required />
        </Field>
      )}
      {type === 'PENYERTAAN_MODAL' && (
        <Field label="Persentase kepemilikan pemodal (%)" hint="Porsi kepemilikan usaha yang diberikan.">
          <input className="input" name="equityPercentage" type="number" min={0} max={100} step="0.5" required />
        </Field>
      )}
      {type === 'PINJAMAN' && (
        <Field label="Imbal hasil per tahun (%)" hint="Besaran imbal hasil yang disepakati di awal.">
          <input className="input" name="interestRate" type="number" min={0} max={100} step="0.5" required />
        </Field>
      )}

      <div className="field-grid">
        <Field label="Tanggal mulai">
          <input className="input" name="startDate" type="date" required />
        </Field>
        <Field label="Tenor (bulan)">
          <input className="input" name="tenorMonths" type="number" min={1} max={240} />
        </Field>
      </div>

      <Field label="Ketentuan tambahan (opsional)" hint="Hasil negosiasi yang perlu ikut tercatat di dokumen.">
        <textarea className="textarea" name="terms" placeholder="mis. laporan hasil usaha disampaikan tiap kuartal" />
      </Field>

      <div style={{ display: 'flex', gap: 12 }}>
        <button type="button" className="btn btn-soft" style={{ flex: 1 }} onClick={onDone}>
          Batal
        </button>
        <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={create.isPending}>
          {create.isPending ? 'Menyimpan…' : 'Susun dokumen'}
        </button>
      </div>
    </form>
  );
}
