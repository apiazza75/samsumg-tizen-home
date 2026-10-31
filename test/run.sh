#!/usr/bin/env bash
# Collaudo completo di Milano Home, da eseguire prima di ogni merge su main:
#   1) sintassi ES5 di tutti i file (servizio: Node vecchi della TV; pagina: Chromium 76 di Tizen 6), con acorn;
#   2) servizio nella replica della sandbox di TizenBrew contro TV finta e rete finta (test/service-tests.js);
#   3) launcher in Chromium via Playwright: bootstrap, cache, aggiornamento, telecomando, icone (test/launcher-tests.js).
# Requisiti: Node >= 18, openssl, Playwright con Chromium (npm i -D playwright && npx playwright install chromium), acorn (npm i -D acorn).
# Variabili: MH_NODE=<node vecchio> per far girare il servizio con la versione di Node della TV (12.x); SHOTS=<cartella> per gli screenshot.
set -euo pipefail
cd "$(dirname "$0")/.."
# acorn e playwright possono stare in node_modules del repo o in un NODE_PATH esterno (ACORN_PATH=<cartella node_modules> aggiunge quella cartella)
export NODE_PATH="${NODE_PATH:-}${ACORN_PATH:+:$ACORN_PATH}:$(npm root -g 2>/dev/null || true)"
echo "== 1) sintassi ES5"
node -e '
const acorn = require("acorn"), fs = require("fs");
const scripts = h => { const o = []; const re = /<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi; let m; while ((m = re.exec(h))) o.push(m[1]); return o; };
const files = { "service.js": [fs.readFileSync("service.js", "utf8")], "service-core.js": [fs.readFileSync("service-core.js", "utf8")], "app/icons.js": [fs.readFileSync("app/icons.js", "utf8")],
  "app/index.html": scripts(fs.readFileSync("app/index.html", "utf8")), "app/launcher.html": scripts(fs.readFileSync("app/launcher.html", "utf8")) };
let bad = 0; for (const [n, list] of Object.entries(files)) list.forEach((s, i) => { try { acorn.parse(s, { ecmaVersion: 5 }); console.log("  ok  " + n + (list.length > 1 ? " #" + i : "")); } catch (e) { bad++; console.log("  NO  " + n + ": " + e.message); } });
if (bad) process.exit(1);'
echo "== 2) servizio (sandbox TizenBrew + TV finta + rete finta)"
node test/service-tests.js
sleep 3   # le porte dei server finti del passo 2 si liberano
echo "== 3) launcher (Chromium)"
node test/launcher-tests.js "${SHOTS:-/tmp/mh-shots}"
echo "== tutto superato"
