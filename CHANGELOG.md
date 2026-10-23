# Changelog

## 0.1.0 (unveröffentlicht)

- Astro-Integration: eRecht24-Rechtstexte (Impressum, Datenschutzerklärung, Social-Media-Datenschutz) beim Build abrufen.
- Komponente `LegalText.astro` mit `type`, `lang` und `class`.
- Deutsch und Englisch aus demselben Abruf, Timeout, Wiederholungen und Warnungsausgabe.
- Option `fallbackToCache`: im Build bei vorübergehendem eRecht24-Ausfall den letzten erfolgreichen Stand (mit Altersgrenze und Warnung) verwenden. Standardmäßig aus.
- Log-Meldungen für den Abruf: „API-Abruf gestartet: …“ und „API-Abruf erfolgreich: n Dokumente, Sprache …“.
- Unterstützung für statische Builds, Node-SSR und Cloudflare (`workerd`-Prerendering) mit Astro 7.
