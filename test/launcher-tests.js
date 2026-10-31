/* Collaudo del launcher in Chromium (Playwright): bootstrap index.html via il proxy TizenBrew finto, cache in localStorage, avvio senza
   rete, aggiornamento del launcher e del servizio, telecomando (riga, griglia, menu, diagnostica), icone, nessun errore di console.
   Richiede: node test/fake-net.js e node test/fake-tv.js ok avviati da qui, servizio nella sandbox, Playwright con Chromium.
   Uso: node test/launcher-tests.js [cartella-screenshot]  (esce con 1 se qualcosa fallisce) */
'use strict';
const cp = require('child_process'), fs = require('fs'), path = require('path'), os = require('os'), http = require('http');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');
const NET = 'http://127.0.0.1:18090', TV = 'http://127.0.0.1:18001', SVC = 'http://127.0.0.1:8095';
const MODULE = 'http://127.0.0.1:8081/module/' + encodeURIComponent('gh/apiazza75/samsung-tizen-home') + '/app/index.html';
const SHA1 = '1111111111111111111111111111111111111111', SHA2 = '2222222222222222222222222222222222222222';
const SHOTS = process.argv[2] || path.join(os.tmpdir(), 'mh-shots'); fs.mkdirSync(SHOTS, { recursive: true });
let pass = 0, fail = 0; const failures = [];
function ok(cond, what, extra) { if (cond) { pass++; console.log('  PASS ' + what); } else { fail++; failures.push(what); console.log('  FAIL ' + what + (extra !== undefined ? '  →  ' + JSON.stringify(extra).slice(0, 400) : '')); } }
const sleep = ms => new Promise(r => setTimeout(r, ms));
function get(url, headers) { return new Promise(resolve => { const req = http.get(url, { headers: headers || {} }, res => { let b = ''; res.on('data', c => b += c); res.on('end', () => { let j = null; try { j = JSON.parse(b); } catch (e) {} resolve({ code: res.statusCode, body: b, json: j }); }); }); req.on('error', e => resolve({ code: 0, error: e.message })); req.setTimeout(15000, () => { req.destroy(); resolve({ code: 0 }); }); }); }
const children = [];
function spawn(name, args, env) { const c = cp.spawn(process.execPath, args, { env: Object.assign({}, process.env, env || {}), stdio: ['ignore', 'pipe', 'pipe'] }); c.stdout.on('data', d => { if (process.env.VERBOSE) process.stdout.write('[' + name + '] ' + d); }); c.stderr.on('data', d => process.stdout.write('[' + name + ' ERR] ' + d)); children.push(c); return c; }
async function waitPing(ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const r = await get(SVC + '/ping'); if (r.code === 200) return r.json; await sleep(250); } return null; }
const INJECT = "window.MH_CDN='" + NET + "/gh/apiazza75/samsung-tizen-home@';window.MH_API='" + NET + "/api/commits/main';";
const MODULES = [{ fullName: 'npm/@foxreis/tizentube', name: '@foxreis/tizentube', appName: 'TizenTube', appPath: 'http://127.0.0.1:8081/module/npm%2F%40foxreis%2Ftizentube/index.html', keys: [], packageType: 'mods', moduleType: 'npm', version: '1.5.2', evaluateScriptOnDocumentStart: true },
  { fullName: 'gh/apiazza75/samsung-tizen-home', name: 'apiazza75/samsung-tizen-home', appName: 'Milano Home', appPath: MODULE, keys: ['ChannelUp', 'ChannelDown'], packageType: 'app', moduleType: 'gh', version: '2.0.0' }];

