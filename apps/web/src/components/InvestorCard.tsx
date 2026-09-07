import { Link } from 'react-router-dom';
import { COOPERATION_LABEL, type InvestorListing, type MatchResult } from '../lib/api';
import { formatRupiah } from '../lib/format';
import { Avatar } from './ui/Avatar';
import { Icon } from './ui/Icon';

/**
 * Kartu pemodal — pasangan dari OpportunityCard untuk sisi UMKM.
 *
 * Struktur sengaja dibuat sejajar (pil sektor + lencana verifikasi + lokasi,
 * grid angka tabular, lalu satu CTA) supaya kedua arah pencarian terasa seperti
 * satu produk, bukan dua halaman berbeda yang kebetulan berdampingan.
 */
export function InvestorCard({ item, match }: { item: InvestorListing; match?: MatchResult }) {
  const pref = item.preference;
  const name = item.fullName ?? 'Pemodal';

  return (
    <article className="opp-card">
      <div className="opp-top">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <Avatar name={name} seed={item.id} size="md" />
          <div style={{ minWidth: 0 }}>
            <div className="opp-meta" style={{ marginBottom: 2 }}>
              {pref?.preferredSector && (
                <span className="badge badge-primary">{pref.preferredSector.name}</span>
              )}
              {item.isVerified && (
                <span className="badge badge-success" title="Dokumen KYC sudah diverifikasi admin">
                  <Icon name="verified" size={13} />
                  Terverifikasi
                </span>
              )}
            </div>
            {item.location && (
              <div className="opp-meta">
                <span className="meta-item">
                  <Icon name="location" size={14} />
                  {item.location}
                </span>
              </div>
            )}
          </div>
        </div>
        {match && (
          <span className="badge badge-primary" title={match.reasons.join(' · ')} style={{ flex: 'none' }}>
            Match {match.score}%
          </span>
        )}
      </div>

      <div>
        <h3 className="opp-name">{name}</h3>
        <div className="opp-meta">
          {pref?.preferredSector ? `Fokus ${pref.preferredSector.name}` : 'Terbuka untuk semua sektor'}
        </div>
      </div>

      {item.bio && <p className="opp-desc">{item.bio}</p>}

      {pref && pref.cooperationTypes.length > 0 && (
        <ul className="chip-row" aria-label="Skema kerja sama yang diterima">
          {pref.cooperationTypes.map((type) => (
            <li key={type} className="chip">
              {COOPERATION_LABEL[type]}
            </li>
          ))}
        </ul>
      )}

      <div className="num-grid">
        <div>
          <small>Rentang Dana</small>
          <b data-money>
            {pref ? `${formatRupiah(pref.minimumAmount)} – ${formatRupiah(pref.maximumAmount)}` : '—'}
          </b>
        </div>
        <div>
          <small>Wilayah Incaran</small>
          <b>{pref?.preferredLocation ?? 'Fleksibel'}</b>
        </div>
        <div>
          <small>Skor Kepercayaan</small>
          <b data-money>{item.trustScore}/100</b>
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
          {pref?.preferredLocation
            ? `Mengincar ${pref.preferredLocation}`
            : 'Tidak membatasi lokasi usaha'}
        </span>
        <Link className="btn btn-primary btn-sm" to={`/app/mitra/${item.id}`}>
          Lihat Profil Pemodal
        </Link>
      </div>
    </article>
  );
}
