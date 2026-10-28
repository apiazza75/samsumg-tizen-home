/* Milano Home — servizio Node eseguito da TizenBrew (gira con i privilegi dell'app: può leggere le app installate,
   le loro icone e avviarle). Espone un piccolo HTTP server locale usato dalla pagina del launcher. ES5 per Node vecchi. */
(function () {
  'use strict';
  var http = require('http');
  var fs = require('fs');
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
          out.push({ id: a.id, name: a.name, iconPath: a.iconPath || '', show: a.show !== false, packageId: a.packageId || '', categories: a.categories || [] }); }
        cb(null, out);
      }, function (e) { cb(e && e.message ? e.message : 'getAppsInfo error', null); });
    } catch (e) { cb(e.message, null); }
  }

  var server = http.createServer(function (req, res) {
    var url = req.url || '/', q = qs(url), path = url.split('?')[0];
    if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }); return res.end(); }
    if (path === '/ping') return json(res, 200, { ok: true, tizen: hasTizen(), node: process.version });
    if (path === '/apps') return listApps(function (err, apps) { if (err) return json(res, 500, { error: err }); json(res, 200, { apps: apps }); });
    if (path === '/launch') {
      if (!hasTizen()) return json(res, 500, { error: 'no tizen' });
      try { tizen.application.launch(q.id, function () { json(res, 200, { ok: true }); }, function (e) { json(res, 500, { error: e && e.message ? e.message : 'launch failed' }); }); }
      catch (e) { json(res, 500, { error: e.message }); }
      return;
    }
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
  server.on('error', function (e) { console.log('MilanoHome service error: ' + e.message); });
  server.listen(PORT, '127.0.0.1', function () { console.log('MilanoHome service on ' + PORT); });
})();
