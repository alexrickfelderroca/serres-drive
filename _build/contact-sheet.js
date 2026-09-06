/* Contact sheets: one montage per Sicur Cars folder, so photos can be
   reviewed visually before choosing hero + gallery order. Regenerable. */
const sharp = require('C:/Users/Rickfelder/Desktop/serres/_build/node_modules/sharp');
const fs = require('fs'), path = require('path');

const SRC = 'c:/Users/Rickfelder/Desktop/serres-drive-main/Sicur Cars';
const OUT = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });

const IMG = /\.(jpe?g|png)$/i;
const COLS = 4, CELL = 420, PAD = 8, LABEL = 26;

(async () => {
  const dirs = fs.readdirSync(SRC, { withFileTypes: true })
    .filter(d => d.isDirectory()).map(d => d.name);
  for (const dir of dirs) {
    const files = fs.readdirSync(path.join(SRC, dir)).filter(f => IMG.test(f)).sort();
    const rows = Math.ceil(files.length / COLS);
    const W = COLS * (CELL + PAD) + PAD, H = rows * (CELL + PAD + LABEL) + PAD;
    const composites = [];
    for (let i = 0; i < files.length; i++) {
      const c = i % COLS, r = Math.floor(i / COLS);
      const buf = await sharp(path.join(SRC, dir, files[i]))
        .rotate()
        .resize(CELL, CELL, { fit: 'contain', background: '#141414' })
        .toBuffer();
      composites.push({ input: buf, left: PAD + c * (CELL + PAD), top: PAD + r * (CELL + PAD + LABEL) });
      const label = Buffer.from(
        `<svg width="${CELL}" height="${LABEL}"><text x="4" y="18" font-family="monospace" font-size="17" fill="#fff">${i + 1}. ${files[i].replace(/&/g,'&amp;').replace(/</g,'&lt;')}</text></svg>`);
      composites.push({ input: label, left: PAD + c * (CELL + PAD), top: PAD + r * (CELL + PAD + LABEL) + CELL });
    }
    const outName = dir.replace(/\s+/g, '_') + '.jpg';
    await sharp({ create: { width: W, height: H, channels: 3, background: '#0a0a0a' } })
      .composite(composites).jpeg({ quality: 72 }).toFile(path.join(OUT, outName));
    console.log(outName, files.length, 'photos');
  }
})();
