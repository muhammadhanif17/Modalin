import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Avatar } from '../components/ui/Avatar';
import { Field, Notice, Badge } from '../components/ui';
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

  const isVerified = profile?.isVerified;

  if (isLoading) {
    return (
      <div className="shell" style={{ padding: '30px 0' }}>
        <Badge tone="soft">Memuat profil...</Badge>
      </div>
    );
  }

  return (
    <div className="shell" style={{ paddingBottom: 30 }}>
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
          {isVerified ? (
            <Badge tone="success">✓ Terverifikasi</Badge>
          ) : (
            <Badge tone="warning">Belum verifikasi</Badge>
          )}
        </div>

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
};