function watchPage(page, errs) {
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() !== 'error') return; const t = m.text(); if (/open-meteo|net::ERR_/.test(t)) return; /* condizioni di rete simulate, non errori del codice (le eccezioni passano da pageerror) */ errs.push('console: ' + t); });
}
async function openLauncher(ctx, errs) { const page = await ctx.newPage(); watchPage(page, errs); await page.goto(MODULE); await page.waitForSelector('#row .item', { timeout: 20000 }); await sleep(1200); return page; }
const key = (page, k) => page.keyboard.press(k);
async function state(page) { return page.evaluate(() => ({ ref: window.MH_REF, source: window.MH_SOURCE, cache: (function () { try { return JSON.parse(localStorage.getItem('mh_launcher') || 'null'); } catch (e) { return null; } })(),
  items: Array.from(document.querySelectorAll('#row .item')).map(e => ({ name: e.querySelector('.nm').textContent, focus: e.classList.contains('is-focus'), svg: !!e.querySelector('.ico svg'), img: !!e.querySelector('.ico img'), txt: !!e.querySelector('.ico .txt') })),
  gridOpen: document.getElementById('all').classList.contains('show'), sections: Array.from(document.querySelectorAll('#sections .sec')).map(s => ({ title: s.querySelector('.sh').textContent.trim(), n: s.querySelectorAll('.card').length, focus: Array.from(s.querySelectorAll('.card')).findIndex(c => c.classList.contains('is-focus')) })),
  menu: document.getElementById('panel').classList.contains('show') ? document.getElementById('ptitle').textContent : null, debug: document.getElementById('debug').classList.contains('show') ? document.getElementById('debug').textContent : null,
  wall: (document.querySelector('.wall.on') || {}).style ? document.querySelector('.wall.on').style.backgroundImage : '', tint: !!document.querySelector('.tint.on'), toast: document.getElementById('toast').textContent })); }

