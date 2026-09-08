import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { formatRupiah } from '../lib/format';
import '../landing.css';

/**
 * Landing Modalin.
 *
 * Permukaan pemasaran, sengaja beda register dari aplikasi: kanvas gelap dan
 * tipografi serif editorial, sementara aplikasi setelah masuk tetap terang
 * mengikuti DESIGN.md. Paletnya tetap milik Modalin — forest digelapkan jadi
 * kanvas, bone jadi warna teks, mint jadi aksen. Tidak ada warna baru.
 *
 * FOTO: sementara memakai Unsplash sebagai penampung. Ganti isi FOTO di bawah
 * dengan berkas milik sendiri begitu tersedia; tidak ada bagian lain yang perlu
 * disentuh. Semua foto di sini orang sungguhan yang tidak berafiliasi dengan
 * Modalin, jadi tidak satu pun diberi nama atau dijadikan testimoni.
 */

const FOTO = {
  warung:
    'https://images.unsplash.com/photo-1775973990808-7195de3e6718?auto=format&fit=crop&w=1000&q=70',
  pengusaha:
    'https://images.unsplash.com/photo-1695653422902-1bea566871c6?auto=format&fit=crop&w=800&q=70',
  pemodal:
    'https://images.unsplash.com/photo-1695654690121-d8c56746ee7b?auto=format&fit=crop&w=800&q=70',
};

type LandingRow = {
  id: string;
  targetAmount: number;
  status: string;
  business?: { name: string; location: string; sector?: { name: string } | null };
};

