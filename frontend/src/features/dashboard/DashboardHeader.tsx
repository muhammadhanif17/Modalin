import { Link } from 'react-router-dom';
import { Avatar } from '../../components/ui/Avatar';
import { Badge, VERIFICATION_TONE, VERIFICATION_LABEL } from '../../components/ui';
import type { MyProfile } from '../../lib/api';

function salam(): string {
  const h = new Date().getHours();
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 19) return 'Selamat sore';
  return 'Selamat malam';
}

export function DashboardHeader({ profile, isInvestor, lead }: { profile: MyProfile; isInvestor: boolean; lead: string }) {
  return (
    <>
      <div className="greeting">
        <Avatar name={profile.fullName} seed={profile.id} size="lg" />
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 className="greeting-name">{profile.fullName}</h1>
          <div className="greeting-role">{isInvestor ? 'Pemodal' : 'Pengusaha'}</div>
          <div className="greeting-pills">
            <span className="score">Skor {profile.trustScore}/100</span>
            <Badge tone={VERIFICATION_TONE[profile.verificationStatus]}>
              {VERIFICATION_LABEL[profile.verificationStatus]}
            </Badge>
          </div>
        </div>
      </div>

      <p className="greeting-lead">
        {salam()}, {profile.fullName.split(' ')[0]}. {lead}
      </p>
    </>
  );
}
