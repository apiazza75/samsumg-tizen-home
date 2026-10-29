# Passaggio di consegne · Milano Home · 29 ottobre 2026

Progetto: launcher "Milano Home" per Samsung Tizen, modulo TizenBrew. Repository apiazza75/samsung-tizen-home.
Lingua di lavoro: italiano. L'utente vuole: prima verificare e progettare, poi implementare, poi verificare con prove eseguite,
poi consegnare UNA volta (niente fix a tentativi, niente "prova questo e vediamo"). Le modifiche vanno sempre unite su main,
non lasciate in PR. Il nome del modulo sulla TV NON deve più cambiare.

## Stato del repository
- main = f7a8fce ("1.6.0: icone Smart Hub e purge automatica di jsDelivr a ogni merge", PR #3, unita il 28/10 sera).
- Storia: 8c58710 = 1.5.0 (tile TizenBrew e Impostazioni TV; bootstrap auto-aggiornanti) · 9e90648 = 1.5.1 (fix: il servizio
  non partiva nella sandbox di TizenBrew; README col nome modulo giusto) · f7a8fce = 1.6.0.
- File: app/index.html e service.js (bootstrap stabili), app/launcher.html (launcher vero), service-core.js (servizio vero),
  package.json (1.6.0), README.md, .github/workflows/purge-jsdelivr.yml.

## Fatti verificati (non ri-discutere, sono provati)
1. TizenBrew 2.x ("Next Generation") legge da jsDelivr SOLO tre file senza versione: package.json, app/index.html (via proxy
   127.0.0.1:8081/module/...), service.js (serviceLauncher). Tutto il resto lo caricano i bootstrap dall'ultimo SHA di main
   (api.github.com -> cdn.jsdelivr.net/gh/<repo>@<sha>/..., URL immutabili, aggiornamento immediato).
2. purge.jsdelivr.net FUNZIONA per questo repo (GET singolo e POST {"path":[...]}; stato "finished", provider CF+FY). L'Action
   "Purge jsDelivr cache" gira a ogni push su main, purga tutti i file (senza versione e @main) e ha concluso con successo
   sul merge della 1.6.0 (run #1, 10 s). Dopo la purge gli URL senza versione servono subito il file nuovo.
3. Nel Module Manager di TizenBrew il campo "Aggiungi modulo GitHub" antepone da solo "gh/": va scritto
   apiazza75/samsung-tizen-home (senza gh/). Con gh/ davanti diventa gh/gh/... e compare come "Unknown Module".
   Il campo salva appena si esce, anche se il nome è sbagliato.
4. Sandbox di TizenBrew (serviceLauncher.js): vm context che copia le proprietà di global TRANNE global, module, services,
   inDebug, currentClient, currentModule. Copia anche Function del realm principale, quindi `new Function(...)` nel bootstrap
   crea codice nel realm principale (dove sulla TV esiste `tizen` come globale). exports/__filename/__dirname non esistono.
   service.js 1.5.1+ gestisce tutto questo e passa il commit al core come argomento MH_REF.
5. Icone: l'API Tizen (getAppsInfo.iconPath) non dà un'icona leggibile per Prime Video, Internet, AirPlay (icona nera) e dà
   la girandola segnaposto per YouTube. La home Samsung usa le icone dello Smart Hub, ottenibili sul canale telecomando
   (ws 127.0.0.1:8001/api/v2/channels/samsung.remote.control, oppure wss 8002 con token):
   {method:"ms.channel.emit",params:{event:"ed.installedApp.get",to:"host"}} -> data.data[] = {appId,name,icon,app_type,is_lock},
   icon = /opt/share/webappservice/apps_icon/FirstScreen/<appId>/250x250.png;
   {method:"ms.channel.emit",params:{event:"ed.apps.icon",to:"host",data:{iconPath}}} -> data.imageBase64.
   Fonti: samsung-tv-ws-api (xchwarze), PR n33miaz/uniover#160, thread Roomie Remote (QN75Q7FNA).
6. service-core.js 1.6.0: client WebSocket completo (parser frame 7/16/64 bit, maschera, frammentazione, ping/pong), canale
   condiviso con coda e chiusura dopo 5 s, 8001 poi 8002 TLS con token salvato in /home/owner/share/milanohome.json;
   /apps abbina ogni app Tizen alla voce Smart Hub (id esatto, prefisso pacchetto, nome) e aggiunge hub/hubName;
   /hubicon?id= (cache /home/owner/share/milanohome-icons, poi file, poi ed.apps.icon); /ping riporta hub{apps,error,tls,
   channelError}. Variabili per i test: MH_TV_HOST, MH_TV_PORT, MH_TV_PORT_TLS, MH_DATA_DIR, MH_CDN, MH_API.
7. launcher.html 1.6.0: iconUrl preferisce /hubicon; appIconByName (tile YouTube/TizenTube) preferisce l'app con hub;
   Diagnostica (menu ↑) mostra "commit <sha>", "servizio: ok {...}", "Smart Hub: N app, M abbinate" e [hub <id>] per app.

## Collaudi fatti (28/10) e NON fatti
- Fatti, tutti passati: parser WS con frame sintetici (8/8); servizio nella replica esatta della sandbox TizenBrew contro una
  TV finta (REST + WS): /apps 5 abbinamenti su 6, /hubicon identico byte per byte con icona da 188 KB in 251 pacchetti,
  cache disco, 403 senza Origin, tasto ricevuto; modalità TLS: 8001 chiusa -> 8002, token salvato e riusato; launcher in
  Chromium 1920x1080 con icone hub a schermo e nessun errore di console; script di purge eseguito a mano (22 path).
  ATTENZIONE: i file di test (fake-tv.js, sandbox-run.js, test-ws.js, pw-launcher.js, fixture PNG) erano nello scratchpad
  della sessione precedente e NON sono nel repository: se servono vanno ricreati (è un candidato per una cartella test/).
- NON verificabili fuori dalla TV: risposta reale di ed.installedApp.get / ed.apps.icon sul firmware della TV (Tizen 6, 2021),
  Node vecchio della TV, TLS del Node verso api.github.com, permesso "Consenti Milano Home".

## Situazione sulla TV al momento del passaggio
- Modulo installato come apiazza75/samsung-tizen-home (nome corretto), autoavvio di TizenBrew impostato e funzionante.
- Ultima foto (28/10 ore 21:52, 1.5.1): launcher ok, toast "Servizio non attivo" perché la TV aveva ancora in cache il
  service.js 1.5.0 (ora risolto con la purge). Icone mancanti: Prime Video, Internet (lettera), AirPlay (nera), YouTube
  (girandola). La TV NON apre TizenBrew da sola all'accensione: è l'impostazione Samsung "Esecuzione automatica ultima app".

## Piano dei passi sulla TV (da far fare all'utente, uno alla volta, chiedendo l'esito)
1. Riavviare TizenBrew (o spegnere/riaccendere la TV): rinnova il servizio -> service.js 1.5.1 -> core 1.6.0 da main.
2. Se compare "Consenti Milano Home" (canale telecomando), accettare. Se la TV usa la 8002, il token viene salvato.
3. Aprire Milano Home -> menu ↑ -> Diagnostica. Atteso: "commit f7a8fce" (o successivo), "servizio: ok {... v:1.6.0, hub:{apps:N, error:null}}",
   "Smart Hub: N app, M abbinate", righe app con [hub <id>]. Chiedere una foto della Diagnostica.
   - Se "Smart Hub: non disponibile (<errore>)": leggere l'errore. "comando rifiutato" = permesso negato (Impostazioni ->
     Generale -> Gestione dispositivi esterni -> Gestione connessioni dispositivi). "la TV non ha risposto" = il firmware non
     risponde a ed.installedApp.get sulla porta usata: valutare 8002 forzata o la porta 8001 con token. Non tirare a indovinare:
     prima raccogliere /ping e la Diagnostica.
4. Verificare le tile: Prime Video, Internet, AirPlay, YouTube (tile TizenTube) con icone Smart Hub. Netflix e le altre
   passano anch'esse alle icone Smart Hub (stile uniforme).
5. Avvio automatico all'accensione: Impostazioni TV -> Generale -> Funzioni Smart -> "Esecuzione automatica ultima app" ON e
   "Esecuzione automatica Smart Hub" OFF; spegnere con TizenBrew/Milano Home in primo piano.
6. Da qui in avanti ogni modifica: merge su main -> (Action purge automatica) -> tile TizenBrew -> riapri Milano Home;
   per rinnovare il servizio riavviare TizenBrew. Mai cambiare il nome del modulo.

## Note tecniche utili
- Origine della pagina: http://127.0.0.1:8081 (document.write + <base>): isTV e il controllo fromPage del servizio valgono.
- App ID TizenBrew: xvvl3S1bvH.TizenBrewStandalone; UI: file:///.../tizenbrew-ui/dist/index.html (routes /, /module-manager,
  /settings); WS 8081: GetModules=4, LaunchModule=5, ModuleAction=10; config TizenBrew: /home/owner/share/tizenbrewConfig.json.
- Vincoli: ES5 nel servizio (Node vecchio), CSS/JS per Chromium 76 (Tizen 6). I due bootstrap vanno toccati il meno possibile.
- jsDelivr: hash corto accettato ma cache 12 h; hash intero immutabile; purge POST https://purge.jsdelivr.net/ {"path":[...]},
  stato su /status/<id>.
