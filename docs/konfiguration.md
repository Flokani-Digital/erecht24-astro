# Konfiguration

## Integrations-Optionen

```js
rechtstexte({
  documents: ['imprint', 'privacyPolicy'],
  languages: ['de'],
})
```

Beide Optionen sind optional. Weitere Optionen gibt es nicht; unbekannte Schlüssel brechen mit einem Fehler ab.

| Option | Werte | Standard | Bedeutung |
|---|---|---|---|
| `documents` | `'imprint'`, `'privacyPolicy'`, `'privacyPolicySocialMedia'` | `['imprint', 'privacyPolicy']` | Welche Rechtstexte beim Build geladen werden |
| `languages` | `'de'`, `'en'` | `['de']` | In welchen Sprachen jeder gewählte Text vorliegen muss |

Regeln:

- Die Datenschutzerklärung für Social Media wird nur abgerufen, wenn du sie ausdrücklich in `documents` aufführst.
- **Jedes gewählte Dokument muss in jeder gewählten Sprache** im eRecht24-Projekt vorhanden sein. Fehlt eine Kombination, bricht der Build ab. Wähle `languages` also nur so, wie die Texte in eRecht24 gepflegt sind.
- Duplikate werden zusammengefasst. Leere Listen und unbekannte Werte werden abgewiesen.
- Die Reihenfolge von `languages` ist relevant: die erste Sprache ist der Standard der Komponente.

## Komponente `LegalText`

```astro
import LegalText from '@flokani.digital/erecht24-astro/LegalText.astro';

<LegalText type="privacyPolicy" lang="de" class="legal-text" />
```

| Prop | Pflicht | Werte | Standard |
|---|---|---|---|
| `type` | ja | `'imprint'`, `'privacyPolicy'`, `'privacyPolicySocialMedia'` | – |
| `lang` | nein | `'de'`, `'en'` | erste Sprache aus `languages` |
| `class` | nein | beliebiger Klassenname | – |

Die Komponente gibt ein `<div>` mit `lang`-Attribut und dem Text aus. Verwendest du einen Typ oder eine Sprache, die nicht konfiguriert ist, bricht der Build mit einer Fehlermeldung ab.

## Umgebungsvariablen

| Variable | Pflicht | Standard | Bedeutung |
|---|---|---|---|
| `ERECHT24_API_KEY` | ja | – | Projekt-API-Key aus eRecht24, geheim |
| `ERECHT24_PLUGIN_KEY` | nein | im Paket enthalten | Nur für eigene Integrationen mit eigenem Developer-Key |

Details und Ladereihenfolge: [Zugangsdaten](zugangsdaten.md).

## Feste Werte

Diese Werte sind nicht konfigurierbar:

| Wert | Festlegung |
|---|---|
| API-Adresse | `https://api.e-recht24.de/v2/` |
| Versuche pro Dokument | höchstens 3 |
| Zeitlimit pro Versuch | 10 Sekunden, einschließlich Antwort-Body |
| Wartezeit zwischen Versuchen | 1 s, dann 2 s |
| Wiederholt wird bei | Netzwerkfehler, Timeout, HTTP 429, 500, 502, 503, 504 |
| `Retry-After` (bei 429) | wird beachtet, mehr als 10 s führt zum Abbruch |

Mehr dazu in [Abruf und Fehlerverhalten](abruf-und-fehler.md).
