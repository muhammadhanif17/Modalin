import { Link } from 'react-router-dom';
import { COOPERATION_LABEL, type MatchResult, type Opportunity } from '../lib/api';
import { formatRupiah } from '../lib/format';
import { Avatar } from './ui/Avatar';

/**
 * Kartu peluang, mengikuti spesifikasi kartu di DESIGN.md:
 * baris atas berisi pil sektor, badge lokasi, dan lencana terverifikasi;
 * tengah berisi grid angka tabular; bawah berisi aksi.
 */
export function OpportunityCard({
  item,
  match,
}: {
  item: Opportunity;
  match?: MatchResult;
}) {
  const { business, owner } = item;

  return (
    <article className="opp-card">
      <div className="opp-top">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <Avatar name={owner.fullName ?? business.name} seed={owner.id} size="md" />
          <div style={{ minWidth: 0 }}>
            <div className="opp-meta" style={{ marginBottom: 2 }}>
              <span className="badge badge-primary">{business.sector.name}</span>
              {/* Badge Terverifikasi hanya muncul kalau admin sudah menyetujui (FR-02) */}
              {owner.isVerified && (
                <span className="badge badge-success" title="Dokumen KYC sudah diverifikasi admin">
                  ✓ Terverifikasi
                </span>
              )}
            </div>
            <div className="opp-meta">📍 {business.location}</div>
          </div>
        </div>
        {match && (
          <span
            className="badge badge-success"
            title={match.reasons.join(' · ')}
            style={{ flex: 'none' }}
          >
            Match {match.score}%
          </span>
        )}
      </div>

      <div>
        <h3>{business.name}</h3>
        <div className="opp-meta">{item.title}</div>
      </div>

      <p className="opp-desc">{business.description}</p>

      <div className="chip-row" aria-label="Skema kerja sama yang dibuka">
        {item.cooperationTypes.map((type) => (
          <span
            key={type}
            className="chip"
            aria-pressed={match?.matchedCooperationTypes.includes(type) ? 'true' : 'false'}
          >
            {COOPERATION_LABEL[type]}
          </span>
        ))}
      </div>

      {/* Grid angka: semua nominal tabular supaya kolomnya lurus antar kartu */}
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
          <small>Estimasi ROI</small>
          <b data-money>{item.estimatedRoi != null ? `${item.estimatedRoi}%` : '—'}</b>
        </div>
      </div>

      {match && match.reasons.length > 0 && (
        <ul className="reasons">
          {match.reasons.slice(0, 3).map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}

      <div className="opp-foot">
        <span className="opp-meta">
          Skor kepercayaan <b data-money>{owner.trustScore}</b>/100
        </span>
        <Link className="btn btn-primary btn-sm" to={`/app/mitra/${owner.id}`}>
          Pelajari Usaha
        </Link>
      </div>
    </article>
  );
}
