#!/usr/bin/env node
// Generates src/sitemap.xml by scanning src/tools/ and using git history for lastmod dates.
// Usage: node sitemap.js [baseUrl]
// Default base URL: https://tools.blackmesa.dk

import { readdirSync, existsSync, writeFileSync } from 'fs';
import { join, relative, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

const BASE_URL = (process.argv[2] || 'https://tools.blackmesa.dk').replace(/\/$/, '');
const SRC_DIR = join(__dirname, 'src');
const TOOLS_DIR = join(SRC_DIR, 'tools');
const OUT_FILE = join(SRC_DIR, 'sitemap.xml');

function gitLastModified(filePath) {
  try {
    const iso = execSync(
      `git log -1 --format=%aI -- "${filePath}"`,
      { cwd: __dirname, stdio: ['ignore', 'pipe', 'ignore'] }
    ).toString().trim();
    if (!iso) return null;
    // Trim to YYYY-MM-DD
    return iso.slice(0, 10);
  } catch {
    return null;
  }
}

const today = new Date().toISOString().slice(0, 10);

// Homepage
const pages = [
  {
    loc: `${BASE_URL}/`,
    lastmod: gitLastModified(join(SRC_DIR, 'index.html')) ?? today,
  },
];

// Tool pages — discover by scanning src/tools/*/index.html
const toolDirs = readdirSync(TOOLS_DIR, { withFileTypes: true })
  .filter(e => e.isDirectory())
  .map(e => e.name)
  .sort();

for (const name of toolDirs) {
  const indexFile = join(TOOLS_DIR, name, 'index.html');
  if (!existsSync(indexFile)) continue;

  pages.push({
    loc: `${BASE_URL}/tools/${name}/`,
    lastmod: gitLastModified(join(TOOLS_DIR, name)) ?? today,
  });
}

// Build XML
const entries = pages.map(p =>
`  <url>
    <loc>${p.loc}</loc>
    <lastmod>${p.lastmod}</lastmod>
  </url>`
).join('\n');

const xml =
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;

writeFileSync(OUT_FILE, xml);
console.log(`Written ${pages.length} URLs to ${relative(__dirname, OUT_FILE)}`);
pages.forEach(p => console.log(`  ${p.lastmod}  ${p.loc}`));
