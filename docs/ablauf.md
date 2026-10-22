# Ablauf im Überblick

Wann, wo und womit passiert was? Die Diagramme zeigen den Weg von der Konfiguration bis zum Besucher. Details zu Wiederholungen und Fehlern stehen in [Abruf und Fehlerverhalten](abruf-und-fehler.md).

## Build

```mermaid
flowchart TB
    subgraph setup["Einrichtung im Projekt"]
        cfg["astro.config.mjs<br/>rechtstexte({ documents, languages })"]
        env[".env oder CI-Secret<br/>ERECHT24_API_KEY (geheim)"]
    end

    subgraph build["Astro-Build (Node-Prozess, lokal oder CI)"]
        s1["1 astro:config:setup<br/>Vite-Plugin und virtuelles Modul"]
        s2["2 astro:build:start<br/>Keys laden: process.env vor .env"]
        s3["3 Abruf je Dokument<br/>seriell, 10 s Timeout, max. 3 Versuche"]
        s4["4 Prüfen<br/>nicht leer, DE/EN vorhanden, Warnungen loggen"]
        s5["5 Snapshot im virtuellen Modul<br/>nur HTML, keine Keys"]
        s6["6 Prerender<br/>LegalText liest das Modul, set:html"]
        fail["Fehler: Build bricht ab<br/>kein Ersatztext"]
        cache[("Cache im Astro-cacheDir<br/>nur mit fallbackToCache")]
    end

    api[("eRecht24 API<br/>api.e-recht24.de/v2")]
    pages["Seiten in src/pages<br/>&lt;LegalText type lang /&gt;<br/>prerender = true"]
    html["Statisches HTML<br/>/impressum/ /datenschutz/"]
    deploy["Deploy<br/>z. B. Cloudflare Pages / Workers Assets"]
    visitor(["Besucher<br/>nur fertiges HTML, kein API-Aufruf"])

    cfg --> s1
    env --> s2
    s1 --> s2 --> s3
    s3 -- "GET mit Headern<br/>api-key und plugin-key" --> api
    api -- JSON --> s3
    s3 --> s4
    s4 -- ok --> s5 --> s6
    s4 -- Fehler --> fail
    s3 -- "dauerhafter Fehler (401, 404, ...)" --> fail
    s3 -- "Ausfall (503, Timeout) mit fallbackToCache" --> cache
    cache -- "Stand gültig, Warnung" --> s5
    cache -- "kein / zu alter Stand" --> fail
    s4 -- "Erfolg: Stand speichern" --> cache
    pages -- import --> s6
    s6 --> html --> deploy --> visitor
```

## Sequenz

```mermaid
sequenceDiagram
    participant Dev as Entwickler / CI
    participant Astro as Astro-Build
    participant Int as Integration
    participant API as eRecht24 API
    participant Page as LegalText.astro

    Dev->>Astro: astro build
    Astro->>Int: astro:config:setup
    Int-->>Astro: Vite-Plugin, virtuelles Modul
    Astro->>Int: astro:build:start
    Int->>Int: Keys laden (process.env vor .env)
    loop je Dokument, nacheinander
        Int->>API: GET /v2/imprint, /privacyPolicy, ...
        API-->>Int: JSON mit html_de, html_en, warnings
    end
    Int->>Int: Prüfen, Warnungen loggen
    Int-->>Astro: Snapshot im virtuellen Modul
    Astro->>Page: Prerender der Rechtstextseiten
    Page-->>Astro: HTML per set:html
    Astro-->>Dev: statische Seiten in dist/
```

## Verhalten je Astro-Befehl

| Befehl | Abruf | Keys nötig |
|---|---|---|
| `astro build` | frisch, alle Dokumente, einmal je Dokumenttyp; bei Ausfall optional letzter Stand | ja |
| `astro dev` | beim ersten Rendern, danach Cache bis zum Neustart | ja |
| `astro sync`, `astro check` | nein | nein |
| `astro preview` | nein (liefert den vorhandenen Build) | nein |

Eine Änderung im eRecht24-Projekt-Manager erscheint erst nach dem nächsten erfolgreichen Build und Deployment. Plane deshalb regelmäßige Builds ein.
