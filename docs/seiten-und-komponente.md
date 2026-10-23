# Seiten und Komponente

## Eine Seite anlegen

```astro
---
// src/pages/impressum.astro
import LegalText from '@flokani.digital/erecht24-astro/LegalText.astro';
import Layout from '../layouts/Layout.astro';

export const prerender = true;
---

<Layout title="Impressum">
  <LegalText type="imprint" lang="de" class="legal-text" />
</Layout>
```

Übliche Zuordnung:

| Seite | `type` |
|---|---|
| `/impressum/` | `imprint` |
| `/datenschutz/` | `privacyPolicy` |
| `/datenschutz-social-media/` | `privacyPolicySocialMedia` (optional) |

Setze für Links auf diese Seiten einen abschließenden Slash und in der Astro-Konfiguration `trailingSlash: 'always'`.

## `prerender` wird empfohlen

Für Rechtstextseiten empfehlen wir `export const prerender = true;`, damit Astro sie bereits beim Build als HTML erzeugt. Ohne diese Angabe rendert die Komponente die beim Build geladenen Texte auch dynamisch in Node- und Cloudflare-SSR-Seiten.

Die Standardkonfiguration des Cloudflare-Adapters mit `workerd` wird unterstützt. Ein Override auf `prerenderEnvironment: 'node'` ist nicht erforderlich. Die Rechtstexte werden beim Build eingebettet; in Produktion findet kein API-Abruf statt und es werden keine Zugangsdaten benötigt. Das Paket fügt Seiten oder Layouts nicht von sich aus hinzu.

## Überschriften

- Impressum und Datenschutzerklärung bringen ein eigenes `<h1>` mit. Setze auf diesen Seiten **keine zweite H1**.
- Der Social-Media-Text beginnt ohne H1 direkt mit `<h3>`. Gib der Seite eine eigene Überschrift oder binde den Text unterhalb der Datenschutzerklärung ein.

## Mehrere Sprachen

```js
// astro.config.mjs
rechtstexte({ documents: ['imprint', 'privacyPolicy'], languages: ['de', 'en'] })
```

```astro
<LegalText type="imprint" lang="en" />
```

Ohne `lang` gilt die erste konfigurierte Sprache. Alle gewählten Dokumente müssen in allen gewählten Sprachen im eRecht24-Projekt vorliegen, siehe [Konfiguration](konfiguration.md).

## Stile

Der Text wird als rohes HTML ohne Klassen oder Stile eingefügt. Astro-Scopestile erreichen ihn nicht, nutze deshalb `:global(.deine-klasse …)`. Welche Elemente es gibt und wie du sie gestaltest (eigenes CSS, Tailwind Typography, Dark Mode), steht in [Styling](styling.md).

## Was die Komponente nicht tut

- Sie bereinigt oder verändert das HTML von eRecht24 nicht. eRecht24 ist die feste, vertrauenswürdige Quelle. Prüfe das Ergebnis mit deinem Layout und, falls vorhanden, deiner Content Security Policy.
- Sie darf nur im Astro-Frontmatter oder in Astro-Komponenten verwendet werden, nicht in Client-Skripten.
