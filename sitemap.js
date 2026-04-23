#!/usr/bin/env node
// Generates src/sitemap.xml by scanning src/tools/ and using git history for lastmod dates.
// Usage: node sitemap.js [baseUrl]
// Default base URL: https://tools.blackmesa.dk

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BASE_URL = (process.argv[2] || 'https://tools.blackmesa.dk').replace(/\/$/, '');
const SRC_DIR = path.join(__dirname, 'src');
const TOOLS_DIR = path.join(SRC_DIR, 'tools');
const OUT_FILE = path.join(SRC_DIR, 'sitemap.xml');

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
    lastmod: gitLastModified(path.join(SRC_DIR, 'index.html')) ?? today,
  },
];

// Tool pages — discover by scanning src/tools/*/index.html
const toolDirs = fs.readdirSync(TOOLS_DIR, { withFileTypes: true })
  .filter(e => e.isDirectory())
  .map(e => e.name)
  .sort();

for (const name of toolDirs) {
  const indexFile = path.join(TOOLS_DIR, name, 'index.html');
  if (!fs.existsSync(indexFile)) continue;

  pages.push({
    loc: `${BASE_URL}/tools/${name}/`,
    lastmod: gitLastModified(path.join(TOOLS_DIR, name)) ?? today,
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

fs.writeFileSync(OUT_FILE, xml);
console.log(`Written ${pages.length} URLs to ${path.relative(__dirname, OUT_FILE)}`);
pages.forEach(p => console.log(`  ${p.lastmod}  ${p.loc}`));
