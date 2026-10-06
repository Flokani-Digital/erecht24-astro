# Mitentwickeln

Hinweise für alle, die am Paket `@flokani.digital/erecht24-astro` arbeiten. Die Nutzung des Pakets steht in der [README](README.md) und unter [docs/](docs/).

Der vollständige Projektumfang und der Prüfstand stehen im [Projektplan](Projektplan.md).

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

Die Integrationstests erzeugen zwei getrennte Projekte unter `.test-work/`. Sie installieren das Paketarchiv mit den lokal verwendeten Astro-Versionen aus dem NPM-Cache und starten kurzzeitig lokale HTTP-Server. Vorher `npm ci` ausführen. Echte eRecht24-Aufrufe sind im Testprozess gesperrt.

## Schlüssel

Der Developer-Key (Plugin-Key) steht in `src/plugin-key.ts` und ist im veröffentlichten Paket öffentlich. Der Projekt-API-Key ist geheim und gehört nie in den Code, in Tests oder in Commits. Für eigene Abrufe `.env` im Projekt anlegen (ist ignoriert) und mit `node --env-file=.env …` laden.

## Kompatibilität und Prüfung

Zielbereich: Astro 7.x, Node `^22.12.0 || ^24.0.0`. Die Entwicklungsabhängigkeiten verwenden Astro 7.3.5 und `@astrojs/node` 11.1.6.

Die automatisierten Tests prüfen insbesondere:

- Unveränderte DE-/EN-Inhalte in statischen Seiten und in vorgerenderten Seiten eines SSR-Projekts.
- Installation aus dem tatsächlichen NPM-Archiv, Komponentenexport und Typ-Injektion mit `astro check`.
- Einen Abruf pro Dokument, gemeinsame laufende Dev-Anfragen und erneuten Abruf nach Neustart.
- Fehler, leere Texte, Warnungen, Wiederholungen und einen hängenden HTTP-Response-Body.
- Abweichendes Env-Verzeichnis, Ausführungsmodus und Vorrang der Prozessumgebung.
- Keine künstlichen Zugangsschlüssel in Paketdateien, Logs und vollständigen Build-Verzeichnissen, einschließlich SSR-Dateien.
- Interne Links mit abschließendem Slash.

Zum Test einer anderen Astro-Version können ausschließlich für den Testlauf Versionen vorgegeben werden. Dabei darf NPM fehlende Pakete aus der Registry nachladen:

```sh
RECHTSTEXTE_TEST_ASTRO_VERSION=7.0.0 \
RECHTSTEXTE_TEST_ADAPTER_VERSION=11.0.0 \
npm run test:integration
```

## Offene Prüfungen vor dem Release

- Visuelle Browserprüfung der Komponente im eigenen Layout
- Prüfung im ersten echten Flokani-Projekt
- Klärung der Lizenz und der Veröffentlichungsberechtigung (bis dahin `private`)
- Live-Abruf mit dem eigenen Developer-Key ist für Deutsch erfolgreich; Englisch und Social Media hängen von der Pflege im jeweiligen eRecht24-Projekt ab

## Commits

Kurze Commit-Messages mit Gitmoji, zum Beispiel `🔑 Developer-Key eintragen`.
