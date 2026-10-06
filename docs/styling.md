# Styling

Das Paket gibt den Text von eRecht24 als **rohes HTML ohne eigene Stile, Klassen oder IDs** aus. Das Aussehen bestimmt allein dein Projekt. Dieses Kapitel zeigt, was es zu stylen gibt und wie du es sauber löst.

## Was im HTML steckt

Das HTML enthält ausschließlich Standard-Elemente ohne `class`, `id` oder `style`:

| Dokument | Elemente |
|---|---|
| Impressum | `h1`, `h2`, `p`, `br`, `strong` |
| Datenschutzerklärung | `h1` bis `h5`, `p`, `a`, `ul`, `li`, `br`, `strong` |
| Social-Media-Datenschutz | beginnt ohne `h1` direkt mit `h3`; sonst vergleichbar |

Links tragen nur `href`, `target="_blank"` und `rel="noopener noreferrer"`. Welche Elemente genau vorkommen, hängt vom Inhalt deines eRecht24-Projekts ab (je nach gewählten Diensten kommen weitere Abschnitte und Listen hinzu). Style deshalb alle Überschriftenebenen, Absätze, Listen und Links.

Die Komponente erzeugt nur diesen Wrapper:

```html
<div class="deine-klasse" lang="de"> …HTML von eRecht24… </div>
```

Alle Regeln hängen sich deshalb an **deine Wrapper-Klasse**, die du über die Prop `class` vergibst.

## Variante 1: Eigenes CSS mit `:global`

Astro-Scopestile erreichen Inhalte aus `set:html` nicht. Verwende `:global(...)` unterhalb deiner Klasse:

```astro
<LegalText type="privacyPolicy" class="legal-text" />

<style>
  :global(.legal-text) {
    max-width: 70ch;
    line-height: 1.65;
  }
  :global(.legal-text h1) { font-size: 2rem; margin-block: 0 1.5rem; }
  :global(.legal-text h2) { font-size: 1.5rem; margin-block: 2.5rem 1rem; }
  :global(.legal-text h3) { font-size: 1.25rem; margin-block: 2rem 0.75rem; }
  :global(.legal-text h4),
  :global(.legal-text h5) { font-size: 1.05rem; margin-block: 1.5rem 0.5rem; }
  :global(.legal-text p) { margin-block: 0 1rem; }
  :global(.legal-text ul) { margin-block: 0 1rem; padding-inline-start: 1.5rem; }
  :global(.legal-text li + li) { margin-top: 0.35rem; }
  :global(.legal-text a) { text-decoration: underline; overflow-wrap: anywhere; }
</style>
```

Lege diese Regeln am besten **einmal** in eine gemeinsame Datei oder in ein Layout, damit Impressum, Datenschutz und Social-Media-Seite gleich aussehen.

## Variante 2: Tailwind Typography

Mit Tailwind und dem Plugin `@tailwindcss/typography` reicht die Klasse `prose`:

```astro
<LegalText type="imprint" class="prose dark:prose-invert max-w-none" />
```

Tailwind v4 bindet das Plugin im CSS ein:

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
```

Bei Tailwind v3 steht es stattdessen in `tailwind.config.js` unter `plugins`. Die Klasse `prose` setzt dann Typografie für alle genannten Elemente. Passe einzelne Elemente mit Varianten wie `prose-h2:mt-10` oder `prose-a:underline` an.

## Variante 3: Design-Variablen und Dark Mode

Nutze deine bestehenden Variablen, dann folgt der Text automatisch deinem Theme:

```css
.legal-text {
  color: var(--color-text);
}
.legal-text a {
  color: var(--color-link);
}
.legal-text h1,
.legal-text h2,
.legal-text h3 {
  color: var(--color-heading);
}
```

Dark Mode ergibt sich aus den Variablen. Es sind keine eigenen Hell-/Dunkel-Regeln für den Rechtstext nötig. Prüfe nur den Kontrast der Links.

## Worauf du achten solltest

- **Silbentrennung:** Das HTML enthält weiche Trennzeichen (`&shy;`) wie in „Datenschutz&shy;erklärung“. Sie greifen nur bei `hyphens: manual` (Standard) oder `auto`. Mit `hyphens: none` brechen lange Wörter nicht um und laufen auf dem Handy über.
- **Lange Links:** Die Datenschutzerklärung enthält lange URLs. `overflow-wrap: anywhere` am Link verhindert horizontales Scrollen.
- **Zeilenumbrüche:** Adressen im Impressum bestehen aus `<br>` innerhalb von `<p>`. Setze `white-space` nicht auf `nowrap`.
- **Überschriftenebenen:** Impressum und Datenschutzerklärung beginnen mit `h1`, der Social-Media-Text mit `h3`. Style alle Ebenen, nicht nur die, die du auf einer Seite siehst.
- **Keine Anker:** Die Überschriften haben keine IDs. Ein Inhaltsverzeichnis mit Sprungmarken brauchst du selbst, etwa per Skript im Layout. Beachte dabei, dass der Text unverändert bleiben soll.
- **Kontrast und Lesbarkeit:** Rechtstexte sind lang. Eine Zeilenlänge von 60 bis 80 Zeichen (`max-width: 70ch`) liest sich deutlich besser.
- **Druck:** Wenn Besucher Rechtstexte drucken, lohnt ein kurzer `@media print`-Block, der Navigation ausblendet und Linkfarben neutral hält.

## Was nicht möglich ist

Das Paket verändert den Text bewusst nicht. Folgendes geht deshalb nicht über das Paket:

- Klassen oder IDs an einzelne Elemente setzen
- Elemente umbenennen oder Überschriftenebenen verschieben
- `target` oder `rel` an Links ändern
- Den Text kürzen oder umschreiben

Wenn du die Struktur anpassen musst, behandle das als eigene, bewusste Nachbearbeitung im Projekt und prüfe danach, dass der Rechtstext inhaltlich vollständig und unverändert bleibt. Dafür bleibt der Betreiber der Website verantwortlich.
