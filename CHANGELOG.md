# Changelog

## 0.1.1 (2026-11-10)

- README: Badges für npm-Version, CI und Lizenz.
- Keywords ergänzt: `astro`, `impressum`, `datenschutz`.
- Repository: `SECURITY.md` mit Meldeweg für Sicherheitslücken. Der Quellcode des Pakets blieb unverändert.

## 0.1.0 (2026-11-10)

- Astro 6 wird zusätzlich zu Astro 7 unterstützt (Peer-Abhängigkeiten: `astro ^6.0.0 || ^7.4.2`, `vite ^7.3.1 || ^8.3.5`). Der Quellcode blieb unverändert. Die CI prüft Astro 6.0.0, 6.4.8 und 7 jeweils unter Node 22.23.4 und 24.22.1; der Integrationstest gibt die tatsächlich installierten Versionen aus und schlägt fehl, wenn eine vorgegebene Version nicht installiert wurde. Zwischenstände 6.1 bis 6.3 sind nicht eigens getestet.
- Abhängigkeiten aktualisiert: Astro 7.4.2, Vite 8.3.5, Node-Adapter 11.1.9, Cloudflare-Adapter 14.4.2, Wrangler 4.153.0 und Astro Check 0.9.12; TypeScript bleibt wegen Astro Check auf der kompatiblen Version 6.0.3.
- Mindestanforderungen für Astro 7 auf 7.4.2, Vite 8.3.5 und Node 22.23.4 angehoben; lokale Entwicklung weiterhin mit Node 24.22.1 LTS. CI für Node 22 und 24 sowie aktualisierte GitHub Actions.
- Integrationstests dürfen fehlende npm-Metadaten und Pakete nachladen, auch ohne Versions-Overrides.
- Indirekte Abhängigkeiten aktualisiert; ein auf `undici` 7.x begrenzter npm-Override stellt die korrigierte Version ab 7.30.1 auch im Cloudflare-Teststack sicher.
- Astro-Integration: eRecht24-Rechtstexte (Impressum, Datenschutzerklärung, Social-Media-Datenschutz) beim Build abrufen.
- Komponente `LegalText.astro` mit `type`, `lang` und `class`.
- Deutsch und Englisch aus demselben Abruf, Timeout, Wiederholungen und Warnungsausgabe.
- Rechtstexte werden auch bei Übereinstimmungen mit dem Projekt-API-Key übernommen. API-Warnungen erscheinen als Klartext ohne Steuerzeichen und ohne Ersetzung von Schlüsselwerten; eigene Fehlermeldungen enthalten weiterhin keine Schlüsselwerte.
- `Retry-After` wird bei HTTP 429 nur als Sekundenangabe ausgewertet. HTTP-Datumswerte verwenden wie ungültige Angaben die reguläre Wartezeit von 1 s, dann 2 s. Mehr als 10 s führt weiterhin sofort zum Abruffehler, ohne Wartezeit oder weiteren Versuch.
- Dokumentation präzisiert: `dev` verwendet nach dem ersten erfolgreichen Abruf denselben Stand bis zum Serverneustart; Änderungen in eRecht24 benötigen einen Dev-Neustart.
- Die lokale Demo lädt die Mock-Umleitung nur einmal.
- Option `fallbackToCache`: im Build bei vorübergehendem eRecht24-Ausfall den letzten erfolgreichen Stand (mit Altersgrenze und Warnung) verwenden. Standardmäßig aus.
- Der Cache-Fallback ist über einen SHA-256-Fingerabdruck an den Projekt-API-Key gebunden und verwirft Cache-Dateien ohne passende Projektzuordnung.
- Der Build leert `dist/` vor dem Kompilieren, damit Ausgaben gelöschter Quellen nicht im NPM-Archiv verbleiben.
- Log-Meldungen für den Abruf: „API-Abruf gestartet: …“ und „API-Abruf erfolgreich: n Dokumente, Sprache …“.
- Lizenz: MIT.
- Die Dokumentation unter `docs/` wird nicht mehr mit dem Paket ausgeliefert; die README verlinkt sie auf GitHub.
- Unterstützung für statische Builds, Node-SSR und Cloudflare (`workerd`-Prerendering) mit Astro 6 und 7.
- Rechtstexte können auch ohne `prerender = true` über Node-SSR und Cloudflare ausgegeben werden; der beim Build geladene Stand benötigt zur Laufzeit weder API-Zugriff noch Zugangsdaten.
