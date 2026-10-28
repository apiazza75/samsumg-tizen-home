/* Bootstrap del servizio di Milano Home (eseguito da TizenBrew, ES5 per Node vecchi).
   Scarica service-core.js dall'ultimo commit di main su jsDelivr (URL con SHA: immutabile, mai in cache vecchia) e lo esegue
   nello stesso contesto, con lo stesso require. Se GitHub non risponde si ripiega sul ramo main. Vedi app/index.html. */
(function () {
  'use strict';
  var https = require('https');
  var REPO = 'apiazza75/samsung-tizen-home';
  var CDN = process.env.MH_CDN || 'https://cdn.jsdelivr.net/gh/' + REPO + '@';
  var API = process.env.MH_API || 'https://api.github.com/repos/' + REPO + '/commits/main';
  var ua = { 'User-Agent': 'MilanoHome-service' };
  function get(url, headers, cb) {
    var done = false, fin = function (c, b) { if (done) return; done = true; cb(c, b); };
    var m = /^(https?):\/\/([^/:]+)(?::(\d+))?(\/.*)?$/.exec(url); if (!m) return fin(0, 'url');
    var mod = m[1] === 'https' ? https : require('http');
    try {
      var req = mod.get({ host: m[2], port: m[3] ? +m[3] : (m[1] === 'https' ? 443 : 80), path: m[4] || '/', headers: headers }, function (res) {
        var b = ''; res.setEncoding('utf8'); res.on('data', function (c) { b += c; }); res.on('end', function () { fin(res.statusCode, b); });
      });
      req.on('error', function (e) { fin(0, String(e && e.message)); });
      req.setTimeout(10000, function () { try { req.abort(); } catch (e) {} fin(0, 'timeout'); });
    } catch (e) { fin(0, e.message); }
  }
  // TizenBrew esegue questo file in un vm context (serviceLauncher.js) dove global, exports, __filename e __dirname non esistono:
  // l'oggetto globale della sandbox si ottiene con Function('return this')(), e gli altri si passano solo se definiti.
  var G = (function () { try { return Function('return this')() || {}; } catch (e) { return {}; } })();
  var mod = typeof module !== 'undefined' ? module : { exports: {} };
  var exp = typeof exports !== 'undefined' ? exports : mod.exports;
  var fname = typeof __filename !== 'undefined' ? __filename : 'service.js', dname = typeof __dirname !== 'undefined' ? __dirname : '.';
  function run(ref, isFallback) {
    get(CDN + ref + '/service-core.js', ua, function (code, body) {
      if (code !== 200) {
        if (!isFallback && ref !== 'main') return run('main', true);
        console.log('MilanoHome boot: service-core non scaricabile (' + code + ' ' + (body || '').slice(0, 80) + ')'); return;
      }
      try { G.MH_REF = ref; (new Function('require', 'module', 'exports', '__filename', '__dirname', 'MH_REF', body))(require, mod, exp, fname, dname, ref); console.log('MilanoHome boot: core ' + ref.slice(0, 7)); }
      catch (e) { console.log('MilanoHome boot: errore nel core: ' + e.message); }
    });
  }
  get(API, { 'User-Agent': 'MilanoHome-service', 'Accept': 'application/vnd.github.sha' }, function (code, body) {
    var sha = (body || '').trim();
    run(code === 200 && /^[0-9a-f]{40}$/.test(sha) ? sha : 'main', code !== 200);
  });
})();