async function main() {
  spawn('tv', [path.join(__dirname, 'fake-tv.js'), 'ok']); spawn('net', [path.join(__dirname, 'fake-net.js')]);
  await sleep(900);
  await get(NET + '/__ctl?sha=' + SHA1 + '&offline=0&inject=' + encodeURIComponent(INJECT) + '&modules=' + encodeURIComponent(JSON.stringify(MODULES)));
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'mh-pw-'));
  spawn('svc', [path.join(__dirname, 'sandbox.js'), path.join(ROOT, 'service.js')], { MH_CDN: NET + '/gh/apiazza75/samsung-tizen-home@', MH_API: NET + '/api/commits/main', MH_DATA_DIR: data, MH_TV_HOST: '127.0.0.1', MH_TV_PORT: '18001', MH_TV_PORT_TLS: '18002', MH_LAN_IP: '127.0.0.2', MH_HUB_DIR: path.join(data, 'none') });
  ok(!!(await waitPing(10000)), 'servizio attivo per il launcher'); await sleep(7000); // il servizio scalda la cache degli sfondi
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, locale: 'it-IT', timezoneId: 'Europe/Rome' });
  const errs = [];

  console.log('\n[P1] prima apertura: bootstrap scarica il launcher dall\'ultimo commit e lo mette in cache');
  let page = await openLauncher(ctx, errs); let s = await state(page);
  ok(s.ref === SHA1 && s.source === 'rete', 'launcher dal commit ' + SHA1.slice(0, 7) + ' via rete', { ref: s.ref, source: s.source });
  ok(s.cache && s.cache.ref === SHA1 && s.cache.html.indexOf('window.MH_ICONS') > 0 && s.cache.html.indexOf('<script src="icons.js"></script>') < 0, 'cache in localStorage con le icone incorporate', s.cache && { ref: s.cache.ref, len: s.cache.html.length });
  ok(s.items.length >= 5 && s.items.length <= 8, 'riga con ' + s.items.length + ' preferiti', s.items.map(i => i.name));
  ok(s.items.every(i => i.svg) && s.items.some(i => i.name === 'YouTube') && s.items.some(i => i.name === 'Netflix'), 'tutte le tile della riga con icona nostra (YouTube da TizenTube, Netflix…)', s.items);
  ok(s.items.filter(i => i.focus).length === 1, 'una tile a fuoco');
  ok(/wall1\.jpg/.test(s.wall) && s.wall.indexOf('/asset') < 0, 'sfondo dal commit (jsDelivr)', s.wall);
  ok(s.tint, 'tinta dello sfondo attiva');
  await page.screenshot({ path: path.join(SHOTS, 'p1-home.png') });
  await key(page, 'ArrowRight'); await sleep(400); s = await state(page); ok(s.items[1].focus, '→ sposta il fuoco');
  await key(page, 'ArrowDown'); await sleep(700); s = await state(page);
  ok(s.gridOpen && s.sections.length >= 3, '↓ apre tutte le app: ' + s.sections.map(x => x.title + ' ' + x.n).join(', '), s.sections);
  ok(s.sections.some(x => /Streaming/.test(x.title)) && s.sections.some(x => /Sorgenti/.test(x.title) && x.n === 4) && s.sections.some(x => /TV e sistema/.test(x.title) && x.n === 4), 'sezioni Streaming, Sorgenti (4 HDMI), TV e sistema (4)');
  ok(s.sections.some(x => x.focus >= 0), 'fuoco nella griglia sull\'app selezionata');
  await page.screenshot({ path: path.join(SHOTS, 'p1-grid.png') });
  await key(page, 'ArrowDown'); await key(page, 'ArrowDown'); await key(page, 'ArrowRight'); await sleep(500); s = await state(page);
  ok(s.gridOpen && s.sections.filter(x => x.focus >= 0).length === 1, 'navigazione a 4 direzioni nella griglia', s.sections);
  await page.screenshot({ path: path.join(SHOTS, 'p1-grid-nav.png') });
  await key(page, 'Escape'); await sleep(600); s = await state(page); ok(!s.gridOpen, 'Indietro chiude la griglia');
  await key(page, 'ArrowUp'); await sleep(400); s = await state(page); ok(s.menu === 'Milano Home 2.0.0', '↑ apre il menu', s.menu);
  await page.screenshot({ path: path.join(SHOTS, 'p1-menu.png') });
  for (let i = 0; i < 6; i++) await key(page, 'ArrowDown');
  await key(page, 'Enter'); await sleep(800); s = await state(page);
  ok(s.debug && /commit 1111111 da rete/.test(s.debug) && /servizio: ok v2\.0\.0 commit 1111111/.test(s.debug) && /Smart Hub: 6 app dal canale/.test(s.debug) && /canale ok su 127\.0\.0\.2:8002/.test(s.debug), 'Diagnostica: commit, servizio, Smart Hub, canale', s.debug && s.debug.slice(0, 600));
  await page.screenshot({ path: path.join(SHOTS, 'p1-diag.png') });
  await key(page, 'Escape'); await sleep(6000); // il controllo aggiornamenti parte dopo 4 s
  await key(page, 'ArrowUp'); for (let i = 0; i < 6; i++) await key(page, 'ArrowDown'); await key(page, 'Enter'); await sleep(800); s = await state(page);
  ok(s.debug && /aggiornamento: launcher allineato \(1111111\) · servizio: allineato/.test(s.debug), 'controllo aggiornamenti: launcher e servizio allineati', s.debug && s.debug.split('\n')[1]);
  await key(page, 'Escape'); await sleep(300);
  ok(errs.length === 0, 'nessun errore di console o di pagina', errs);
  await page.close();

  console.log('\n[P2] seconda apertura con GitHub e jsDelivr irraggiungibili: il launcher parte dalla cache, gli sfondi dal servizio');
  await get(NET + '/__ctl?offline=2');
  page = await openLauncher(ctx, errs); s = await state(page);
  ok(s.ref === SHA1 && s.source === 'cache', 'launcher dalla cache', { ref: s.ref, source: s.source });
  ok(s.items.length >= 5 && s.items.every(i => i.svg), 'riga e icone presenti senza rete');
  await sleep(1500); s = await state(page);
  ok(/8095\/asset\?name=wall1\.jpg/.test(s.wall), 'sfondo dalla cache su disco del servizio', s.wall);
  await page.screenshot({ path: path.join(SHOTS, 'p2-offline.png') });
  await sleep(5500); s = await state(page);
  await key(page, 'ArrowUp'); for (let i = 0; i < 6; i++) await key(page, 'ArrowDown'); await key(page, 'Enter'); await sleep(800); s = await state(page);
  ok(s.debug && /aggiornamento: errore/.test(s.debug) && /da cache/.test(s.debug), 'Diagnostica senza rete: errore di aggiornamento riportato, launcher da cache', s.debug && s.debug.slice(0, 400));
  ok(errs.length === 0, 'nessun errore di pagina senza rete', errs);
  await page.close();

  console.log('\n[P3] main avanza: il launcher scarica il nuovo (per la prossima apertura) e aggiorna subito il servizio');
  const over = fs.mkdtempSync(path.join(os.tmpdir(), 'mh-over-')); fs.mkdirSync(path.join(over, 'app'));
  fs.writeFileSync(path.join(over, 'app', 'launcher.html'), fs.readFileSync(path.join(ROOT, 'app', 'launcher.html'), 'utf8').replace("var VERSION='2.0.0';", "var VERSION='2.0.0-next';"));
  await get(NET + '/__ctl?offline=0&sha=' + SHA2 + '&override=' + encodeURIComponent(SHA2 + ':' + over));
  page = await openLauncher(ctx, errs); s = await state(page);
  ok(s.ref === SHA1 && s.source === 'cache', 'apertura ancora dalla cache vecchia');
  let t0 = Date.now(); let st2 = null;
  while (Date.now() - t0 < 25000) { st2 = await state(page); if (st2.cache && st2.cache.ref === SHA2) break; await sleep(500); }
  ok(st2.cache && st2.cache.ref === SHA2 && st2.cache.html.indexOf("VERSION='2.0.0-next'") > 0, 'nuovo launcher scaricato in cache (' + (Date.now() - t0) + ' ms)', st2.cache && st2.cache.ref);
  ok(/Aggiornamento scaricato|Servizio aggiornato a 2222222 · launcher nuovo/.test(st2.toast), 'avviso mostrato: ' + st2.toast);
  t0 = Date.now(); let pg = null; while (Date.now() - t0 < 20000) { pg = (await get(SVC + '/ping')).json; if (pg && pg.ref === SHA2) break; await sleep(500); }
  ok(pg && pg.ref === SHA2, 'servizio aggiornato a ' + SHA2.slice(0, 7) + ' su richiesta del launcher', pg && pg.ref);
  await page.close();
  page = await openLauncher(ctx, errs); s = await state(page);
  ok(s.ref === SHA2 && s.source === 'cache', 'apertura successiva: launcher nuovo dalla cache');
  await key(page, 'ArrowUp'); await sleep(300); s = await state(page); ok(s.menu === 'Milano Home 2.0.0-next', 'versione nuova in uso', s.menu);
  await key(page, 'Escape'); await sleep(300);
  ok(errs.length === 0, 'nessun errore di pagina durante l\'aggiornamento', errs);
  await page.close();

  console.log('\n[P4] prima installazione senza rete: il bootstrap ritenta e parte quando la rete torna');
  const ctx2 = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  await get(NET + '/__ctl?offline=2');   // il proxy di TizenBrew consegna index.html, GitHub e jsDelivr non rispondono
  page = await ctx2.newPage(); watchPage(page, errs);
  await page.goto(MODULE); await sleep(4000); let boot = await page.evaluate(() => document.getElementById('boot') ? document.getElementById('boot').textContent : 'launcher');
  ok(/rete non disponibile/.test(boot) || boot === 'launcher', 'stato mostrato: ' + boot);
  await get(NET + '/__ctl?offline=0'); await page.waitForSelector('#row .item', { timeout: 40000 }); s = await state(page);
  ok(s.source === 'rete' && s.items.length >= 5, 'launcher partito da solo al ritorno della rete');
  await page.close(); await ctx2.close();

  console.log('\n[P5] anteprima locale (file://): modalità demo con icone, nessun errore');
  const ctx3 = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  page = await ctx3.newPage(); const errs3 = []; watchPage(page, errs3);
  await page.goto('file://' + path.join(ROOT, 'app', 'launcher.html')); await page.waitForSelector('#row .item', { timeout: 15000 }); await sleep(1000); s = await state(page);
  ok(s.items.length === 6 && s.items.every(i => i.svg), 'demo: 6 preferiti con icona', s.items.map(i => i.name));
  await key(page, 'ArrowDown'); await sleep(600); s = await state(page); ok(s.gridOpen && s.sections.length >= 4, 'demo: griglia con sezioni', s.sections);
  ok(errs3.length === 0, 'demo senza errori', errs3);
  await page.screenshot({ path: path.join(SHOTS, 'p5-demo-grid.png') });
  await page.close(); await ctx3.close();

  await browser.close();
  console.log('\nRisultato: ' + pass + ' verifiche superate, ' + fail + ' fallite' + (fail ? '\n - ' + failures.join('\n - ') : '') + '\nScreenshot in ' + SHOTS);
  await get(SVC + '/shutdown'); children.forEach(c => { try { c.kill('SIGTERM'); } catch (e) {} });
  process.exit(fail ? 1 : 0);
}
main().catch(async e => { console.log('ERRORE del collaudo: ' + e.stack); try { await get(SVC + '/shutdown'); } catch (x) {} children.forEach(c => { try { c.kill('SIGTERM'); } catch (x) {} }); process.exit(2); });
