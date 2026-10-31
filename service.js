/* Bootstrap del servizio di Milano Home (eseguito da TizenBrew nella sua sandbox, ES5 per Node vecchi).
   Il core vero è service-core.js. Questo file è volutamente stabile: TizenBrew lo legge da jsDelivr senza versione.
   1) Se sul disco c'è una copia del core (scaricata in precedenza) la esegue SUBITO, senza rete.
   2) In sottofondo chiede a GitHub l'ultimo commit di main (con ritentativi) e, se è diverso da quello in uso, scarica il core
      da cdn.jsdelivr.net/gh/<repo>@<sha>/service-core.js (URL immutabile), lo salva su disco e lo esegue: il core nuovo
      chiede a quello vecchio di chiudersi (/shutdown) e prende la porta. Nessun riavvio di TizenBrew.
   3) Il launcher può chiedere un controllo immediato (/update): il core lo inoltra qui tramite MH_BOOT.update().
   Senza copia su disco e senza GitHub si tenta il ramo main (la cache jsDelivr viene svuotata a ogni merge). */
(function () {
  'use strict';
  var https = require('https');
  var fs = require('fs');
  var REPO = 'apiazza75/samsung-tizen-home';
  var CDN = process.env.MH_CDN || 'https://cdn.jsdelivr.net/gh/' + REPO + '@';
  var API = process.env.MH_API || 'https://api.github.com/repos/' + REPO + '/commits/main';
  var DATA_DIR = process.env.MH_DATA_DIR || '/home/owner/share';
  var CORE_FILE = DATA_DIR + '/milanohome-core.js';
  var CORE_META = DATA_DIR + '/milanohome-core.json';
  var UA = { 'User-Agent': 'MilanoHome-service' };
  var BACKOFF = [2000, 5000, 10000, 30000, 60000, 120000];
  function log(m) { console.log('MilanoHome boot: ' + m); }
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
  // l'oggetto globale si ottiene con Function('return this')() (Function è quella del realm principale, dove esiste `tizen`).
  var G = (function () { try { return Function('return this')() || {}; } catch (e) { return {}; } })();
  var mod = typeof module !== 'undefined' ? module : { exports: {} };
  var exp = typeof exports !== 'undefined' ? exports : mod.exports;
  var fname = typeof __filename !== 'undefined' ? __filename : 'service.js', dname = typeof __dirname !== 'undefined' ? __dirname : '.';

  var state = { running: null, source: null, cached: null, lastCheck: null, lastSha: null, lastError: null, checking: false, waiters: [] };
  var boot = {
    update: function (cb) { check(cb); },
    info: function () { return { running: state.running, source: state.source, cached: state.cached, lastCheck: state.lastCheck, lastSha: state.lastSha, lastError: state.lastError, checking: state.checking }; }
  };
  function exec(body, ref, source) {
    try {
      G.MH_REF = ref; G.MH_BOOT = boot;
      (new Function('require', 'module', 'exports', '__filename', '__dirname', 'MH_REF', 'MH_BOOT', body))(require, mod, exp, fname, dname, ref, boot);
      state.running = ref; state.source = source; log('core ' + ref.slice(0, 7) + ' (' + source + ')'); return true;
    } catch (e) { state.lastError = 'errore nel core ' + ref.slice(0, 7) + ': ' + e.message; log(state.lastError); return false; }
  }
  function readCache() {
    try { var meta = JSON.parse(fs.readFileSync(CORE_META, 'utf8')); var body = fs.readFileSync(CORE_FILE, 'utf8');
      if (meta && meta.ref && body.length > 1000) return { ref: meta.ref, body: body }; } catch (e) {}
    return null;
  }
  function writeCache(ref, body) {
    try { fs.writeFileSync(CORE_FILE, body); fs.writeFileSync(CORE_META, JSON.stringify({ ref: ref, at: Date.now() })); state.cached = ref; return true; }
    catch (e) { log('core non salvato: ' + e.message); return false; }
  }
  // scarica il core a `ref` e lo esegue (se non è già quello in uso); cb({ref, action, error})
  function fetchAndRun(ref, cb) {
    if (state.running === ref) return cb({ ref: ref, action: 'none' });
    get(CDN + ref + '/service-core.js', UA, function (code, body) {
      if (code !== 200 || !body || body.length < 1000) { state.lastError = 'core ' + ref.slice(0, 7) + ' non scaricabile (' + code + ')'; return cb({ ref: ref, action: 'error', error: state.lastError }); }
      if (/^[0-9a-f]{40}$/.test(ref)) writeCache(ref, body);
      cb({ ref: ref, action: exec(body, ref, 'rete') ? 'updated' : 'error', error: state.lastError });
    });
  }
  // un solo controllo alla volta: chi arriva durante un controllo riceve lo stesso risultato
  function check(cb) {
    if (cb) state.waiters.push(cb);
    if (state.checking) return;
    state.checking = true;
    function finish(r) { state.checking = false; state.lastCheck = Date.now(); var w = state.waiters; state.waiters = []; w.forEach(function (f) { try { f(r); } catch (e) {} }); }
    get(API, { 'User-Agent': UA['User-Agent'], 'Accept': 'application/vnd.github.sha' }, function (code, body) {
      var sha = (body || '').trim();
      if (code === 200 && /^[0-9a-f]{40}$/.test(sha)) { state.lastSha = sha; state.lastError = null; return fetchAndRun(sha, finish); }
      state.lastError = 'GitHub non risponde (' + code + ' ' + String(body || '').slice(0, 60) + ')';
      if (state.running) return finish({ ref: state.running, action: 'none', error: state.lastError });
      // niente in esecuzione e niente GitHub: provo il ramo main (jsDelivr viene purgato a ogni merge)
      fetchAndRun('main', finish);
    });
  }
  // all'avvio: core dalla cache subito, poi controllo aggiornamenti con ritentativi finché la rete non risponde
  var cached = readCache();
  if (cached) { state.cached = cached.ref; exec(cached.body, cached.ref, 'cache'); }
  var attempt = 0;
  function startupCheck() {
    check(function (r) {
      if (!r.error && r.action !== 'error') return;   // GitHub raggiunto e core allineato: da qui in poi gli aggiornamenti li chiede il launcher (/update)
      var wait = BACKOFF[Math.min(attempt++, BACKOFF.length - 1)];
      log('ritento tra ' + (wait / 1000) + ' s (' + (r.error || '') + ')');
      setTimeout(startupCheck, wait);
    });
  }
  setTimeout(startupCheck, cached ? 1500 : 0);
})();
