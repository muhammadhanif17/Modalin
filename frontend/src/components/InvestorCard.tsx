import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, MapPin, Star, Target } from 'lucide-react';
import { COOPERATION_LABEL, type InvestorListing, type MatchResult } from '../lib/api';
import { formatRupiahSingkat } from '../lib/format';
import { coverFor } from '../lib/photos';

/**
 * Kartu pemodal — dipindahkan dari mockup a8 (Eksplorasi Investor).
 *
 * Bentuknya sengaja dibuat kembar dengan OpportunityCard supaya kedua arah
 * pencarian terasa satu produk. Rentang dana ditulis ringkas ("Rp 50 Jt –
 * 200 Jt") persis seperti mockup: versi angka penuh memecah dirinya jadi empat
 * baris di dalam kolom setengah kartu.
 *
 * Dua isian mockup tidak dibawa karena tidak ada sumber datanya: "Terverifikasi
 * KTP & NPWP OJK" (kami tidak memverifikasi ke OJK) dan "Telah mendanai 6 UMKM
 * • 100% Pembayaran Lancar" (riwayat pendanaan belum dicatat).
 */
export function InvestorCard({ item, match }: { item: InvestorListing; match?: MatchResult }) {
  const pref = item.preference;
  const nama = item.fullName ?? 'Pemodal';
  const skema = (pref?.cooperationTypes ?? []).map((t) => COOPERATION_LABEL[t]);

  return (
    <article className="p-5 rounded-2xl bg-surface-container-lowest shadow-md flex flex-col gap-space-md relative overflow-hidden">
      <div className="flex items-start justify-between gap-space-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <img
              alt=""
              className="w-14 h-14 rounded-full object-cover shadow-sm"
              src={coverFor(item.id, pref?.preferredSector?.name)}
              loading="lazy"
              decoding="async"
            />
            {item.isVerified && (
              <BadgeCheck
                className="absolute -bottom-1 -right-1 w-[18px] h-[18px] text-secondary bg-surface-container-lowest rounded-full"
                aria-hidden="true"
              />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <h3 className="text-headline-sm text-primary font-bold truncate">{nama}</h3>
            <span className="text-body-sm text-on-surface-variant truncate">
              {pref?.preferredSector ? `Fokus ${pref.preferredSector.name}` : 'Terbuka semua sektor'}
            </span>
            {item.location && (
              <div className="flex items-center gap-1 mt-0.5 text-on-surface-variant text-label-sm">
                <MapPin className="w-[14px] h-[14px] shrink-0" aria-hidden="true" />
                <span className="truncate">{item.location}</span>
              </div>
            )}
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
        {item.isVerified && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary-container/50 text-on-secondary-container text-label-sm font-bold">
            <BadgeCheck className="w-[14px] h-[14px]" aria-hidden="true" />
            <span>Terverifikasi KTP</span>
          </div>
        )}
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary-container text-on-primary text-label-sm font-bold">
          <Star className="w-[14px] h-[14px] text-tertiary-fixed fill-current" aria-hidden="true" />
          <span>Skor Percaya: {item.trustScore}/100</span>
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-surface-container-low grid grid-cols-2 gap-3">
        <div className="flex flex-col min-w-0">
          <span className="text-label-sm text-on-surface-variant uppercase tracking-wider">
            Alokasi Siap Salur
          </span>
          <span className="text-headline-sm text-primary font-extrabold mt-0.5 tabular-nums">
            {pref
              ? `${formatRupiahSingkat(pref.minimumAmount)} – ${formatRupiahSingkat(pref.maximumAmount)}`
              : '—'}
          </span>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-label-sm text-on-surface-variant uppercase tracking-wider">
            Wilayah Incaran
          </span>
          <span className="text-headline-sm text-secondary font-extrabold mt-0.5">
            {pref?.preferredLocation ?? 'Fleksibel'}
          </span>
        </div>
      </div>

      {skema.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-label-sm text-on-surface-variant font-medium">
            Skema kerja sama yang diterima:
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
      )}

      {item.bio && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-surface-container/60">
          <Target className="w-[18px] h-[18px] text-secondary shrink-0" aria-hidden="true" />
          <p className="text-body-sm leading-tight text-on-surface-variant line-clamp-2">
            {item.bio}
          </p>
        </div>
      )}

      <Link
        className="w-full h-[48px] rounded-xl bg-primary text-on-primary flex items-center justify-center gap-2 text-label-lg font-bold shadow-sm active:scale-[0.99] transition-transform hover:bg-secondary no-underline"
        to={`/app/mitra/${item.id}`}
      >
        <span>Lihat Profil Pemodal</span>
        <ArrowRight className="w-[18px] h-[18px]" aria-hidden="true" />
      </Link>
    </article>
  );
}
