# Milano Home

Launcher pulito per Samsung Smart TV (Tizen), in stile liquid glass, con orologio, meteo a 3 giorni (Open-Meteo) e fotografie di Milano dall'alto.
Funziona come **modulo di TizenBrew**: nessun certificato, nessuna firma.

## Installazione (una volta sola)

1. Sulla TV apri **TizenBrew → Module Manager (tasto verde) → Aggiungi modulo GitHub** e scrivi solo `apiazza75/samsung-tizen-home`, **senza** il prefisso `gh/`: lo aggiunge TizenBrew da solo (con `gh/` davanti il modulo diventa `gh/gh/…` e compare come "Unknown Module"). Il campo salva appena ne esci.
2. Nelle impostazioni di TizenBrew (tasto blu) imposta Milano Home come modulo ad **avvio automatico**, ma solo dopo averlo aperto una volta a mano dalla home di TizenBrew.
3. Sulla TV attiva *Impostazioni → Generale → Funzioni Smart → Avvio automatico ultima app*.

Se sulla TV c'è ancora un modulo con un nome diverso (per esempio `…/samsung-tizen-home@<commit>`) o una card "Unknown Module", rimuovili prima: Module Manager → seleziona la card → conferma la rimozione.

Se TizenBrew non arriva più alla sua home (per esempio perché l'avvio automatico punta a un modulo rimosso): avvialo tenendo premuta la **freccia ↑**, che salta l'avvio automatico per quella sessione, poi disattivalo da Impostazioni → Autoavvio → Disabilita.

## Aggiornamenti: automatici

TizenBrew legge i file di un modulo da jsDelivr, che tiene in cache fino a 12 ore gli URL senza versione. Milano Home aggira il problema su due livelli, così **basta fare il merge su `main`** e il nome del modulo non cambia mai:

- `app/index.html` e `service.js` sono due **bootstrap stabili**: a ogni avvio chiedono a GitHub l'ultimo commit di `main` e caricano `app/launcher.html` e `service-core.js` da `cdn.jsdelivr.net/gh/apiazza75/samsung-tizen-home@<sha>/…`, URL immutabili e quindi mai in cache vecchia. Se GitHub non risponde si usa l'ultimo commit noto (salvato sulla TV) e, in mancanza, il ramo `main`.
- A ogni push su `main` la GitHub Action **Purge jsDelivr cache** (`.github/workflows/purge-jsdelivr.yml`) svuota la cache di jsDelivr per tutti i file del repository, sia senza versione sia `@main`: anche una modifica ai bootstrap arriva alla TV al riavvio successivo di TizenBrew.

In pratica: merge su `main` → sulla TV tile **TizenBrew** → riapri Milano Home (il launcher è già nuovo). Per rinnovare anche il servizio riavvia TizenBrew. La voce *Diagnostica* del menu ↑ mostra il commit in uso, lo stato del servizio e delle icone.

Per provare un ramo o un commit specifico: `…/app/index.html?ref=<sha-o-ramo>` (i rami con `/` nel nome non sono indirizzabili su jsDelivr).

## Icone

Le icone delle app sono quelle dello **Smart Hub**, le stesse della home Samsung: il servizio le chiede alla TV sul canale telecomando (`ed.installedApp.get` dà l'elenco con il percorso di ogni icona, `ed.apps.icon` restituisce l'immagine quando il file non è leggibile direttamente) e le tiene in cache sulla TV (`/home/owner/share/milanohome-icons`). Ogni app Tizen viene abbinata alla voce Smart Hub per id, per pacchetto o per nome; se non c'è corrispondenza si usa il file icona dell'app e, in mancanza, l'iniziale su sfondo colorato. In Diagnostica ogni app riporta `[hub <id>]` quando l'icona viene dallo Smart Hub.

Il canale telecomando usa la porta 8001; se la TV la rifiuta passa alla 8002 (TLS) e conserva il token rilasciato dalla TV, così la richiesta "Consenti Milano Home" compare una volta sola.

## Telecomando

← → scegli l'app · Invio apri · **↑ menu** (scegli e ordina le app, nomi HDMI, app di sistema, diagnostica) · Indietro torna a TizenBrew · Home = home Samsung.

Due tile di servizio evitano di uscire dal launcher: **TizenBrew** riporta alla pagina dei moduli (prima fa rileggere l'elenco, così eventuali aggiornamenti dei moduli vengono visti subito; da lì basta riaprire Milano Home) e **Impostazioni TV** apre il menu Samsung sopra il launcher (aggiornamento software, rete, ecc.). Entrambe si possono nascondere dal menu ↑.

Il tile **Spegni** spegne la TV con Invio premuto due volte. HDMI, Home, Spegni e Impostazioni TV usano l'API telecomando Samsung: al primo uso la TV chiede di consentire "Milano Home".

Il launcher ricorda l'ultima app aperta, tiene in cache l'elenco delle app per partire subito, e mostra un saluto in base all'ora.

Quando esci da un'app aperta dal launcher, Milano Home torna in primo piano da sola (disattivabile dal menu). Nel menu "Scegli e ordina le app" la riga selezionata si sposta con ← → (o canale ▲▼).

## Crediti foto

Gianluca (Pexels), Mikhail Nilov (Pexels), Anastasiia Buchinskaia (Unsplash), Mahya Jahangir (Unsplash). Licenze Pexels/Unsplash.
