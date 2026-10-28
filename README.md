# Milano Home

Launcher pulito per Samsung Smart TV (Tizen), in stile liquid glass, con orologio, meteo a 3 giorni (Open-Meteo) e fotografie di Milano dall'alto.
Funziona come **modulo di TizenBrew**: nessun certificato, nessuna firma.

## Installazione

1. Sulla TV apri **TizenBrew → Module Manager → Add module** e inserisci `gh/apiazza75/samsung-tizen-home`.
2. Nelle impostazioni di TizenBrew imposta Milano Home come modulo ad **avvio automatico**.
3. Sulla TV attiva *Impostazioni → Generale → Funzioni Smart → Avvio automatico ultima app*.

## Telecomando

← → scegli l'app · Invio apri · **↑ menu** (scegli e ordina le app, nomi HDMI, app di sistema, diagnostica) · Indietro torna a TizenBrew · Home = home Samsung.

Due tile di servizio evitano di uscire dal launcher: **TizenBrew** riporta alla pagina dei moduli (prima fa rileggere l'elenco, così eventuali aggiornamenti dei moduli vengono visti subito; da lì basta riaprire Milano Home) e **Impostazioni TV** apre il menu Samsung sopra il launcher (aggiornamento software, rete, ecc.). Entrambe si possono nascondere dal menu ↑.

Il tile **Spegni** spegne la TV con Invio premuto due volte. Gli HDMI e lo spegnimento usano l'API telecomando Samsung: al primo uso la TV chiede di consentire "Milano Home".

Il launcher ricorda l'ultima app aperta, tiene in cache l'elenco delle app per partire subito, e mostra un saluto in base all'ora.

Quando esci da un'app aperta dal launcher, Milano Home torna in primo piano da sola (disattivabile dal menu). Nel menu "Scegli e ordina le app" la riga selezionata si sposta con ← → (o canale ▲▼).

## Crediti foto

Gianluca (Pexels), Mikhail Nilov (Pexels), Anastasiia Buchinskaia (Unsplash), Mahya Jahangir (Unsplash). Licenze Pexels/Unsplash.
