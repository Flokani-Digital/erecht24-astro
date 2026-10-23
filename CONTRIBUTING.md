# Mitentwickeln

Hinweise für alle, die am Paket `@flokani.digital/erecht24-astro` arbeiten. Die Nutzung des Pakets steht in der [README](README.md) und unter [docs/](docs/).

`vite` ist bewusst Peer-Dependency: `src/index.ts` importiert `loadEnv` direkt aus `vite`. Strikte Paketmanager wie pnpm lösen den Import sonst nicht auf; verwendet wird die von Astro installierte Version.

## Lokal entwickeln

Wir verwenden **Node.js 24 LTS**, im Projekt festgelegt auf **24.21.0**. `fnm` liest diese Version aus `.node-version`. Die globale Standardversion muss dafür nicht geändert werden.

```sh
fnm install
fnm use
npm ci
npm run dev
```

Die Demo ist unter `http://127.0.0.1:4337/` erreichbar. Sie verwendet ausschließlich künstliche Rechtstexte und benötigt keine Zugangsdaten. `Ctrl+C` beendet Astro und den lokalen API-Testserver. Die Mock-Umleitung gehört nur zum Demo- und Testprozess und wird nicht mit dem Paket ausgeliefert. Die Demo-Texte sind keine gültigen Rechtstexte.

## Befehle

| Befehl | Zweck |
|---|---|
| `npm run build` | TypeScript-Paket nach `dist/` kompilieren |
| `npm run check` | TypeScript prüfen |
| `npm test` | API-, Inhalts-, Konfigurations-, Retry- und Timeout-Tests |
| `npm run test:integration` | Paketarchiv installieren; Astro-Builds, Befehle, Umgebungsvariablen und Ausgaben prüfen |
| `npm run test:live` | Optional: echte eRecht24-API abfragen. Verwendet die öffentlichen Demo-Schlüssel aus der OpenAPI-Beschreibung, **nicht** die eigenen Schlüssel aus `.env` |
| `npm run dev` | Statische Demo mit simuliertem eRecht24-Server starten |
| `npm pack` | Lokales NPM-Archiv erstellen; veröffentlicht nichts |

Die Integrationstests verwenden drei getrennte Projekte unter `.test-work/`: statische Ausgabe, Node-SSR und Cloudflare mit dem standardmäßigen `workerd`-Prerendering. Sie installieren das tatsächliche Paketarchiv und starten lokale HTTP-Server. Vorher `npm ci` ausführen. Echte eRecht24-Aufrufe sind im Testprozess gesperrt. Prozesse und Server werden auch bei Fehlern beendet. Erfolgreiche Testprojekte werden gelöscht; bei Fehlern bleiben die Artefakte unter `.test-work/` für die Diagnose erhalten.

## Schlüssel

Der Developer-Key (Plugin-Key) steht in `src/plugin-key.ts` und ist im veröffentlichten Paket öffentlich. Der Projekt-API-Key ist geheim und gehört nie in den Code, in Tests oder in Commits. Für eigene Abrufe `.env` im Projekt anlegen (ist ignoriert) und mit `node --env-file=.env …` laden.

## Kompatibilität und Prüfung

Zielbereich: Astro 7.x, Node `^22.12.0 || ^24.0.0`. Die Entwicklungsabhängigkeiten verwenden Astro 7.3.5, `@astrojs/node` 11.1.6, `@astrojs/cloudflare` 14.3.4 und Wrangler 4.125.0.

Die automatisierten Tests decken insbesondere Folgendes ab:

- Unveränderte DE-/EN-Inhalte in statischen Seiten sowie in vorgerenderten Node-SSR- und Cloudflare-Seiten.
- Installation aus dem tatsächlichen NPM-Archiv, Komponentenexport und Typ-Injektion mit `astro check`.
- Einen Abruf pro Dokument, gemeinsame laufende Dev-Anfragen, Cache-Erhalt über HMR und einen frischen Abruf nach echtem Serverneustart.
- Einen fehlgeschlagenen Dev-Abruf (HTTP 401) über echtes HTTP mit kontrollierter Paketmeldung.
- Erfolgreiche Ausgabe der Rechtstexte auf Seiten ohne `prerender` mit allen drei Targets, ohne API-Abrufe oder Zugangsdaten zur Laufzeit.
- Fehler, leere Texte, Warnungen, Wiederholungen und einen hängenden HTTP-Response-Body.
- Abweichendes Env-Verzeichnis, Ausführungsmodus und Vorrang der Prozessumgebung.
- Keine künstlichen Zugangsschlüssel in Paketdateien, Logs und vollständigen Build-Verzeichnissen, einschließlich SSR-Dateien.
- Alle sechs Nutzer-Dokumentationen unter `docs/` im Paketarchiv, gültige relative Dokumentationslinks und den absoluten GitHub-Link auf `CONTRIBUTING.md` in der README.

Zum Test einer anderen Astro-Version können ausschließlich für den Testlauf Versionen vorgegeben werden. Dabei darf NPM fehlende Pakete aus der Registry nachladen:

```sh
RECHTSTEXTE_TEST_ASTRO_VERSION=7.0.0 \
RECHTSTEXTE_TEST_ADAPTER_VERSION=11.0.0 \
RECHTSTEXTE_TEST_CLOUDFLARE_VERSION=14.0.0 \
RECHTSTEXTE_TEST_WRANGLER_VERSION=4.83.0 \
RECHTSTEXTE_TEST_VITE_VERSION=8.0.13 \
fnm exec --using 22.12.0 npm run test:integration
```

Ohne diese Variablen verwenden die Testprojekte die im Root-Projekt installierten Versionen. Die Overrides gelten nur für die Testprojekte und ändern die Paketabhängigkeiten nicht. Die Mindestversionsprüfung verwendet Node 22.12.0 und die oben angegebenen Astro-, Adapter-, Wrangler- und Vite-Versionen.

Alle API- und Adapterprüfungen verwenden künstliche Rechtstexte und lokale Server.

## Offene Prüfungen vor dem Release

- Visuelle Browserprüfung der Komponente im eigenen Layout
- Prüfung im ersten echten Flokani-Projekt
- Klärung der Lizenz und der Veröffentlichungsberechtigung (bis dahin `private`)
- Live-Abruf mit dem eigenen Developer-Key ist für Deutsch erfolgreich; Englisch und Social Media hängen von der Pflege im jeweiligen eRecht24-Projekt ab

## Commits

Kurze Commit-Messages mit Gitmoji, zum Beispiel `🔑 Developer-Key eintragen`.
