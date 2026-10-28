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

jsDelivr tiene in cache fino a 7 giorni i file di un modulo senza versione, e la sua API di purge è solo su invito: per questo finora ogni versione andava reinstallata con un nome diverso. Dalla 1.5.0 il modulo si aggiorna da solo:

- `app/index.html` e `service.js` sono due **bootstrap stabili** che a ogni avvio chiedono a GitHub l'ultimo commit di `main` e caricano `app/launcher.html` e `service-core.js` da `cdn.jsdelivr.net/gh/apiazza75/samsung-tizen-home@<sha>/…`: un URL con lo SHA del commit è immutabile, quindi non c'è mai cache vecchia.
- Se GitHub non risponde si usa l'ultimo commit noto (salvato sulla TV) e, in mancanza, il ramo `main` (cache jsDelivr 12 ore).
- Per aggiornare basta quindi **fare il merge su `main`** e riaprire Milano Home dalla tile **TizenBrew** (o riavviare TizenBrew, così si rinnova anche il servizio). La voce *Diagnostica* del menu mostra il commit in uso.
- Per provare un ramo o un commit specifico: `…/app/index.html?ref=<sha-o-ramo>` (i rami con `/` nel nome non sono indirizzabili su jsDelivr).

I due bootstrap cambiano di rado; se un giorno dovessero cambiare, TizenBrew li rilegge entro 7 giorni oppure subito con rimozione e nuova aggiunta del modulo.

## Telecomando

← → scegli l'app · Invio apri · **↑ menu** (scegli e ordina le app, nomi HDMI, app di sistema, diagnostica) · Indietro torna a TizenBrew · Home = home Samsung.

Due tile di servizio evitano di uscire dal launcher: **TizenBrew** riporta alla pagina dei moduli (prima fa rileggere l'elenco, così eventuali aggiornamenti dei moduli vengono visti subito; da lì basta riaprire Milano Home) e **Impostazioni TV** apre il menu Samsung sopra il launcher (aggiornamento software, rete, ecc.). Entrambe si possono nascondere dal menu ↑.

Il tile **Spegni** spegne la TV con Invio premuto due volte. Gli HDMI e lo spegnimento usano l'API telecomando Samsung: al primo uso la TV chiede di consentire "Milano Home".

Il launcher ricorda l'ultima app aperta, tiene in cache l'elenco delle app per partire subito, e mostra un saluto in base all'ora.

Quando esci da un'app aperta dal launcher, Milano Home torna in primo piano da sola (disattivabile dal menu). Nel menu "Scegli e ordina le app" la riga selezionata si sposta con ← → (o canale ▲▼).

## Crediti foto

Gianluca (Pexels), Mikhail Nilov (Pexels), Anastasiia Buchinskaia (Unsplash), Mahya Jahangir (Unsplash). Licenze Pexels/Unsplash.
