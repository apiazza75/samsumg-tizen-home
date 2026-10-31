/* TV Samsung finta per i collaudi del servizio: API REST (porta 18001), canale telecomando WebSocket in chiaro (18001) e TLS (18002)
   con il flusso del token, ed.installedApp.get, ed.apps.icon (icona grande in un frame da >64 KB), ms.remote.control.
   Modalità (variabile d'ambiente FAKE_TV_MODE o argomento): ok | tlsonly | closeall | lan8001only | unauth | silent.
   Controllo: GET /__ctl?mode=... | ?running=<id>:<0|1> | ?consent=<ms> ; GET /__keys (tasti ricevuti) ; GET /__conns (connessioni ws).
   Nessuna dipendenza: il lato server del WebSocket è implementato qui (handshake, frame in entrata mascherati, frame in uscita). */
'use strict';
const http = require('http'), https = require('https'), crypto = require('crypto'), fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const PORT = +process.env.FAKE_TV_PORT || 18001, PORT_TLS = +process.env.FAKE_TV_PORT_TLS || 18002;
const state = { mode: process.argv[2] || process.env.FAKE_TV_MODE || 'ok', running: {}, keys: [], conns: [], consentDelay: 0 };
const ICON_PNG = fs.readFileSync(path.join(__dirname, 'fixtures', 'hub-icon.png'));
const HUB_APPS = [
  { appId: '11101200001', name: 'Netflix', icon: '/opt/share/webappservice/apps_icon/FirstScreen/11101200001/250x250.png', app_type: 2, is_lock: 0 },
  { appId: '3201512006785', name: 'Prime Video', icon: '/opt/share/webappservice/apps_icon/FirstScreen/3201512006785/250x250.png', app_type: 2, is_lock: 0 },
  { appId: '111299001912', name: 'YouTube', icon: '/opt/share/webappservice/apps_icon/FirstScreen/111299001912/250x250.png', app_type: 2, is_lock: 0 },
  { appId: '3201901017640', name: 'Disney+', icon: '/opt/share/webappservice/apps_icon/FirstScreen/3201901017640/250x250.png', app_type: 2, is_lock: 0 },
  { appId: 'org.tizen.browser', name: 'Internet', icon: '/opt/share/webappservice/apps_icon/FirstScreen/org.tizen.browser/250x250.png', app_type: 4, is_lock: 0 },
  { appId: '3201907018807', name: 'DAZN', icon: '/opt/share/webappservice/apps_icon/FirstScreen/3201907018807/250x250.png', app_type: 2, is_lock: 0 }
];
const TOKEN = '12345678';

/* --- REST --- */
function rest(req, res) {
  const u = new URL(req.url, 'http://x');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (u.pathname === '/__ctl') {
    if (u.searchParams.get('mode')) state.mode = u.searchParams.get('mode');
    if (u.searchParams.get('running')) { const [id, v] = u.searchParams.get('running').split(':'); state.running[id] = v === '1'; }
    if (u.searchParams.get('consent')) state.consentDelay = +u.searchParams.get('consent');
    if (u.searchParams.get('reset')) { state.keys = []; state.conns = []; }
    res.end(JSON.stringify({ ok: true, mode: state.mode }));
  } else if (u.pathname === '/__keys') res.end(JSON.stringify(state.keys));
  else if (u.pathname === '/__conns') res.end(JSON.stringify(state.conns));
  else if (u.pathname === '/api/v2/') res.end(JSON.stringify({ device: { developerIP: '127.0.0.1', developerMode: '1', name: 'Fake TV' } }));
  else if (u.pathname.startsWith('/api/v2/applications/')) { const id = decodeURIComponent(u.pathname.split('/').pop()); res.end(JSON.stringify({ id, running: !!state.running[id], visible: !!state.running[id] })); }
  else { res.statusCode = 404; res.end('{}'); }
}

