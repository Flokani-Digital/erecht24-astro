# Astro Rechtstexte für eRecht24

`@flokani.digital/erecht24-astro` ist eine Astro-Integration, die Impressum, Datenschutzerklärung und optional die Datenschutzerklärung für Social Media aus deinem [eRecht24](https://www.e-recht24.de/)-Projekt beim Build abruft und als HTML ausgibt. Im Browser deiner Besucher findet kein API-Aufruf statt.

> **Status:** Das Paket ist noch nicht veröffentlicht (`private`). Bis zur Veröffentlichung kann es als lokales Archiv installiert werden, siehe [Installation](#installation).
>
> Kein offizielles Produkt von eRecht24. Die Rechtstexte stammen unverändert von eRecht24; für ihre Vollständigkeit, Aktualität und korrekte Einbindung bleibt der Betreiber der Website verantwortlich.

## Voraussetzungen

- Astro `6.0.0` oder neuer innerhalb von `6.x`, oder Astro ab `7.4.2` innerhalb von `7.x` (Peer-Abhängigkeiten: `astro ^6.0.0 || ^7.4.2`, `vite ^7.3.1 || ^8.3.5`). Astro 6 bringt Vite 7 mit, Astro 7 Vite 8.
- Node.js `^22.23.4 || ^24.0.0`
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

Für Rechtstextseiten empfehlen wir `export const prerender = true;`, damit Astro sie bereits beim Build als HTML erzeugt. Ohne diese Angabe können Node- und Cloudflare-SSR-Seiten die beim Build geladenen Texte auch dynamisch ausgeben, ohne API-Abruf oder Zugangsdaten zur Laufzeit. Die Standardkonfiguration des Cloudflare-Adapters mit `workerd` wird unterstützt; ein Override auf `prerenderEnvironment: 'node'` ist nicht nötig.

**4. Bauen**

```sh
npx astro build
```

Der Build lädt die Texte für die statische Ausgabe oder SSR. Fehlt der Key oder ein Text, bricht der Build mit einer verständlichen Meldung ab.

## Dokumentation

| Thema | Inhalt |
|---|---|
| [Ablauf im Überblick](https://github.com/Flokani-Digital/erecht24-astro/blob/HEAD/docs/ablauf.md) | Diagramme: Build, Abruf, Prerender, Deployment |
| [Konfiguration](https://github.com/Flokani-Digital/erecht24-astro/blob/HEAD/docs/konfiguration.md) | Alle Optionen, Props der Komponente und Standardwerte |
| [Zugangsdaten](https://github.com/Flokani-Digital/erecht24-astro/blob/HEAD/docs/zugangsdaten.md) | API-Key und Plugin-Key, `.env`, CI und Deployment |
| [Seiten und Komponente](https://github.com/Flokani-Digital/erecht24-astro/blob/HEAD/docs/seiten-und-komponente.md) | Seiten anlegen, mehrsprachig, SSR, Styling, Social Media |
| [Styling](https://github.com/Flokani-Digital/erecht24-astro/blob/HEAD/docs/styling.md) | Struktur des HTML, eigenes CSS, Tailwind Typography, Dark Mode |
| [Abruf und Fehlerverhalten](https://github.com/Flokani-Digital/erecht24-astro/blob/HEAD/docs/abruf-und-fehler.md) | Verhalten je Astro-Befehl, Wiederholungen, Timeouts, Aktualisierung |
| [Fehlerbehebung](https://github.com/Flokani-Digital/erecht24-astro/blob/HEAD/docs/fehlerbehebung.md) | Fehlermeldung, Ursache, Lösung |

Zum Mitentwickeln siehe [CONTRIBUTING.md](https://github.com/Flokani-Digital/erecht24-astro/blob/HEAD/CONTRIBUTING.md).

## Wichtig zu wissen

- **Aktualisierung nur per Build:** Änderungen in eRecht24 erscheinen erst nach einem neuen erfolgreichen Build und Deployment. Regelmäßige Builds sind Aufgabe deines Deployment-Systems.
- **Kein stiller Fallback:** Standardmäßig gibt es keinen Rückgriff auf alte Texte. Ein fehlgeschlagener Build lässt das letzte erfolgreiche Deployment bestehen. Optional nutzt `fallbackToCache` bei vorübergehenden eRecht24-Ausfällen den letzten erfolgreichen Stand desselben Projekts, siehe [Abruf und Fehler](https://github.com/Flokani-Digital/erecht24-astro/blob/HEAD/docs/abruf-und-fehler.md).
- **HTML unverändert:** Der Text wird nicht bereinigt oder verändert. Prüfe das echte HTML mit deinem Layout und deiner Content Security Policy.
- **Keys:** Der API-Key ist geheim und gehört in ein Secret. Der Plugin-Key ist im Paket enthalten und kein Geheimnis.

## Ausblick

Geplant sind Push-Benachrichtigungen von eRecht24, die über einen Deploy-Hook automatisch einen neuen Build auslösen. Das ist nicht Teil der ersten Version.

## Quellen

- [eRecht24 OpenAPI](https://api.e-recht24.de/v2openapi.json)
- [Astro Integration API](https://docs.astro.build/en/reference/integrations-reference/)
- [Astro: Umgebungsvariablen](https://docs.astro.build/en/guides/environment-variables/)

## Lizenz

[MIT](https://github.com/Flokani-Digital/erecht24-astro/blob/HEAD/LICENSE) © Flokani GmbH. Forks und eigene Integrationen sollten über `ERECHT24_PLUGIN_KEY` einen eigenen eRecht24-Developer-Key verwenden.
