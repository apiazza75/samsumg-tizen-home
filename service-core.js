/* Milano Home — servizio Node eseguito da TizenBrew (caricato da service.js, il bootstrap che lo tiene in cache su disco e lo
   aggiorna dall'ultimo commit di main). Gira con i privilegi dell'app: legge le app installate e le loro icone, le avvia, serve
   gli sfondi e i font dalla cache su disco, e parla con la TV sul canale telecomando Samsung (samsung.remote.control) per i tasti
   (HDMI, Home, Spegni, Menu) e per le icone dello Smart Hub. Espone un piccolo HTTP server locale usato dal launcher.
   ES5 per Node vecchi. Gli endpoint che agiscono sulla TV accettano solo richieste dalla pagina di TizenBrew. */
(function () {
  'use strict';
  var VERSION = '2.0.1';
  // commit in uso e bootstrap: li passa service.js come argomenti (nella sandbox di TizenBrew `global` non esiste)
  var REF = (function () { try { return (typeof MH_REF !== 'undefined' && MH_REF) || Function('return this')().MH_REF || null; } catch (e) { return null; } })();
  var BOOT = (function () { try { return (typeof MH_BOOT !== 'undefined' && MH_BOOT) || Function('return this')().MH_BOOT || null; } catch (e) { return null; } })();
  var http = require('http');
  var https = require('https');
  var fs = require('fs');
  var os = require('os');
  var crypto = require('crypto');
  var PORT = 8095;
  var TV_HOST = process.env.MH_TV_HOST || '127.0.0.1';
  var TV_PORT = +process.env.MH_TV_PORT || 8001;          // API REST e canale ws in chiaro
  var TV_PORT_TLS = +process.env.MH_TV_PORT_TLS || 8002;  // canale wss con token (TV recenti)
  var LAN_IP = process.env.MH_LAN_IP || null;             // nei test: finto IP di rete della TV
  var PAGE_ORIGIN = 'http://127.0.0.1:8081';
  var REPO = 'apiazza75/samsung-tizen-home';
  var CDN = process.env.MH_CDN || 'https://cdn.jsdelivr.net/gh/' + REPO + '@';
  var ICON_DIRS = ['/opt/usr/', '/usr/apps/', '/opt/apps/', '/opt/share/', '/usr/share/'];
  var HUB_DIR = process.env.MH_HUB_DIR || '/opt/share/webappservice/apps_icon/FirstScreen';   // icone della home Samsung, una cartella per app
  var DATA_DIR = process.env.MH_DATA_DIR || '/home/owner/share';   // la stessa cartella del file di configurazione di TizenBrew
  var ICON_CACHE = DATA_DIR + '/milanohome-icons';
  var ASSET_CACHE = DATA_DIR + '/milanohome-assets';
  var STATE_FILE = DATA_DIR + '/milanohome.json';
  var ASSETS = { 'wall1.jpg': 'image/jpeg', 'wall2.jpg': 'image/jpeg', 'wall3.jpg': 'image/jpeg', 'wall4.jpg': 'image/jpeg', 'figtree.woff2': 'font/woff2' };
  var B = (Buffer.alloc && Buffer.from && Buffer.from !== Uint8Array.from) ? Buffer : {
    from: function (s, e) { return new Buffer(s, e); },
    alloc: function (n) { var b = new Buffer(n); b.fill(0); return b; }
  };
  var sockets = [];
  var SELF_APP = (function () { try { return tizen.application.getCurrentApplication().appInfo.packageId + '.TizenBrewStandalone'; } catch (e) { return 'xvvl3S1bvH.TizenBrewStandalone'; } })();
  function hasTizen() { return !!(typeof tizen !== 'undefined' && tizen && tizen.application); }
  function log(m) { console.log('MilanoHome: ' + m); }
  function mkdir(d) { try { fs.mkdirSync(d); } catch (e) {} }

  /* --- stato persistente (token del canale TLS, combinazione host/porta che ha funzionato) --- */
  function loadState() { try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) || {}; } catch (e) { return {}; } }
  function saveState(s) { try { fs.writeFileSync(STATE_FILE, JSON.stringify(s)); } catch (e) { log('stato non salvato: ' + e.message); } }

  /* --- IP di rete della TV: il canale telecomando potrebbe accettare solo connessioni dall'interfaccia di rete, non da 127.0.0.1 --- */
  function lanIp() {
    if (LAN_IP) return LAN_IP;
    try { var ifs = os.networkInterfaces(), names = Object.keys(ifs);
      for (var i = 0; i < names.length; i++) { var list = ifs[names[i]] || [];
        for (var j = 0; j < list.length; j++) { var a = list[j]; if ((a.family === 'IPv4' || a.family === 4) && !a.internal && a.address) return a.address; } }
    } catch (e) {}
    return null;
  }

  /* --- ritorno automatico: osservo l'app avviata dal launcher e, quando si chiude, riporto TizenBrew (Milano Home) in primo piano --- */
  var watch = null;
  function getJson(path, cb) {
    try { var r = http.get({ host: TV_HOST, port: TV_PORT, path: path }, function (res) { var b = ''; res.on('data', function (c) { b += c; }); res.on('end', function () { try { cb(null, JSON.parse(b)); } catch (e) { cb(e); } }); });
      r.on('error', function (e) { cb(e); }); r.setTimeout(3000, function () { try { r.abort(); } catch (e) {} }); } catch (e) { cb(e); }
  }
  function bringLauncherBack() {
    if (!hasTizen()) return;
    try { tizen.application.launch(SELF_APP, function () { log('launcher in primo piano'); }, function (e) { log('launch launcher failed ' + (e && e.message)); }); } catch (e) { log(e.message); }
  }
  function watchApp(id) {
    if (watch) { clearInterval(watch.timer); watch = null; }
    var w = { id: id, seenRunning: false, started: Date.now(), timer: null };
    w.timer = setInterval(function () {
      if (Date.now() - w.started > 6 * 3600 * 1000) { clearInterval(w.timer); watch = null; return; }
      getJson('/api/v2/applications/' + encodeURIComponent(id), function (err, j) {
        if (err || !j || typeof j.running === 'undefined') { if (Date.now() - w.started > 30000 && !w.seenRunning) { clearInterval(w.timer); watch = null; } return; }
        var running = j.running === true || j.running === 'true';
        if (running) { w.seenRunning = true; return; }
        if (w.seenRunning) { clearInterval(w.timer); watch = null; setTimeout(bringLauncherBack, 600); }
        else if (Date.now() - w.started > 30000) { clearInterval(w.timer); watch = null; }
      });
    }, 2000);
    watch = w;
  }

  /* --- HTTP: utilità --- */
  function json(res, code, obj) {
    res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Connection': 'close' });
    res.end(JSON.stringify(obj));
  }
  function dec(x) { try { return decodeURIComponent(x); } catch (e) { return ''; } }
  function qs(url) { var o = {}, i = url.indexOf('?'); if (i < 0) return o;
    url.slice(i + 1).split('&').forEach(function (p) { var kv = p.split('='); o[dec(kv[0])] = dec((kv[1] || '').replace(/\+/g, ' ')); }); return o; }
  function fromPage(req) {
    var o = req.headers.origin || '', r = req.headers.referer || '';
    if (o) return o === PAGE_ORIGIN;
    if (r) return r.indexOf(PAGE_ORIGIN + '/') === 0;
    return false;
  }
  function imageType(buf) {
    if (buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
    if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8) return 'image/jpeg';
    if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
    if (buf.length > 6 && buf.toString('ascii', 0, 3) === 'GIF') return 'image/gif';
    var head = buf.toString('utf8', 0, Math.min(buf.length, 200)).toLowerCase(); if (head.indexOf('<svg') >= 0) return 'image/svg+xml';
    return 'application/octet-stream';
  }
  function sendImage(res, buf) {
    res.writeHead(200, { 'Content-Type': imageType(buf), 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'max-age=86400' });
    res.end(buf);
  }
  // download binario (jsDelivr): cb(err, buffer)
  function download(url, cb) {
    var done = false, fin = function (e, b) { if (done) return; done = true; cb(e, b); };
    var m = /^(https?):\/\/([^/:]+)(?::(\d+))?(\/.*)?$/.exec(url); if (!m) return fin('url');
    try {
      var req = (m[1] === 'https' ? https : http).get({ host: m[2], port: m[3] ? +m[3] : (m[1] === 'https' ? 443 : 80), path: m[4] || '/', headers: { 'User-Agent': 'MilanoHome-service' } }, function (res) {
        if (res.statusCode !== 200) { res.resume(); return fin('HTTP ' + res.statusCode); }
        var parts = []; res.on('data', function (c) { parts.push(c); }); res.on('end', function () { fin(null, Buffer.concat(parts)); });
      });
      req.on('error', function (e) { fin(e.message); });
      req.setTimeout(20000, function () { try { req.abort(); } catch (e) {} fin('timeout'); });
    } catch (e) { fin(e.message); }
  }

  /* --- app installate (API Tizen) --- */
  function listApps(cb) {
    if (!hasTizen()) return cb('no tizen', null);
    try {
      tizen.application.getAppsInfo(function (list) {
        var out = [];
        for (var i = 0; i < list.length; i++) { var a = list[i];
          var ip = a.iconPath || '', ok = false; try { ok = !!ip && fs.statSync(ip).isFile(); } catch (e) { ok = false; }
          out.push({ id: a.id, name: a.name, iconPath: ip, iconOk: ok, show: a.show !== false, packageId: a.packageId || '' }); }
        cb(null, out);
      }, function (e) { cb(e && e.message ? e.message : 'getAppsInfo error', null); });
    } catch (e) { cb(e.message, null); }
  }

  /* --- WebSocket minimo verso la TV: frame mascherati in uscita, parser completo in entrata (lunghezze 7/16/64 bit, maschera,
         frammentazione, ping/pong, close con codice e motivo). Le risposte della TV con le icone arrivano in più pacchetti TCP. --- */
  function wsFrame(data, opcode) {
    var payload = Buffer.isBuffer(data) ? data : B.from(String(data), 'utf8'), len = payload.length, mask = crypto.randomBytes(4), head;
    if (len < 126) { head = B.alloc(2); head[1] = 0x80 | len; }
    else if (len < 65536) { head = B.alloc(4); head[1] = 0x80 | 126; head.writeUInt16BE(len, 2); }
    else { head = B.alloc(10); head[1] = 0x80 | 127; head.writeUInt32BE(0, 2); head.writeUInt32BE(len, 6); }
    head[0] = 0x80 | (opcode || 0x1);
    var masked = B.alloc(len); for (var i = 0; i < len; i++) masked[i] = payload[i] ^ mask[i % 4];
    return Buffer.concat([head, mask, masked]);
  }
  function wsParser(h) { // h.text(str), h.ping(payload), h.close(code, reason)
    var buf = B.alloc(0), parts = [];
    return function feed(chunk) {
      buf = buf.length ? Buffer.concat([buf, chunk]) : chunk;
      for (;;) {
        if (buf.length < 2) return;
        var fin = buf[0] & 0x80, op = buf[0] & 0x0f, masked = buf[1] & 0x80, len = buf[1] & 0x7f, off = 2;
        if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
        else if (len === 127) { if (buf.length < 10) return; len = buf.readUInt32BE(2) * 4294967296 + buf.readUInt32BE(6); off = 10; }
        var mask = null; if (masked) { if (buf.length < off + 4) return; mask = buf.slice(off, off + 4); off += 4; }
        if (buf.length < off + len) return;
        var payload = buf.slice(off, off + len); buf = buf.slice(off + len);
        if (mask) { var p = B.alloc(len); for (var i = 0; i < len; i++) p[i] = payload[i] ^ mask[i % 4]; payload = p; }
        if (op === 0x8) { h.close(payload.length >= 2 ? payload.readUInt16BE(0) : null, payload.length > 2 ? payload.toString('utf8', 2) : ''); return; }
        if (op === 0x9) { h.ping(payload); continue; }
        if (op === 0xA) continue;
        parts.push(payload);
        if (fin) { var all = parts.length === 1 ? parts[0] : Buffer.concat(parts); parts = []; h.text(all.toString('utf8')); }
      }
    };
  }

  /* --- canale telecomando Samsung (samsung.remote.control), condiviso e con coda: una sola connessione alla volta, richieste in
         sequenza, chiusura dopo 5 s di inattività. Si provano in ordine le combinazioni host/porta (IP di rete e 127.0.0.1, 8002 TLS
         e 8001 in chiaro) finché una risponde ms.channel.connect; quella buona viene ricordata. Sulla 8002 la TV rilascia un token,
         salvato e riusato (così chiede "Consenti" una volta sola). Ogni tentativo viene registrato per la Diagnostica. --- */
  var chan = null, tvQueue = [], tvBusy = false, tvIdleTimer = null, lastChanError = null, attempts = [];
  function combos() {
    var st = loadState(), lan = lanIp(), list = [], seen = {};
    function add(host, tls) { if (!host) return; var k = host + ':' + (tls ? TV_PORT_TLS : TV_PORT); if (seen[k]) return; seen[k] = 1; list.push({ host: host, port: tls ? TV_PORT_TLS : TV_PORT, tls: !!tls }); }
    if (st.chan && st.chan.host) add(st.chan.host, st.chan.tls);
    add(lan, true); add(lan, false); add(TV_HOST, true); add(TV_HOST, false);
    return list;
  }
  function openChannel(c, cb) {
    var state = loadState(), t0 = Date.now(), bytes = 0, events = [];
    var rec = { host: c.host, port: c.port, tls: c.tls, result: null, code: null, reason: null, ms: 0, bytes: 0, events: events, at: t0 };
    attempts.push(rec); if (attempts.length > 12) attempts.shift();
    var name = B.from('Milano Home', 'utf8').toString('base64');
    var path = '/api/v2/channels/samsung.remote.control?name=' + name + (c.tls && state.token ? '&token=' + encodeURIComponent(state.token) : '');
    var opts = { host: c.host, port: c.port, path: path, method: 'GET',
      headers: { 'Connection': 'Upgrade', 'Upgrade': 'websocket', 'Sec-WebSocket-Version': '13', 'Sec-WebSocket-Key': crypto.randomBytes(16).toString('base64') } };
    if (c.tls) opts.rejectUnauthorized = false;
    var done = false, req = null;
    function fail(err, kind, result) { if (done) return; done = true; clearTimeout(timer); rec.result = result || kind; rec.ms = Date.now() - t0; rec.bytes = bytes; try { if (req) req.abort(); } catch (e) {} cb({ message: String(err), kind: kind || 'error' }); }
    var timer = setTimeout(function () { fail('nessuna conferma dalla TV: premi "Consenti" sull\'avviso e riprova', 'timeout', 'nessuna risposta in 30 s'); }, 30000);
    try { req = (c.tls ? https : http).request(opts); } catch (e) { return fail(e.message, 'connect', 'errore: ' + e.message); }
    req.on('upgrade', function (res, socket, head) {
      events.push('101 upgrade ' + (Date.now() - t0) + 'ms');
      var ch = { sock: socket, listeners: [], closed: false, tls: c.tls, combo: c };
      ch.send = function (obj) { socket.write(wsFrame(JSON.stringify(obj))); };
      ch.close = function () { if (ch.closed) return; ch.closed = true; try { socket.end(); } catch (e) {} if (chan === ch) chan = null; };
      function broadcast(msg) { ch.listeners.slice().forEach(function (fn) { fn(msg); }); }
      var feed = wsParser({
        text: function (txt) { var msg; try { msg = JSON.parse(txt); } catch (e) { events.push('testo non JSON (' + txt.length + ' byte)'); return; }
          if (events.length < 8) events.push('evento ' + (msg.event || '?') + ' ' + (Date.now() - t0) + 'ms');
          if (!done) {
            if (msg.event === 'ms.channel.connect') { done = true; clearTimeout(timer); rec.result = 'ok'; rec.ms = Date.now() - t0; rec.bytes = bytes;
              var tok = msg.data && msg.data.token; if (tok) { state.token = String(tok); }
              state.chan = { host: c.host, tls: c.tls }; saveState(state);
              cb(null, ch); return; }
            if (msg.event === 'ms.channel.unauthorized') { fail('comando rifiutato: consenti "Milano Home" nella TV (Impostazioni → Generale → Gestione dispositivi esterni)', 'unauthorized', 'rifiutato (ms.channel.unauthorized)'); ch.close(); }
            return; }
          broadcast(msg); },
        ping: function (p) { try { socket.write(wsFrame(p, 0xA)); } catch (e) {} },
        close: function (code, reason) { rec.code = code; rec.reason = reason; events.push('frame close ' + code + (reason ? ' ' + reason : '') + ' ' + (Date.now() - t0) + 'ms'); ch.close(); }
      });
      socket.on('data', function (d) { bytes += d.length; try { feed(d); } catch (e) { log('frame ws non valido: ' + e.message); events.push('frame non valido: ' + e.message); ch.close(); } });
      socket.on('error', function (e) { if (!done) fail(e.message, 'connect', 'errore socket: ' + e.message); ch.closed = true; if (chan === ch) chan = null; broadcast({ event: 'mh.closed', error: e.message }); });
      socket.on('close', function () { ch.closed = true; if (chan === ch) chan = null;
        if (!done) fail('connessione chiusa dalla TV' + (rec.code ? ' (codice ' + rec.code + (rec.reason ? ' ' + rec.reason : '') + ')' : ''), 'connect', 'chiusa dalla TV dopo ' + (Date.now() - t0) + ' ms' + (rec.code ? ', codice ' + rec.code + (rec.reason ? ' ' + rec.reason : '') : ', senza frame di chiusura') + (bytes ? ', ' + bytes + ' byte ricevuti' : ', nessun dato'));
        broadcast({ event: 'mh.closed' }); });
      if (head && head.length) { bytes += head.length; feed(head); }
    });
    req.on('response', function (r) { r.resume(); fail('API telecomando non disponibile (HTTP ' + r.statusCode + ')', 'connect', 'HTTP ' + r.statusCode + ' invece di 101'); });
    req.on('error', function (e) { fail(e.message, 'connect', 'errore: ' + e.message); });
    req.setTimeout(31000, function () { try { req.abort(); } catch (e) {} fail('timeout', 'timeout', 'timeout'); });
    req.end();
  }
  function withChannel(cb) {
    if (chan && !chan.closed) return cb(null, chan);
    var list = combos(), i = 0, errs = [];
    (function next() {
      if (i >= list.length) { lastChanError = errs.join(' / '); return cb(lastChanError); }
      var c = list[i++];
      openChannel(c, function (err, ch) {
        if (!err) { chan = ch; lastChanError = null; return cb(null, ch); }
        errs.push(c.host + ':' + c.port + ' ' + err.message);
        // rifiuto esplicito o avviso "Consenti" in attesa: inutile provare altre porte (riaprirebbero l'avviso)
        if (err.kind !== 'connect') { lastChanError = errs.join(' / '); return cb(lastChanError); }
        next();
      });
    })();
  }
  function scheduleIdleClose() { clearTimeout(tvIdleTimer); tvIdleTimer = setTimeout(function () { if (!tvBusy && !tvQueue.length && chan) chan.close(); }, 5000); }
  // tvRequest(messaggio, eventoAtteso|null, timeoutMs, cb(err, msg)); con eventoAtteso null è "invia e basta" (tasti)
  function tvRequest(msg, waitEvent, ms, cb) { tvQueue.push({ msg: msg, ev: waitEvent, ms: ms, cb: cb }); pump(); }
  function pump() {
    if (tvBusy || !tvQueue.length) return;
    tvBusy = true; var job = tvQueue.shift();
    withChannel(function (err, c) {
      if (err) { tvBusy = false; var rest = tvQueue; tvQueue = []; job.cb(err); rest.forEach(function (j) { j.cb(err); }); return; }
      var done = false, t = setTimeout(function () { finish('la TV non ha risposto (' + job.ev + ')'); }, job.ms);
      function finish(e, data) { if (done) return; done = true; clearTimeout(t); var i = c.listeners.indexOf(on); if (i >= 0) c.listeners.splice(i, 1); tvBusy = false; job.cb(e, data); scheduleIdleClose(); pump(); }
      function on(m) { if (m.event === 'mh.closed') return finish(m.error || 'connessione chiusa dalla TV'); if (job.ev && m.event === job.ev) finish(null, m); }
      c.listeners.push(on);
      try { c.send(job.msg); } catch (e) { return finish(e.message); }
      if (!job.ev) setTimeout(function () { finish(null, null); }, 400);
    });
  }
  function sendRemoteKey(key, cb) {
    tvRequest({ method: 'ms.remote.control', params: { Cmd: 'Click', DataOfCmd: key, Option: 'false', TypeOfRemote: 'SendRemoteKey' } }, null, 5000, function (err) { cb(err || null); });
  }

  /* --- icone dello Smart Hub (le stesse della home Samsung). Due fonti, in ordine:
         1) la cartella HUB_DIR, una sottocartella per app con 250x250.png (nessun canale necessario, se leggibile);
         2) il canale telecomando: ed.installedApp.get (elenco con percorso icona) e ed.apps.icon (immagine in base64).
         Cache su disco in ICON_CACHE. --- */
  var hub = { apps: null, at: 0, error: null, pending: null, dir: null, dirError: null, dirAt: 0 };
  function hubDirList() {
    if (hub.dir && Date.now() - hub.dirAt < 600000) return hub.dir;
    try { var names = fs.readdirSync(HUB_DIR); hub.dir = names.filter(function (n) { return n && n.charAt(0) !== '.'; }); hub.dirError = null; }
    catch (e) { hub.dir = null; hub.dirError = e.code || e.message; }
    hub.dirAt = Date.now(); return hub.dir;
  }
  function hubDirIcon(id) { return HUB_DIR + '/' + String(id).replace(/[^A-Za-z0-9._-]/g, '_') + '/250x250.png'; }
  function hubList(cb) {
    if (hub.apps && Date.now() - hub.at < 600000) return cb(null, hub.apps);
    if (hub.pending) return hub.pending.push(cb);
    hub.pending = [cb];
    tvRequest({ method: 'ms.channel.emit', params: { event: 'ed.installedApp.get', to: 'host' } }, 'ed.installedApp.get', 10000, function (err, msg) {
      var list = null;
      if (!err) { try { list = msg.data.data; } catch (e) {} if (!Array.isArray(list)) err = 'risposta inattesa dalla TV'; }
      if (!err) {
        hub.apps = list.map(function (a) { return { appId: String(a.appId || ''), name: String(a.name || ''), icon: String(a.icon || ''), type: a.app_type }; });
        hub.at = Date.now(); hub.error = null; log('Smart Hub: ' + hub.apps.length + ' app');
      } else { hub.error = String(err); log('Smart Hub non disponibile: ' + hub.error); }
      var w = hub.pending; hub.pending = null; w.forEach(function (f) { f(err, hub.apps); });
    });
  }
  function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9+]/g, ''); }
  // abbina un'app Tizen a una voce dello Smart Hub: id esatto, poi pacchetto, poi nome (solo con l'elenco del canale)
  function hubFor(a, list, dirIds) {
    var pkg = String(a.id || '').split('.')[0], i, h;
    if (list) {
      for (i = 0; i < list.length; i++) { h = list[i]; if (h.appId && (h.appId === a.id || h.appId === pkg || h.appId === a.packageId)) return h.appId; }
      var n = norm(a.name); if (n) for (i = 0; i < list.length; i++) { if (norm(list[i].name) === n) return list[i].appId; }
    }
    if (dirIds) { for (i = 0; i < dirIds.length; i++) { if (dirIds[i] === a.id || dirIds[i] === pkg || dirIds[i] === a.packageId) return dirIds[i]; } }
    return null;
  }
  function cacheFile(id) { return ICON_CACHE + '/' + String(id).replace(/[^A-Za-z0-9._-]/g, '_') + '.img'; }
  function hubIcon(id, cb) {
    var file = cacheFile(id);
    function save(buf) { mkdir(ICON_CACHE); fs.writeFile(file, buf, function (e3) { if (e3) log('icona non salvata: ' + e3.message); }); cb(null, buf); }
    fs.readFile(file, function (e, d) {
      if (!e && d && d.length > 100) return cb(null, d);
      fs.readFile(hubDirIcon(id), function (e1, d1) {
        if (!e1 && d1 && d1.length > 100) return save(d1);
        hubList(function (err, list) {
          var h = null; (list || []).forEach(function (x) { if (x.appId === id) h = x; });
          if (!h) return cb(err ? String(err) : 'app non presente nello Smart Hub');
          var readDirect = function (next) { if (!h.icon) return next(); fs.readFile(h.icon, function (e2, d2) { if (!e2 && d2 && d2.length > 100) return save(d2); next(); }); };
          readDirect(function () {
            tvRequest({ method: 'ms.channel.emit', params: { event: 'ed.apps.icon', to: 'host', data: { iconPath: h.icon } } }, 'ed.apps.icon', 15000, function (e3, msg) {
              if (e3) return cb(String(e3));
              var b64 = msg && msg.data && (msg.data.imageBase64 || msg.data.image || msg.data.data);
              if (!b64 || typeof b64 !== 'string') return cb('icona non fornita dalla TV');
              var buf = B.from(b64.replace(/^data:[^,]*,/, ''), 'base64');
              if (buf.length < 100) return cb('icona vuota');
              save(buf);
            });
          });
        });
      });
    });
  }

  /* --- sfondi e font: dal disco; se mancano o appartengono a un altro commit, scaricati da jsDelivr al commit in uso --- */
  function asset(name, cb) {
    var file = ASSET_CACHE + '/' + name, meta = file + '.ref';
    fs.readFile(file, function (e, d) {
      var ref = null; try { ref = fs.readFileSync(meta, 'utf8'); } catch (e2) {}
      if (!e && d && d.length > 100 && (!REF || ref === REF)) return cb(null, d);
      if (!REF) return cb(e ? 'file assente' : null, d && d.length > 100 ? d : null);
      download(CDN + REF + '/app/' + name, function (err, buf) {
        if (err || !buf || buf.length < 100) { if (!e && d && d.length > 100) return cb(null, d); return cb(err || 'vuoto'); }
        mkdir(ASSET_CACHE); fs.writeFile(file, buf, function (e3) { if (!e3) fs.writeFile(meta, REF, function () {}); });
        cb(null, buf);
      });
    });
  }

  /* --- server HTTP locale --- */
  var server = http.createServer(function (req, res) {
    var url = req.url || '/', q = qs(url), path = url.split('?')[0];
    if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }); return res.end(); }
    if (path === '/ping') { var dir = hubDirList();
      return json(res, 200, { ok: true, tizen: hasTizen(), node: process.version, v: VERSION, ref: REF, self: SELF_APP, watching: watch ? watch.id : null, lan: lanIp(),
        boot: BOOT ? BOOT.info() : null,
        hub: { apps: hub.apps ? hub.apps.length : null, error: hub.error, dir: dir ? dir.length : null, dirError: hub.dirError, chan: loadState().chan || null, channelError: lastChanError, attempts: attempts.slice(-6) } }); }
    if (path === '/apps') return listApps(function (err, apps) {
      if (err) return json(res, 500, { error: err });
      var dirIds = hubDirList();
      // arricchisco con l'app corrispondente dello Smart Hub (canale, poi cartella); se la TV non risponde entro 8 s rispondo senza
      var sent = false, t = setTimeout(function () { if (!sent) { sent = true; finish(null, 'timeout'); } }, 8000);
      function finish(list, herr) {
        apps.forEach(function (a) { var h = hubFor(a, list, dirIds); if (h) { a.hub = h; if (list) list.forEach(function (x) { if (x.appId === h) a.hubName = x.name; }); } });
        json(res, 200, { apps: apps, hub: list ? list.length : null, hubDir: dirIds ? dirIds.length : null, hubError: herr ? String(herr) : null });
      }
      hubList(function (herr, list) { if (sent) return; sent = true; clearTimeout(t); finish(list, herr || hub.error); });
    });
    if (path === '/hub') return hubList(function (err, list) { json(res, err && !list ? 500 : 200, { error: err ? String(err) : null, apps: list, dir: hubDirList(), dirError: hub.dirError }); });
    if (path === '/hubicon') { var id = q.id || ''; if (!id) return json(res, 400, { error: 'id?' });
      return hubIcon(id, function (err, buf) { if (err) return json(res, 404, { error: err }); sendImage(res, buf); }); }
    if (path === '/icon') {
      var p = q.path || '', okDir = ICON_DIRS.some(function (d) { return p.indexOf(d) === 0; });
      if (!p || p.indexOf('..') >= 0 || !okDir || !/\.(png|jpe?g|svg|webp|gif)$/i.test(p)) return json(res, 400, { error: 'bad path' });
      fs.readFile(p, function (err, data) { if (err) return json(res, 404, { error: err.message }); sendImage(res, data); });
      return;
    }
    if (path === '/asset') { var n = q.name || ''; if (!ASSETS[n]) return json(res, 400, { error: 'asset?' });
      return asset(n, function (err, buf) { if (err || !buf) return json(res, 404, { error: String(err || 'assente') });
        res.writeHead(200, { 'Content-Type': ASSETS[n], 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'max-age=86400' }); res.end(buf); }); }
    // da qui in poi: azioni sulla TV o sul servizio, solo dalla pagina del launcher (o, per /shutdown, dal servizio stesso)
    if (path === '/shutdown') {
      if (req.headers.origin || req.headers.referer) return json(res, 403, { error: 'forbidden' });
      json(res, 200, { bye: true });
      setTimeout(function () { try { server.close(); } catch (e) {} sockets.forEach(function (s) { try { s.destroy(); } catch (e) {} }); if (chan) chan.close(); if (watch) { clearInterval(watch.timer); watch = null; } }, 50);
      return;
    }
    if (!fromPage(req)) return json(res, 403, { error: 'forbidden' });
    if (path === '/update') {
      if (!BOOT) return json(res, 200, { ref: REF, action: 'unsupported', error: 'bootstrap 1.x: per aggiornare il servizio riavvia TizenBrew' });
      var answered = false, ut = setTimeout(function () { if (!answered) { answered = true; json(res, 200, { ref: REF, action: 'pending' }); } }, 25000);
      return BOOT.update(function (r) { if (answered) return; answered = true; clearTimeout(ut); json(res, 200, r); });
    }
    if (path === '/launch') {
      if (!hasTizen()) return json(res, 500, { error: 'no tizen' });
      if (!q.id) return json(res, 400, { error: 'id?' });
      try { tizen.application.launch(q.id, function () { json(res, 200, { ok: true }); if (q.back === '1') watchApp(q.id); else if (watch) { clearInterval(watch.timer); watch = null; } }, function (e) { json(res, 500, { error: e && e.message ? e.message : 'launch failed' }); }); }
      catch (e) { json(res, 500, { error: e.message }); }
      return;
    }
    if (path === '/key') { var k = (q.key || '').replace(/[^A-Z0-9_]/g, ''); if (!k) return json(res, 400, { error: 'key?' });
      return sendRemoteKey(k, function (err) { if (err) return json(res, 500, { error: String(err) }); json(res, 200, { ok: true }); }); }
    if (path === '/hubreset') { hub.apps = null; hub.at = 0; hub.error = null; attempts = []; var st = loadState(); delete st.chan; saveState(st); if (chan) chan.close();
      return hubList(function (err, list) { json(res, 200, { error: err ? String(err) : null, apps: list ? list.length : null, attempts: attempts }); }); }
    json(res, 404, { error: 'not found' });
  });
  server.on('connection', function (s) { sockets.push(s); s.on('close', function () { var i = sockets.indexOf(s); if (i >= 0) sockets.splice(i, 1); }); });
  var tries = 0;
  server.on('error', function (e) {
    log('service error: ' + e.message);
    if (e.code === 'EADDRINUSE' && tries < 6) { tries++;
      // una versione precedente del servizio occupa la porta: le chiedo di chiudersi e riprovo (fino a 6 volte)
      var again = function () { setTimeout(function () { server.listen(PORT, '127.0.0.1'); }, 1000); };
      try { var r = http.get({ host: '127.0.0.1', port: PORT, path: '/shutdown' }, function (res) { res.resume(); again(); });
        r.on('error', again); r.setTimeout(2000, function () { try { r.abort(); } catch (err) {} }); } catch (err) { again(); }
    }
  });
  server.listen(PORT, '127.0.0.1', function () {
    log('service ' + VERSION + ' on ' + PORT + (REF ? ' (' + String(REF).slice(0, 7) + ')' : ''));
    // pre-carico l'elenco dello Smart Hub (se la TV deve chiedere "Consenti", succede ora e non al primo uso del launcher)
    if (hasTizen() || process.env.MH_TV_PORT) setTimeout(function () { hubDirList(); hubList(function () {}); }, 1500);
    // scaldo la cache degli sfondi (uno alla volta), così il launcher li trova anche quando jsDelivr non risponde
    setTimeout(function () { var names = Object.keys(ASSETS); (function next() { if (!names.length) return; asset(names.shift(), function () { setTimeout(next, 500); }); })(); }, 4000);
  });
})();
