import { Link } from 'react-router-dom';

type Attention = {
  tag: string | null;
  title: string;
  sub: string;
  cta: string;
  to: string;
} | null;

/**
 * Kartu gelap "Perhatian Utama Hari Ini" dari mockup beranda — satu hal
 * paling mendesak, ditonjolkan sebelum apa pun yang lain. Aksi lebih dulu,
 * skor menyusul.
 */
export function AttentionCard({ attention }: { attention: Attention }) {
  if (!attention) return null;
  return (
    <div className="attention">
      <div className="attention-head">
        <span>Perhatian Utama Hari Ini</span>
        {attention.tag && <span className="attention-tag">{attention.tag}</span>}
      </div>
      <strong className="attention-title">{attention.title}</strong>
      <p className="attention-sub">{attention.sub}</p>
      <Link className="btn btn-attention btn-block" to={attention.to}>
        {attention.cta}
      </Link>
    </div>
  );
}
