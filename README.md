# Milano Home

Launcher pulito per Samsung Smart TV (Tizen), in stile liquid glass: orologio, meteo a 3 giorni (Open-Meteo), fotografie di Milano dall'alto con deriva lenta e dissolvenza, una riga di app preferite e una griglia con tutte le app per categoria.
Funziona come **modulo di TizenBrew**: nessun certificato, nessuna firma.

## Installazione (una volta sola)

1. Sulla TV apri **TizenBrew → Module Manager (tasto verde) → Aggiungi modulo GitHub** e scrivi solo `apiazza75/samsung-tizen-home`, **senza** il prefisso `gh/`: lo aggiunge TizenBrew da solo (con `gh/` davanti il modulo diventa `gh/gh/…` e compare come "Unknown Module"). Il campo salva appena ne esci.
2. Apri Milano Home una volta dalla home di TizenBrew: la prima apertura scarica il launcher e lo salva sulla TV; da lì in poi parte all'istante, anche senza rete.
3. Nelle impostazioni di TizenBrew (tasto blu) puoi impostare Milano Home come modulo ad **avvio automatico** e il suo servizio tra i **servizi ad avvio automatico**.
4. Sulla TV, per riaccenderla direttamente su Milano Home: *Impostazioni → Generale → Funzioni Smart*, attiva sia **Esecuzione automatica Smart Hub** sia **Esecuzione automatica ultima app** (Samsung richiede entrambe), poi spegni la TV con TizenBrew / Milano Home in primo piano.

Se sulla TV c'è ancora un modulo con un nome diverso o una card "Unknown Module", rimuovilo prima: Module Manager → seleziona la card → conferma la rimozione.
Se TizenBrew non arriva più alla sua home: avvialo tenendo premuta la **freccia ↑**, che salta l'avvio automatico per quella sessione, poi disattivalo da Impostazioni → Autoavvio → Disabilita.

## Telecomando

← → scegli l'app nella riga · Invio apri · **↓ tutte le app** (griglia per categoria: Streaming, Media e musica, Giochi, Sorgenti, TV e sistema, Altre app; ← → ↑ ↓ sposta, Invio apre, Indietro chiude) · **↑ menu** · canale ▲▼ salta di 5 · Indietro torna a TizenBrew.

Menu ↑: scegli e ordina le app della riga, nomi degli ingressi HDMI, app di sistema, ritorno automatico a Milano Home quando esci da un'app, ripristino dell'ordine, nuovo tentativo di collegamento con la TV, **Diagnostica**, svuotamento della cache del launcher.

Nella griglia trovi anche **TizenBrew** (torna alla pagina dei moduli), **Impostazioni TV** (menu Samsung sopra il launcher), **Home Samsung** e **Spegni** (Invio due volte). HDMI, Home, Spegni e Impostazioni TV usano l'API telecomando Samsung: al primo uso la TV chiede di consentire "Milano Home".

Il launcher ricorda l'ultima app aperta e quando l'hai aperta, tiene in cache l'elenco delle app per partire subito, e mostra un saluto in base all'ora. Quando esci da un'app aperta dal launcher, Milano Home torna in primo piano da sola (disattivabile dal menu). Per una TV fluida il launcher non usa sfocature né ombre multiple: solo trasformazioni e dissolvenze.

## Come funziona: parte senza rete, si aggiorna da solo

TizenBrew legge da jsDelivr solo tre file senza versione (`package.json`, `app/index.html`, `service.js`), e li tiene in cache a lungo. Tutto il resto lo gestiscono due **bootstrap stabili**:

- `app/index.html` tiene il launcher vero (`app/launcher.html` con `app/icons.js` incorporato) in **cache sulla TV** (localStorage): se c'è, parte subito e senza rete. Alla prima installazione lo scarica dall'ultimo commit di `main` (`cdn.jsdelivr.net/gh/apiazza75/samsung-tizen-home@<sha>/…`, URL immutabile), con ritentativi finché la rete non risponde.
- `service.js` tiene il servizio vero (`service-core.js`) in **cache su disco** (`/home/owner/share/milanohome-core.js`): se c'è, lo esegue subito e senza rete; in sottofondo controlla l'ultimo commit di `main` (con ritentativi) e, se è cambiato, scarica il core nuovo e lo esegue al posto del vecchio, senza riavviare TizenBrew.
- Il **launcher**, una volta avviato, controlla l'ultimo commit di `main`: se è nuovo scarica launcher e icone nella cache (attivi alla prossima apertura) e chiede al servizio di aggiornarsi subito (`/update`).
- A ogni push su `main` la GitHub Action **Purge jsDelivr cache** svuota la cache di jsDelivr per tutti i file. Per gli URL senza versione jsDelivr può però continuare a risolvere `main` a un commit precedente anche dopo la purge: quei tre file si rinnovano entro 12 ore. Non blocca nulla, perché anche i bootstrap vecchi caricano launcher e servizio dall'ultimo commit (URL `@<sha>`, immutabili e disponibili subito).

