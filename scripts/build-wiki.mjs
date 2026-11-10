// Erzeugt aus docs/ die Seiten für das GitHub Wiki.
// Aufruf: node scripts/build-wiki.mjs <Zielverzeichnis>
// docs/ bleibt die einzige Quelle; das Wiki ist nur ein Spiegel.

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(import.meta.url), '..', '..');
const docsDir = join(root, 'docs');
const outDir = process.argv[2] ? resolve(process.argv[2]) : null;

if (!outDir) {
  console.error('Aufruf: node scripts/build-wiki.mjs <Zielverzeichnis>');
  process.exit(1);
}

const repoUrl = 'https://github.com/Flokani-Digital/erecht24-astro';
const npmUrl = 'https://www.npmjs.com/package/@flokani.digital/erecht24-astro';

// Dateiname (ohne .md) -> { title, page } aus der ersten Überschrift
const pages = new Map();
for (const file of readdirSync(docsDir).filter((f) => f.endsWith('.md')).sort()) {
  const source = readFileSync(join(docsDir, file), 'utf8');
  const title = source.match(/^# (.+)$/m)?.[1]?.trim();
  if (!title) throw new Error(`${file}: keine Überschrift der Ebene 1 gefunden`);
  pages.set(basename(file, '.md'), { title, page: title.replace(/\s+/g, '-'), source });
}

const pageNames = new Set([...pages.values()].map((p) => p.page));
if (pageNames.size !== pages.size) throw new Error('Doppelte Wiki-Seitennamen');

// Interne Links ](datei.md#anker) -> ](Seitenname#anker); unbekannte Ziele sind ein Fehler
function rewriteLinks(markdown, file) {
  return markdown.replace(/\]\(([a-z0-9-]+)\.md(#[^)]*)?\)/g, (_m, name, anchor = '') => {
    const target = pages.get(name);
    if (!target) throw new Error(`${file}: Link auf unbekannte Seite ${name}.md`);
    return `](${target.page}${anchor})`;
  });
}

mkdirSync(outDir, { recursive: true });

for (const [name, { page, source }] of pages) {
  writeFileSync(join(outDir, `${page}.md`), rewriteLinks(source, `${name}.md`));
}

// Home: Tabelle "Dokumentation" aus der README übernehmen und auf Wiki-Seiten umbiegen
const readme = readFileSync(join(root, 'README.md'), 'utf8');
const rows = [...readme.matchAll(/^\| \[([^\]]+)\]\([^)]*\/docs\/([a-z0-9-]+)\.md\) \| (.+) \|$/gm)];
if (rows.length === 0) throw new Error('README: Dokumentationstabelle nicht gefunden');

const table = rows.map(([, label, name, text]) => {
  const target = pages.get(name);
  if (!target) throw new Error(`README: Link auf unbekannte Seite docs/${name}.md`);
  return `| [${label}](${target.page}) | ${text} |`;
});

writeFileSync(
  join(outDir, 'Home.md'),
  [
    '# Astro Rechtstexte für eRecht24',
    '',
    `Dokumentation zu [@flokani.digital/erecht24-astro](${npmUrl}): Rechtstexte beim Build von eRecht24 abrufen und statisch ausgeben.`,
    '',
    '| Thema | Inhalt |',
    '|---|---|',
    ...table,
    '',
    `Installation und Schnellstart stehen in der [README](${repoUrl}#readme). Fehler und Wünsche bitte als [Issue](${repoUrl}/issues) melden.`,
    '',
  ].join('\n'),
);

writeFileSync(
  join(outDir, '_Sidebar.md'),
  [
    '**[Start](Home)**',
    '',
    ...rows.map(([, label, name]) => `- [${label}](${pages.get(name).page})`),
    '',
    `[Repository](${repoUrl}) · [npm](${npmUrl})`,
    '',
  ].join('\n'),
);

writeFileSync(
  join(outDir, '_Footer.md'),
  `Dieses Wiki wird automatisch aus [\`docs/\`](${repoUrl}/tree/main/docs) erzeugt. Änderungen bitte per Pull Request im Repository vornehmen; direkte Wiki-Änderungen werden überschrieben.\n`,
);

console.log(`${pages.size} Seiten + Home, _Sidebar, _Footer nach ${outDir} geschrieben.`);
