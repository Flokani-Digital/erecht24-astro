# Astro Rechtstexte für eRecht24

Astro-Integration von Flokani zum Abruf von Impressum, Datenschutzerklärung und optional Social-Media-Datenschutz bei eRecht24. Die Texte werden beim Build geladen und als statisches HTML ausgegeben.

**Entwicklungsstand:** erste Implementierung mit simulierten API-Antworten. Das Paket ist noch nicht veröffentlicht und bleibt bis zur Klärung von Lizenz und NPM-Scope `private`. Der echte API-Test steht aus, da der Developer-/Plugin-Key noch fehlt. Der vollständige Umfang ist im [Projektplan](Projektplan.md) beschrieben.

## Lokal entwickeln

Wir verwenden **Node.js 24 LTS**, im Projekt festgelegt auf **24.21.0**. `fnm` liest diese Version aus `.node-version`. Die globale Standardversion muss dafür nicht geändert werden.

```sh
fnm install
fnm use
npm ci
npm run dev
```

Die Demo ist unter `http://127.0.0.1:4337/` erreichbar. Sie verwendet ausschließlich künstliche Rechtstexte und benötigt keine Zugangsdaten. `Ctrl+C` beendet Astro und den lokalen API-Testserver. Die Mock-Umleitung gehört nur zum Demo-/Testprozess und wird nicht mit dem Paket ausgeliefert.

| Befehl | Zweck |
|---|---|
| `npm run build` | TypeScript-Paket nach `dist/` kompilieren |
| `npm run check` | TypeScript prüfen |
| `npm test` | API-, Inhalts-, Konfigurations-, Retry- und Timeout-Tests |
| `npm run test:integration` | Paketarchiv installieren; Astro-Builds, Befehle, Umgebungsvariablen und Ausgaben prüfen |
| `npm run dev` | Statische Demo mit simuliertem eRecht24-Server starten |
| `npm pack` | Lokales NPM-Archiv erstellen; veröffentlicht nichts |

Die Integrationstests erzeugen zwei getrennte Projekte unter `.test-work/`. Sie installieren das Paketarchiv mit den lokal verwendeten Astro-Versionen aus dem NPM-Cache und starten kurzzeitig lokale HTTP-Server. Vorher `npm ci` ausführen. Echte eRecht24-Aufrufe sind im Testprozess gesperrt.

## In ein Astro-Projekt einbinden

Bis zur Veröffentlichung das mit `npm pack` erzeugte Archiv im Zielprojekt installieren:

```sh
npm install /pfad/zum/flokani-astro-rechtstexte-0.1.0.tgz
```

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import rechtstexte from '@flokani/astro-rechtstexte';

export default defineConfig({
  trailingSlash: 'always',
  integrations: [rechtstexte({
    documents: ['imprint', 'privacyPolicy'],
    languages: ['de'],
  })],
});
```

Beide Optionen sind optional. Ohne Angaben werden Impressum und Datenschutzerklärung auf Deutsch geladen. Weitere Werte:

| Option | Erlaubte Werte |
|---|---|
| `documents` | `imprint`, `privacyPolicy`, `privacyPolicySocialMedia` |
| `languages` | `de`, `en` |

Social-Media-Datenschutz wird nur nach ausdrücklicher Auswahl abgerufen. Alle ausgewählten Dokumente müssen in allen ausgewählten Sprachen vorliegen. Duplikate werden zusammengefasst; leere Listen und unbekannte Werte werden abgewiesen.

### Zugangsdaten

Im **Astro-Zielprojekt** eine nicht versionierte `.env.local` anlegen, entsprechend der Vorlage `.env.example`:

```dotenv
ERECHT24_API_KEY=projekt-api-key
ERECHT24_PLUGIN_KEY=developer-plugin-key
```

Im Deployment-System beide Werte als Secrets hinterlegen. Die Integration berücksichtigt Vites tatsächlichen `mode` und `envDir`; bereits gesetzte Umgebungsvariablen haben Vorrang. `vite.envDir: false` deaktiviert das Laden der Dateien. Die Variablen erhalten keinen `PUBLIC_`-Präfix.

### Seiten und Komponente

```astro
---
// src/pages/impressum.astro
import LegalText from '@flokani/astro-rechtstexte/LegalText.astro';
import Layout from '../layouts/Layout.astro';

export const prerender = true;
---

