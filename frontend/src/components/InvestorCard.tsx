import { Link } from 'react-router-dom';
import { type InvestorListing, type MatchResult } from '../lib/api';
import { formatRupiahSingkat, initials } from '../lib/format';

/**
 * Kartu pemodal pola index.html (cardInv): sampul gradien + sektor, baris
 * identitas (foto/inisial, nama satu baris, fokus, lokasi), matriks angka,
 * dan kaki "Fokus X + Lihat Profil". Data tetap dari API; tidak ada angka
 * oder ajakan yang tak punya sumber ("Telah mendanai 6 UMKM", klaim OJK).
 */
export function InvestorCard({ item, match }: { item: InvestorListing; match?: MatchResult }) {
  const pref = item.preference;
  const nama = item.fullName ?? 'Pemodal';
  const sector = pref?.preferredSector?.name ?? 'Semua sektor';

  return (
    <article className="card rec-card">
      <div className="rec-cover" data-initial={initialOf(nama)} aria-hidden="true">
        <span className="badge badge-primary">{sector}</span>
      </div>
      <div className="rec-body">
        <div className="opp-top">
          <div className="rec-id">
            {item.avatarUrl ? (
              <img className="rec-avatar" src={item.avatarUrl} alt="" loading="lazy" decoding="async" />
            ) : (
              <span className={`avatar avatar-md ${toneFor(item.id)}`} aria-hidden="true">
                {initials(nama)}
              </span>
            )}
            <div className="rec-title">
              <h3 className="rec-name">
                {nama}{' '}
                {item.isVerified && (
                  <span className="material-symbols-outlined text-secondary text-[16px]" aria-label="Terverifikasi">
                    verified
                  </span>
                )}
              </h3>
              <div className="opp-meta">{pref ? `Fokus ${sector}` : 'Terbuka semua sektor'}</div>
              {item.location && <div className="opp-meta">{item.location}</div>}
            </div>
          </div>
          {match ? (
            <span className="score" title={match.reasons.join(' · ')}>
              {match.score}%
            </span>
          ) : (
            <span className="score">{item.trustScore}</span>
          )}
        </div>
        <div className="num-grid">
          <div>
            <small>Kapasitas</small>
            <b data-money>
              {pref
                ? `${formatRupiahSingkat(pref.minimumAmount)} – ${formatRupiahSingkat(pref.maximumAmount)}`
                : 'Fleksibel'}
            </b>
          </div>
          <div>
            <small>Skor</small>
            <b data-money>{item.trustScore}/100</b>
          </div>
          <div>
            <small>Status</small>
            <b>{item.isVerified ? 'Terverifikasi' : 'Baru'}</b>
          </div>
        </div>
        <div className="opp-foot">
          <span className="opp-meta">Fokus {sector}</span>
          <Link className="btn btn-primary btn-sm" to={`/app/mitra/${item.id}`}>
            Lihat Profil
          </Link>
        </div>
      </div>
    </article>
  );
}

/** Huruf raksasa sampul — inisial depan nama, seperti data-initial index.html. */
function initialOf(name: string) {
  return (name.trim().charAt(0) || 'M').toUpperCase();
}

/** Nada avatar stabil per id dari palet avatar-t1..t6. */
function toneFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h + id.charCodeAt(i)) % 6;
  return `avatar-t${h + 1}`;
}
