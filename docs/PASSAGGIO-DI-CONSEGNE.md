# Passaggio di consegne · Milano Home · 31 ottobre 2026

Progetto: launcher "Milano Home" per Samsung Tizen, modulo TizenBrew. Repository apiazza75/samsung-tizen-home.
Lingua di lavoro: italiano. L'utente vuole: prima verificare e progettare, poi implementare, poi verificare con prove eseguite,
poi consegnare UNA volta (niente fix a tentativi, niente "prova questo e vediamo"). Le modifiche vanno sempre unite su main,
non lasciate in PR. Il nome del modulo sulla TV NON deve più cambiare.

## Stato del repository
- main = 2.0.1 (71a15bd): 2.0.0 (PR #5) + Action purge con verifica (PR #6) + correzioni segnalate da Codex (PR #7).
- Storia: 8c58710 = 1.5.0 · 9e90648 = 1.5.1 · f7a8fce = 1.6.0 · 9bdfd45 = documentazione · 2.0.0 (PR #5).
- File: app/index.html e service.js (bootstrap stabili, ora con cache), app/launcher.html (launcher vero, font incorporato),
  app/icons.js (set di icone nostro, 45 app + 6 di sistema), service-core.js (servizio vero), package.json (2.0.0), README.md,
  test/ (banco di prova completo), .github/workflows/purge-jsdelivr.yml.

## Fatti verificati (non ri-discutere, sono provati)
1. TizenBrew 2.x legge da jsDelivr SOLO tre file senza versione: package.json (servizio di TizenBrew, all'avvio, una volta sola:
   se la rete manca il modulo resta "Unknown Module" finché non si apre il Module Manager), app/index.html (proxy
   127.0.0.1:8081/module/..., a ogni apertura, SENZA cache e SENZA gestione errori: se jsDelivr non risponde la pagina resta
   vuota), service.js (serviceLauncher, all'avvio del servizio). Letto nel codice sorgente di TizenBrew (service-nextgen).
2. purge.jsdelivr.net accetta la purge (stato finished, provider CF+FY) ma NON basta per gli URL senza versione: il 31/10
   dopo i merge della 2.0.x jsDelivr ha continuato per più di 5 minuti a risolvere "main" a commit vecchi, diversi tra i
   nodi (service.js alla 1.5.1, index.html alla 1.6), e ripetere la purge produce solo "throttled". I tre file che TizenBrew
   legge senza versione si rinnovano entro 12 ore (s-maxage 43200). Gli URL @sha sono invece disponibili subito. L'Action
   ora purga una volta e riporta lo stato senza insistere. Conseguenza pratica: dopo un merge che tocca i bootstrap, la TV
   può usare il bootstrap vecchio per qualche ora; non è un problema perché carica comunque launcher e core dall'ultimo
   commit (scenario S8 dei test).
3. Module Manager: scrivere apiazza75/samsung-tizen-home senza gh/.
4. Sandbox di TizenBrew: vm context con le proprietà di global TRANNE global, module, services, inDebug, currentClient,
   currentModule; `new Function(...)` esegue nel realm principale (dove esiste `tizen`). test/sandbox.js è la replica esatta.
5. La TV dell'utente: Tizen 6 (2021), Node v12.4.0 nel servizio, 439 app Tizen. Foto della Diagnostica 1.6.0 del 30/10:
   servizio ok, "Smart Hub: non disponibile (connessione chiusa dalla TV / connessione chiusa dalla TV)" = su 8001 e 8002 la
   stretta di mano WebSocket riesce (101) e poi la TV chiude senza inviare ms.channel.connect. Nell'elenco dispositivi della TV
   "Milano Home" NON compare (ci sono "device 2" e "device 3" senza dettagli, tutti consentiti); "Notifica di accesso" =
   solo la prima volta. Ipotesi principale: la TV non accetta il canale telecomando da 127.0.0.1. La 2.0.0 prova anche l'IP
   di rete della TV (os.networkInterfaces) e registra codice/motivo di chiusura: la Diagnostica 2.0.0 dirà quale combinazione
   funziona ("canale ok su <host>:<porta>") o perché no ("tentativi canale: ...").
6. Autoavvio TizenBrew (letto nel codice): avviene solo dopo il rilancio in modalità debug (ADB → CDP → CanLaunchModules
   {type:'autolaunch'}); la UI lo salta se è stato premuto ↑. Per la 2.0.5 il flusso è corretto; sulla TV dell'utente non parte:
   da chiarire versione di TizenBrew e cosa mostra. Samsung "Esecuzione automatica ultima app" richiede anche "Esecuzione
   automatica Smart Hub" attiva (fonte: community Samsung) e la TV spenta con l'app in primo piano.
7. Icone: tutte nostre (app/icons.js); Smart Hub solo come ripiego (cartella FirstScreen letta direttamente, poi canale).

## Architettura 2.0.0 (collaudata)
- index.html: launcher (con icons.js incorporato) in localStorage `mh_launcher` {ref, html}; se c'è parte subito; se no lo
  scarica (sha di main → jsDelivr@sha, altrimenti @main) con ritentativi 3/5/10/20/30 s; Invio riprova. `?ref=` bypassa.
- launcher.html: dopo 4 s controlla main; se nuovo scarica launcher+icons in cache (attivi alla prossima apertura) e chiama
  /update sul servizio; VERSION, window.MH_REF, MH_SOURCE (cache|rete), MH_CDN, MH_API. Menu ↑ → "Svuota la cache del
  launcher e ricarica" e "Riprova il collegamento con la TV" (/hubreset).
- service.js: core in /home/owner/share/milanohome-core.js (+ .json {ref}); esegue subito dalla cache; check con backoff
  2/5/10/30/60/120 s; espone MH_BOOT {update(cb), info()} al core; il core nuovo prende la porta 8095 chiedendo /shutdown
  al vecchio. Il core 2.0 funziona anche sotto il bootstrap 1.5.1 (/update → 'unsupported').
- service-core.js: /ping (v, ref, lan, boot, hub{apps,error,dir,dirError,chan,channelError,attempts}), /apps (hub da canale
  o da cartella), /hub, /hubicon, /icon, /asset?name= (sfondi/font con cache su disco, scaldata all'avvio), /update, /launch,
  /key, /hubreset, /shutdown. Canale: combinazioni [state.chan, lan:8002, lan:8001, 127.0.0.1:8002, 127.0.0.1:8001];
  si ferma su unauthorized/timeout (per non riaprire l'avviso "Consenti"). Variabili per i test: MH_TV_HOST, MH_TV_PORT,
  MH_TV_PORT_TLS, MH_LAN_IP, MH_HUB_DIR, MH_DATA_DIR, MH_CDN, MH_API.

## Collaudi (test/run.sh): tutti superati prima del merge della 2.0.0
- Sintassi ES5 (acorn) di servizio, core, icone, index e launcher.
- test/service-tests.js: 66 verifiche in 9 scenari (prima installazione; aggiornamento a caldo; avvio senza rete con cache;
  senza rete e senza cache; canale loopback chiuso/LAN ok; canale chiuso ovunque + cartella icone; unauthorized; bootstrap
  1.5.1 + core 2.0; attesa "Consenti" e riuso del token). Superati anche con Node 12.22 (MH_NODE=...).
- test/launcher-tests.js: 35 verifiche in 5 scenari (prima apertura; GitHub/jsDelivr giù con cache; main avanza → launcher
  e servizio aggiornati; prima installazione senza rete con ritorno della rete; demo file://). Screenshot 1920x1080 ispezionati.

## Sulla TV, da fare (uno alla volta, chiedendo l'esito)
1. Riavviare TizenBrew (o la TV): il servizio rinnova service.js (2.0, purgato) e scarica il core 2.0; aprire Milano Home
   due volte (la prima scarica il launcher 2.0 in cache, la seconda lo usa). In alternativa alla prima apertura: menu ↑ →
   "Svuota la cache del launcher e ricarica".
2. Diagnostica (menu ↑): attesa "commit <sha 2.0.0> da cache", "servizio: ok v2.0.0", riga "Smart Hub: ... canale ok su
   <host>:<porta>" oppure "tentativi canale: ..." con i motivi. Chiedere una foto.
3. Se il canale resta chiuso su tutte e 4 le combinazioni: le icone sono comunque nostre; restano senza funzione i tasti
   HDMI/Home/Spegni/Impostazioni. Prossima idea da verificare: launch diretto delle app di sistema per Home/Impostazioni
   (tizen.application.launch) e sorgenti HDMI come app Tizen, oppure tizen.tvwindow (privilegio non concesso a TizenBrew).
4. Avvio automatico: chiedere versione di TizenBrew e comportamento; Samsung: entrambe le "Esecuzione automatica" attive.

## Note
- jsDelivr: hash intero immutabile; purge POST https://purge.jsdelivr.net/ {"path":[...]}.
- Origine della pagina: http://127.0.0.1:8081 (document.write + <base>): isTV e fromPage valgono.
- App ID TizenBrew: xvvl3S1bvH.TizenBrewStandalone; WS 8081: GetModules=4, LaunchModule=5, ModuleAction=10.
- Vincoli: ES5 nel servizio; CSS/JS per Chromium 76. I due bootstrap vanno toccati il meno possibile (ogni modifica richiede
  purge + riavvio di TizenBrew per service.js).
