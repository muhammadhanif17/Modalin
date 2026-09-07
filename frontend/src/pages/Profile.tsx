import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, VERIFICATION_LABEL, type VerificationStatus } from '../lib/api';
import { Avatar } from '../components/ui/Avatar';
import { Icon } from '../components/ui/Icon';
import { Field, Notice, Badge, VERIFICATION_TONE } from '../components/ui';
import { LogoutButton } from '../components/Layout';
import { readSession } from '../lib/session';

export function ProfilePage() {
  const session = readSession();
  const qc = useQueryClient();
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api<Profile>(`/api/profile/me`),
    staleTime: 30_000,
  });
  const [editing, setEditing] = useState(false);

  const status = profile?.verificationStatus ?? 'UNVERIFIED';
  const isVerified = status === 'VERIFIED';

  if (isLoading) {
    return (
      <div className="shell" style={{ padding: '30px 0' }}>
        <Badge tone="soft">Memuat profil...</Badge>
      </div>
    );
  }

  return (
    <div className="shell page-bottom">
      <div className="page-head">
        <h1>Profil kamu</h1>
        <p>Data ini membantu mitra memahami siapa kamu.</p>
      </div>

      <div className="stack">
        <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Avatar name={profile?.fullName} seed={session?.id} size="lg" />
          <div style={{ flex: 1 }}>
            <h2>{profile?.fullName ?? '-'}</h2>
            <p style={{ color: 'var(--text-2)' }}>
              {session?.role === 'INVESTOR' ? 'Investor' : 'Pemilik usaha'} · {session?.email}
            </p>
          </div>
          {/*
            Dibaca dari verificationStatus, bukan boolean isVerified: dengan
            boolean, akun yang DITOLAK ikut tampil kuning "Belum verifikasi" —
            padahal statusnya menuntut tindakan dan harus merah. Ini satu-satunya
            tempat yang masih memakai boolean setelah Beranda/Verifikasi/Admin
            diseragamkan.
          */}
          <Badge tone={VERIFICATION_TONE[status]}>
            {status === 'VERIFIED' && <Icon name="verified" size={13} />}
            {VERIFICATION_LABEL[status]}
          </Badge>
        </div>

        {/*
          Sebelumnya jalan ke Verifikasi dan Berkas hanya ada lewat pintasan di
          Beranda, jadi pengguna yang membuka tab Profil dari bottom nav tidak
          menemukan jalannya sama sekali.
        */}
        <nav className="stack" aria-label="Pengaturan akun">
          <Link className="row-link" to="/app/verifikasi">
            <span className="row-icon">
              <Icon name="shield" />
            </span>
            <div className="row-main">
              <div className="row-title">Verifikasi identitas</div>
              <div className="row-sub">
                KTP{session?.role === 'UMKM' ? ' dan NIB' : ''} ·{' '}
                {isVerified ? 'sudah terverifikasi' : 'belum terverifikasi'}
              </div>
            </div>
            <Icon name="chevron" size={18} className="row-chevron" />
          </Link>
          <Link className="row-link" to="/app/rekam-jejak">
            <span className="row-icon">
              <Icon name="folder" />
            </span>
            <div className="row-main">
              <div className="row-title">
                {session?.role === 'INVESTOR' ? 'Rekam jejak pendanaan' : 'Berkas pendukung'}
              </div>
              <div className="row-sub">Unggah dokumen agar mitra lebih yakin</div>
            </div>
            <Icon name="chevron" size={18} className="row-chevron" />
          </Link>
          {session?.role === 'INVESTOR' && (
            <Link className="row-link" to="/app/preferensi">
              <span className="row-icon">
                <Icon name="target" />
              </span>
              <div className="row-main">
                <div className="row-title">Preferensi investasi</div>
                <div className="row-sub">Kriteria yang dipakai untuk mencarikan kecocokan</div>
              </div>
              <Icon name="chevron" size={18} className="row-chevron" />
            </Link>
          )}
          {/*
            Pintasan ke wizard multi-step (a3-a7 untuk UMKM, b3-b5 untuk investor).
            Edit dasar (HP, bio, lokasi) tetap di halaman ini.
          */}
          <Link className="row-link" to={session?.role === 'UMKM' ? '/app/profile/edit' : '/app/preferensi/edit'}>
            <span className="row-icon">
              <Icon name="edit" />
            </span>
            <div className="row-main">
              <div className="row-title">
                {session?.role === 'UMKM' ? 'Edit profil usaha' : 'Edit preferensi modal'}
              </div>
              <div className="row-sub">
                {session?.role === 'UMKM'
                  ? 'Data dasar, kebutuhan dana, jenis kerja sama, portofolio'
                  : 'Data pemodal, preferensi, skema kemitraan'}
              </div>
            </div>
            <Icon name="chevron" size={18} className="row-chevron" />
          </Link>
        </nav>

        {!editing ? (
          <div className="card card-pad">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3>Detail</h3>
              <button className="btn btn-soft" onClick={() => setEditing(true)}>
                Ubah profil
              </button>
            </div>
            <div className="detail-list">
              <div className="detail-item">
                <small>Nomor HP</small>
                <strong>{profile?.phone || '-'}</strong>
              </div>
              <div className="detail-item">
                <small>Lokasi</small>
                <strong>{profile?.location || '-'}</strong>
              </div>
              <div className="detail-item">
                <small>Tentang</small>
                <strong>{profile?.bio || '-'}</strong>
              </div>
            </div>
          </div>
        ) : (
          <EditProfile
            profile={profile}
            onDone={() => {
              setEditing(false);
              qc.invalidateQueries({ queryKey: ['profile'] });
            }}
          />
        )}

        <div className="card card-pad">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}

function EditProfile({ profile = {}, onDone }: { profile?: Profile; onDone: () => void }) {
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const mutation = useMutation({
    mutationFn: (data: unknown) => api('/api/profile/me', { method: 'PATCH', json: data }),
    onSuccess: () => {
      setSaved(true);
      qc.invalidateQueries({ queryKey: ['profile'] });
      setTimeout(onDone, 700);
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Gagal menyimpan.'),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSaved(false);
    const data = Object.fromEntries(new FormData(e.currentTarget));
    mutation.mutate(data);
  }

  return (
    <form className="card card-pad" style={{ display: 'grid', gap: 16 }} onSubmit={onSubmit}>
      {error && <Notice tone="error">{error}</Notice>}
      {saved && <Notice tone="success">Profil tersimpan!</Notice>}
      <Field label="Nama lengkap">
        <input className="input" name="fullName" defaultValue={profile?.fullName} minLength={2} required />
      </Field>
      <Field label="Nomor HP">
        <input className="input" name="phone" defaultValue={profile?.phone ?? ''} />
      </Field>
      <Field label="Lokasi">
        <input className="input" name="location" defaultValue={profile?.location ?? ''} />
      </Field>
      <Field label="Tentang">
        <textarea className="textarea" name="bio" defaultValue={profile?.bio ?? ''} />
      </Field>
      <div className="hero-actions">
        <button className="btn btn-primary" type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Menyimpan...' : 'Simpan perubahan'}
        </button>
        <button className="btn btn-outline" type="button" onClick={onDone}>
          Batal
        </button>
      </div>
    </form>
  );
}

type Profile = {
  fullName?: string;
  phone?: string | null;
  location?: string | null;
  bio?: string | null;
  isVerified?: boolean;
  verificationStatus?: VerificationStatus;
};
