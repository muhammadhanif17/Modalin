import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Avatar } from '../components/ui/Avatar';
import { Icon } from '../components/ui/Icon';
import { formatRupiah } from '../lib/format';

export function HomePage() {
  const { data } = useQuery({
    queryKey: ['landing'],
    // Landing boleh dilihat tanpa masuk, jadi kegagalan diperlakukan sebagai
    // daftar kosong — bukan alasan menggagalkan seluruh halaman.
    queryFn: () =>
      api<{ items: LandingRow[] }>('/api/search?limit=3')
        .then((r) => r.items)
        .catch(() => [] as LandingRow[]),
    staleTime: 60_000,
  });

  const featured = (data ?? []).slice(0, 3);

  return (
    <div className="shell page-bottom">
      <section className="hero">
        <div>
          <span className="eyebrow">Platform kolaborasi pendanaan</span>
          <h1>Modal tumbuh ketika orang yang tepat bertemu.</h1>
          <p className="hero-sub">
            Modalin mempertemukan UMKM dengan investor yang relevan — lewat profil yang
            jujur, kecocokan yang terukur, dan percakapan yang transparan.
          </p>
          <p className="trust-line">
            <Icon name="lock" size={16} />
            Dana investasi disalurkan langsung antara kedua pihak, di luar platform. Pembayaran
            di sini hanya untuk biaya layanan.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary btn-block" to="/register">
              Mulai sekarang
            </Link>
            {/*
              Dulu menuju /app/explore yang dijaga AuthGuard, jadi pengunjung publik
              langsung dibanting ke /login tanpa penjelasan. Sekarang jujur soal
              tujuannya dan tetap mendarat di Cari peluang setelah masuk.
            */}
            <Link
              className="btn btn-soft btn-block"
              to="/login"
              state={{ from: '/app/explore', notice: 'Masuk dulu untuk menjelajahi peluang.' }}
            >
              Jelajahi peluang
            </Link>
          </div>
        </div>
        <div className="hero-panel">
          <div className="hero-panel-head">
            <span className="live-dot" />
            Pendanaan aktif
            <span style={{ marginLeft: 'auto' }}>terbaru</span>
          </div>
          {featured.length === 0 && (
            <p className="hero-panel-empty">Belum ada peluang. Coba lagi sebentar lagi.</p>
          )}
          {featured.map((item) => (
            <div className="opp-row" key={item.id}>
              <Avatar name={item.business?.name} seed={item.id} size="sm" />
              <div>
                <div className="opp-name">{item.business?.name}</div>
                <div className="opp-spec">
                  {item.business?.sector?.name} · {item.business?.location}
                </div>
                <div className="opp-spec">{formatRupiah(item.targetAmount)}</div>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <span className="badge badge-soft">{item.status}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="stats">
        <div className="stat">
          <strong>64 jt+</strong>
          <span>UMKM aktif di Indonesia</span>
        </div>
        <div className="stat">
          <strong>1</strong>
          <span>ruang kolaborasi terpadu</span>
        </div>
        <div className="stat">
          <strong>100%</strong>
          <span>proses yang transparan</span>
        </div>
      </section>

      <section className="section-pad" id="cara">
        <div className="section-head">
          <div>
            <h2>Bagaimana Modalin bekerja</h2>
            <p>Empat langkah sederhana menuju kemitraan yang sehat.</p>
          </div>
        </div>
        <div className="grid-3">
          {steps.map((step, i) => (
            <div className="card card-pad" key={step.title}>
              {/* Penanda urutan, bukan metrik — pil skor hijau dipakai untuk angka nyata saja */}
              <span className="step-number" aria-hidden="true">
                {i + 1}
              </span>
              <h3 style={{ marginTop: 14 }}>{step.title}</h3>
              <p className="step-desc">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="footer">Modalin — dibangun untuk UMKM Indonesia.</footer>
    </div>
  );
}

type LandingRow = {
  id: string;
  targetAmount: number;
  status: string;
  business?: {
    name: string;
    location: string;
    sector?: { name: string } | null;
  };
};

const steps = [
  {
    title: 'Lengkapi profil',
    desc: 'Ceritakan usahamu atau preferensi investasimu. Profil yang jujur menarik kecocokan yang tepat.',
  },
  {
    title: 'Temukan kecocokan',
    desc: 'Sistem mencocokkan kebutuhan dengan preferensi — sektor, rentang modal, lokasi, dan tingkat kepercayaan.',
  },
  {
    title: 'Mulai percakapan',
    desc: 'Diskusikan detail secara langsung di chat. Tanpa perantara, tanpa drama.',
  },
  {
    title: 'Sepakati & jalan',
    desc: 'Buat perjanjian bersama, tandatangani, dan biarkan usahamu tumbuh.',
  },
];
