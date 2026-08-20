#!/usr/bin/env node
// Bundles index.html + assets/style.css + assets/js/*.js + every data/*.json
// into a single self-contained dist/standalone.html — no server, no fetch(),
// works by opening the file directly in a browser.

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const dataDir = path.join(root, "data");
const jsDir = path.join(root, "assets/js");

const css = fs.readFileSync(path.join(root, "assets/style.css"), "utf8");

// Load js modules in filename order (01-, 02-, ... 14-) — the same order
// index.html loads them in, since load order matters for the window.OH
// namespace pattern (each file assumes earlier ones already ran).
const jsFiles = fs.readdirSync(jsDir).filter(f => f.endsWith(".js")).sort();
const js = jsFiles.map(f => `/* --- ${f} --- */\n` + fs.readFileSync(path.join(jsDir, f), "utf8")).join("\n\n");

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
<meta name="description" content="Unofficial community database for Once Human — weapons, mods, blueprints, builds, tech tree, deviants, ranching, crops, bosses, regions and patch history.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Work+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
${css}
</style>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>

<header class="site-header">
  <div class="header-inner">
    <button type="button" class="menu-toggle" id="menu-toggle" aria-expanded="false" aria-controls="mobile-drawer" aria-label="Open navigation menu">
      <span aria-hidden="true">☰</span>
    </button>
    <a class="brand" href="#home">
      <h1>Once Human Database</h1>
      <span class="version-pill" id="version-pill">v—</span>
    </a>
    <div class="search-box">
      <label class="sr-only" for="global-search">Search the database</label>
      <input type="search" id="global-search" placeholder="Search everything… (weapons, mods, deviants, bosses…)"
             autocomplete="off" role="combobox" aria-expanded="false" aria-controls="search-results" aria-autocomplete="list">
      <div class="search-results" id="search-results" role="listbox" aria-label="Search results" hidden></div>
    </div>
  </div>
  <nav class="nav-groups" id="nav-groups" aria-label="Main navigation"></nav>
</header>

<div class="drawer-backdrop" id="drawer-backdrop" hidden></div>
<nav class="mobile-drawer" id="mobile-drawer" aria-label="Main navigation" hidden></nav>

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
console.log(`Wrote ${path.join(outDir, "standalone.html")} (${(html.length / 1024).toFixed(0)} KB) from ${jsFiles.length} js modules: ${jsFiles.join(", ")}`);
