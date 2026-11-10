# Mitentwickeln

Hinweise für alle, die am Paket `@flokani.digital/erecht24-astro` arbeiten. Die Nutzung des Pakets steht in der [README](README.md) und unter [docs/](docs/).

`vite` ist bewusst Peer-Dependency: `src/index.ts` importiert `loadEnv` direkt aus `vite`. Strikte Paketmanager wie pnpm lösen den Import sonst nicht auf; verwendet wird die von Astro installierte Version.

## Lokal entwickeln

Wir verwenden **Node.js 24 LTS**, im Projekt festgelegt auf **24.22.1**. `fnm` liest diese Version aus `.node-version`. Die globale Standardversion muss dafür nicht geändert werden.

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

Die Integrationstests verwenden drei getrennte Projekte unter `.test-work/`: statische Ausgabe, Node-SSR und Cloudflare mit dem standardmäßigen `workerd`-Prerendering. Sie installieren das tatsächliche Paketarchiv und starten lokale HTTP-Server. Vorher `npm ci` ausführen. NPM verwendet seinen lokalen Cache bevorzugt und darf fehlende Registry-Metadaten oder Pakete nachladen; ein vollständig vorgefüllter Cache ist nicht erforderlich. Echte eRecht24-Aufrufe sind im Testprozess gesperrt. Prozesse und Server werden auch bei Fehlern beendet. Erfolgreiche Testprojekte werden gelöscht; bei Fehlern bleiben die Artefakte unter `.test-work/` für die Diagnose erhalten.

## Schlüssel

Der Developer-Key (Plugin-Key) steht in `src/plugin-key.ts` und ist im veröffentlichten Paket öffentlich. Der Projekt-API-Key ist geheim und gehört nie in den Code, in Tests oder in Commits. Für eigene Abrufe `.env` im Projekt anlegen (ist ignoriert) und mit `node --env-file=.env …` laden.

## Kompatibilität und Prüfung

Zielbereich: Astro `^6.0.0 || ^7.4.2`, Vite `^7.3.1 || ^8.3.5` und Node `^22.23.4 || ^24.0.0`. Die Entwicklungsabhängigkeiten (und damit `npm test` lokal) verwenden Astro 7.4.2, Vite 8.3.5, `@astrojs/node` 11.1.9, `@astrojs/cloudflare` 14.4.2, Wrangler 4.153.0 und `@astrojs/check` 0.9.12.

TypeScript bleibt auf der aktuellen kompatiblen 6.x-Linie (6.0.3). `@astrojs/check` 0.9.12 unterstützt laut Peer-Abhängigkeit nur TypeScript 5 und 6; ein Wechsel auf TypeScript 7 setzt dessen Unterstützung voraus. Die Node-Typen bleiben auf der Node-24-Linie. Die CI prüft Node 22.23.4 und 24.22.1 jeweils mit Astro 7 (Lockfile-Stand) sowie mit Astro 6.0.0 und 6.4.8 über die Versionsvorgaben unten:

| Astro | Vite | `@astrojs/node` | `@astrojs/cloudflare` |
| --- | --- | --- | --- |
| 6.0.0 | 7.3.1 | 10.0.0 | 13.0.0 |
| 6.4.8 | 7.3.7 | 10.1.4 | 13.7.0 |

Die Adapter sind für Nutzer optional und nur Teil des Teststacks. Die Versionen stehen in `.github/workflows/ci.yml`; bei neuen Astro-6-Versionen dort und hier anpassen.

