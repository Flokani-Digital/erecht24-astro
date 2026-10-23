# Changelog

## 0.1.0 (unveröffentlicht)

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
- Unterstützung für statische Builds, Node-SSR und Cloudflare (`workerd`-Prerendering) mit Astro 7.
- Rechtstexte können auch ohne `prerender = true` über Node-SSR und Cloudflare ausgegeben werden; der beim Build geladene Stand benötigt zur Laufzeit weder API-Zugriff noch Zugangsdaten.
