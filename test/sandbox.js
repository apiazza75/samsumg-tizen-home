/* Replica esatta della sandbox in cui TizenBrew esegue il file di servizio di un modulo (service-nextgen/service/utils/serviceLauncher.js):
   un vm context con le proprietà di global TRANNE services, module, global, inDebug, currentClient, currentModule; più require, tizen e
   un module vuoto. Qui `tizen` è finto (elenco app, launch). Uso: node sandbox.js <file-servizio> [--old] con le variabili MH_* nell'ambiente. */
'use strict';
const vm = require('vm'), fs = require('fs'), path = require('path');
const file = process.argv[2];
const FIX = path.join(__dirname, 'fixtures');
const APPS = [
  { id: '11101200001.Netflix', name: 'Netflix', iconPath: path.join(FIX, 'app-icon.png'), packageId: '11101200001', show: true },
  { id: 'org.tizen.netflix-app', name: 'Netflix', iconPath: '', packageId: 'org.tizen.netflix-app', show: false },
  { id: '3201512006785.PrimeVideo', name: 'Prime Video', iconPath: '/nonexistent/icon.png', packageId: '3201512006785', show: true },
  { id: '111299001912.YouTube', name: 'YouTube', iconPath: '', packageId: '111299001912', show: true },
  { id: '3201901017640.DisneyPlus', name: 'Disney+', iconPath: path.join(FIX, 'app-icon.png'), packageId: '3201901017640', show: true },
  { id: 'org.tizen.browser', name: 'Internet', iconPath: '', packageId: 'org.tizen.browser', show: true },
  { id: '3201907018807.Dazn', name: 'DAZN', iconPath: '', packageId: '3201907018807', show: true },
  { id: 'Ye2g2vFfhn.Timvision', name: 'TIMVISION', iconPath: path.join(FIX, 'app-icon.png'), packageId: 'Ye2g2vFfhn', show: true },
  { id: 'GHI3a0zMSx.XboxGamePass', name: 'Xbox', iconPath: path.join(FIX, 'app-icon.png'), packageId: 'GHI3a0zMSx', show: true },
  { id: 'com.samsung.tv.gallery', name: 'Gallery', iconPath: '', packageId: 'com.samsung.tv.gallery', show: true },
  { id: 'org.tizen.tts-engine', name: '', iconPath: '', packageId: 'org.tizen.tts-engine', show: false },
  { id: 'kIciSQiYEM.Sconosciuta', name: 'App senza icona', iconPath: '', packageId: 'kIciSQiYEM', show: true }
];
const LAUNCH_LOG = process.env.MH_DATA_DIR ? path.join(process.env.MH_DATA_DIR, 'launched.json') : null;
function logLaunch(entry) { if (!LAUNCH_LOG) return; let list = []; try { list = JSON.parse(fs.readFileSync(LAUNCH_LOG, 'utf8')); } catch (e) {} list.push(Object.assign({ at: Date.now() }, entry)); fs.writeFileSync(LAUNCH_LOG, JSON.stringify(list)); }
function ApplicationControlData(key, value) { this.key = key; this.value = value; }
function ApplicationControl(operation, uri, mime, category, data) { this.operation = operation; this.uri = uri; this.mime = mime; this.category = category; this.data = data || []; }
global.tizen = {
  ApplicationControl, ApplicationControlData,
  application: {
    getAppsInfo(ok) { setTimeout(() => ok(APPS.map(a => Object.assign({}, a))), 10); },
    launch(id, ok, err) { logLaunch({ method: 'launch', id }); if (id.indexOf('fail') >= 0) return err && err(new Error('launch refused')); ok && ok(); },
    launchAppControl(ctrl, id, ok, err) { logLaunch({ method: 'appcontrol', id, operation: ctrl.operation, data: ctrl.data.map(d => ({ key: d.key, value: d.value })) }); if (process.env.MH_FAKE_NO_APPCONTROL) return err && err(new Error('NotSupportedError')); ok && ok(); },
    getCurrentApplication() { return { appInfo: { packageId: 'xvvl3S1bvH' } }; }
  }
};
if (process.env.MH_FAKE_NO_APPCONTROL === 'ctor') { delete global.tizen.ApplicationControl; }
const sandbox = {};
Object.getOwnPropertyNames(global).forEach(prop => {
  const disAllowed = ['services', 'module', 'global', 'inDebug', 'currentClient', 'currentModule'];
  if (disAllowed.indexOf(prop) >= 0) return;
  sandbox[prop] = global[prop];
});
sandbox.require = require;
sandbox.tizen = global.tizen;
sandbox.module = { exports: {} };
const script = fs.readFileSync(file, 'utf8');
try { vm.runInContext(script, vm.createContext(sandbox)); console.log('sandbox: ' + path.basename(file) + ' avviato'); }
catch (e) { console.log('sandbox: ERRORE ' + e.stack); process.exit(2); }
process.on('SIGTERM', () => process.exit(0));
