/* Milano Home — servizio Node eseguito da TizenBrew (gira con i privilegi dell'app: può leggere le app installate,
   le loro icone e avviarle). Espone un piccolo HTTP server locale usato dalla pagina del launcher. ES5 per Node vecchi.
   Il cambio sorgente HDMI usa l'API telecomando Samsung sulla porta 8001 (al primo uso la TV chiede "Consenti"). */
(function () {
  'use strict';
  var http = require('http');
  var fs = require('fs');
  var crypto = require('crypto');
  var PORT = 8095;

  function json(res, code, obj) {
    res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(obj));
  }
  function qs(url) { var o = {}, i = url.indexOf('?'); if (i < 0) return o;
    url.slice(i + 1).split('&').forEach(function (p) { var kv = p.split('='); o[decodeURIComponent(kv[0])] = decodeURIComponent((kv[1] || '').replace(/\+/g, ' ')); }); return o; }
  function hasTizen() { return typeof tizen !== 'undefined' && tizen.application; }

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
    var payload = Buffer.from(text, 'utf8'), len = payload.length, mask = crypto.randomBytes(4), head;
    if (len < 126) { head = Buffer.alloc(2); head[1] = 0x80 | len; }
    else { head = Buffer.alloc(4); head[1] = 0x80 | 126; head.writeUInt16BE(len, 2); }
    head[0] = 0x81;
    var masked = Buffer.alloc(len); for (var i = 0; i < len; i++) masked[i] = payload[i] ^ mask[i % 4];
    return Buffer.concat([head, mask, masked]);
  }
  function sendRemoteKey(key, cb) {
    var name = Buffer.from('Milano Home').toString('base64');
    var req = http.request({ host: '127.0.0.1', port: 8001, path: '/api/v2/channels/samsung.remote.control?name=' + name, method: 'GET',
      headers: { 'Connection': 'Upgrade', 'Upgrade': 'websocket', 'Sec-WebSocket-Version': '13', 'Sec-WebSocket-Key': crypto.randomBytes(16).toString('base64') } });
    var done = false, timer = setTimeout(function () { if (!done) { done = true; cb('timeout: conferma "Consenti" sulla TV'); } }, 30000);
    req.on('upgrade', function (res, socket) {
      socket.on('data', function (buf) {
        var txt = buf.toString('utf8');
        if (txt.indexOf('ms.channel.connect') >= 0 && !done) {
          socket.write(wsFrame(JSON.stringify({ method: 'ms.remote.control', params: { Cmd: 'Click', DataOfCmd: key, Option: 'false', TypeOfRemote: 'SendRemoteKey' } })));
          setTimeout(function () { done = true; clearTimeout(timer); try { socket.end(); } catch (e) {} cb(null); }, 400);
        } else if (txt.indexOf('ms.channel.unauthorized') >= 0 && !done) { done = true; clearTimeout(timer); cb('non autorizzato: consenti "Milano Home" nella TV'); try { socket.end(); } catch (e) {} }
      });
      socket.on('error', function (e) { if (!done) { done = true; clearTimeout(timer); cb(e.message); } });
    });
    req.on('error', function (e) { if (!done) { done = true; clearTimeout(timer); cb(e.message); } });
    req.end();
  }

  var server = http.createServer(function (req, res) {
    var url = req.url || '/', q = qs(url), path = url.split('?')[0];
    if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }); return res.end(); }
    if (path === '/shutdown') { json(res, 200, { bye: true }); setTimeout(function () { try { server.close(); } catch (e) {} }, 50); return; }
    if (path === '/ping') return json(res, 200, { ok: true, tizen: hasTizen(), node: process.version, v: '1.3.1' });
    if (path === '/apps') return listApps(function (err, apps) { if (err) return json(res, 500, { error: err }); json(res, 200, { apps: apps }); });
    if (path === '/launch') {
      if (!hasTizen()) return json(res, 500, { error: 'no tizen' });
      try { tizen.application.launch(q.id, function () { json(res, 200, { ok: true }); }, function (e) { json(res, 500, { error: e && e.message ? e.message : 'launch failed' }); }); }
      catch (e) { json(res, 500, { error: e.message }); }
      return;
    }
    if (path === '/key') { var k = (q.key || '').replace(/[^A-Z0-9_]/g, ''); if (!k) return json(res, 400, { error: 'key?' });
      return sendRemoteKey(k, function (err) { if (err) return json(res, 500, { error: err }); json(res, 200, { ok: true }); }); }
    if (path === '/icon') {
      var p = q.path || '';
      if (!p || p.indexOf('..') >= 0) return json(res, 400, { error: 'bad path' });
      fs.readFile(p, function (err, data) {
        if (err) return json(res, 404, { error: err.message });
        var ext = p.split('.').pop().toLowerCase(), ct = ext === 'png' ? 'image/png' : (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg' : ext === 'svg' ? 'image/svg+xml' : 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': ct, 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'max-age=86400' });
        res.end(data);
      });
      return;
    }
    json(res, 404, { error: 'not found' });
  });
  var retried = false;
  server.on('error', function (e) {
    console.log('MilanoHome service error: ' + e.message);
    if (e.code === 'EADDRINUSE' && !retried) { retried = true;
      // una versione precedente del servizio occupa la porta: le chiedo di chiudersi e riprovo
      http.get({ host: '127.0.0.1', port: PORT, path: '/shutdown' }, function () { setTimeout(function () { server.listen(PORT, '127.0.0.1'); }, 800); })
        .on('error', function () { setTimeout(function () { server.listen(PORT, '127.0.0.1'); }, 800); });
    }
  });
  server.listen(PORT, '127.0.0.1', function () { console.log('MilanoHome service ' + '1.3.1' + ' on ' + PORT); });
})();
