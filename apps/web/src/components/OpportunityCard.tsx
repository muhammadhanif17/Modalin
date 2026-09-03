import { formatRupiah } from '../lib/format';
import { Avatar } from './ui/Avatar';
import { Score } from './ui';

export type OpportunityItem = {
  id: string;
  name: string;
  sector: string;
  location: string;
  description: string;
  targetAmount: number;
  cooperationType?: string | null;
  ownerName?: string | null;
  matchScore?: number | null;
};

export function OpportunityCard({
  item,
  rank,
}: {
  item: OpportunityItem;
  rank?: number;
}) {
  return (
    <article className="opp-card">
      <div className="opp-top">
        <Avatar name={item.ownerName ?? item.name} seed={item.id} size="md" />
        <span className="badge badge-soft">{item.sector}</span>
      </div>
      <div>
        <h3>{item.name}</h3>
        <div className="opp-meta">
          <span>📍 {item.location}</span>
          {item.cooperationType && <span>· {item.cooperationType}</span>}
        </div>
      </div>
      <p className="opp-desc">{item.description}</p>
      <div className="opp-foot">
        <div className="opp-amount">
          {formatRupiah(item.targetAmount)}
          <small>target pendanaan</small>
        </div>
        {rank !== undefined ? (
          <span className="badge badge-accent">Peringkat {rank + 1}</span>
        ) : (
          item.matchScore != null && <Score value={item.matchScore} />
        )}
      </div>
    </article>
  );
}
