/* =====================================================================
   Serres Drive — fleet image pipeline
   Source: "<root>/<folder>", donde <root> sale de cfg.root en
           image-selection.json: "sicur" -> "Sicur Cars/" (originales del
           propietario) y "stratos" -> "Stratos/" (los del proveedor).
           Las dos carpetas estan ignoradas por git.
   Output: assets/img/cars/<slug>/alquiler-<slug>-barcelona-<n>.{jpg,webp}

   Sources top out at ~1290 px wide (phone captures of a listing), so
   nothing is upscaled: WIDE is capped at the source width. Quality is
   tuned DOWN per file until it fits BUDGET, so the hero of every car
   lands under the 150 KB the brief asks for.
   ===================================================================== */
const sharp = require('./sharp-resolve');
const fs = require('fs'), path = require('path');

const ROOT = path.join(__dirname, '..');
const ROOTS = {
  sicur:   path.join(ROOT, 'Sicur Cars'),
  stratos: path.join(ROOT, 'Stratos'),
};
const OUT = path.join(ROOT, 'assets/img/cars');
const { cropRect } = require('./subject-crop');
const SEL = JSON.parse(fs.readFileSync(path.join(__dirname, 'image-selection.json'), 'utf8'));

const WIDE = 1200, CARD = 800;          // 3:2 landscape, card + 2x card
const RATIO = 3 / 2;
const BUDGET = { jpgWide: 150_000, webpWide: 110_000, jpgCard: 80_000, webpCard: 55_000 };

/* Encode, stepping quality down until the file fits its budget.

   El guardia de salida era "q === 45", pero el bucle va 82, 76, 70, 64, 58,
   52, 46 y luego para: 45 no se pisa nunca. Mientras todas las fuentes fueron
   las de Sicur Cars la rama no se noto, porque todas entraban en presupuesto;
   las del DBX de Stratos son exteriores con follaje y no entran a q=46, asi
   que encode() devolvia undefined y el manifiesto reventaba al leer .bytes.
   Ahora se guarda siempre el ultimo intento (el mas comprimido) y se avisa. */
async function encode(pipeline, file, fmt, budget, start = 82) {
  let last = null, lastQ = start;
  for (let q = start; q >= 45; q -= 6) {
    const buf = await (fmt === 'webp'
      ? pipeline.clone().webp({ quality: q })
      : pipeline.clone().jpeg({ quality: q, mozjpeg: true, progressive: true })).toBuffer();
    last = buf; lastQ = q;
    if (buf.length <= budget) { fs.writeFileSync(file, buf); return { q, bytes: buf.length }; }
  }
  fs.writeFileSync(file, last);
  console.warn(`  !! ${path.basename(file)}: ${Math.round(last.length / 1024)} KB a q=${lastQ}, por encima del presupuesto de ${Math.round(budget / 1024)} KB`);
  return { q: lastQ, bytes: last.length, overBudget: true };
}

(async () => {
  const manifest = {};
  for (const [slug, cfg] of Object.entries(SEL)) {
    if (slug.startsWith('_')) continue;
    const root = ROOTS[cfg.root || 'sicur'];
    if (!root) throw new Error(`${slug}: root desconocido "${cfg.root}"`);
    const dir = path.join(root, cfg.folder);
    if (!fs.existsSync(dir)) throw new Error(`${slug}: no existe ${dir}`);
    const files = fs.readdirSync(dir).filter(f => /\.(jpe?g|png)$/i.test(f));
    const outDir = path.join(OUT, slug);
    fs.mkdirSync(outDir, { recursive: true });
    manifest[slug] = [];

    for (let i = 0; i < cfg.shots.length; i++) {
      const match = files.find(f => f.includes(cfg.shots[i]));
      if (!match) { console.warn(`  !! ${slug}: no source matching "${cfg.shots[i]}"`); continue; }
      const n = i + 1;
      const base = `alquiler-${slug}-barcelona-${n}`;
      const meta = await sharp(path.join(dir, match)).rotate().metadata();
      const wide = Math.min(WIDE, meta.width);
      const src = sharp(path.join(dir, match)).rotate();

      const rect = await cropRect(path.join(dir, match), meta.width, meta.height, RATIO);
      const cropped = src.clone().extract(rect);
      const big = cropped.clone().resize(wide, Math.round(wide / RATIO), { fit: 'cover' });
      const small = cropped.clone().resize(CARD, Math.round(CARD / RATIO), { fit: 'cover' });

      const jw = await encode(big, path.join(outDir, `${base}.jpg`), 'jpg', BUDGET.jpgWide);
      const ww = await encode(big, path.join(outDir, `${base}.webp`), 'webp', BUDGET.webpWide);
      await encode(small, path.join(outDir, `${base}-800.jpg`), 'jpg', BUDGET.jpgCard);
      await encode(small, path.join(outDir, `${base}-800.webp`), 'webp', BUDGET.webpCard);

      manifest[slug].push({
        n, base, width: wide, height: Math.round(wide / RATIO),
        jpgKb: Math.round(jw.bytes / 1024), webpKb: Math.round(ww.bytes / 1024), source: match,
      });
    }
    const h = manifest[slug][0];
    console.log(`${slug.padEnd(24)} ${String(manifest[slug].length).padStart(2)} shots  hero ${h.width}x${h.height} jpg ${h.jpgKb}KB webp ${h.webpKb}KB`);
  }
  fs.writeFileSync(path.join(__dirname, 'image-manifest.json'), JSON.stringify(manifest, null, 2));
  const over = Object.values(manifest).flat().filter(m => m.jpgKb > 150);
  console.log(over.length ? `\n!! ${over.length} file(s) over 150 KB` : '\nAll images within budget.');
})();