In pratica: **merge su `main` → riapri Milano Home due volte** (la prima scarica, la seconda usa il nuovo). La voce *Diagnostica* del menu ↑ mostra commit in uso, fonte (cache o rete), stato dell'aggiornamento, servizio, Smart Hub e i tentativi di collegamento con la TV.

Per provare un ramo o un commit specifico senza toccare la cache: `…/app/index.html?ref=<sha-o-ramo>`.

Resta una sola dipendenza dalla rete all'apertura, che non è nostra: il proxy di TizenBrew scarica `app/index.html` (3 KB) da jsDelivr a ogni apertura del modulo, e il servizio di TizenBrew legge `package.json` all'avvio. Se la rete della TV non è ancora pronta in quel momento, TizenBrew mostra una pagina vuota o "Unknown Module": aprire il Module Manager fa rileggere l'elenco.

## Icone

Le icone sono **nostre** (`app/icons.js`, SVG che replicano quelle originali, 45 app più HDMI, TizenBrew, Impostazioni, Home, Spegni), abbinate per nome o per id dell'app: aspetto uniforme e nessuna dipendenza dalla TV. Per le app non comprese si usano, in ordine, l'icona dello **Smart Hub** (la stessa della home Samsung: letta dalla cartella `/opt/share/webappservice/apps_icon/FirstScreen/<appId>/250x250.png` se leggibile, altrimenti chiesta alla TV sul canale telecomando con `ed.installedApp.get` / `ed.apps.icon`, con cache su disco in `/home/owner/share/milanohome-icons`), poi il file icona dell'app Tizen, e infine il nome dell'app su una tinta.

## Canale telecomando

Il servizio parla con la TV su `samsung.remote.control` provando in ordine l'IP di rete della TV e `127.0.0.1`, porta 8002 (TLS) e 8001, e le due versioni del canale, `/api/v2/` e `/api/v3/`: quale funzioni dipende dal firmware. Su alcuni il v2 chiude subito con codice 1005 "notack" (la richiesta di accoppiamento non viene nemmeno mostrata, oppure il token salvato non è più valido) e il v3 accetta i tasti senza accoppiamento; su altri è il contrario e il v3 risponde `ms.error` ai tasti. Il servizio ricorda la combinazione buona, dimentica un token rifiutato, scarta il canale che rifiuta i tasti e registra ogni tentativo (stretta di mano, eventi, codice e motivo di chiusura) nella Diagnostica. Se la TV rifiuta: *Impostazioni → Generale → Gestione dispositivi esterni → Gestione connessioni dispositivi*, "Notifica di accesso" attiva e "Milano Home" consentito; poi menu ↑ → "Riprova il collegamento con la TV".

Quando esci da un'app aperta dal launcher, il servizio riapre TizenBrew con un *app control* che indica il modulo Milano Home (il meccanismo con cui TizenBrew permette ad altre app di aprire un modulo), così si torna al launcher e non alla pagina dei moduli; se l'API non è disponibile ripiega sul semplice avvio di TizenBrew.

## Collaudo

`test/run.sh` esegue tutto: sintassi ES5, servizio nella replica esatta della sandbox di TizenBrew contro una TV finta (REST, WebSocket 8001 e 8002 TLS con token, icone, tasti, tutte le modalità di guasto del canale) e una rete finta (GitHub API, jsDelivr, proxy TizenBrew), launcher in Chromium con Playwright (prima apertura, cache senza rete, aggiornamento di launcher e servizio, telecomando, griglia, diagnostica, nessun errore di console). `MH_NODE=<node 12>` fa girare il servizio con la stessa versione di Node della TV.

## Vincoli

Servizio in ES5 (Node 12 sulla TV, sandbox `vm` di TizenBrew senza `global`, `exports`, `__filename`); pagina per Chromium 76 (Tizen 6): niente `gap` nei flex, `clamp`, `inset`, `aspect-ratio`. Il nome del modulo sulla TV non deve cambiare.

## Crediti foto

Gianluca (Pexels), Mikhail Nilov (Pexels), Anastasiia Buchinskaia (Unsplash), Mahya Jahangir (Unsplash). Licenze Pexels/Unsplash.