<Layout title="Impressum">
  <LegalText type="imprint" lang="de" class="legal-text" />
</Layout>
```

Entsprechend auf `/datenschutz/` den Typ `privacyPolicy` und optional auf `/datenschutz-social-media/` den Typ `privacyPolicySocialMedia` verwenden. Bei `languages: ['de', 'en']` kann eine englische Seite `lang="en"` setzen. Ohne `lang` gilt die erste konfigurierte Sprache. Nicht konfigurierte Dokumente oder Sprachen erzeugen einen Fehler.

**Auch in SSR-Projekten benötigen Rechtstextseiten `export const prerender = true`.** Die Komponente weist eine dynamische Ausgabe im Produktionsbetrieb beim Rendern zurück. Sie fügt Seiten oder Layouts nicht automatisch hinzu.

Das Original-HTML wird unverändert mit `set:html` innerhalb eines `<div>` mit der gewünschten Klasse und dem Sprach-Attribut ausgegeben. eRecht24 ist die feste vertrauenswürdige HTML-Quelle; das Paket bereinigt oder verändert deren Inhalte nicht. Vor dem Produktiveinsatz das echte HTML mit dem eigenen Layout und gegebenenfalls dessen Content Security Policy prüfen.

Stile müssen die eingefügten Elemente erreichen, beispielsweise im Projektlayout:

```astro
<style>
  :global(.legal-text h2) { margin-top: 2rem; }
  :global(.legal-text a) { text-decoration: underline; }
</style>
```

## Abruf und Fehlerverhalten

| Astro-Befehl | Verhalten |
|---|---|
| `build` | Frischer Abruf aller konfigurierten Dokumente; einmal je Typ, DE/EN gemeinsam |
| `dev` | Abruf beim ersten Bedarf; Wiederverwendung bis zum Neustart der Integrationsinstanz |
| `sync`, `check` | Typen und Konfiguration ohne Zugangsdaten oder API-Abruf prüfen |
| `preview` | Bereits gebaute Seiten ohne erneuten Abruf ausliefern |

Fehlende Schlüssel, Dokumente, Sprachinhalte, unbrauchbares HTML oder ungültige Antworten brechen den Build ab. Bei Netzwerkfehlern, Timeouts und HTTP 429/500/502/503/504 sind maximal drei Versuche vorgesehen. Ein Versuch hat 10 Sekunden Zeit einschließlich Response-Body. Wiederholungen warten 1 und 2 Sekunden; `Retry-After` bei 429 kann die Wartezeit bis auf 10 Sekunden verlängern. Größere Vorgaben führen zum Abbruch.

API-Warnungen erscheinen als lesbarer Text im Astro-Log; bekannte Schlüsselwerte werden entfernt. Warnungen allein verhindern den Build nicht. Schlüssel werden ausschließlich als Request-Header an die festgelegte HTTPS-API übertragen. Es gibt keinen stillen Rückgriff auf alte Texte und keinen API-Aufruf im Browser oder beim späteren Seitenbesuch.

Änderungen in eRecht24 werden erst durch einen neuen erfolgreichen Build und ein Deployment sichtbar. Regelmäßige Builds sowie sichtbare Fehlerbenachrichtigungen sind Aufgabe des jeweiligen Deployment-Systems. Ein fehlgeschlagener Build soll das letzte erfolgreiche Deployment bestehen lassen.

## Kompatibilität und Prüfung

Zielbereich: Astro 7.x, Node `^22.12.0 || ^24.0.0`. Die Entwicklungsabhängigkeiten verwenden Astro 7.3.5 und `@astrojs/node` 11.1.6. Details zu tatsächlich geprüften Versionen und verbleibenden Prüfungen stehen im [Projektplan](Projektplan.md).

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

Visuelle Browserprüfung, Live-Test gegen eRecht24 und Prüfung im ersten echten Flokani-Projekt stehen aus. Die Demo-Texte sind keine gültigen Rechtstexte.

## Quellen

- [eRecht24 OpenAPI](https://api.e-recht24.de/v2openapi.json)
- [Astro Integration API](https://docs.astro.build/en/reference/integrations-reference/)
- [Astro: Umgebungsvariablen](https://docs.astro.build/en/guides/environment-variables/)
- [Node.js-Veröffentlichungen und LTS-Status](https://nodejs.org/en/about/previous-releases)
