#!/usr/bin/env bash
# Prüft den Build-Output (dist/) auf interne Links ohne Trailing Slash.
# Nutzung: bash check-trailing-slash.sh dist/
# Exit 0 = OK, Exit 1 = Fehler gefunden

DIR="${1:-dist/}"

if [ ! -d "$DIR" ]; then
  echo "FEHLER: Verzeichnis '$DIR' nicht gefunden. Erst 'astro build' ausführen."
  exit 1
fi

# Interne hrefs finden, die NICHT auf / enden und KEINE Dateiendung haben.
# Erlaubt: href="/pfad/", href="/datei.xml", href="/#anker"
MATCHES=$(grep -rhoE 'href="/[^"#?]*"' "$DIR" --include='*.html' \
  | grep -vE '/"$' \
  | grep -vE '\.[a-zA-Z0-9]{2,5}"$' \
  | sort | uniq -c | sort -rn)

if [ -n "$MATCHES" ]; then
  echo "FEHLER: Interne Links ohne Trailing Slash gefunden:"
  echo "$MATCHES"
  echo ""
  echo "Diese Links lösen 308-Redirects aus und erzeugen Search-Console-Fehler."
  echo "Fix: Trailing Slash ergänzen, z.B. href=\"/services/\" statt href=\"/services\"."
  exit 1
fi

echo "OK: Alle internen Links haben einen Trailing Slash."
exit 0
