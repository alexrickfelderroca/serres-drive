/* =====================================================================
   Servidor estatico minimo para verificar el sitio generado en local.

   Uso:  node _build/serve.js [puerto]      (por defecto 8131, el que
                                             espera _build/shot.js)

   Sirve la raiz del repositorio tal cual la sirve Hostinger: directorios
   con index.html y sin reescrituras. Cache-Control: no-store, para que
   cada recarga vea el ultimo build.
   ===================================================================== */
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const PORT = Number(process.argv[2] || 8131);
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif',
  '.ico': 'image/x-icon', '.glb': 'model/gltf-binary', '.xml': 'application/xml',
  '.txt': 'text/plain', '.woff2': 'font/woff2',
};
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.stat(file, (err, st) => {
    if (!err && st.isDirectory()) { res.writeHead(301, { Location: p + '/' }); return res.end(); }
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return fs.createReadStream(path.join(ROOT, '404.html')).pipe(res);
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    fs.createReadStream(file).pipe(res);
  });
}).listen(PORT, () => console.log('serres-drive en http://localhost:' + PORT));
