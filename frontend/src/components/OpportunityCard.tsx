import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, MapPin, Star, Store } from 'lucide-react';
import { COOPERATION_LABEL, type MatchResult, type Opportunity } from '../lib/api';
import { formatRupiah, formatRupiahSingkat } from '../lib/format';
import { Avatar } from './ui/Avatar';
import { coverFor } from '../lib/photos';

/**
 * Kartu peluang usaha — dipindahkan dari mockup b6 (Eksplorasi UMKM).
 *
 * Kelas Tailwind-nya diambil apa adanya dari mockup supaya tampilannya benar
 * sejak awal, bukan diterjemahkan ulang ke CSS tulis tangan. Dua penyesuaian
 * yang disengaja: ikon Material Symbols diganti lucide-react (tidak ada jeda
 * memuat font yang sempat menampilkan teks ligatur mentah), dan angka yang
 * tidak punya sumber data dihapus — mockup memajang "Terkumpul 60% (3/5 slot)"
 * dan "Pembukuan teraudit Modalin", dua-duanya tidak ada di skema.
 */
export function OpportunityCard({ item, match }: { item: Opportunity; match?: MatchResult }) {
  const { business, owner } = item;
  const skema = item.cooperationTypes.map((t) => COOPERATION_LABEL[t]);
  const umur = business.establishedYear ? new Date().getFullYear() - business.establishedYear : null;

  return (
    <article className="p-5 rounded-2xl bg-surface-container-lowest shadow-md flex flex-col gap-space-md relative overflow-hidden">
      <div className="flex items-start justify-between gap-space-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <img
              alt=""
              className="w-14 h-14 rounded-full object-cover shadow-sm"
              src={coverFor(item.id, business.sector.name)}
              loading="lazy"
              decoding="async"
            />
            {owner.isVerified && (
              <BadgeCheck
                className="absolute -bottom-1 -right-1 w-[18px] h-[18px] text-secondary bg-surface-container-lowest rounded-full"
                aria-hidden="true"
              />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <h3 className="text-headline-sm text-primary font-bold truncate">{business.name}</h3>
            <span className="text-body-sm text-on-surface-variant truncate">
              {owner.fullName ? `Pemilik: ${owner.fullName} • ` : ''}
              {business.sector.name}
            </span>
            <div className="flex items-center gap-1 mt-0.5 text-on-surface-variant text-label-sm">
              <MapPin className="w-[14px] h-[14px] shrink-0" aria-hidden="true" />
              <span className="truncate">{business.location}</span>
            </div>
          </div>
        </div>
        {match && (
          <span
            className="px-2.5 py-1 rounded-full bg-secondary text-on-secondary text-label-sm font-black tracking-tight shrink-0 shadow-sm"
            title={match.reasons.join(' · ')}
          >
            {match.score}% Cocok
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {owner.isVerified && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary-container/50 text-on-secondary-container text-label-sm font-bold">
            <BadgeCheck className="w-[14px] h-[14px]" aria-hidden="true" />
            <span>Terverifikasi KTP &amp; NIB</span>
          </div>
        )}
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary-container text-on-primary text-label-sm font-bold">
          <Star className="w-[14px] h-[14px] text-tertiary-fixed fill-current" aria-hidden="true" />
          <span>Skor Percaya: {owner.trustScore}/100</span>
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-surface-container-low grid grid-cols-2 gap-3">
        <div className="flex flex-col min-w-0">
          <span className="text-label-sm text-on-surface-variant uppercase tracking-wider">
            Target Modal
          </span>
          <span className="text-headline-sm text-primary font-extrabold mt-0.5 tabular-nums">
            {formatRupiah(item.targetAmount)}
          </span>
          {item.tenorMonths && (
            <span className="text-label-sm text-on-surface-variant mt-0.5">
              Tenor {item.tenorMonths} bulan
            </span>
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-label-sm text-on-surface-variant uppercase tracking-wider">
            Penawaran Imbal
          </span>
          <span className="text-headline-sm text-secondary font-extrabold mt-0.5 tabular-nums">
            {item.estimatedRoi != null ? `${item.estimatedRoi}%` : '—'}
          </span>
          {business.monthlyRevenue != null && (
            <span className="text-label-sm text-on-surface-variant mt-0.5 tabular-nums">
              Omzet {formatRupiahSingkat(business.monthlyRevenue)}/bln
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-label-sm text-on-surface-variant font-medium">
          Skema kerja sama yang dibuka:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {skema.map((s) => (
            <span
              key={s}
              className="px-2.5 py-1 rounded-md bg-surface-container text-label-sm font-semibold text-primary"
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      {umur !== null && umur >= 0 && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-surface-container/60">
          <Store className="w-[18px] h-[18px] text-secondary shrink-0" aria-hidden="true" />
          <p className="text-body-sm leading-tight text-on-surface-variant">
            Sudah berjalan <span className="font-bold text-primary">{umur} tahun</span> · berdiri{' '}
            {business.establishedYear}
          </p>
        </div>
      )}

      <Link
        className="w-full h-[48px] rounded-xl bg-primary text-on-primary flex items-center justify-center gap-2 text-label-lg font-bold shadow-sm active:scale-[0.99] transition-transform hover:bg-secondary no-underline"
        to={`/app/mitra/${owner.id}`}
      >
        <span>Tinjau Proposal</span>
        <ArrowRight className="w-[18px] h-[18px]" aria-hidden="true" />
      </Link>
    </article>
  );
}

/** Dipertahankan supaya impor lama tidak putus; avatar inisial dipakai di rute lain. */
export { Avatar };
