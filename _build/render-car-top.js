/* =====================================================================
   Renderiza el GT3 RS del hero (assets/models/gt3.glb) visto desde arriba,
   con fondo transparente, para la escena 04 de /como-funciona.

   Sin Blender: usa three.js dentro del Chrome del sistema (puppeteer-core
   de la cache de npx, igual que shot.js) con SwiftShader, y guarda el
   canvas como PNG. Luego sharp recorta el aire y saca los derivados.

   Uso:
     node _build/render-car-top.js                 -> assets/img/how/gt3-top.{png,webp}
     node _build/render-car-top.js --probe <dir>   -> tres angulos de prueba en <dir>

   Camara: elevacion (grados sobre el plano del coche), azimut (0 = desde
   atras, el coche mira hacia arriba de la imagen), en VIEWS.
   ===================================================================== */
const fs = require('fs'), path = require('path');
const NM = process.env.SHOT_NODE_MODULES
  || 'C:/Users/Rickfelder/AppData/Local/npm-cache/_npx/0f94ee7615faf582/node_modules';
const CHROME = process.env.SHOT_CHROME
  || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const puppeteer = require(path.join(NM, 'puppeteer-core'));
const sharp = require('C:/Users/Rickfelder/Desktop/serres/_build/node_modules/sharp');
const ROOT = path.join(__dirname, '..');
const BASE = process.env.SHOT_BASE || 'http://localhost:8131';

const probe = process.argv.includes('--probe');
const probeDir = probe ? process.argv[process.argv.indexOf('--probe') + 1] : null;

/* elev 90 = planta pura. El coche queda con el morro hacia +x, asi que
   azim -90 pone la camara DETRAS del coche (mirando hacia donde va) y azim 0
   la pone a su lado. En la imagen final el morro apunta hacia arriba. */
const VIEWS = probe
  ? [
      { name: 'top-90', elev: 88, azim: -90, yaw: 0 },
      { name: 'rear-66', elev: 66, azim: -90, yaw: 0 },
      { name: 'rear-54-3q', elev: 54, azim: -72, yaw: 0 },
    ]
  : [{ name: 'gt3-top', elev: 62, azim: -90, yaw: 0 }];

const W = 2000, H = 2000;

const html = (v) => `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;background:transparent}canvas{display:block}</style>
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"}}</script>
<script type="module">
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
const W=${W},H=${H};
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
renderer.setSize(W,H);renderer.setPixelRatio(1);renderer.setClearAlpha(0);
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
renderer.outputColorSpace=THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
const scene=new THREE.Scene();
const pmrem=new THREE.PMREMGenerator(renderer);
scene.environment=pmrem.fromScene(new RoomEnvironment(),0.03).texture;
scene.add(new THREE.AmbientLight(0xffffff,0.45));
const key=new THREE.DirectionalLight(0xf2f6ff,3.0);key.position.set(2,10,4);scene.add(key);
const rim=new THREE.DirectionalLight(0xcdd8ee,1.8);rim.position.set(-6,4,-6);scene.add(rim);
const fill=new THREE.DirectionalLight(0xbfd0ff,0.6);fill.position.set(0,3,8);scene.add(fill);
const camera=new THREE.PerspectiveCamera(30,W/H,0.1,1000);
const draco=new DRACOLoader().setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");
new GLTFLoader().setDRACOLoader(draco).load("${BASE}/assets/models/gt3.glb",(gltf)=>{
  const inner=gltf.scene;
  inner.traverse(n=>{ if(n.isMesh&&n.material){ (Array.isArray(n.material)?n.material:[n.material]).forEach(m=>{m.envMapIntensity=1.3;}); } });
  const box=new THREE.Box3().setFromObject(inner);
  inner.position.sub(box.getCenter(new THREE.Vector3()));
  const wrap=new THREE.Group();wrap.add(inner);scene.add(wrap);
  wrap.rotation.y=${v.yaw};
  const size=box.getSize(new THREE.Vector3());
  const dim=Math.max(size.x,size.y,size.z);
  /* El coche del hero mira hacia +x con yaw 0 (BASE_YAW -0.6 lo giraba un
     poco). Aqui lo ponemos con el morro hacia -z (arriba de la imagen). */
  wrap.rotation.y=Math.PI/2+${v.yaw};
  const elev=${v.elev}*Math.PI/180, azim=${v.azim}*Math.PI/180;
  const dist=dim*2.6;
  camera.position.set(Math.sin(azim)*Math.cos(elev)*dist, Math.sin(elev)*dist, Math.cos(azim)*Math.cos(elev)*dist);
  camera.lookAt(0,0,0);
  camera.updateProjectionMatrix();
  renderer.render(scene,camera);
  window.__png=renderer.domElement.toDataURL("image/png");
  window.__done=true;
},undefined,(e)=>{window.__err=String(e);window.__done=true;});
</script>`;

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: true,
    userDataDir: path.join(process.env.TEMP || ROOT, 'serres-render-profile'),
    args: ['--no-first-run', '--no-default-browser-check', '--hide-scrollbars',
      '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
      `--window-size=${W},${H}`],
  });
  const outDir = probe ? probeDir : path.join(ROOT, 'assets/img/how');
  fs.mkdirSync(outDir, { recursive: true });
  for (const v of VIEWS) {
    const page = await browser.newPage();
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    /* La pagina se sirve desde el servidor local para que el GLB llegue por
       http (file:// bloquea el fetch del loader). */
    await page.goto(`${BASE}/404.html`, { waitUntil: 'domcontentloaded' });
    await page.setContent(html(v), { waitUntil: 'load' });
    await page.waitForFunction('window.__done === true', { timeout: 120000 });
    const err = await page.evaluate('window.__err || null');
    if (err) throw new Error(`${v.name}: ${err} ${errors.join(' | ')}`);
    const dataUrl = await page.evaluate('window.__png');
    const raw = Buffer.from(dataUrl.split(',')[1], 'base64');
    await page.close();

    /* Recorte del aire transparente y derivados. */
    const trimmed = await sharp(raw).trim({ threshold: 8 }).toBuffer();
    const meta = await sharp(trimmed).metadata();
    const png = path.join(outDir, `${v.name}.png`);
    await sharp(trimmed).resize({ width: Math.min(meta.width, 1400), withoutEnlargement: true })
      .png({ compressionLevel: 9, palette: true, quality: 96, dither: 1, effort: 9 }).toFile(png);
    const info = await sharp(png).metadata();
    let line = `${v.name.padEnd(12)} ${info.width}x${info.height}  png ${Math.round(fs.statSync(png).size / 1024)} KB`;
    if (!probe) {
      const webp = path.join(outDir, `${v.name}.webp`);
      await sharp(trimmed).resize({ width: Math.min(meta.width, 1400), withoutEnlargement: true })
        .webp({ quality: 86, alphaQuality: 90, effort: 6 }).toFile(webp);
      line += `  webp ${Math.round(fs.statSync(webp).size / 1024)} KB`;
    }
    console.log(line + (errors.length ? `  (avisos: ${errors.join(' | ')})` : ''));
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
