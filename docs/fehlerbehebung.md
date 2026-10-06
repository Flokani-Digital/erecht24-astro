# Fehlerbehebung

Alle Meldungen beginnen mit `[@flokani.digital/erecht24-astro]`.

## Zugangsdaten

| Meldung | Ursache | Lösung |
|---|---|---|
| `ERECHT24_API_KEY wird für den Abruf benötigt.` | Variable fehlt im Build | In `.env.local` oder als Secret setzen, siehe [Zugangsdaten](zugangsdaten.md). Bei `vite.envDir: false` in die Prozessumgebung |
| `Zugangsschlüssel enthalten ungültige Zeichen.` | Leerzeichen, Zeilenumbruch oder Nicht-ASCII-Zeichen im Wert | Nur den reinen Key ohne Leerraum eintragen, beim Kopieren auf versteckte Zeichen achten |
| `Das Paket enthält noch keinen eRecht24-Developer-Key.` | Kein eingebauter Plugin-Key im Paket | `ERECHT24_PLUGIN_KEY` mit eigenem Developer-Key setzen |

## Abruf

| Meldung | Ursache | Lösung |
|---|---|---|
| `<typ>: Abruf fehlgeschlagen (HTTP 401)` | Schlüssel falsch oder keine passende eRecht24-Mitgliedschaft | Schlüssel und Mitgliedschaft prüfen |
| `<typ>: Abruf fehlgeschlagen (HTTP 404)` | Das Dokument ist im eRecht24-Projekt nicht angelegt, häufig `privacyPolicySocialMedia` | Dokument in eRecht24 anlegen oder aus `documents` entfernen |
| `<typ> (en): Rechtstext fehlt oder ist leer.` | Die Sprache ist im Projekt nicht gepflegt | Text in eRecht24 ergänzen oder `languages` anpassen |
| `<typ>: Netzwerkfehler oder Timeout nach 3 Versuchen.` | Keine Verbindung oder API zu langsam | Netzwerk des Build-Servers prüfen, Build erneut starten |
| `Abruf fehlgeschlagen (HTTP 429/5xx)` | API überlastet oder Rate-Limit | Später erneut bauen. Verlangt `Retry-After` mehr als 10 s, bricht der Build ab |
| `<typ>: Die API-Antwort enthält kein gültiges JSON.` / `Unerwartete Antwortstruktur.` | Ungültige Antwort, etwa durch einen Proxy | Netzwerkpfad prüfen, Fehler an eRecht24 melden |
| `<typ>: Die API-Antwort enthält vertrauliche Zugangsdaten.` | Der Rechtstext enthält den Projekt-API-Key | Text in eRecht24 prüfen; Key gegebenenfalls neu erzeugen |

## Konfiguration

| Meldung | Ursache | Lösung |
|---|---|---|
| `Die Konfiguration muss ein Objekt sein.` | Falscher Aufruf von `rechtstexte(...)` | Objekt übergeben oder leer aufrufen |
| `Unbekannte Option. Erlaubt sind documents und languages.` | Tippfehler oder nicht unterstützte Option | Nur `documents` und `languages` verwenden |
| `documents muss bekannte Dokumenttypen enthalten.` | Leere Liste oder unbekannter Wert | `imprint`, `privacyPolicy`, `privacyPolicySocialMedia` |
| `languages muss de und/oder en enthalten.` | Leere Liste oder unbekannter Wert | `de` und/oder `en` |

## Komponente und Seiten

| Meldung | Ursache | Lösung |
|---|---|---|
| `Der Dokumenttyp "…" wurde nicht in documents konfiguriert.` | Komponente nutzt einen Typ, der nicht geladen wird | Typ in `documents` aufnehmen |
| `Die Sprache "…" wurde für … nicht in languages konfiguriert oder der Text fehlt.` | `lang` passt nicht zu `languages` | `languages` ergänzen oder `lang` korrigieren |
| `Rechtstextseiten benötigen export const prerender = true.` | Seite wird dynamisch gerendert (SSR) | `export const prerender = true;` in die Seite |
| `Inhalte sind vor dem Rendern noch nicht geladen.` | Seite wird außerhalb von `build` oder `dev` gerendert | Über `astro build` oder `astro dev` starten |
| `Rechtstexte dürfen nur im Astro-Frontmatter importiert werden.` | Import in Client-Code | Nur in `.astro`-Frontmatter oder serverseitig verwenden |

## Der Text sieht falsch aus

- **Zwei H1 auf einer Seite:** Impressum und Datenschutzerklärung bringen eine eigene H1 mit, siehe [Seiten und Komponente](seiten-und-komponente.md).
- **Stile greifen nicht:** `:global(.deine-klasse …)` verwenden, siehe [Styling](styling.md).
- **Social-Media-Text ohne Überschrift:** Er beginnt mit `<h3>`; der Seite eine eigene Überschrift geben.
- **Text veraltet:** Neuen Build und Deployment auslösen, siehe [Abruf und Fehlerverhalten](abruf-und-fehler.md).
