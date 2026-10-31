/* Rete finta per i collaudi: GitHub API (ultimo commit di main), jsDelivr (file del repository a qualunque ref) e il proxy di
   TizenBrew (porta 8081: /module/<nome>/app/... letto dal "jsDelivr" finto, più il WebSocket con GetModules). Porta 18090.
   Controllo: GET /__ctl?offline=0|1|2 (1: le connessioni vengono troncate, come senza rete; 2: passa solo app/index.html) | ?sha=<40 hex> | ?override=<ref>:<cartella>
   (i file di quel ref vengono letti da un'altra cartella: simula un commit nuovo) | ?inject=<js> (script aggiunto in testa a index.html,
   come lo userebbe un test per puntare i bootstrap a questa rete). */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const PORT = +process.env.FAKE_NET_PORT || 18090, PROXY_PORT = 8081;
const ROOT = path.join(__dirname, '..');
const REPO = 'apiazza75/samsung-tizen-home';
const state = { offline: false, sha: 'a'.repeat(40), overrides: {}, inject: '', modules: [] };
const MIME = { html: 'text/html; charset=utf-8', js: 'application/javascript', json: 'application/json', jpg: 'image/jpeg', png: 'image/png', woff2: 'font/woff2', svg: 'image/svg+xml' };
function fileFor(ref, rel) { const base = state.overrides[ref] || ROOT; const p = path.join(base, rel); if (!fs.existsSync(p) && base !== ROOT) return path.join(ROOT, rel); return p; }
function serve(req, res) {
  const u = new URL(req.url, 'http://x');
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  if (u.pathname === '/__ctl') {
    if (u.searchParams.has('offline')) state.offline = +u.searchParams.get('offline') || 0;   // 1 = tutto giù; 2 = passa solo app/index.html (il proxy TizenBrew l'ha consegnato), tutto il resto giù
    if (u.searchParams.get('sha')) state.sha = u.searchParams.get('sha');
    if (u.searchParams.get('override')) { const [ref, dir] = u.searchParams.get('override').split(':'); if (dir) state.overrides[ref] = dir; else delete state.overrides[ref]; }
    if (u.searchParams.has('inject')) state.inject = u.searchParams.get('inject');
    if (u.searchParams.has('modules')) state.modules = JSON.parse(u.searchParams.get('modules'));
    return res.end(JSON.stringify(state));
  }
  if (state.offline === 1 || (state.offline === 2 && !/\/app\/index\.html$/.test(u.pathname)) || (state.offline === 3 && u.pathname === '/api/commits/main')) { req.socket.destroy(); return; }   // 3: solo l'API di GitHub giù
  if (u.pathname === '/api/commits/main') { res.setHeader('Content-Type', 'text/plain'); return res.end(state.sha); }
  const m = /^\/gh\/([^/@]+\/[^/@]+)(?:@([^/]+))?\/(.+)$/.exec(u.pathname);
  if (m && m[1] === REPO) {
    const ref = m[2] || 'main', rel = m[3], p = fileFor(ref, rel);
    if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.statusCode = 404; return res.end('Couldn\'t find the requested file'); }
    res.setHeader('Content-Type', MIME[path.extname(p).slice(1)] || 'application/octet-stream');
    return res.end(fs.readFileSync(p));
  }
  res.statusCode = 404; res.end('not found');
}
http.createServer(serve).listen(PORT, '127.0.0.1', () => console.log('fake net on ' + PORT));

/* --- proxy TizenBrew (come service-nextgen/service/index.js): /module/<nome>/<file> -> jsDelivr, senza cache --- */
const proxy = http.createServer((req, res) => {
  const m = /^\/module\/([^/]+)\/(.+)$/.exec(req.url);
  if (!m) return res.end('127.0.0.1');
  const name = decodeURIComponent(m[1]).replace(/^gh\//, ''), rel = m[2].split('?')[0];
  http.get('http://127.0.0.1:' + PORT + '/gh/' + name + '/' + rel, r => {
    res.statusCode = r.statusCode; res.setHeader('Content-Type', r.headers['content-type'] || 'text/plain');
    const parts = []; r.on('data', c => parts.push(c)); r.on('end', () => {
      let body = Buffer.concat(parts);
      if (rel.endsWith('index.html') && state.inject) body = Buffer.from(body.toString('utf8').replace('<script>', '<script>' + state.inject + '</script><script>'));
      res.end(body);
    });
  }).on('error', () => { /* come TizenBrew: nessuna risposta */ });
});
proxy.on('upgrade', (req, socket) => {
  const key = crypto.createHash('sha1').update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + key + '\r\n\r\n');
  const send = obj => { const p = Buffer.from(JSON.stringify(obj)); let h; if (p.length < 126) { h = Buffer.from([0x81, p.length]); } else { h = Buffer.alloc(4); h[0] = 0x81; h[1] = 126; h.writeUInt16BE(p.length, 2); } socket.write(Buffer.concat([h, p])); };
  socket.on('data', d => { try { let len = d[1] & 0x7f, off = 2; if (len === 126) { len = d.readUInt16BE(2); off = 4; } const mask = d.slice(off, off + 4); off += 4; const p = Buffer.alloc(len); for (let i = 0; i < len; i++) p[i] = d[off + i] ^ mask[i % 4];
    const msg = JSON.parse(p.toString('utf8')); if (msg.type === 4) send({ type: 4, payload: state.modules }); } catch (e) {} });
  socket.on('error', () => {});
});
proxy.listen(PROXY_PORT, '127.0.0.1', () => console.log('fake tizenbrew proxy on ' + PROXY_PORT));