/* --- WebSocket lato server --- */
function frame(data, opcode) {
  const payload = Buffer.isBuffer(data) ? data : Buffer.from(String(data), 'utf8'); const len = payload.length; let head;
  if (len < 126) { head = Buffer.alloc(2); head[1] = len; } else if (len < 65536) { head = Buffer.alloc(4); head[1] = 126; head.writeUInt16BE(len, 2); }
  else { head = Buffer.alloc(10); head[1] = 127; head.writeUInt32BE(0, 2); head.writeUInt32BE(len, 6); }
  head[0] = 0x80 | (opcode || 1); return Buffer.concat([head, payload]);
}
function closeFrame(code, reason) { const r = Buffer.from(reason || '', 'utf8'); const b = Buffer.alloc(2 + r.length); b.writeUInt16BE(code, 0); r.copy(b, 2); return frame(b, 8); }
function parser(onText) {
  let buf = Buffer.alloc(0);
  return chunk => {
    buf = Buffer.concat([buf, chunk]);
    for (;;) {
      if (buf.length < 2) return;
      const op = buf[0] & 0x0f, masked = buf[1] & 0x80; let len = buf[1] & 0x7f, off = 2;
      if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; } else if (len === 127) { if (buf.length < 10) return; len = buf.readUInt32BE(6); off = 10; }
      let mask = null; if (masked) { if (buf.length < off + 4) return; mask = buf.slice(off, off + 4); off += 4; }
      if (buf.length < off + len) return;
      let payload = buf.slice(off, off + len); buf = buf.slice(off + len);
      if (mask) { const p = Buffer.alloc(len); for (let i = 0; i < len; i++) p[i] = payload[i] ^ mask[i % 4]; payload = p; }
      if (op === 1) onText(payload.toString('utf8')); else if (op === 8) return 'close';
    }
  };
}
function upgrade(tls) {
  return (req, socket, head) => {
    const u = new URL(req.url, 'http://x'), host = (req.headers.host || '').split(':')[0], viaLan = host !== '127.0.0.1' && host !== 'localhost';
    const tokenOk = u.searchParams.get('token') === TOKEN, conn = { tls, host, name: u.searchParams.get('name'), tokenOk, closed: null, at: Date.now() };
    state.conns.push(conn);
    const key = crypto.createHash('sha1').update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + key + '\r\n\r\n');
    const send = obj => socket.write(frame(JSON.stringify(obj)));
    const closeWith = (code, reason) => { conn.closed = code + ' ' + reason; socket.write(closeFrame(code, reason)); setTimeout(() => socket.end(), 30); };
    const m = state.mode;
    // scenari di guasto (decisi dopo la stretta di mano, come fa la TV vera)
    if (m === 'closeall') return setTimeout(() => closeWith(1001, 'loopback'), 40);
    if (m === 'tlsonly' && !tls) return setTimeout(() => closeWith(1001, 'plain-closed'), 40);
    if (m === 'lan8001only' && (tls || !viaLan)) return setTimeout(() => closeWith(1001, viaLan ? 'tls-closed' : 'loopback'), 40);
    if (m === 'unauth') return setTimeout(() => { send({ event: 'ms.channel.unauthorized', data: {} }); closeWith(1000, ''); }, 40);
    if (m === 'silent') return;
    const connect = () => send({ event: 'ms.channel.connect', data: tls ? { token: TOKEN, clients: [] } : { clients: [] } });
    if (tls && !tokenOk) setTimeout(connect, state.consentDelay); else setTimeout(connect, 20);
    const feed = parser(txt => {
      let msg; try { msg = JSON.parse(txt); } catch (e) { return; }
      if (msg.method === 'ms.remote.control') { state.keys.push(msg.params && msg.params.DataOfCmd); return; }
      if (msg.method === 'ms.channel.emit' && msg.params) {
        if (msg.params.event === 'ed.installedApp.get') setTimeout(() => send({ event: 'ed.installedApp.get', from: 'host', data: { data: HUB_APPS } }), 30);
        if (msg.params.event === 'ed.apps.icon') setTimeout(() => send({ event: 'ed.apps.icon', from: 'host', data: { iconPath: msg.params.data.iconPath, imageBase64: ICON_PNG.toString('base64') } }), 30);
      }
    });
    socket.on('data', d => { if (feed(d) === 'close') socket.end(); });
    socket.on('error', () => {});
    if (head && head.length) feed(head);
  };
}

/* --- certificato autofirmato per la 18002 (come la TV) --- */
function selfSigned() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'faketv-')), key = path.join(dir, 'k.pem'), crt = path.join(dir, 'c.pem');
  cp.execSync(`openssl req -x509 -newkey rsa:2048 -nodes -keyout ${key} -out ${crt} -days 2 -subj /CN=faketv 2>/dev/null`);
  return { key: fs.readFileSync(key), cert: fs.readFileSync(crt) };
}
const plain = http.createServer(rest); plain.on('upgrade', upgrade(false));
const tls = https.createServer(selfSigned(), rest); tls.on('upgrade', upgrade(true));
plain.listen(PORT, '0.0.0.0', () => tls.listen(PORT_TLS, '0.0.0.0', () => console.log('fake tv ' + state.mode + ' on ' + PORT + '/' + PORT_TLS)));
