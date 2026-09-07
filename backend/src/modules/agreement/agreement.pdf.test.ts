import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { afterAll, describe, expect, it } from 'vitest';
import { CooperationType } from '@prisma/client';
import { renderAgreementPdf, type AgreementPdfInput } from './agreement.pdf.js';
import { scopeDir } from '../../middleware/upload.js';

/**
 * PDFKit menulis teks sebagai hex string dalam array TJ, bukan literal (...),
 * jadi ekstraksi harus mendekode hex.
 */
function extractText(file: string): string {
  const raw = fs.readFileSync(file);
  const parts: string[] = [];
  const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  const buf = raw.toString('latin1');

  let match: RegExpExecArray | null;
  while ((match = streamRe.exec(buf)) !== null) {
    let data: Buffer;
    try {
      data = zlib.inflateSync(Buffer.from(match[1]!, 'latin1'));
    } catch {
      continue;
    }
    const text = data.toString('latin1');
    const hexRe = /<([0-9A-Fa-f]+)>/g;
    let hex: RegExpExecArray | null;
    while ((hex = hexRe.exec(text)) !== null) {
      parts.push(Buffer.from(hex[1]!, 'hex').toString('latin1'));
    }
  }
  return parts.join('');
}

function baseInput(overrides: Partial<AgreementPdfInput> = {}): AgreementPdfInput {
  return {
    agreementNumber: `TEST-${Math.random().toString(36).slice(2, 10)}`,
    cooperationType: CooperationType.BAGI_HASIL,
    amount: 150_000_000,
    startDate: new Date('2026-09-10'),
    endDate: null,
    profitSharingRatio: 22,
    equityPercentage: null,
    interestRate: null,
    tenorMonths: 24,
    terms: null,
    businessName: 'Dapur Bunda Sambal Nusantara',
    parties: [
      {
        role: 'PIHAK PERTAMA (Pengusaha)',
        fullName: 'Siti Rahmawati',
        email: 'dapur.bunda@modalin.id',
        signedAt: new Date('2026-09-10'),
        signatureUrl: 'http://localhost:4000/api/files/signature/tidak-ada.png',
      },
      {
        role: 'PIHAK KEDUA (Pemodal)',
        fullName: 'Sari Dewanti',
        email: 'sari.investor@modalin.id',
        signedAt: new Date('2026-09-10'),
        signatureUrl: 'http://localhost:4000/api/files/signature/tidak-ada.png',
      },
    ],
    ...overrides,
  };
}

/**
 * PDFKit memposisikan spasi lewat kerning, bukan sebagai karakter, jadi teks
 * yang diekstrak dari stream kehilangan sebagian spasinya ("BELUMtersertifikasi").
 * Perbandingan karena itu dilakukan tanpa spasi — yang diuji adalah ADA/TIDAK
 * ADA kalimatnya, bukan tata letaknya.
 */
const squash = (s: string) => s.replace(/\s+/g, '').toLowerCase();

const written: string[] = [];
async function render(input: AgreementPdfInput): Promise<string> {
  const filename = await renderAgreementPdf(input);
  const file = path.join(scopeDir('agreement'), filename);
  written.push(file);
  return squash(extractText(file));
}

/** Cocokkan frasa dengan mengabaikan spasi. */
function expectPhrase(text: string, phrase: string) {
  expect(text.includes(squash(phrase)), `dokumen harus memuat: "${phrase}"`).toBe(true);
}
function expectNoPhrase(text: string, phrase: string) {
  expect(text.includes(squash(phrase)), `dokumen TIDAK boleh memuat: "${phrase}"`).toBe(false);
}

afterAll(() => {
  for (const file of written) fs.rmSync(file, { force: true });
});

describe('FR-10/FR-11 dokumen perjanjian', () => {
  it('mencetak kerangka dokumen dan blok tanda tangan kedua pihak', async () => {
    const text = await render(baseInput());
    expectPhrase(text, 'SURAT PERJANJIAN KERJA SAMA');
    expectPhrase(text, 'TANDA TANGAN PARA PIHAK');
    expectPhrase(text, 'PIHAK PERTAMA');
    expectPhrase(text, 'PIHAK KEDUA');
    expectPhrase(text, 'Siti Rahmawati');
    expectPhrase(text, 'Sari Dewanti');
  });

  /**
   * Regresi: disclaimer pernah terpotong karena diposisikan absolut dan meluber
   * keluar halaman, sehingga dokumen kehilangan justru kalimat yang mencegah
   * overclaim hukum. Kalimat-kalimat ini WAJIB utuh.
   */
  it('mencetak disclaimer hukum secara UTUH, tidak terpotong', async () => {
    const text = await render(baseInput());
    expectPhrase(text, 'BELUM tersertifikasi');
    expectPhrase(text, 'Penyelenggara Sertifikasi Elektronik');
    expectPhrase(text, 'PSrE');
    expectPhrase(text, 'Pasal 11 Undang-Undang');
    expectPhrase(text, 'Nomor 71 Tahun 2019');
    expectPhrase(text, 'TIDAK setara dengan akta notaris');
    expectPhrase(text, 'di luar platform Modalin');
  });

  it('disclaimer tetap utuh walau isi perjanjian panjang sampai berganti halaman', async () => {
    const text = await render(baseInput({ terms: 'Klausul tambahan. '.repeat(400) }));
    expectPhrase(text, 'TIDAK setara dengan akta notaris');
    expectPhrase(text, 'Pasal 11 Undang-Undang');
  });

  it('memakai pasal Bagi Hasil dan menyebut porsi bagi hasil', async () => {
    const text = await render(baseInput());
    expectPhrase(text, 'BAGI HASIL');
    expectPhrase(text, 'Pembagian Hasil Usaha');
    expectPhrase(text, '22');
    expectNoPhrase(text, 'Penyertaan Modal dan Kepemilikan');
  });

  it('memakai pasal Penyertaan Modal beserta persentase kepemilikan', async () => {
    const text = await render(
      baseInput({
        cooperationType: CooperationType.PENYERTAAN_MODAL,
        profitSharingRatio: null,
        equityPercentage: 12,
      }),
    );
    expectPhrase(text, 'PENYERTAAN MODAL');
    expectPhrase(text, 'Penyertaan Modal dan Kepemilikan');
    expectPhrase(text, '12');
    expectNoPhrase(text, 'Pembagian Hasil Usaha');
  });

  it('memakai pasal Pinjaman beserta imbal hasil dan tenor', async () => {
    const text = await render(
      baseInput({
        cooperationType: CooperationType.PINJAMAN,
        profitSharingRatio: null,
        interestRate: 13.5,
        tenorMonths: 24,
      }),
    );
    expectPhrase(text, 'PINJAMAN');
    expectPhrase(text, 'Pokok Pinjaman dan Imbal Hasil');
    expectPhrase(text, '13.5');
    expectNoPhrase(text, 'Pembagian Hasil Usaha');
  });

  it('nominal ditulis dalam format Rupiah Indonesia', async () => {
    const text = await render(baseInput({ amount: 150_000_000 }));
    expectPhrase(text, '150.000.000');
  });

  it('tanggal ditulis dalam format Indonesia', async () => {
    const text = await render(baseInput({ startDate: new Date('2026-09-10') }));
    expectPhrase(text, 'September 2026');
  });

  it('tidak crash walau berkas gambar tanda tangan tidak ada di disk', async () => {
    await expect(render(baseInput())).resolves.toBeTruthy();
  });
});