export function HomePage() {
  const { data } = useQuery({
    queryKey: ['landing'],
    // Landing boleh dilihat tanpa masuk, jadi kegagalan diperlakukan sebagai
    // daftar kosong — bukan alasan menggagalkan seluruh halaman.
    queryFn: () =>
      api<{ items: LandingRow[] }>('/api/search?limit=50')
        .then((r) => r.items)
        .catch(() => [] as LandingRow[]),
    staleTime: 60_000,
  });

  const rows = data ?? [];
  const ada = rows.length > 0;

  return (
    <div className="lp">
      <section className="lp-hero">
        <div>
          <h1 className="lp-display">
            Usaha layak. Modal siap.{' '}
            <span className="lp-turn">Yang kurang cuma pertemuannya.</span>
          </h1>
          <p className="lp-body">
            Modalin mempertemukan UMKM Indonesia dengan pemodal yang benar-benar cocok — lewat
            profil terverifikasi, skor kepercayaan yang bisa ditelusuri, dan percakapan langsung
            antara kedua pihak.
          </p>
          <div className="lp-actions">
            <Link className="btn btn-primary" to="/register">
              Daftar sebagai pengusaha
            </Link>
            <Link className="btn btn-ghost" to="/register">
              Daftar sebagai pemodal
            </Link>
          </div>

          {/* Angka dari database, bukan klaim. Kalau kosong, barisnya tidak muncul. */}
          {ada && (
            <div className="lp-stats">
              <div className="lp-stat">
                <b>{rows.length}</b>
                <span>usaha mencari modal</span>
              </div>
              <div className="lp-stat">
                <b>{new Set(rows.map((r) => r.business?.sector?.name)).size}</b>
                <span>sektor</span>
              </div>
              <div className="lp-stat">
                <b>{formatRupiah(Math.min(...rows.map((r) => r.targetAmount)))}</b>
                <span>pengajuan terkecil</span>
              </div>
            </div>
          )}
        </div>

        <figure className="lp-figure">
          <img
            src={FOTO.warung}
            alt="Warung kopi milik pelaku usaha kecil di Indonesia"
            width={1000}
            height={1250}
            decoding="async"
          />
        </figure>
      </section>

      <section className="lp-sides">
        <h2 className="lp-display">
          Dua pihak yang selama ini <span className="lp-turn">saling mencari</span>.
        </h2>
        <div className="lp-pair">
          <figure className="lp-side">
            <img
              src={FOTO.pengusaha}
              alt="Pelaku UMKM sedang menyiapkan dagangannya"
              loading="lazy"
              decoding="async"
            />
            <figcaption>
              <span className="lp-label">Pengusaha</span>
              <h3>Punya usaha yang jalan, kurang modal untuk naik kelas.</h3>
              <p>
                Ceritakan usahamu sekali. Verifikasi KTP dan NIB membuka badge Terverifikasi, dan
                skor kepercayaanmu naik seiring rekam jejak.
              </p>
            </figcaption>
          </figure>
          <figure className="lp-side">
            <img
              src={FOTO.pemodal}
              alt="Dua orang meninjau data usaha bersama"
              loading="lazy"
              decoding="async"
            />
            <figcaption>
              <span className="lp-label">Pemodal</span>
              <h3>Punya modal, kurang usaha yang bisa ditelusuri.</h3>
              <p>
                Atur sektor, rentang dana, lokasi, dan skema yang kamu terima. Pencocokan berjalan
                dua arah, jadi kedua sisi sama-sama dicarikan.
              </p>
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="lp-steps">
        <span className="lp-label">
          Empat langkah, <b>tanpa perantara</b>
        </span>
        <h2 className="lp-display" style={{ marginTop: 14 }}>
          Dari profil sampai perjanjian.
        </h2>
        {LANGKAH.map((l, i) => (
          <div className="lp-step" key={l.judul}>
            <span className="lp-step-n">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <h3>{l.judul}</h3>
              <p>{l.isi}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="lp-terms">
        <h2 className="lp-display">Apa yang Modalin lakukan, dan apa yang tidak.</h2>
        <dl>
          {BATAS.map((b) => (
            <div className="lp-term" key={b.dt}>
              <dt>{b.dt}</dt>
              <dd>{b.dd}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="lp-end">
        <h2 className="lp-display">Mulai dari satu pertemuan.</h2>
        <div className="lp-actions">
          <Link className="btn btn-primary" to="/register">
            Buat akun
          </Link>
          <Link
            className="btn btn-ghost"
            to="/login"
            state={{ from: '/app/explore', notice: 'Masuk dulu untuk menjelajahi peluang.' }}
          >
            Sudah punya akun
          </Link>
        </div>
      </section>

      <footer className="lp-foot">
        <span>Modalin — dibangun untuk UMKM Indonesia</span>
        <span>Tim El Yapping · HOLOGY 9.0</span>
      </footer>
    </div>
  );
}

const LANGKAH = [
  {
    judul: 'Lengkapi profil dan verifikasi identitas',
    isi: 'Unggah KTP, dan NIB bila kamu pengusaha. Admin meninjau berkasnya sebelum badge Terverifikasi muncul — badge itu tidak pernah terbit hanya karena kamu sudah mengunggah.',
  },
  {
    judul: 'Temukan yang cocok, atau biarkan dicarikan',
    isi: 'Cari sendiri dengan filter sektor, dana, lokasi, dan skema. Atau lihat rekomendasi otomatis: skema kerja sama disaring lebih dulu, sisanya diberi bobot sektor 40%, dana 30%, lokasi 10%, dan skor kepercayaan 20%.',
  },
  {
    judul: 'Tunjukkan ketertarikan, lalu bicara langsung',
    isi: 'Ruang negosiasi terbuka hanya setelah pihak yang dituju menerima. Tidak ada yang bisa menghubungimu sebelum kamu menyetujuinya.',
  },
  {
    judul: 'Susun perjanjian dan tanda tangani',
    isi: 'Isi angka pokok sesuai skema yang disepakati, bubuhkan tanda tangan langsung dari layar, lalu terbitkan PDF. Dokumen menolak terbit selama salah satu pihak belum menandatangani.',
  },
];

const BATAS = [
  {
    dt: 'Dana investasi',
    dd: 'Disalurkan langsung antara pengusaha dan pemodal, di luar platform. Modalin tidak menampung, menyalurkan, maupun menjadi perantara dana.',
  },
  {
    dt: 'Pembayaran di platform',
    dd: 'Terbatas pada biaya layanan dan langganan. Saat ini berjalan dalam mode simulasi dan ditandai jelas di setiap layarnya.',
  },
  {
    dt: 'Dokumen identitas',
    dd: 'KTP, NIB, dan tanda tangan disimpan terpisah dan hanya bisa dibuka oleh pemiliknya dan admin verifikasi.',
  },
  {
    dt: 'Tanda tangan elektronik',
    dd: 'Sah menurut Pasal 11 UU ITE, namun belum tersertifikasi PSrE — kekuatan pembuktiannya di bawah dokumen bersertifikat dan tidak setara akta notaris.',
  },
];
