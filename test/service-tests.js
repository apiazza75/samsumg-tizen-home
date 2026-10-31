/* Collaudo del servizio (service.js + service-core.js) nella replica della sandbox di TizenBrew, contro la TV finta e la rete finta.
   Esegue gli scenari in sequenza e stampa PASS/FAIL per ogni verifica. Uso: node test/service-tests.js  (esce con 1 se qualcosa fallisce) */
'use strict';
const cp = require('child_process'), fs = require('fs'), path = require('path'), os = require('os'), http = require('http');
const ROOT = path.join(__dirname, '..'), FIX = path.join(__dirname, 'fixtures');
const NET = 'http://127.0.0.1:18090', TV = 'http://127.0.0.1:18001', SVC = 'http://127.0.0.1:8095', PAGE = 'http://127.0.0.1:8081';
const SHA1 = '1111111111111111111111111111111111111111', SHA2 = '2222222222222222222222222222222222222222';
let pass = 0, fail = 0; const failures = [];
function ok(cond, what, extra) { if (cond) { pass++; console.log('  PASS ' + what); } else { fail++; failures.push(what); console.log('  FAIL ' + what + (extra !== undefined ? '  →  ' + JSON.stringify(extra).slice(0, 300) : '')); } }
const sleep = ms => new Promise(r => setTimeout(r, ms));
function get(url, headers, ms) {
  return new Promise(resolve => {
    const req = http.get(url, { headers: headers || {} }, res => { const parts = []; res.on('data', c => parts.push(c)); res.on('end', () => { const buf = Buffer.concat(parts); let j = null; try { j = JSON.parse(buf.toString('utf8')); } catch (e) {} resolve({ code: res.statusCode, buf, json: j, type: res.headers['content-type'] }); }); });
    req.on('error', e => resolve({ code: 0, error: e.message })); req.setTimeout(ms || 15000, () => { req.destroy(); resolve({ code: 0, error: 'timeout' }); });
  });
}
const ctlNet = q => get(NET + '/__ctl?' + q), ctlTv = q => get(TV + '/__ctl?' + q);
const fromPage = { Origin: PAGE };
async function waitPing(ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const r = await get(SVC + '/ping', {}, 1500); if (r.code === 200) return r.json; await sleep(250); } return null; }
async function waitPortFree(ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const r = await get(SVC + '/ping', {}, 800); if (r.code !== 200) return true; await sleep(200); } return false; }

/* processi */
const children = [];
function spawn(name, args, env) { const c = cp.spawn(process.execPath, args, { env: Object.assign({}, process.env, env || {}), stdio: ['ignore', 'pipe', 'pipe'] }); c.name = name; c.log = '';
  c.stdout.on('data', d => { c.log += d; if (process.env.VERBOSE) process.stdout.write('[' + name + '] ' + d); }); c.stderr.on('data', d => { c.log += d; process.stdout.write('[' + name + ' ERR] ' + d); }); children.push(c); return c; }
function kill(c) { if (!c || c.killed) return; try { c.kill('SIGTERM'); } catch (e) {} }
async function stopService(c) { await get(SVC + '/shutdown', {}, 2000); kill(c); await waitPortFree(5000); }
let svc = null;
function baseEnv(dataDir, extra) { return Object.assign({ MH_CDN: NET + '/gh/apiazza75/samsung-tizen-home@', MH_API: NET + '/api/commits/main', MH_DATA_DIR: dataDir, MH_TV_HOST: '127.0.0.1', MH_TV_PORT: '18001', MH_TV_PORT_TLS: '18002', MH_LAN_IP: '127.0.0.2', MH_HUB_DIR: path.join(dataDir, 'no-such-dir') }, extra || {}); }
function tmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'mh-test-')); }
const NODE = process.env.MH_NODE || process.execPath;   // MH_NODE=<percorso di un node vecchio> per provare il servizio con la versione della TV
function startService(dataDir, extra, file) { svc = cp.spawn(NODE, [path.join(__dirname, 'sandbox.js'), file || path.join(ROOT, 'service.js')], { env: Object.assign({}, process.env, baseEnv(dataDir, extra)), stdio: ['ignore', 'pipe', 'pipe'] });
  svc.name = 'svc'; svc.log = ''; svc.stdout.on('data', d => { svc.log += d; if (process.env.VERBOSE) process.stdout.write('[svc] ' + d); }); svc.stderr.on('data', d => { svc.log += d; process.stdout.write('[svc ERR] ' + d); }); children.push(svc); return svc; }

