import { Link } from 'react-router-dom';
import { Icon, type IconName } from '../../components/ui/Icon';

type Shortcut = { to: string; icon: IconName; title: string; sub: string };

const SHORTCUTS = (isInvestor: boolean): Shortcut[] => [
  {
    to: '/app/agreements',
    icon: 'document',
    title: 'Dokumen kesepakatan',
    sub: 'Susun, tandatangani, dan terbitkan SPK',
  },
  {
    to: '/app/rekam-jejak',
    icon: 'folder',
    title: isInvestor ? 'Rekam jejak pendanaan' : 'Berkas pendukung',
    sub: 'Unggah dokumen agar mitra lebih yakin',
  },
  {
    to: '/app/pembayaran',
    icon: 'receipt',
    title: 'Pembayaran',
    sub: 'Biaya layanan dan langganan Modalin Pro',
  },
];

export function Shortcuts({ isInvestor }: { isInvestor: boolean }) {
  return (
    <>
      <div className="section-head">
        <h2>Pintasan</h2>
      </div>
      <div className="stack">
        {SHORTCUTS(isInvestor).map((item) => (
          <Link className="row-link" to={item.to} key={item.to}>
            <span className="row-icon">
              <Icon name={item.icon} />
            </span>
            <div className="row-main">
              <div className="row-title">{item.title}</div>
              <div className="row-sub">{item.sub}</div>
            </div>
            <Icon name="chevron" size={18} className="row-chevron" />
          </Link>
        ))}
      </div>
    </>
  );
}
