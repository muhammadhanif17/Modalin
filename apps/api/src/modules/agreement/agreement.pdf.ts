import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import { CooperationType } from '@prisma/client';
import { COOPERATION_LABEL } from '../../lib/cooperation.js';
import { scopeDir } from '../../middleware/upload.js';

/**
 * Modul 6 — Otomatisasi Dokumen Perjanjian (FR-10, FR-11).
 *
 * Template diisi sesuai jenis kerja sama yang disepakati: pasal pokok berbeda
 * untuk Bagi Hasil, Penyertaan Modal, dan Pinjaman.
 *
 * PENTING (ARCHITECTURE.md §11): tanda tangan di sini TIDAK tersertifikasi
 * PSrE. Dokumen tetap sah menurut Pasal 11 UU ITE dan Pasal 59 ayat (3)
 * PP No. 71/2019, tapi kekuatan pembuktiannya di bawah dokumen bersertifikat.
 * Disclaimer itu WAJIB ikut tercetak — jangan pernah mengklaim setara akta
 * notaris.
 */

const DISCLAIMER =
  'Dokumen ini ditandatangani secara elektronik melalui platform Modalin. Tanda tangan elektronik ' +
  'yang digunakan BELUM tersertifikasi oleh Penyelenggara Sertifikasi Elektronik (PSrE). Dokumen ' +
  'tetap memiliki kekuatan hukum berdasarkan Pasal 11 Undang-Undang Informasi dan Transaksi ' +
  'Elektronik serta Pasal 59 ayat (3) Peraturan Pemerintah Nomor 71 Tahun 2019, namun kekuatan ' +
  'pembuktiannya berada di bawah dokumen yang disertifikasi PSrE dan TIDAK setara dengan akta notaris. ' +
  'Penyaluran dana investasi dilakukan langsung antara kedua belah pihak di luar platform Modalin.';

export type AgreementPdfInput = {
  agreementNumber: string;
  cooperationType: CooperationType;
  amount: number;
  startDate: Date;
  endDate: Date | null;
  profitSharingRatio: number | null;
  equityPercentage: number | null;
  interestRate: number | null;
  tenorMonths: number | null;
  terms: string | null;
  businessName: string | null;
  parties: Array<{ role: string; fullName: string; email: string; signedAt: Date; signatureUrl: string }>;
};

const rupiah = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;
const tanggal = (d: Date) =>
  d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

/** Pasal pokok yang berbeda per skema — menutup Keputusan Terbuka §12 poin 1. */
function schemeClauses(input: AgreementPdfInput): Array<[string, string]> {
  switch (input.cooperationType) {
    case CooperationType.BAGI_HASIL:
      return [
        [
          'Pasal 2 - Pembagian Hasil Usaha',
          `Keuntungan bersih usaha dibagi dengan porsi ${input.profitSharingRatio ?? 0}% untuk Pihak Kedua ` +
            `(Pemodal) dan sisanya untuk Pihak Pertama (Pengusaha). Kedua pihak menanggung risiko kerugian ` +
            `usaha secara proporsional. Tidak ada bunga tetap yang diperjanjikan dalam skema ini.`,
        ],
        [
          'Pasal 3 - Jangka Waktu dan Pelaporan',
          `Kerja sama berlaku ${input.tenorMonths ? `selama ${input.tenorMonths} bulan` : 'sampai diakhiri kedua pihak'} ` +
            `terhitung sejak ${tanggal(input.startDate)}. Pihak Pertama menyampaikan laporan hasil usaha secara berkala ` +
            `kepada Pihak Kedua.`,
        ],
      ];
    case CooperationType.PENYERTAAN_MODAL:
      return [
        [
          'Pasal 2 - Penyertaan Modal dan Kepemilikan',
          `Atas penyertaan modal sebesar ${rupiah(input.amount)}, Pihak Kedua memperoleh kepemilikan sebesar ` +
            `${input.equityPercentage ?? 0}% atas usaha Pihak Pertama, beserta hak dan kewajiban yang melekat ` +
            `pada porsi kepemilikan tersebut.`,
        ],
        [
          'Pasal 3 - Hak Suara dan Risiko',
          `Pihak Kedua berhak memperoleh informasi perkembangan usaha dan ikut menanggung risiko usaha sesuai ` +
            `porsi kepemilikannya. Pengalihan kepemilikan kepada pihak lain wajib mendapat persetujuan tertulis ` +
            `dari Pihak Pertama.`,
        ],
      ];
    case CooperationType.PINJAMAN:
    default:
      return [
        [
          'Pasal 2 - Pokok Pinjaman dan Imbal Hasil',
          `Pihak Kedua memberikan pinjaman sebesar ${rupiah(input.amount)} kepada Pihak Pertama dengan imbal ` +
            `hasil sebesar ${input.interestRate ?? 0}% per tahun.`,
        ],
        [
          'Pasal 3 - Jangka Waktu dan Pengembalian',
          `Pinjaman dikembalikan dalam jangka waktu ${input.tenorMonths ?? 12} bulan terhitung sejak ` +
            `${tanggal(input.startDate)}${input.endDate ? ` sampai dengan ${tanggal(input.endDate)}` : ''}, ` +
            `dengan skema angsuran yang disepakati kedua pihak.`,
        ],
      ];
  }
}