Ein npm-Override hebt indirekte `undici`-7.x-Abhängigkeiten auf mindestens 7.30.1 an. Der aktuelle Cloudflare-Stack zieht über Miniflare noch 7.29.1 mit, das unter anderem von [GHSA-xjj6-f33q-929c](https://github.com/nodejs/undici/security/advisories/GHSA-xjj6-f33q-929c) betroffen ist. Die unabhängigen Testprojekte übernehmen denselben Override. Sobald Cloudflare durchgängig korrigierte Versionen verwendet, kann er nach erneuter Audit- und Integrationsprüfung entfernt werden.

Die automatisierten Tests decken insbesondere Folgendes ab:

- Unveränderte DE-/EN-Inhalte in statischen Seiten sowie in vorgerenderten Node-SSR- und Cloudflare-Seiten.
- Installation aus dem tatsächlichen NPM-Archiv, Komponentenexport und Typ-Injektion mit `astro check`.
- Einen Abruf pro Dokument, gemeinsame laufende Dev-Anfragen, Cache-Erhalt über HMR und einen frischen Abruf nach echtem Serverneustart.
- Einen fehlgeschlagenen Dev-Abruf (HTTP 401) über echtes HTTP mit kontrollierter Paketmeldung.
- Erfolgreiche Ausgabe der Rechtstexte auf Seiten ohne `prerender` mit allen drei Targets, ohne API-Abrufe oder Zugangsdaten zur Laufzeit.
- Fehler, leere Texte, Warnungen, Wiederholungen und einen hängenden HTTP-Response-Body.
- Abweichendes Env-Verzeichnis, Ausführungsmodus und Vorrang der Prozessumgebung.
- Keine künstlichen Zugangsschlüssel in Paketdateien, Logs und vollständigen Build-Verzeichnissen, einschließlich SSR-Dateien.
- Paketarchiv ohne `docs/`: Die Dokumentation liegt nur auf GitHub, deshalb verwendet die README ausschließlich absolute Links.

Zum Test einer anderen Astro-Version (zum Beispiel Astro 6) können ausschließlich für den Testlauf Versionen vorgegeben werden. Dabei darf NPM fehlende Pakete aus der Registry nachladen:

```sh
RECHTSTEXTE_TEST_ASTRO_VERSION=7.4.2 \
RECHTSTEXTE_TEST_ADAPTER_VERSION=11.1.9 \
RECHTSTEXTE_TEST_CLOUDFLARE_VERSION=14.4.2 \
RECHTSTEXTE_TEST_WRANGLER_VERSION=4.153.0 \
RECHTSTEXTE_TEST_VITE_VERSION=8.3.5 \
fnm exec --using 22.23.4 npm run test:integration
```

Beispiel für Astro 6.0.0 (die Peer-Untergrenze):

```sh
RECHTSTEXTE_TEST_ASTRO_VERSION=6.0.0 \
RECHTSTEXTE_TEST_VITE_VERSION=7.3.1 \
RECHTSTEXTE_TEST_ADAPTER_VERSION=10.0.0 \
RECHTSTEXTE_TEST_CLOUDFLARE_VERSION=13.0.0 \
npm run test:integration
```

Vite muss zur Astro-Version passen (Astro 6: Vite 7, Astro 7: Vite 8), sonst scheitert die Installation an den Peer-Abhängigkeiten.

Ohne diese Variablen verwenden die Testprojekte die im Root-Projekt installierten Versionen und übernehmen dessen Lockfile. Die Overrides gelten nur für die Testprojekte und ändern die Paketabhängigkeiten nicht. Die Mindestversionsprüfung verwendet Node 22.23.4 und die oben angegebenen Astro-, Adapter-, Wrangler- und Vite-Versionen.

Alle API- und Adapterprüfungen verwenden künstliche Rechtstexte und lokale Server.

## Release

Erledigt für 0.1.0: Browserprüfung und Live-Abruf (Deutsch) im ersten echten Flokani-Projekt, MIT-Lizenz. Englisch und Social Media hängen von der Pflege im jeweiligen eRecht24-Projekt ab.

Eine veröffentlichte Version lässt sich auf npm nie wieder neu hochladen, auch nicht nach `unpublish`. Jede Korrektur braucht eine neue Version.

Die Veröffentlichung läuft über den Workflow `.github/workflows/release.yml` mit npm Trusted Publishing (OIDC). Es werden weder npm-Token noch Passkey-Bestätigungen benötigt.

1. CI auf `main` ist grün.
2. Version in `package.json` setzen; vor einer finalen Version im `CHANGELOG.md` das Datum eintragen. Per Pull Request nach `main` mergen.
3. `npm publish --dry-run --tag next` bzw. `--tag latest` prüfen: nur `dist/`, `components/`, README, LICENSE und `package.json`.
4. Tag `v<version>` auf `main` setzen und pushen, zum Beispiel `git tag v0.1.1 && git push origin v0.1.1`. Der Tag muss exakt zur Version in `package.json` passen. Tags `v*` lassen sich danach nicht mehr verschieben oder löschen. Alternativ lässt sich der Workflow ohne Tag unter Actions → Release → „Run workflow“ auf `main` starten, zum Beispiel für einen Wiederholungslauf.
5. Der Workflow prüft (Typen, Tests, Integrationstests) und wartet dann auf die Freigabe im GitHub-Environment `npm-publish`. Nach der Freigabe veröffentlicht er mit Provenance. Versionen mit Bindestrich (zum Beispiel `0.2.0-rc.0`) erhalten den Dist-Tag `next`, alle anderen `latest`.
6. Bei Vorabversionen in einem Kundenprojekt `npm i @flokani.digital/erecht24-astro@next` installieren, `astro build` und die Rechtstextseiten im Browser prüfen.
7. GitHub Release zum Tag anlegen.

Einrichtung (einmalig, erledigt für das Paket): auf npmjs.com unter Paket → Settings → Trusted Publisher: GitHub Actions, Organisation `Flokani-Digital`, Repository `erecht24-astro`, Workflow `release.yml`, Environment `npm-publish`, „Allow npm publish“ aktiv.

## Commits

Kurze Commit-Messages mit Gitmoji, zum Beispiel `🔑 Developer-Key eintragen`.
