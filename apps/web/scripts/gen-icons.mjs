import sharp from 'sharp';

async function make({ size, corner, maskable }) {
  const pad = maskable ? size * 0.18 : 0;
  const inner = size - pad * 2;
  const r = corner * (inner / 100);

  // Rounded-rect background
  const bg = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${pad}" y="${pad}" width="${inner}" height="${inner}" rx="${r}" fill="#0f2419"/>
    </svg>`
  );

  // White "M" letterform as a path, centered in the inner box
  const w = inner * 0.52;
  const x0 = size / 2 - w / 2;
  const y0 = size / 2 - w * 0.62;
  const y1 = y0 + w * 0.92;
  const m = w / 3;
  const stroke = inner * 0.085;

  const glyph = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <path d="
        M ${x0} ${y1}
        L ${x0} ${y0}
        L ${x0 + m} ${y0}
        L ${x0 + w / 2} ${y0 + (y1 - y0) * 0.78}
        L ${x0 + w - m} ${y0}
        L ${x0 + w} ${y0}
        L ${x0 + w} ${y1}
        L ${x0 + w - m} ${y1}
        L ${x0 + w - m} ${y0 + (y1 - y0) * 0.35}
        L ${x0 + w / 2} ${y1}
        L ${x0 + m} ${y0 + (y1 - y0) * 0.35}
        L ${x0 + m} ${y1}
        Z
      " fill="#ffffff"/>
    </svg>`
  );

  const bgImage = await sharp(bg).png().toBuffer();
  let out = await sharp(glyph).resize(size, size).png().toBuffer();
  out = await sharp(bgImage).composite([{ input: out }]).png().toBuffer();

  if (maskable) {
    await sharp(out).toFile(`./public/icons/icon-maskable-${size}.png`);
  } else {
    await sharp(out).toFile(`./public/icons/icon-${size}.png`);
  }
  console.log('wrote', size, maskable ? 'maskable' : '');
}

(async () => {
  await make({ size: 192, corner: 24, maskable: false });
  await make({ size: 512, corner: 20, maskable: false });
  await make({ size: 512, corner: 50, maskable: true });
})();
