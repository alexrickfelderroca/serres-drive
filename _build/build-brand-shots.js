// build-brand-shots.js
// Descarga las fotos de marca generadas para la home (manifest.json) y produce
// las derivadas que usa la web: 1600x900 y 800x450, en JPG progresivo y WebP.
//
// Entrada:  _build/brand-shots-src/manifest.json
//           [{ "slug": "porsche", "job_id": "...", "url": "https://..." }, ...]
// Original: _build/brand-shots-src/<slug>.<ext>   (bytes tal cual, sin tocar)
// Salida:   assets/img/brands/<slug>.jpg | .webp | -800.jpg | -800.webp
//
// Uso: node _build/build-brand-shots.js [--force] [--only=slug1,slug2]
//   --force        vuelve a descargar el original aunque ya exista en disco.
//   --only=a,b     procesa solo esos slugs del manifest (para reintentos de
//                  una o dos marcas sin recodificar las demas).
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const sharp = require('C:/Users/Rickfelder/Desktop/serres/_build/node_modules/sharp');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(__dirname, 'brand-shots-src');
const OUT_DIR = path.join(ROOT, 'assets', 'img', 'brands');
const MANIFEST = path.join(SRC_DIR, 'manifest.json');
const FORCE = process.argv.includes('--force');
// --only=slug1,slug2 -> lista de slugs a procesar; null = todos los del manifest.
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const ONLY = onlyArg
  ? onlyArg.slice('--only='.length).split(',').map((s) => s.trim()).filter(Boolean)
  : null;

const KB = 1024;
const Q_START = 80;   // calidad inicial
const Q_STEP = 4;     // se baja de 4 en 4
const Q_FLOOR = 40;   // por debajo de esto no merece la pena: se avisa

// Tamanos a producir y techo de peso (KB) por formato.
const SIZES = [
  { w: 1600, h: 900, suffix: '',     jpgMax: 230, webpMax: 190 },
  { w: 800,  h: 450, suffix: '-800', jpgMax: 90,  webpMax: 70 },
];

// ---------------------------------------------------------------------------
// Descarga con seguimiento de redirecciones (maximo 5 saltos).
function fetchBuffer(url, hops) {
  hops = hops || 0;
  return new Promise((resolve, reject) => {
    if (hops > 5) return reject(new Error('Demasiadas redirecciones: ' + url));
    const lib = url.startsWith('http:') ? http : https;
    const req = lib.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 build-brand-shots' } }, (res) => {
      const code = res.statusCode || 0;
      if (code >= 300 && code < 400 && res.headers.location) {
        res.resume();
        const next = new URL(res.headers.location, url).toString();
        return resolve(fetchBuffer(next, hops + 1));
      }
      if (code !== 200) {
        res.resume();
        return reject(new Error('HTTP ' + code + ' al pedir ' + url));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({
        buf: Buffer.concat(chunks),
        contentType: String(res.headers['content-type'] || ''),
        finalUrl: url,
      }));
      res.on('error', reject);
    });
    req.on('error', reject);
  });
}

// Extension del original: primero la de la URL, si no la del content-type.
function extFrom(url, contentType) {
  const m = /\.(jpe?g|png|webp|avif)(?:[?#]|$)/i.exec(url);
  if (m) {
    const e = m[1].toLowerCase();
    return e === 'jpeg' ? 'jpg' : e;
  }
  const ct = contentType.toLowerCase();
  if (ct.includes('jpeg')) return 'jpg';
  if (ct.includes('png')) return 'png';
  if (ct.includes('webp')) return 'webp';
  if (ct.includes('avif')) return 'avif';
  return 'bin';
}

// Busca un original ya descargado para el slug (cualquier extension).
function findExisting(slug) {
  const hit = fs.readdirSync(SRC_DIR).find((f) => {
    return f.startsWith(slug + '.') && f !== 'manifest.json';
  });
  return hit ? path.join(SRC_DIR, hit) : null;
}

function kb(n) { return (n / KB).toFixed(1) + ' KB'; }

// Codifica bajando la calidad hasta que el archivo cabe en maxKB.
async function encodeUnder(srcBuf, size, fmt, maxKB) {
  let q = Q_START;
  let buf;
  for (;;) {
    const p = sharp(srcBuf).resize({ width: size.w, height: size.h, fit: 'cover', position: 'centre' });
    buf = fmt === 'jpg'
      ? await p.jpeg({ quality: q, progressive: true, mozjpeg: true }).toBuffer()
      : await p.webp({ quality: q }).toBuffer();
    if (buf.length <= maxKB * KB) break;
    if (q - Q_STEP < Q_FLOOR) {
      console.warn('  AVISO: ' + fmt + ' ' + size.w + 'x' + size.h + ' no baja de ' + maxKB + ' KB ni a q' + q + ' (' + kb(buf.length) + ')');
      break;
    }
    q -= Q_STEP;
  }
  return { buf, q };
}

async function processOne(item) {
  const slug = item.slug;
  if (!slug || !item.url) throw new Error('Entrada del manifest sin slug o url: ' + JSON.stringify(item));

  // 1. Original: se guarda byte a byte, sin recomprimir.
  let srcPath = FORCE ? null : findExisting(slug);
  if (!srcPath) {
    const got = await fetchBuffer(item.url);
    const ext = extFrom(got.finalUrl, got.contentType);
    srcPath = path.join(SRC_DIR, slug + '.' + ext);
    fs.writeFileSync(srcPath, got.buf);
  }
  const srcBuf = fs.readFileSync(srcPath);
  const meta = await sharp(srcBuf).metadata();

  // 2. Derivadas.
  const parts = [];
  for (const size of SIZES) {
    for (const fmt of ['jpg', 'webp']) {
      const max = fmt === 'jpg' ? size.jpgMax : size.webpMax;
      const out = path.join(OUT_DIR, slug + size.suffix + '.' + fmt);
      const r = await encodeUnder(srcBuf, size, fmt, max);
      fs.writeFileSync(out, r.buf);
      parts.push(path.basename(out) + ' ' + kb(r.buf.length) + ' q' + r.q);
    }
  }

  console.log(
    slug.padEnd(14) + 'src ' + kb(srcBuf.length) + ' (' + meta.width + 'x' + meta.height + ' ' + meta.format + ')' +
    ' -> ' + parts.join(' | ')
  );
}

async function main() {
  if (!fs.existsSync(MANIFEST)) {
    console.error('No existe el manifest: ' + MANIFEST);
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  if (!Array.isArray(manifest) || manifest.length === 0) {
    console.error('El manifest esta vacio o no es un array.');
    process.exit(1);
  }
  fs.mkdirSync(SRC_DIR, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Con --only se filtra el manifest; un slug que no exista en el es un error
  // (casi seguro una errata), no un silencio.
  let items = manifest;
  if (ONLY) {
    const known = new Set(manifest.map((it) => it.slug));
    const missing = ONLY.filter((s) => !known.has(s));
    if (missing.length) {
      console.error('Slug(s) de --only que no estan en el manifest: ' + missing.join(', '));
      process.exit(1);
    }
    items = manifest.filter((it) => ONLY.includes(it.slug));
  }

  let failures = 0;
  for (const item of items) {
    try {
      await processOne(item);
    } catch (err) {
      failures++;
      console.error((item.slug || '?').padEnd(14) + 'ERROR: ' + err.message);
    }
  }
  if (failures) {
    console.error(failures + ' imagen(es) con error.');
    process.exit(1);
  }
}

main();