async function main() {
  const tv = spawn('tv', [path.join(__dirname, 'fake-tv.js'), 'tlsonly']);
  const net = spawn('net', [path.join(__dirname, 'fake-net.js')]);
  await sleep(900);
  ok((await get(TV + '/api/v2/')).code === 200, 'TV finta attiva');
  ok((await get(NET + '/api/commits/main')).code === 200, 'rete finta attiva');
  await ctlNet('sha=' + SHA1 + '&offline=0');

  console.log('\n[S1] prima installazione: rete ok, TV con sola 8002 (8001 chiusa dopo la stretta di mano)');
  let data = tmpDir(); startService(data);
  let p = await waitPing(8000);
  ok(!!p, 'servizio risponde a /ping', svc.log);
  if (p) {
    ok(p.v === '2.0.1', 'versione 2.0.0', p.v);
    ok(p.ref === SHA1, 'core dal commit di main (' + SHA1.slice(0, 7) + ')', p.ref);
    ok(p.boot && p.boot.source === 'rete', 'avviato dalla rete', p.boot);
    ok(p.lan === '127.0.0.2', 'IP di rete rilevato', p.lan);
    ok(fs.existsSync(path.join(data, 'milanohome-core.js')) && JSON.parse(fs.readFileSync(path.join(data, 'milanohome-core.json'), 'utf8')).ref === SHA1, 'core salvato su disco con il commit');
    ok(p.tizen === true && /^v\d+/.test(p.node), 'tizen visibile nella sandbox, node ' + p.node);
  }
  let apps = await get(SVC + '/apps', {}, 20000);
  ok(apps.code === 200 && apps.json && Array.isArray(apps.json.apps), '/apps risponde', apps.json);
  if (apps.json && apps.json.apps) {
    const byId = {}; apps.json.apps.forEach(a => { byId[a.id] = a; });
    ok(apps.json.hub === 6 && !apps.json.hubError, 'elenco Smart Hub dal canale: 6 app', { hub: apps.json.hub, err: apps.json.hubError });
    ok(byId['11101200001.Netflix'].hub === '11101200001', 'Netflix abbinata per pacchetto', byId['11101200001.Netflix']);
    ok(byId['org.tizen.browser'].hub === 'org.tizen.browser', 'Internet abbinata per id esatto');
    ok(byId['111299001912.YouTube'].hub === '111299001912' && byId['111299001912.YouTube'].hubName === 'YouTube', 'YouTube abbinata con nome Smart Hub');
    ok(!byId['kIciSQiYEM.Sconosciuta'].hub, 'app sconosciuta senza abbinamento');
    ok(byId['11101200001.Netflix'].iconOk === true && byId['3201512006785.PrimeVideo'].iconOk === false, 'iconOk calcolato sui file');
  }
  p = await get(SVC + '/ping'); p = p.json;
  ok(p.hub.apps === 6 && p.hub.chan && p.hub.chan.tls === true, 'canale ricordato: TLS', p.hub.chan);
  ok(Array.isArray(p.hub.attempts) && p.hub.attempts.length === 1 && p.hub.attempts[0].result === 'ok' && p.hub.attempts[0].port === 18002 && p.hub.attempts[0].host === '127.0.0.2', 'primo tentativo: IP di rete, 8002, ok', p.hub.attempts);
  let st = JSON.parse(fs.readFileSync(path.join(data, 'milanohome.json'), 'utf8'));
  ok(st.token === '12345678' && st.chan && st.chan.host === '127.0.0.2', 'token e combinazione salvati su disco', st);
  let icon = await get(SVC + '/hubicon?id=11101200001', {}, 20000);
  const fixture = fs.readFileSync(path.join(FIX, 'hub-icon.png'));
  ok(icon.code === 200 && icon.type === 'image/png' && icon.buf.equals(fixture), 'icona Smart Hub via ed.apps.icon identica byte per byte (' + fixture.length + ' byte, frame a 64 bit)', { code: icon.code, len: icon.buf && icon.buf.length });
  ok(fs.existsSync(path.join(data, 'milanohome-icons', '11101200001.img')), 'icona salvata nella cache su disco');
  icon = await get(SVC + '/hubicon?id=11101200001'); ok(icon.code === 200 && icon.buf.equals(fixture), 'seconda richiesta servita dalla cache');
  let r = await get(SVC + '/hubicon?id=nessuna'); ok(r.code === 404, 'icona di un\'app non presente: 404');
  r = await get(SVC + '/key?key=KEY_HDMI1', fromPage, 20000); ok(r.code === 200 && r.json.ok, 'tasto inviato', r.json);
  let keys = (await get(TV + '/__keys')).json; ok(keys.indexOf('KEY_HDMI1') >= 0, 'la TV ha ricevuto KEY_HDMI1', keys);
  r = await get(SVC + '/key?key=KEY_HOME'); ok(r.code === 403, 'tasto senza Origin: 403');
  r = await get(SVC + '/launch?id=11101200001.Netflix&back=1', fromPage); ok(r.code === 200 && r.json.ok, 'launch app', r.json);
  r = await get(SVC + '/launch?id=x.fail', fromPage); ok(r.code === 500 && /refused/.test(r.json.error), 'launch rifiutato dalla TV riportato');
  r = await get(SVC + '/shutdown', fromPage); ok(r.code === 403, 'shutdown dalla pagina: 403');
  r = await get(SVC + '/asset?name=wall1.jpg', {}, 20000); ok(r.code === 200 && r.type === 'image/jpeg' && r.buf.equals(fs.readFileSync(path.join(ROOT, 'app', 'wall1.jpg'))), 'sfondo scaricato dal commit e identico', { code: r.code, len: r.buf && r.buf.length });
  ok(fs.existsSync(path.join(data, 'milanohome-assets', 'wall1.jpg')) && fs.readFileSync(path.join(data, 'milanohome-assets', 'wall1.jpg.ref'), 'utf8') === SHA1, 'sfondo in cache su disco con il commit');
  r = await get(SVC + '/asset?name=../etc/passwd'); ok(r.code === 400, 'asset non in elenco: 400');
  r = await get(SVC + '/update', fromPage, 30000); ok(r.code === 200 && r.json.action === 'none' && r.json.ref === SHA1, '/update senza novità: none', r.json);

  console.log('\n[S2] aggiornamento a caldo: main avanza a un commit con un core diverso');
  const over = tmpDir(); fs.mkdirSync(path.join(over, 'app'));
  fs.writeFileSync(path.join(over, 'service-core.js'), fs.readFileSync(path.join(ROOT, 'service-core.js'), 'utf8').replace("var VERSION = '2.0.1';", "var VERSION = '2.0.0-next';"));
  await ctlNet('sha=' + SHA2 + '&override=' + SHA2 + ':' + over);
  r = await get(SVC + '/update', fromPage, 30000); ok(r.code === 200 && r.json.action === 'updated' && r.json.ref === SHA2, '/update: updated → ' + SHA2.slice(0, 7), r.json);
  await sleep(2500);
  p = await waitPing(8000);
  ok(p && p.v === '2.0.0-next' && p.ref === SHA2, 'il core nuovo ha preso la porta (v ' + (p && p.v) + ')', p && { v: p.v, ref: p.ref });
  ok(p && p.boot.running === SHA2 && p.boot.cached === SHA2, 'bootstrap: in esecuzione e in cache il commit nuovo', p && p.boot);
  ok(JSON.parse(fs.readFileSync(path.join(data, 'milanohome-core.json'), 'utf8')).ref === SHA2, 'cache su disco aggiornata');
  r = await get(SVC + '/asset?name=wall1.jpg', {}, 20000); ok(r.code === 200 && fs.readFileSync(path.join(data, 'milanohome-assets', 'wall1.jpg.ref'), 'utf8') === SHA2, 'sfondo riscaricato per il commit nuovo');
  apps = await get(SVC + '/apps', {}, 20000); ok(apps.code === 200 && apps.json.hub === 6, 'dopo lo scambio il canale TV funziona ancora', apps.json && apps.json.hubError);
  await stopService(svc);

  console.log('\n[S3] avvio SENZA rete con la cache su disco (TV accesa a freddo)');
  await ctlNet('offline=1');
  startService(data);
  const t0 = Date.now(); p = await waitPing(6000);
  ok(!!p, 'servizio attivo entro ' + (Date.now() - t0) + ' ms senza rete', svc.log);
  ok(p && p.ref === SHA2 && p.v === '2.0.0-next' && p.boot.source === 'cache', 'core dalla cache su disco (' + SHA2.slice(0, 7) + ')', p && p.boot);
  await sleep(3500);
  p = (await get(SVC + '/ping')).json; ok(p.boot.lastError && /GitHub/.test(p.boot.lastError), 'errore di rete riportato nel bootstrap', p.boot);
  apps = await get(SVC + '/apps', {}, 20000); ok(apps.code === 200 && apps.json.apps.length === 12, 'le app si leggono anche senza rete');
  r = await get(SVC + '/asset?name=wall1.jpg', {}, 20000); ok(r.code === 200 && r.buf.length > 1000, 'sfondo servito dalla cache senza rete');
  await ctlNet('offline=0');
  await sleep(6000);
  p = (await get(SVC + '/ping')).json; ok(p.boot.lastSha === SHA2 && !p.boot.lastError, 'tornata la rete: controllo riuscito al ritentativo', p.boot);
  await stopService(svc);

  console.log('\n[S4] avvio senza rete e SENZA cache (prima installazione a freddo): ritenta finché la rete torna');
  data = tmpDir(); await ctlNet('offline=1'); startService(data);
  await sleep(3000); r = await get(SVC + '/ping', {}, 1000); ok(r.code !== 200, 'senza rete e senza cache non c\'è ancora servizio');
  await ctlNet('offline=0'); p = await waitPing(12000);
  ok(!!p && p.ref === SHA2, 'servizio partito da solo quando la rete è tornata', svc.log);
  await stopService(svc);

  console.log('\n[S5] canale: 127.0.0.1 chiuso dalla TV su entrambe le porte, IP di rete ok solo in chiaro');
  await ctlTv('mode=lan8001only&reset=1'); data = tmpDir(); startService(data); p = await waitPing(8000);
  apps = await get(SVC + '/apps', {}, 20000);
  ok(apps.code === 200 && apps.json.hub === 6, 'elenco Smart Hub ottenuto', apps.json && apps.json.hubError);
  p = (await get(SVC + '/ping')).json;
  ok(p.hub.chan && p.hub.chan.host === '127.0.0.2' && p.hub.chan.tls === false, 'ricordata la combinazione buona: IP di rete, 8001', p.hub.chan);
  ok(p.hub.attempts.length === 2 && /chiusa dalla TV.*codice 1001 tls-closed/.test(p.hub.attempts[0].result) && p.hub.attempts[1].result === 'ok', 'tentativi registrati con codice e motivo di chiusura', p.hub.attempts);
  await stopService(svc);

  console.log('\n[S6] canale chiuso ovunque + cartella icone Smart Hub leggibile: icone senza canale');
  await ctlTv('mode=closeall&reset=1'); data = tmpDir();
  const hubDir = path.join(data, 'FirstScreen'); fs.mkdirSync(hubDir); ['11101200001', '3201907018807', 'org.tizen.browser'].forEach(id => { fs.mkdirSync(path.join(hubDir, id)); fs.writeFileSync(path.join(hubDir, id, '250x250.png'), fixture); });
  startService(data, { MH_HUB_DIR: hubDir }); p = await waitPing(8000);
  apps = await get(SVC + '/apps', {}, 25000);
  ok(apps.code === 200 && apps.json.hub === null && /chiusa dalla TV/.test(apps.json.hubError || ''), 'canale non disponibile riportato', apps.json && { hub: apps.json.hub, err: apps.json.hubError });
  if (apps.json && apps.json.apps) { const byId = {}; apps.json.apps.forEach(a => { byId[a.id] = a; });
    ok(apps.json.hubDir === 3 && byId['11101200001.Netflix'].hub === '11101200001' && byId['3201907018807.Dazn'].hub === '3201907018807' && byId['org.tizen.browser'].hub === 'org.tizen.browser' && !byId['111299001912.YouTube'].hub, 'abbinamenti dalla cartella icone (3 su 3)', apps.json.hubDir); }
  icon = await get(SVC + '/hubicon?id=3201907018807', {}, 20000); ok(icon.code === 200 && icon.buf.equals(fixture), 'icona letta dalla cartella Smart Hub, identica');
  p = (await get(SVC + '/ping')).json;
  ok(p.hub.dir === 3 && p.hub.attempts.length === 4 && p.hub.attempts.every(a => /chiusa dalla TV.*1001/.test(a.result)), '4 tentativi (2 host × 2 porte) tutti chiusi con codice 1001', p.hub.attempts.map(a => a.host + ':' + a.port + ' ' + a.result));
  ok(/chiusa dalla TV/.test(p.hub.channelError), 'errore canale in /ping');
  r = await get(SVC + '/key?key=KEY_HOME', fromPage, 60000); ok(r.code === 500 && /chiusa dalla TV/.test(r.json.error), 'tasto con canale chiuso: errore chiaro', r.json);
  await ctlTv('mode=ok'); r = await get(SVC + '/hubreset', fromPage, 60000); ok(r.code === 200 && r.json.apps === 6 && !r.json.error, '/hubreset dopo che la TV accetta: canale ripristinato', r.json);
  await stopService(svc);

  console.log('\n[S7] rifiuto esplicito (ms.channel.unauthorized): niente cascata sulle altre porte');
  await ctlTv('mode=unauth&reset=1'); data = tmpDir(); startService(data); p = await waitPing(8000);
  apps = await get(SVC + '/apps', {}, 25000); ok(/consenti/i.test(apps.json.hubError || ''), 'messaggio che spiega cosa fare sulla TV', apps.json && apps.json.hubError);
  p = (await get(SVC + '/ping')).json; ok(p.hub.attempts.length === 1 && /unauthorized/.test(p.hub.attempts[0].result), 'un solo tentativo', p.hub.attempts);
  await stopService(svc);

  console.log('\n[S8] il bootstrap vecchio (service.js 1.5.1, ancora in cache su qualche TV) carica il core 2.0');
  const oldFile = path.join(data, 'service-old.js'); fs.writeFileSync(oldFile, cp.execSync('git show 9e90648:service.js', { cwd: ROOT }));
  await ctlTv('mode=ok&reset=1'); await ctlNet('sha=' + SHA2); startService(tmpDir(), {}, oldFile); p = await waitPing(8000);
  ok(!!p && p.v === '2.0.0-next' && p.ref === SHA2 && p.boot === null, 'core 2.0 in esecuzione sotto il bootstrap 1.5.1', p && { v: p.v, ref: p.ref, boot: p.boot });
  r = await get(SVC + '/update', fromPage); ok(r.code === 200 && r.json.action === 'unsupported' && /riavvia TizenBrew/.test(r.json.error), '/update: spiega che serve riavviare TizenBrew', r.json);
  apps = await get(SVC + '/apps', {}, 20000); ok(apps.code === 200 && apps.json.hub === 6, 'canale ok con la TV in modalità ok (8001 e 8002 entrambe aperte)');
  await stopService(svc);

  console.log('\n[S9] attesa del "Consenti" sulla TV: il servizio aspetta la conferma senza aprire altri avvisi');
  await ctlTv('mode=ok&consent=2500&reset=1'); await ctlNet('sha=' + SHA1); data = tmpDir(); startService(data); p = await waitPing(8000);
  const t1 = Date.now(); apps = await get(SVC + '/apps', {}, 25000);
  ok(apps.code === 200 && apps.json.hub === 6 && Date.now() - t1 >= 2000, 'elenco ottenuto dopo la conferma (' + (Date.now() - t1) + ' ms)', apps.json && apps.json.hubError);
  const conns = (await get(TV + '/__conns')).json; ok(conns.length === 1 && conns[0].tls && !conns[0].tokenOk, 'una sola connessione (8002, senza token: prima volta)', conns);
  await ctlTv('consent=0'); await sleep(6000); // il canale si chiude dopo 5 s di inattività; la richiesta successiva riusa il token
  r = await get(SVC + '/key?key=KEY_POWER', fromPage, 20000); ok(r.code === 200, 'tasto dopo la chiusura per inattività');
  const conns2 = (await get(TV + '/__conns')).json; ok(conns2.length === 2 && conns2[1].tokenOk, 'seconda connessione con il token salvato', conns2);
  await stopService(svc);

  console.log('\nRisultato: ' + pass + ' verifiche superate, ' + fail + ' fallite' + (fail ? '\n - ' + failures.join('\n - ') : ''));
  children.forEach(kill);
  process.exit(fail ? 1 : 0);
}
main().catch(e => { console.log('ERRORE del collaudo: ' + e.stack); children.forEach(kill); process.exit(2); });
