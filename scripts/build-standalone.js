#!/usr/bin/env node
// Bundles index.html + assets/style.css + assets/app.js + every data/*.json
// into a single self-contained dist/standalone.html — no server, no fetch(),
// works by opening the file directly in a browser.

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const dataDir = path.join(root, "data");

const css = fs.readFileSync(path.join(root, "assets/style.css"), "utf8");
const js = fs.readFileSync(path.join(root, "assets/app.js"), "utf8");

const data = {};
for (const file of fs.readdirSync(dataDir)) {
  if (!file.endsWith(".json")) continue;
  const key = file.replace(/\.json$/, "");
  data[key] = JSON.parse(fs.readFileSync(path.join(dataDir, file), "utf8"));
}

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Once Human Database</title>
<meta name="description" content="Unofficial community database for Once Human — weapons, mods, blueprints, builds, memetics, deviants, crops, bosses, regions and patch history.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Work+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
${css}
</style>
</head>
<body>
<header class="site-header">
  <div class="header-inner">
    <div class="brand">
      <h1>Once Human Database</h1>
      <span class="version-pill" id="version-pill">v—</span>
    </div>
    <div class="search-box">
      <input type="search" id="global-search" placeholder="Search everything… (weapons, mods, deviants, bosses…)" autocomplete="off">
    </div>
  </div>
  <nav class="tabs" id="tabs"></nav>
</header>
<main id="main"></main>
<footer class="site-footer" id="footer">Loading…</footer>
<script>window.__OH_DATA = ${JSON.stringify(data)};</script>
<script>
${js}
</script>
</body>
</html>
`;

const outDir = path.join(root, "dist");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "standalone.html"), html);
console.log(`Wrote ${path.join(outDir, "standalone.html")} (${(html.length / 1024).toFixed(0)} KB)`);