/** Tulis PDF ke folder terisolasi, kembalikan nama berkasnya. */
export async function renderAgreementPdf(input: AgreementPdfInput): Promise<string> {
  const dir = scopeDir('agreement');
  const filename = `${input.agreementNumber.replace(/[^A-Za-z0-9_-]/g, '')}.pdf`;
  const target = path.join(dir, filename);

  const doc = new PDFDocument({ size: 'A4', margin: 56, info: { Title: `Perjanjian ${input.agreementNumber}` } });
  const stream = fs.createWriteStream(target);
  doc.pipe(stream);

  const ink = '#16241D';
  const muted = '#4A5B52';
  const forest = '#0F2419';

  doc.fillColor(forest).fontSize(20).text('SURAT PERJANJIAN KERJA SAMA', { align: 'center' });
  doc.moveDown(0.3);
  doc.fillColor(muted).fontSize(12).text(COOPERATION_LABEL[input.cooperationType].toUpperCase(), { align: 'center' });
  doc.moveDown(0.2);
  doc.fontSize(10).text(`Nomor: ${input.agreementNumber}`, { align: 'center' });
  doc.moveDown(1.2);

  doc.fillColor(ink).fontSize(10);
  doc.text(
    `Pada hari ini, ${tanggal(input.startDate)}, para pihak yang identitasnya tercantum di bawah ini sepakat ` +
      `mengikatkan diri dalam perjanjian kerja sama${input.businessName ? ` atas usaha "${input.businessName}"` : ''} ` +
      `dengan ketentuan sebagai berikut.`,
    { align: 'justify' },
  );
  doc.moveDown(0.8);

  const clauses: Array<[string, string]> = [
    [
      'Pasal 1 - Pokok Perjanjian',
      `Pihak Kedua menyediakan dana sebesar ${rupiah(input.amount)} kepada Pihak Pertama dengan skema ` +
        `${COOPERATION_LABEL[input.cooperationType]}, terhitung sejak ${tanggal(input.startDate)}` +
        `${input.endDate ? ` sampai dengan ${tanggal(input.endDate)}` : ''}.`,
    ],
    ...schemeClauses(input),
  ];
  if (input.terms?.trim()) {
    clauses.push(['Pasal 4 - Ketentuan Tambahan', input.terms.trim()]);
  }
  clauses.push([
    `Pasal ${clauses.length + 1} - Penyelesaian Perselisihan`,
    'Segala perselisihan yang timbul dari perjanjian ini diselesaikan terlebih dahulu secara musyawarah. ' +
      'Apabila tidak tercapai kesepakatan, para pihak menempuh jalur hukum yang berlaku di Republik Indonesia.',
  ]);

  for (const [title, bodyText] of clauses) {
    doc.moveDown(0.5).fillColor(forest).fontSize(11).text(title);
    doc.moveDown(0.2).fillColor(ink).fontSize(10).text(bodyText, { align: 'justify' });
  }

  // --- Blok tanda tangan ---
  doc.moveDown(1.4).fillColor(forest).fontSize(11).text('TANDA TANGAN PARA PIHAK');
  doc.moveDown(0.5);

  const startY = doc.y;
  const colWidth = (doc.page.width - 112) / 2;
  input.parties.forEach((party, index) => {
    const x = 56 + index * colWidth;
    doc.fillColor(muted).fontSize(9).text(party.role, x, startY, { width: colWidth - 16 });

    let cursorY = doc.y + 4;
    try {
      const local = party.signatureUrl.split('/').pop();
      if (local && !local.includes('..')) {
        const file = path.join(scopeDir('signature'), local);
        if (fs.existsSync(file)) {
          doc.image(file, x, cursorY, { fit: [colWidth - 32, 48] });
          cursorY += 52;
        }
      }
    } catch {
      // Gambar tanda tangan gagal dimuat — dokumen tetap terbit dengan nama
      // dan waktu tanda tangan, yang sudah cukup sebagai bukti persetujuan.
    }

    doc.fillColor(ink).fontSize(10).text(party.fullName, x, Math.max(cursorY, startY + 60), { width: colWidth - 16 });
    doc.fillColor(muted).fontSize(8).text(party.email, x, doc.y, { width: colWidth - 16 });
    doc.text(`Ditandatangani ${tanggal(party.signedAt)}`, x, doc.y, { width: colWidth - 16 });
  });

  // --- Disclaimer wajib ---
  //
  // Ini bagian yang TIDAK BOLEH terpotong: kalau kalimat "tidak tersertifikasi
  // PSrE" dan "tidak setara akta notaris" hilang, dokumen berubah jadi
  // overclaim hukum. Jadi tingginya diukur dulu, dan kalau sisa halaman tidak
  // cukup, disclaimer dipindah ke halaman baru — bukan ditulis menembus batas
  // bawah dan terpangkas diam-diam.
  const contentWidth = doc.page.width - 112;
  const bottomLimit = doc.page.height - doc.page.margins.bottom;

  doc.fontSize(7.5);
  const disclaimerHeight = doc.heightOfString(DISCLAIMER, { width: contentWidth, align: 'justify' });
  const needed = disclaimerHeight + 22; // garis pemisah + jarak

  let y = Math.max(doc.y + 24, startY + 150);
  if (y + needed > bottomLimit) {
    doc.addPage();
    y = doc.page.margins.top;
  }

  doc.rect(56, y, contentWidth, 0.5).fillColor('#E2DDD2').fill();
  doc.fillColor(muted).fontSize(7.5).text(DISCLAIMER, 56, y + 12, {
    width: contentWidth,
    align: 'justify',
  });

  doc.end();
  await new Promise<void>((resolve, reject) => {
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });

  return filename;
}
