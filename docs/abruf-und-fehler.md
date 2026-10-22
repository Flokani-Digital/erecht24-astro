# Abruf und Fehlerverhalten

## Wann wird abgerufen?

| Astro-Befehl | Verhalten |
|---|---|
| `build` | Frischer Abruf aller konfigurierten Dokumente, einmal je Dokumenttyp; Deutsch und Englisch kommen aus derselben Antwort |
| `dev` | Abruf beim ersten Bedarf, danach Wiederverwendung bis zum Neustart; gleichzeitige Seiten teilen sich den laufenden Abruf |
| `sync`, `check` | Prüfen Typen und Konfiguration, **ohne** Zugangsdaten und ohne API-Abruf |
| `preview` | Liefert bereits gebaute Seiten aus, ohne erneuten Abruf |

Die Dokumente werden nacheinander abgerufen. Bei einem dauerhaften Fehler stoppt der Abruf sofort.

In `dev` wird ein erfolgreicher Abruf für die Lebensdauer des Servers gespeichert. Nach einem Fehler (zum Beispiel falscher Key) den Fehler beheben und den Dev-Server neu starten; ein Neustart lädt außerdem einen frischen Stand.

Das gilt auch mit Node- und Cloudflare-Adapter in deren Standardkonfiguration. In Produktion werden ausschließlich die beim Build eingebetteten Texte ausgegeben; ein Abruf zur Laufzeit findet nicht statt.

## Wiederholungen und Zeitlimits

- Höchstens **3 Versuche** je Dokument.
- Jeder Versuch hat **10 Sekunden**, einschließlich des Response-Bodys.
- Zwischen den Versuchen wird **1 s**, dann **2 s** gewartet.
- Wiederholt wird bei Netzwerkfehlern, Timeouts und HTTP `429`, `500`, `502`, `503`, `504`.
- Bei `429` wird `Retry-After` beachtet (Sekunden oder HTTP-Datum). Verlangt der Server mehr als 10 Sekunden, bricht der Abruf ab.
- Alle anderen HTTP-Fehler (zum Beispiel `401`, `404`) und Weiterleitungen werden nicht wiederholt.

## Ausfall: Fallback auf den letzten Stand

Standardmäßig bricht ein Build bei einem Ausfall von eRecht24 ab (zum Beispiel bei einer Wartung mit HTTP 503). Mit `fallbackToCache` kannst du das für **vorübergehende** Ausfälle abmildern:

```js
rechtstexte({ fallbackToCache: { maxAgeDays: 7 } }) // oder fallbackToCache: true (= 7 Tage)
```

So funktioniert es:

- Jeder Build ruft weiterhin frisch ab. Nach einem vollständig erfolgreichen Abruf speichert das Paket die Texte in `<cacheDir>/erecht24-astro/snapshot.json`. Standard ist `node_modules/.astro/`; Astro-Option `cacheDir`. Die Datei enthält nur Rechtstexte und den Abrufzeitpunkt, keine Schlüssel.
- Schlägt der Abruf nach allen Wiederholungen **vorübergehend** fehl (Netzwerkfehler, Timeout, HTTP `429`, `500`, `502`, `503`, `504`), verwendet der Build den gespeicherten Stand und gibt eine **Warnung** mit dem Datum aus.
- Ist kein Stand vorhanden, er ist älter als `maxAgeDays`, passt nicht zu `documents`/`languages` oder ist beschädigt, bricht der Build ab. Die Meldung nennt den Grund.
- **Kein** Fallback bei `401`, `403`, `404`, fehlendem Key, ungültiger Antwort, leerem oder fehlendem Text. Das sind Konfigurations- oder Inhaltsfehler.
- Nur im `build`. `astro dev` ruft immer live ab und zeigt Fehler offen an.

Wichtig:

- Ein Fallback kann **veraltete Rechtstexte** veröffentlichen. Wähle `maxAgeDays` bewusst kurz und beachte die Build-Warnungen im Deployment-System. Die Verantwortung für aktuelle Texte bleibt beim Betreiber.
- In CI und beim Hosting wirkt der Fallback nur, wenn das Cache-Verzeichnis zwischen den Builds erhalten bleibt. Ohne erhaltenen Cache gibt es nach einem frischen Checkout keinen Stand zum Zurückfallen. Prüfe das für deinen Anbieter (bei Cloudflare Pages ist es nicht getestet).

## Wann bricht der Build ab?

- `ERECHT24_API_KEY` fehlt oder enthält ungültige Zeichen
- Ein Dokument ist im eRecht24-Projekt nicht angelegt (HTTP 404) oder der Zugriff wird verweigert (HTTP 401)
- Ein Text fehlt in einer gewählten Sprache oder ist leer
- Die API-Antwort ist kein gültiges JSON oder hat eine unerwartete Struktur
- Die Antwort enthält den Projekt-API-Key im Text
- Netzwerkfehler oder Timeout nach 3 Versuchen (ohne `fallbackToCache` oder ohne nutzbaren Stand)

Es gibt **keinen stillen Rückgriff** auf alte Texte. Ein fehlgeschlagener Build soll das letzte erfolgreiche Deployment bestehen lassen; dafür sorgt dein Deployment-System.

## Warnungen

eRecht24 kann zu einem Dokument Hinweise (`warnings`) mitliefern, etwa zur Einbindung. Sie erscheinen als lesbarer Text im Astro-Log. Warnungen verhindern den Build nicht, sollten aber gelesen werden, weil sie rechtlich relevante Hinweise enthalten können.

## Texte aktuell halten

Änderungen in eRecht24 sind erst nach einem neuen, erfolgreichen Build und Deployment sichtbar. Plane dafür:

- regelmäßige Builds (zum Beispiel täglich oder wöchentlich per Zeitplan)
- sichtbare Benachrichtigungen bei fehlgeschlagenen Builds

In Produktion findet kein API-Aufruf im Browser oder beim Seitenbesuch statt.
