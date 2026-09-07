import type { MyProfile } from '../../lib/api';

function salam(): string {
  const h = new Date().getHours();
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 19) return 'Selamat sore';
  return 'Selamat malam';
}

/**
 * Kepala beranda ala prototipe index.html: sapaan + satu baris urgensi.
 * Skor dan badge verifikasi TIDAK di sini — sudah ada di TrustScoreCard,
 * menampilkannya dua kali hanya menambah kotak tanpa informasi baru.
 */
export function DashboardHeader({ profile, lead }: { profile: MyProfile; lead: string }) {
  return (
    <div className="page-head">
      <h1>
        {salam()}, {profile.fullName.split(' ')[0]}
      </h1>
      <p>{lead}</p>
    </div>
  );
}
