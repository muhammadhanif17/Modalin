import { Link } from 'react-router-dom';
import { Avatar } from '../../components/ui/Avatar';
import { formatRupiah } from '../../lib/format';
import type { MatchesResponse } from '../../lib/api';

/** Tiga rekomendasi teratas dari pencocokan otomatis, sisi mana pun. */
export function TopMatches({ matches }: { matches: MatchesResponse }) {
  if (matches.recommended.length === 0) return null;

  return (
    <>
      <div className="section-head">
        <h2>Paling cocok untukmu</h2>
        <Link to="/app/matches" className="opp-meta">
          Lihat semua →
        </Link>
      </div>
      <div className="stack">
        {matches.audience === 'pemodal'
          ? matches.recommended.slice(0, 3).map((item) => (
              <Link className="row-link" to={`/app/mitra/${item.id}`} key={item.id}>
                <Avatar name={item.fullName ?? 'Pemodal'} seed={item.id} size="md" />
                <div className="row-main">
                  <div className="row-title">{item.fullName ?? 'Pemodal'}</div>
                  <div className="row-sub">
                    {item.preference?.preferredSector?.name ?? 'Semua sektor'} ·{' '}
                    <span data-money>
                      {item.preference ? formatRupiah(item.preference.maximumAmount) : '—'}
                    </span>
                  </div>
                </div>
                <span className="badge badge-primary">Match {item.match.score}%</span>
              </Link>
            ))
          : matches.recommended.slice(0, 3).map((item) => (
              <Link className="row-link" to={`/app/mitra/${item.owner.id}`} key={item.id}>
                <Avatar name={item.business.name} seed={item.owner.id} size="md" />
                <div className="row-main">
                  <div className="row-title">{item.business.name}</div>
                  <div className="row-sub">
                    {item.business.sector.name} ·{' '}
                    <span data-money>{formatRupiah(item.targetAmount)}</span>
                  </div>
                </div>
                <span className="badge badge-primary">Match {item.match.score}%</span>
              </Link>
            ))}
      </div>
    </>
  );
}
