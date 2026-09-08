import { Link } from 'react-router-dom';
import { COOPERATION_LABEL, type MatchResult, type Opportunity } from '../lib/api';
import { formatRupiah } from '../lib/format';

/**
 * Kartu peluang usaha pola index.html (cardOpp): sampul gradien + sektor,
 * lokasi + skor cocok, nama dua baris, chip skema, matriks Target/Tenor/ROI,
 * dan kaki kepercayaan + "Pelajari Usaha". Angka tanpa sumber ("Terkumpul
 * 60%", "Pembukuan teraudit") tetap tidak dibawa.
 */
export function OpportunityCard({ item, match }: { item: Opportunity; match?: MatchResult }) {
  const { business, owner } = item;
  const skema = item.cooperationTypes.map((t) => COOPERATION_LABEL[t]);

  return (
    <article className="card rec-card">
      <div className="rec-cover" data-initial={initialOf(business.name)} aria-hidden="true">
        <span className="badge badge-primary">{business.sector.name}</span>
      </div>
      <div className="rec-body">
        <div className="opp-top">
          <div className="opp-meta">{business.location}</div>
          {match && (
            <span className="score" title={match.reasons.join(' · ')}>
              {match.score}%
            </span>
          )}
        </div>
        <div className="rec-title">
          <h3 className="rec-name-wrap">
            {business.name}{' '}
            {owner.isVerified && (
              <span className="material-symbols-outlined text-secondary text-[16px]" aria-label="Terverifikasi">
                verified
              </span>
            )}
          </h3>
          <div className="opp-meta">{item.title}</div>
        </div>
        {skema.length > 0 && (
          <div className="chip-row" aria-label="Skema kerja sama">
            {skema.map((s) => (
              <span key={s} className="badge badge-soft">
                {s}
              </span>
            ))}
          </div>
        )}
        <div className="num-grid">
          <div>
            <small>Target Modal</small>
            <b data-money>{formatRupiah(item.targetAmount)}</b>
          </div>
          <div>
            <small>Tenor</small>
            <b data-money>{item.tenorMonths ? `${item.tenorMonths} bln` : '—'}</b>
          </div>
          <div>
            <small>ROI</small>
            <b data-money>{item.estimatedRoi != null ? `${item.estimatedRoi}%` : '—'}</b>
          </div>
        </div>
        <div className="opp-foot">
          <span className="opp-meta">
            Kepercayaan <b data-money>{owner.trustScore}</b>/100
          </span>
          <Link className="btn btn-primary btn-sm" to={`/app/mitra/${owner.id}`}>
            Pelajari Usaha
          </Link>
        </div>
      </div>
    </article>
  );
}

/** Huruf raksasa sampul — inisial depan nama usaha. */
function initialOf(name: string) {
  return (name.trim().charAt(0) || 'U').toUpperCase();
}
