import { Link } from 'react-router-dom';
import { COOPERATION_LABEL, type MatchResult, type Opportunity } from '../lib/api';
import { formatRupiah } from '../lib/format';
import { Avatar } from './ui/Avatar';
import { Icon } from './ui/Icon';

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
                  <Icon name="verified" size={13} />
                  Terverifikasi
                </span>
              )}
            </div>
            <div className="opp-meta">
              <span className="meta-item">
                <Icon name="location" size={14} />
                {business.location}
              </span>
            </div>
          </div>
        </div>
        {match && (
          /* Skor kecocokan bukan status verifikasi — pakai warna brand, bukan hijau status */
          <span className="badge badge-primary" title={match.reasons.join(' · ')} style={{ flex: 'none' }}>
            Match {match.score}%
          </span>
        )}
      </div>

      <div>
        <h3 className="opp-name">{business.name}</h3>
        <div className="opp-meta">{item.title}</div>
      </div>

      <p className="opp-desc">{business.description}</p>

      {/*
        Chip di sini informatif, bukan tombol — `aria-pressed` pada <span> tidak
        valid dan diabaikan pembaca layar. Skema yang beririsan ditandai lewat
        kelas visual, dan daftarnya dibungkus <ul> supaya terbaca sebagai daftar.
      */}
      <ul className="chip-row" aria-label="Skema kerja sama yang dibuka">
        {item.cooperationTypes.map((type) => (
          <li
            key={type}
            className={`chip ${match?.matchedCooperationTypes.includes(type) ? 'is-selected' : ''}`}
          >
            {COOPERATION_LABEL[type]}
          </li>
        ))}
      </ul>

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
