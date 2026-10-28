/* Milano Home — servizio Node eseguito da TizenBrew (gira con i privilegi dell'app: può leggere le app installate,
   le loro icone e avviarle). Espone un piccolo HTTP server locale usato dalla pagina del launcher. ES5 per Node vecchi.
   Il cambio sorgente HDMI, Home e lo spegnimento usano l'API telecomando Samsung sulla porta 8001
   (al primo uso la TV chiede "Consenti"). Gli endpoint che agiscono sulla TV accettano solo richieste dalla pagina di TizenBrew. */
(function () {
  'use strict';
  var VERSION = '1.3.2';
  var http = require('http');
  var fs = require('fs');
  var crypto = require('crypto');
  var PORT = 8095;
  var PAGE_ORIGIN = 'http://127.0.0.1:8081';
  var ICON_DIRS = ['/opt/usr/', '/usr/apps/', '/opt/apps/', '/opt/share/', '/usr/share/'];
  var B = (Buffer.alloc && Buffer.from && Buffer.from !== Uint8Array.from) ? Buffer : {
    from: function (s, e) { return new Buffer(s, e); },
    alloc: function (n) { var b = new Buffer(n); b.fill(0); return b; }
  };
  var sockets = [];

  function json(res, code, obj) {
    res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Connection': 'close' });
    res.end(JSON.stringify(obj));
  }
  function dec(x) { try { return decodeURIComponent(x); } catch (e) { return ''; } }
  function qs(url) { var o = {}, i = url.indexOf('?'); if (i < 0) return o;
    url.slice(i + 1).split('&').forEach(function (p) { var kv = p.split('='); o[dec(kv[0])] = dec((kv[1] || '').replace(/\+/g, ' ')); }); return o; }
  function hasTizen() { return typeof tizen !== 'undefined' && tizen.application; }
  function fromPage(req) {
    var o = req.headers.origin || '', r = req.headers.referer || '';
    if (o) return o === PAGE_ORIGIN;
    if (r) return r.indexOf(PAGE_ORIGIN + '/') === 0;
    return false;
  }

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

  /* --- mini client WebSocket (solo testo, frame mascherati) per l'API telecomando Samsung --- */
  function wsFrame(text) {
    var payload = B.from(text, 'utf8'), len = payload.length, mask = crypto.randomBytes(4), head;
    if (len < 126) { head = B.alloc(2); head[1] = 0x80 | len; }
    else { head = B.alloc(4); head[1] = 0x80 | 126; head.writeUInt16BE(len, 2); }
    head[0] = 0x81;
    var masked = B.alloc(len); for (var i = 0; i < len; i++) masked[i] = payload[i] ^ mask[i % 4];
    return Buffer.concat([head, mask, masked]);
  }
  function sendRemoteKey(key, cb) {
    var name = B.from('Milano Home', 'utf8').toString('base64');
    var req = http.request({ host: '127.0.0.1', port: 8001, path: '/api/v2/channels/samsung.remote.control?name=' + name, method: 'GET',
      headers: { 'Connection': 'Upgrade', 'Upgrade': 'websocket', 'Sec-WebSocket-Version': '13', 'Sec-WebSocket-Key': crypto.randomBytes(16).toString('base64') } });
    var done = false, sock = null;
    function finish(err) { if (done) return; done = true; clearTimeout(timer); if (sock) { try { sock.end(); } catch (e) {} } cb(err || null); }
    var timer = setTimeout(function () { finish('nessuna conferma dalla TV: premi "Consenti" sull\'avviso e riprova'); }, 30000);
    req.on('upgrade', function (res, socket, head) {
      sock = socket;
      var onData = function (buf) {
        var txt = buf.toString('utf8');
        if (txt.indexOf('ms.channel.connect') >= 0 && !done) {
          socket.write(wsFrame(JSON.stringify({ method: 'ms.remote.control', params: { Cmd: 'Click', DataOfCmd: key, Option: 'false', TypeOfRemote: 'SendRemoteKey' } })));
          setTimeout(function () { finish(null); }, 400);
        } else if (txt.indexOf('ms.channel.unauthorized') >= 0) { finish('comando rifiutato: consenti "Milano Home" nella TV (Impostazioni → Generale → Gestione dispositivi esterni)'); }
      };
      socket.on('data', onData);
      socket.on('error', function (e) { finish(e.message); });
      socket.on('close', function () { finish('connessione chiusa dalla TV'); });
      if (head && head.length) onData(head);
    });
    req.on('response', function (r) { r.resume(); finish('API telecomando non disponibile (HTTP ' + r.statusCode + ')'); });
    req.on('error', function (e) { finish(e.message); });
    req.setTimeout(31000, function () { try { req.abort(); } catch (e) {} finish('timeout'); });
    req.end();
  }

  var server = http.createServer(function (req, res) {
    var url = req.url || '/', q = qs(url), path = url.split('?')[0];
    if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }); return res.end(); }
    if (path === '/ping') return json(res, 200, { ok: true, tizen: hasTizen(), node: process.version, v: VERSION });
    if (path === '/apps') return listApps(function (err, apps) { if (err) return json(res, 500, { error: err }); json(res, 200, { apps: apps }); });
    if (path === '/icon') {
      var p = q.path || '', okDir = ICON_DIRS.some(function (d) { return p.indexOf(d) === 0; });
      if (!p || p.indexOf('..') >= 0 || !okDir || !/\.(png|jpe?g|svg|webp|gif)$/i.test(p)) return json(res, 400, { error: 'bad path' });
      fs.readFile(p, function (err, data) {
        if (err) return json(res, 404, { error: err.message });
        var ext = p.split('.').pop().toLowerCase(), ct = ext === 'png' ? 'image/png' : (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg' : ext === 'svg' ? 'image/svg+xml' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': ct, 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'max-age=86400' });
        res.end(data);
      });
      return;
    }
    // da qui in poi: azioni sulla TV, solo dalla pagina del launcher (o, per /shutdown, dal servizio stesso)
    if (path === '/shutdown') {
      if (req.headers.origin || req.headers.referer) return json(res, 403, { error: 'forbidden' });
      json(res, 200, { bye: true });
      setTimeout(function () { try { server.close(); } catch (e) {} sockets.forEach(function (s) { try { s.destroy(); } catch (e) {} }); }, 50);
      return;
    }
    if (!fromPage(req)) return json(res, 403, { error: 'forbidden' });
    if (path === '/launch') {
      if (!hasTizen()) return json(res, 500, { error: 'no tizen' });
      if (!q.id) return json(res, 400, { error: 'id?' });
      try { tizen.application.launch(q.id, function () { json(res, 200, { ok: true }); }, function (e) { json(res, 500, { error: e && e.message ? e.message : 'launch failed' }); }); }
      catch (e) { json(res, 500, { error: e.message }); }
      return;
    }
    if (path === '/key') { var k = (q.key || '').replace(/[^A-Z0-9_]/g, ''); if (!k) return json(res, 400, { error: 'key?' });
      return sendRemoteKey(k, function (err) { if (err) return json(res, 500, { error: err }); json(res, 200, { ok: true }); }); }
    json(res, 404, { error: 'not found' });
  });
  server.on('connection', function (s) { sockets.push(s); s.on('close', function () { var i = sockets.indexOf(s); if (i >= 0) sockets.splice(i, 1); }); });
  var attempts = 0;
  server.on('error', function (e) {
    console.log('MilanoHome service error: ' + e.message);
    if (e.code === 'EADDRINUSE' && attempts < 6) { attempts++;
      // una versione precedente del servizio occupa la porta: le chiedo di chiudersi e riprovo (fino a 6 volte)
      var again = function () { setTimeout(function () { server.listen(PORT, '127.0.0.1'); }, 1000); };
      try { var r = http.get({ host: '127.0.0.1', port: PORT, path: '/shutdown' }, function (res) { res.resume(); again(); });
        r.on('error', again); r.setTimeout(2000, function () { try { r.abort(); } catch (err) {} }); } catch (err) { again(); }
    }
  });
  server.listen(PORT, '127.0.0.1', function () { console.log('MilanoHome service ' + VERSION + ' on ' + PORT); });
})();
