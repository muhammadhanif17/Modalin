import { Link } from 'react-router-dom';
import { Icon } from '../../components/ui/Icon';
import type { TrustBreakdown } from '../../lib/api';

/**
 * Kelengkapan profil — blok "Kelengkapan Profil Usaha 75%" di mockup a1,
 * dan padanannya di sisi pemodal (b1).
 *
 * Angkanya bukan hiasan: profileCompleteness adalah komponen bobot 40 dari
 * Trust Score, jadi persentase di sini benar-benar memberi tahu berapa banyak
 * dari 40 poin itu yang sudah didapat. Satu hal yang paling dekat untuk
 * dilengkapi ikut disebut, supaya pengguna tahu langkah berikutnya alih-alih
 * cuma melihat angka.
 */

const BOBOT_KELENGKAPAN = 40;

export function ProfileProgress({
  breakdown,
  isInvestor,
}: {
  breakdown: TrustBreakdown | null;
  isInvestor: boolean;
}) {
  if (!breakdown) return null;

  const persen = Math.round((breakdown.profileCompleteness / BOBOT_KELENGKAPAN) * 100);
  if (persen >= 100) return null;

  const berikutnya = breakdown.missing[0];
  const sisaPoin = BOBOT_KELENGKAPAN - breakdown.profileCompleteness;

  return (
    <section className="progress-card" aria-label="Kelengkapan profil">
      <div className="progress-head">
        <span className="progress-icon">
          <Icon name="check" size={18} />
        </span>
        <div>
          <h3>{isInvestor ? 'Kelengkapan profil pemodal' : 'Kelengkapan profil usaha'}</h3>
          <p>
            Bagian ini menyumbang {BOBOT_KELENGKAPAN} poin ke skor kepercayaanmu.
          </p>
        </div>
        <b data-money>{persen}%</b>
      </div>

      <div className="meter" aria-label={`Profil terisi ${persen} persen`}>
        <span style={{ width: `${persen}%` }} />
      </div>

      {berikutnya && (
        <p className="progress-tip">
          Berikutnya: <b>{berikutnya}</b>. Melengkapinya menambah sampai {sisaPoin} poin dan
          mempercepat respons mitra.
        </p>
      )}

      <Link className="btn btn-outline btn-block" to={isInvestor ? '/app/preferensi/edit' : '/app/profile/edit'}>
        {isInvestor ? 'Lengkapi profil pemodal' : 'Lengkapi profil usaha'}
      </Link>
    </section>
  );
}
