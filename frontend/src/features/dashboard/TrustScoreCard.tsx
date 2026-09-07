import { Link } from 'react-router-dom';
import { Badge, VERIFICATION_TONE, VERIFICATION_LABEL } from '../../components/ui';
import type { MyProfile, TrustBreakdown } from '../../lib/api';

export function TrustScoreCard({
  profile,
  breakdown,
}: {
  profile: MyProfile;
  breakdown: TrustBreakdown | null;
}) {
  const needsVerification = profile.verificationStatus !== 'VERIFIED';

  return (
    <div className="card card-pad stack" style={{ marginTop: 20 }}>
      <div className="opp-top">
        <div>
          <h3>Skor kepercayaan</h3>
          <div className="opp-meta">Dihitung dari kelengkapan profil, verifikasi, dan ulasan</div>
        </div>
        <Badge tone={VERIFICATION_TONE[profile.verificationStatus]}>
          {VERIFICATION_LABEL[profile.verificationStatus]}
        </Badge>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span data-money className="score-display">
          {profile.trustScore}
        </span>
        <span className="opp-meta">/ 100</span>
      </div>
      <div className="meter" aria-label={`Skor ${profile.trustScore} dari 100`}>
        <span style={{ width: `${profile.trustScore}%` }} />
      </div>

      {breakdown && breakdown.missing.length > 0 && (
        <>
          <p className="field-hint">Lengkapi ini untuk menaikkan skormu:</p>
          <ul className="reasons">
            {breakdown.missing.slice(0, 4).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </>
      )}

      {needsVerification && (
        <Link className="btn btn-primary btn-block" to="/app/verifikasi">
          {profile.verificationStatus === 'REJECTED' ? 'Perbaiki dokumen' : 'Verifikasi identitas'}
        </Link>
      )}
    </div>
  );
}
