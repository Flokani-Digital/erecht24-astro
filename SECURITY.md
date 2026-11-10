# Sicherheitsrichtlinie

## Unterstützte Versionen

Sicherheitskorrekturen erscheinen für die jeweils aktuelle Version `0.1.x`. Ältere Versionen erhalten keine Korrekturen; bitte auf die neueste Version aktualisieren.

## Sicherheitslücke melden

Bitte **kein öffentliches Issue** öffnen. Melde Sicherheitslücken privat über GitHub:

[Sicherheitslücke melden](https://github.com/Flokani-Digital/erecht24-astro/security/advisories/new) (Reiter „Security“ → „Report a vulnerability“)

Hilfreich sind die betroffene Version, eine kurze Beschreibung, die Schritte zur Reproduktion und die erwartete Auswirkung. Bitte keine echten API-Keys oder Zugangsdaten mitsenden.

## Umgang mit Schlüsseln

- Der **Projekt-API-Key** (`ERECHT24_API_KEY`) ist ein Geheimnis. Er gehört in `.env.local` oder in ein CI-Secret und darf nicht versioniert werden. Die eigenen Fehlermeldungen des Pakets enthalten keine Schlüsselwerte.
- Der **Plugin-Key** im Paket identifiziert das Plugin gegenüber eRecht24 und ist öffentlich. Er ist kein Geheimnis.
- Der Abruf findet nur beim Build statt. Im Browser der Besucher gibt es keinen API-Aufruf.

## Hinweis

Das Paket ist kein offizielles Produkt von eRecht24. Fragen zu den Rechtstexten selbst gehören an eRecht24.
