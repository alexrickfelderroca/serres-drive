// build-brand-logos.js
// Prepara los logos de marca de la home (assets/img/brands/logos/<slug>.png)
// a partir de las fuentes en _build/brand-logos-src/. Cada fuente lleva un
// tratamiento:
//   - white-glyph : marca negra sobre blanco -> glifo blanco puro con alpha
//                   derivado de la luminancia (Audi, Volkswagen).
//   - unwhite     : quita el fondo blanco conservando los colores, con
//                   des-premultiplicado contra blanco para que no quede halo
//                   (Porsche, Mercedes-AMG).
//   - passthrough : conserva el alpha que ya trae el PNG (Lamborghini). Si el
//                   PNG no tiene alpha real, cae a "unwhite" y lo avisa.
// Despues, para todos: recorte de margenes transparentes, ajuste dentro de
// 640x480 sin agrandar, y PNG con alpha (compressionLevel 9, sin paleta).
//
// Uso: node _build/build-brand-logos.js [--preview] [--json]
//   --preview  ademas genera la hoja de contacto en
//              .screenshots/brand-tiles/logos-preview.png sobre fondo #0a0a0b.
//   --json     imprime al final el resumen en JSON.

'use strict';

const path = require('path');
const fs = require('fs');
const sharp = require('./sharp-resolve');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(__dirname, 'brand-logos-src');
const OUT_DIR = path.join(ROOT, 'assets', 'img', 'brands', 'logos');
const PREVIEW = path.join(ROOT, '.screenshots', 'brand-tiles', 'logos-preview.png');

const MAX_W = 640;
const MAX_H = 480;

// Umbrales del tratamiento "white-glyph": luminancia <= LO -> alpha 255,
// >= HI -> alpha 0, lineal entre medio (bordes suaves del antialias).
const GLYPH_LO = 40;
const GLYPH_HI = 215;

// Umbrales del tratamiento "unwhite": w = min(r,g,b); w >= UNW_HI -> alpha 0,
// w <= UNW_LO -> alpha 255, lineal entre medio. Los fondos de las fuentes son
// blanco puro (255) y la rampa solo tiene que cubrir el antialias del borde:
// con el valor inicial de 212 los brillos del cromo (w entre 212 y 249)
// quedaban semitransparentes y sobre la loseta oscura salian grises y con
// grano; con 240 se conservan opacos y el borde sigue sin halo (comprobado
// con zoom 3x sobre #0a0a0b).
const UNW_LO = 240;
const UNW_HI = 250;

const LOGOS = [
  { slug: 'audi',         file: 'audi.jpeg',         treatment: 'white-glyph' },
  { slug: 'porsche',      file: 'porsche.jpeg',      treatment: 'unwhite' },
  { slug: 'mercedes-amg', file: 'mercedes-amg.jpeg', treatment: 'unwhite' },
  { slug: 'volkswagen',   file: 'volkswagen.jpeg',   treatment: 'white-glyph' },
  { slug: 'lamborghini',  file: 'lamborghini.png',   treatment: 'passthrough' },
];

const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

// Marca negra sobre blanco -> glifo blanco puro. El alpha sale de la
// luminancia con una rampa lineal entre GLYPH_LO y GLYPH_HI.
function toWhiteGlyph(px) {
  const n = px.length / 4;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const lum = 0.2126 * px[o] + 0.7152 * px[o + 1] + 0.0722 * px[o + 2];
    let a;
    if (lum <= GLYPH_LO) a = 255;
    else if (lum >= GLYPH_HI) a = 0;
    else a = Math.round((1 - (lum - GLYPH_LO) / (GLYPH_HI - GLYPH_LO)) * 255);
    px[o] = 255; px[o + 1] = 255; px[o + 2] = 255; px[o + 3] = a;
  }
}

