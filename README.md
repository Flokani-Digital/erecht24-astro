# Astro Rechtstexte für eRecht24

`@flokani.digital/erecht24-astro` ist eine Astro-Integration, die Impressum, Datenschutzerklärung und optional die Datenschutzerklärung für Social Media aus deinem [eRecht24](https://www.e-recht24.de/)-Projekt beim Build abruft und als statisches HTML ausgibt. Im Browser deiner Besucher findet kein API-Aufruf statt.

> **Status:** Das Paket ist noch nicht veröffentlicht (`private`, Lizenz offen). Bis zur Veröffentlichung kann es als lokales Archiv installiert werden, siehe [Installation](#installation).
>
> Kein offizielles Produkt von eRecht24. Die Rechtstexte stammen unverändert von eRecht24; für ihre Vollständigkeit, Aktualität und korrekte Einbindung bleibt der Betreiber der Website verantwortlich.

## Voraussetzungen

- Astro `7.x` (Peer-Abhängigkeit: `astro ^7.0.0`, `vite ^8.0.13`)
- Node.js `^22.12.0 || ^24.0.0`
- Ein eRecht24-Projekt mit angelegten Rechtstexten und dessen **Projekt-API-Key** (im eRecht24-Projekt-Manager erzeugen)

## Installation

Nach der Veröffentlichung:

```sh
npm install @flokani.digital/erecht24-astro
```

Bis dahin aus einem lokal erzeugten Archiv (`npm pack` im Paket-Repository):

```sh
npm install /pfad/zum/flokani.digital-erecht24-astro-0.1.0.tgz
```

## Schnellstart

**1. Integration eintragen**

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import rechtstexte from '@flokani.digital/erecht24-astro';

export default defineConfig({
  trailingSlash: 'always',
  integrations: [rechtstexte()],
});
```

Ohne Optionen werden Impressum und Datenschutzerklärung auf Deutsch geladen.

**2. API-Key hinterlegen**

```dotenv
# .env.local (nicht versionieren)
ERECHT24_API_KEY=dein-projekt-api-key
```

**3. Seite anlegen**

```astro
---
// src/pages/impressum.astro
import LegalText from '@flokani.digital/erecht24-astro/LegalText.astro';
import Layout from '../layouts/Layout.astro';

export const prerender = true;
---

<Layout title="Impressum">
  <LegalText type="imprint" class="legal-text" />
</Layout>
```

Für die Datenschutzerklärung dasselbe mit `type="privacyPolicy"`.

In SSR-Projekten braucht **jede Rechtstextseite** `export const prerender = true;`, auch mit Node- oder Cloudflare-Adapter. Ohne diese Angabe kann der Build erfolgreich sein; beim dynamischen Rendern in Produktion verweigert die Komponente die Ausgabe. Die Standardkonfiguration des Cloudflare-Adapters mit `workerd` wird unterstützt; ein Override auf `prerenderEnvironment: 'node'` ist nicht nötig.

**4. Bauen**

```sh
npx astro build
```

Der Build ruft die Texte ab und schreibt sie in die statischen Seiten. Fehlt der Key oder ein Text, bricht der Build mit einer verständlichen Meldung ab.

## Dokumentation

| Thema | Inhalt |
|---|---|
| [Ablauf im Überblick](docs/ablauf.md) | Diagramme: Build, Abruf, Prerender, Deployment |
| [Konfiguration](docs/konfiguration.md) | Alle Optionen, Props der Komponente und Standardwerte |
| [Zugangsdaten](docs/zugangsdaten.md) | API-Key und Plugin-Key, `.env`, CI und Deployment |
| [Seiten und Komponente](docs/seiten-und-komponente.md) | Seiten anlegen, mehrsprachig, SSR, Styling, Social Media |
| [Styling](docs/styling.md) | Struktur des HTML, eigenes CSS, Tailwind Typography, Dark Mode |
| [Abruf und Fehlerverhalten](docs/abruf-und-fehler.md) | Verhalten je Astro-Befehl, Wiederholungen, Timeouts, Aktualisierung |
| [Fehlerbehebung](docs/fehlerbehebung.md) | Fehlermeldung, Ursache, Lösung |

Zum Mitentwickeln siehe [CONTRIBUTING.md](https://github.com/Flokani-Digital/erecht24-astro/blob/HEAD/CONTRIBUTING.md).

## Wichtig zu wissen

- **Aktualisierung nur per Build:** Änderungen in eRecht24 erscheinen erst nach einem neuen erfolgreichen Build und Deployment. Regelmäßige Builds sind Aufgabe deines Deployment-Systems.
- **Kein stiller Fallback:** Es gibt keinen Rückgriff auf alte Texte. Ein fehlgeschlagener Build lässt das letzte erfolgreiche Deployment bestehen.
- **HTML unverändert:** Der Text wird nicht bereinigt oder verändert. Prüfe das echte HTML mit deinem Layout und deiner Content Security Policy.
- **Keys:** Der API-Key ist geheim und gehört in ein Secret. Der Plugin-Key ist im Paket enthalten und kein Geheimnis.

## Ausblick

Geplant sind Push-Benachrichtigungen von eRecht24, die über einen Deploy-Hook automatisch einen neuen Build auslösen. Das ist nicht Teil der ersten Version.

## Quellen

- [eRecht24 OpenAPI](https://api.e-recht24.de/v2openapi.json)
- [Astro Integration API](https://docs.astro.build/en/reference/integrations-reference/)
- [Astro: Umgebungsvariablen](https://docs.astro.build/en/guides/environment-variables/)
