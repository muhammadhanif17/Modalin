import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Icon } from '../components/ui/Icon';
import { formatRupiah, formatRupiahSingkat } from '../lib/format';
import { PHOTO_HERO, coverFor } from '../lib/photos';

/**
 * Landing ala daynight.co.uk tanpa animasinya: pita gelap editorial
 * (hero + angka raksasa + kutipan misi + FAQ + CTA penutup) diselingi
 * seksi terang berisi data yang benar-benar ada. Nol animasi, nol klaim
 * karangan — angka dan daftar peluang dihitung dari API.
 */
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
  const featured = rows.slice(0, 3);
  const sectors = new Set(rows.map((r) => r.business?.sector?.name).filter(Boolean)).size;

  const stats = [
    { value: rows.length > 0 ? String(rows.length) : '—', label: 'Peluang aktif' },
    { value: rows.length > 0 ? String(sectors) : '—', label: 'Sektor usaha' },
    {
      value: rows.length > 0 ? formatRupiahSingkat(Math.min(...rows.map((r) => r.targetAmount))) : '—',
      label: 'Kebutuhan terkecil',
    },
  ];

  return (
    <>
      {/* Pita gelap 1: hero + foto + angka raksasa */}
      <section className="night">
        <div className="shell hero-night">
          <div>
            <h1>
              Modal untuk usaha yang <em>tumbuh</em>.
            </h1>
            <p className="night-sub">
              Modalin mempertemukan UMKM terverifikasi dengan pemodal yang cocok — transparan dan
              tanpa perantara.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-cream" to="/register">
                Mulai sekarang
              </Link>
              <Link
                className="btn btn-ghost-light"
                to="/login"
                state={{ from: '/app/explore', notice: 'Masuk dulu untuk menjelajahi peluang.' }}
              >
                Jelajahi peluang
              </Link>
            </div>
            <p className="night-trust">
              <Icon name="lock" size={16} />
              Verifikasi KTP &amp; NIB · Skor kepercayaan terukur
            </p>
          </div>
          <figure className="hero-photo">
            <img src={PHOTO_HERO} alt="Pelaku UMKM Indonesia" loading="eager" />
            <figcaption className="float-badge">
              <b data-money>{rows.length > 0 ? rows.length : '—'}</b>
              <small>peluang aktif sekarang</small>
            </figcaption>
          </figure>
        </div>
        <div className="shell night-stats">
          {stats.map((s) => (
            <div key={s.label}>
              <b data-money>{s.value}</b>
              <small>{s.label}</small>
            </div>
          ))}
        </div>
      </section>

      {/* Seksi terang 1: peluang */}
      <div className="shell page-bottom">
        <section className="section-pad" aria-label="Peluang aktif">
          <p className="section-index">(01) — Peluang aktif</p>
          <div className="section-head">
            <div>
              <h2>Didanai sekarang</h2>
              <p>Pengajuan yang benar-benar berjalan di platform.</p>
            </div>
          </div>
          {featured.length === 0 && (
            <p className="opp-desc">Belum ada peluang. Coba lagi sebentar lagi.</p>
          )}
          {featured.length > 0 && (
            <div className="opp-grid">
              {featured.map((item) => (
                <Link
                  className="opp-card"
                  key={item.id}
                  to="/login"
                  state={{ from: '/app/explore', notice: 'Masuk dulu untuk menjelajahi peluang.' }}
                >
                  <div className="opp-cover">
                    {/* Foto dipilih menurut sektor usahanya, lihat lib/photos.ts */}
                    <img
                      src={coverFor(item.id, item.business?.sector?.name)}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div className="opp-card-body">
                    <span className="badge badge-soft">{item.business?.sector?.name}</span>
                    <h3>{item.business?.name}</h3>
                    <div className="opp-spec">{item.business?.location}</div>
                  </div>
                  <div className="opp-amount" data-money>
                    {formatRupiah(item.targetAmount)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Pita gelap 2: kutipan misi (bukan testimoni — tidak ada nama palsu) */}
      <section className="night night-quote">
        <div className="shell">
          <blockquote>
            “Ketika usaha kecil dipercaya modal, ia tumbuh dan membuka kerja untuk sekitarnya.”
          </blockquote>
          <p>— Misi Modalin</p>
        </div>
      </section>

      {/* Seksi terang 2: cara kerja */}
      <div className="shell page-bottom">
        <section className="section-pad" id="cara" aria-label="Cara kerja">
          <p className="section-index">(02) — Cara kerja</p>
          <div className="section-head">
            <div>
              <h2>Empat langkah menuju kemitraan</h2>
            </div>
          </div>
          <div className="steps-plain">
            {steps.map((step, i) => (
              <div key={step.title}>
                <span className="steps-plain-num" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3>{step.title}</h3>
                <p className="step-desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Pita gelap 3: FAQ + CTA penutup + kaki */}
      <section className="night">
        <div className="shell section-pad" aria-label="Pertanyaan umum">
          <p className="night-index">(03) — Pertanyaan umum</p>
          <div className="faq">
            {faqs.map((f) => (
              <details key={f.q} name="faq">
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
        <div className="shell night-cta">
          <h2>
            Ceritakan usahamu. Kami carikan <em>pemodalnya</em>.
          </h2>
          <Link className="btn btn-cream" to="/register">
            Mulai sekarang
          </Link>
          <footer className="night-foot">Modalin — dibangun untuk UMKM Indonesia.</footer>
        </div>
      </section>
    </>
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
    desc: 'Ceritakan usahamu atau preferensi investasimu.',
  },
  {
    title: 'Temukan kecocokan',
    desc: 'Sistem mencocokkan sektor, dana, lokasi, dan skor kepercayaan.',
  },
  {
    title: 'Mulai percakapan',
    desc: 'Diskusikan detail langsung di chat, tanpa perantara.',
  },
  {
    title: 'Sepakati & jalan',
    desc: 'Susun perjanjian, tandatangani, dan bertumbuh.',
  },
];

const faqs = [
  {
    q: 'Apa itu Modalin?',
    a: 'Platform yang mempertemukan pemilik usaha (UMKM) yang sudah terverifikasi dengan pemodal yang preferensinya cocok.',
  },
  {
    q: 'Apakah dana investasi lewat Modalin?',
    a: 'Tidak. Dana disalurkan langsung antara kedua pihak di luar platform. Pembayaran di platform terbatas pada biaya layanan.',
  },
  {
    q: 'Bagaimana cara terverifikasi?',
    a: 'Unggah KTP (dan NIB untuk usaha) di halaman verifikasi, lalu tunggu ditinjau admin. Badge Terverifikasi muncul setelah disetujui.',
  },
  {
    q: 'Siapa yang bisa bergabung?',
    a: 'Pemilik usaha yang butuh modal dan pemodal perorangan yang ingin mendanai bisnis lokal.',
  },
  {
    q: 'Bagaimana kecocokan dihitung?',
    a: 'Dari irisan skema kerja sama, lalu dibobot: sektor 40%, kebutuhan dana 30%, lokasi 10%, dan skor kepercayaan 20%.',
  },
];
