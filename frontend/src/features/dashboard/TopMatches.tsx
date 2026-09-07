import { Link } from 'react-router-dom';
import { Avatar } from '../../components/ui/Avatar';
import { formatRupiah } from '../../lib/format';
import type { MatchesResponse, MatchedInvestor, MatchedOpportunity } from '../../lib/api';

/**
 * Daftar rekomendasi lengkap di beranda — tidak ada halaman terpisah.
 * Baris ringkas (avatar, nama, sub, badge skor), bukan kartu penuh.
 */
export function TopMatches({ matches }: { matches: MatchesResponse }) {
  if (matches.recommended.length === 0 && matches.alternatives.length === 0) return null;
  // Persempit union lewat audience supaya baris mendapat tipe yang tepat.
  if (matches.audience === 'pemodal') {
    return (
      <>
        <div className="section-head">
          <h2>Rekomendasi pemodal</h2>
        </div>
        <div className="stack">
          {matches.recommended.map((item) => (
            <InvestorRow key={item.id} item={item} />
          ))}
        </div>
        {matches.alternatives.length > 0 && (
          <>
            <div className="section-head">
              <h2>Alternatif terdekat</h2>
            </div>
            <div className="stack">
              {matches.alternatives.map((item) => (
                <InvestorRow key={item.id} item={item} />
              ))}
            </div>
          </>
        )}
      </>
    );
  }
  return (
    <>
      <div className="section-head">
        <h2>Rekomendasi peluang</h2>
      </div>
      <div className="stack">
        {matches.recommended.map((item) => (
          <OpportunityRow key={item.id} item={item} />
        ))}
      </div>
      {matches.alternatives.length > 0 && (
        <>
          <div className="section-head">
            <h2>Alternatif terdekat</h2>
          </div>
          <div className="stack">
            {matches.alternatives.map((item) => (
              <OpportunityRow key={item.id} item={item} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

type InvestorItem = MatchedInvestor;
type OpportunityItem = MatchedOpportunity;

function InvestorRow({ item }: { item: InvestorItem }) {
  return (
    <Link className="row-link" to={`/app/mitra/${item.id}`}>
      <Avatar name={item.fullName ?? 'Pemodal'} seed={item.id} size="md" />
      <div className="row-main">
        <div className="row-title">{item.fullName ?? 'Pemodal'}</div>
        <div className="row-sub">
          {item.preference?.preferredSector?.name ?? 'Semua sektor'} ·{' '}
          <span data-money>{item.preference ? formatRupiah(item.preference.maximumAmount) : '—'}</span>
        </div>
      </div>
      <span className="badge badge-primary">Match {item.match.score}%</span>
    </Link>
  );
}

function OpportunityRow({ item }: { item: OpportunityItem }) {
  return (
    <Link className="row-link" to={`/app/mitra/${item.owner.id}`}>
      <Avatar name={item.business.name} seed={item.owner.id} size="md" />
      <div className="row-main">
        <div className="row-title">{item.business.name}</div>
        <div className="row-sub">
          {item.business.sector.name} · <span data-money>{formatRupiah(item.targetAmount)}</span>
        </div>
      </div>
      <span className="badge badge-primary">Match {item.match.score}%</span>
    </Link>
  );
}