// Quita el fondo blanco conservando el color. En los pixeles de borde
// (0 < alpha < 255) se des-premultiplica contra blanco: el color observado es
// c = c' * a + 255 * (1 - a), asi que c' = (c - 255 * (1 - a)) / a.
function unwhite(px) {
  const n = px.length / 4;
  const span = UNW_HI - UNW_LO;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const r = px[o], g = px[o + 1], b = px[o + 2];
    const w = Math.min(r, g, b);
    let a;
    if (w >= UNW_HI) a = 0;
    else if (w <= UNW_LO) a = 255;
    else a = Math.round((UNW_HI - w) / span * 255);
    if (a === 0) {
      px[o] = 0; px[o + 1] = 0; px[o + 2] = 0; px[o + 3] = 0;
    } else if (a < 255) {
      const bg = 255 - a;
      px[o]     = clamp255(Math.round((r - bg) * 255 / a));
      px[o + 1] = clamp255(Math.round((g - bg) * 255 / a));
      px[o + 2] = clamp255(Math.round((b - bg) * 255 / a));
      px[o + 3] = a;
    } else {
      px[o + 3] = 255;
    }
  }
}

// Comprueba si el canal alpha aporta algo (algun pixel con alpha < 255).
function hasRealAlpha(px) {
  for (let o = 3; o < px.length; o += 4) if (px[o] < 255) return true;
  return false;
}

async function buildLogo(logo) {
  const src = path.join(SRC_DIR, logo.file);
  const out = path.join(OUT_DIR, logo.slug + '.png');
  const notes = [];

  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = data;
  let treatment = logo.treatment;

  if (treatment === 'passthrough') {
    if (!hasRealAlpha(px)) {
      treatment = 'unwhite';
      notes.push('el PNG no tenia alpha real (todo 255): se aplico unwhite');
    } else {
      notes.push('alpha original conservado');
    }
  }
  if (treatment === 'white-glyph') toWhiteGlyph(px);
  else if (treatment === 'unwhite') unwhite(px);

  // Recorte de margenes transparentes (trim sobre alpha) y ajuste dentro de
  // MAX_W x MAX_H sin agrandar.
  const trimmed = await sharp(px, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 10 })
    .toBuffer();

  await sharp(trimmed)
    .resize({ width: MAX_W, height: MAX_H, fit: 'inside', withoutEnlargement: true })
    /* Paleta de 256 colores con tramado: el escudo de Porsche pasaba de 750 KB
       a ~150 KB sin que se note a los 96 px a los que se pinta. */
    .png({ compressionLevel: 9, palette: true, quality: 95, dither: 1, effort: 9 })
    .toFile(out);

  const meta = await sharp(out).metadata();
  const kb = Math.round(fs.statSync(out).size / 1024 * 10) / 10;
  console.log(
    logo.slug.padEnd(13) + treatment.padEnd(12) +
    meta.width + 'x' + meta.height + '  ' + kb + ' KB' +
    '  channels=' + meta.channels + ' hasAlpha=' + meta.hasAlpha +
    (notes.length ? '  (' + notes.join('; ') + ')' : '')
  );
  return {
    slug: logo.slug, path: out, width: meta.width, height: meta.height, kb,
    treatment, note: notes.join('; '), channels: meta.channels, hasAlpha: meta.hasAlpha,
  };
}

// Hoja de contacto: lienzo 1400x600 #0a0a0b con los cinco logos en fila,
// cada uno dentro de una caja visual comun de 220x150 (aspecto conservado).
async function buildPreview(results) {
  const W = 1400, H = 600, BOX_W = 220, BOX_H = 150;
  const slot = W / results.length;
  const composites = [];
  for (let i = 0; i < results.length; i++) {
    const buf = await sharp(results[i].path)
      .resize({ width: BOX_W, height: BOX_H, fit: 'inside' })
      .png()
      .toBuffer();
    const m = await sharp(buf).metadata();
    composites.push({
      input: buf,
      left: Math.round(slot * i + (slot - m.width) / 2),
      top: Math.round((H - m.height) / 2),
    });
  }
  fs.mkdirSync(path.dirname(PREVIEW), { recursive: true });
  await sharp({ create: { width: W, height: H, channels: 4, background: { r: 10, g: 10, b: 11, alpha: 1 } } })
    .composite(composites)
    .png()
    .toFile(PREVIEW);
  console.log('preview -> ' + PREVIEW);
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const results = [];
  for (const logo of LOGOS) results.push(await buildLogo(logo));
  if (process.argv.includes('--preview')) await buildPreview(results);
  if (process.argv.includes('--json')) console.log(JSON.stringify(results));
})().catch((err) => { console.error(err); process.exit(1); });
