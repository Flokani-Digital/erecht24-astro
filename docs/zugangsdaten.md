# Zugangsdaten

eRecht24 verwendet zwei Schlüssel, die als Request-Header an die API gesendet werden.

| Schlüssel | Header | Herkunft | Geheim? |
|---|---|---|---|
| **Projekt-API-Key** | `eRecht24-api-key` | Du erzeugst ihn im eRecht24-Projekt-Manager | **Ja** |
| **Plugin-Key** (Developer-Key) | `eRecht24-plugin-key` | Von eRecht24 an Flokani vergeben, im Paket enthalten | Nein |

Du musst in der Regel nur den Projekt-API-Key setzen.

## API-Key setzen

Lege im **Astro-Projekt** eine nicht versionierte Datei an, zum Beispiel `.env.local`:

```dotenv
ERECHT24_API_KEY=dein-projekt-api-key
```

Trage die Datei in `.gitignore` ein. Verwende **keinen** `PUBLIC_`-Präfix; der Key darf nie im Browser landen.

### Wo die Variable gelesen wird

Reihenfolge, die höhere Stufe gewinnt:

1. Prozessumgebung (`ERECHT24_API_KEY=… npx astro build`, CI-Secrets)
2. Env-Dateien im Projektverzeichnis, wie Vite sie lädt (`.env`, `.env.local`, `.env.[mode]`)

Die Integration berücksichtigt den tatsächlichen Vite-`mode` und `envDir`. Mit `vite.envDir: false` werden keine Dateien geladen; dann muss die Variable in der Prozessumgebung stehen.

## Deployment und CI

Hinterlege `ERECHT24_API_KEY` im Secret-Speicher deines Hosters oder deiner CI und stelle sicher, dass er beim **Build** verfügbar ist. Zur Laufzeit wird er nicht benötigt, weil keine API-Aufrufe beim Seitenbesuch stattfinden.

## Plugin-Key überschreiben

Der Plugin-Key ist fest im Paket enthalten. Setze `ERECHT24_PLUGIN_KEY` nur, wenn du mit einem eigenen Developer-Key von eRecht24 arbeitest (zum Beispiel in einem Fork). Der Wert überschreibt dann den eingebauten Schlüssel.

## Sicherheit

- Schlüssel werden ausschließlich als Header an die feste HTTPS-Adresse der eRecht24-API gesendet.
- Warnungen und Fehlermeldungen entfernen bekannte Schlüsselwerte aus dem Text.
- Enthält eine API-Antwort den Projekt-API-Key im Rechtstext selbst, bricht der Build ab.
- Schlüssel müssen aus druckbaren ASCII-Zeichen ohne Leerzeichen bestehen; sonst bricht der Build ab, ohne den Wert auszugeben.
