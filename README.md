# Once Human Database

An interactive, searchable reference database for **Once Human** (Starry Studio / NetEase) covering:

- **Weapons** (62) — every weapon family across all 9 categories, with rarity, stats, and a dedicated page per weapon
- **Mods** (41 named) — weapon-effect mods (Shrapnel, Power Surge, Frost Vortex, Bounce, Fast Gunner, Burn, Unstable Bomber, Fortress Warfare, Marked), each with its own page and drop sources
- **Blueprints** — the blueprint system plus construction/furniture/defense categories, each with a detail page listing unlock paths
- **Stations** — every crafting/cooking station (Gear Workbench tiers, Stove tiers, etc.) with unlock requirements and materials
- **Builds & Classes** — Once Human's weapon-effect archetypes (its closest equivalent to "classes") plus named meta loadouts, each cross-linked to its mods and weapons
- **Memetics** — the full Gathering / Crafting / Management / Building specialization system (105 specializations)
- **Deviants (Animals)** — 56 companion creatures with capture method, placement and cross-links to what they help you farm/cook/build
- **Crops & Ranching** — farming system, 10 crops, and livestock/breeding
- **Food & Cooking** — 80+ recipes with ingredients (linked back to crops), buff effects, and which station cooks them
- **Bosses** — the Great Ones plus seasonal/event bosses, each with fight mechanics and drops
- **Regions** — Manibus strongholds and other notable areas/scenarios
- **Updates** — patch history through the current live version

Every item across those categories has its own page — click a weapon, mod, deviant, crop, boss, blueprint, build, memetic or recipe and it opens a detail view with where to get it, how to craft it, what mods/food/blueprints it connects to, plus a breadcrumb and back link. Pages are deep-linkable (`#weapons/compound-bow`, `#deviants/mini-wonder`, etc.) so you can share a direct link to any single item.

It's a plain HTML/CSS/JS site (no build step, no framework, no client-side router library — just `location.hash`) backed by JSON data files, so it can be hosted anywhere that serves static files (GitHub Pages, Netlify, a simple `python3 -m http.server`, etc).

## Running locally

Browsers block `fetch()` against `file://` URLs, so serve the folder over HTTP:

```bash
python3 -m http.server 8080
# then open http://localhost:8080/
```

or with Node:

```bash
npx serve .
```

## Project structure

```
index.html               Page shell, tab bar, search box
assets/style.css         Styling (light/dark, follows system theme)
assets/app.js            Loads /data/*.json, builds cross-reference indexes, and
                          renders a hash-router (#tab or #tab/item) with a list
                          view + a detail page per item for every category
data/*.json              The actual database — one file per category
scripts/build-standalone.js   Bundles everything into dist/standalone.html
dist/standalone.html     Single-file build — open directly, no server needed
```

## Data & sources

All data is compiled from publicly available sources: the official Once Human site's patch notes, the Once Human Fandom wiki, oncehumandb.com, Game8, and other community guides. Full source list and a "when was this compiled" timestamp live in `data/meta.json` and are rendered on the **Sources** tab of the site itself.

Once Human updates frequently (multiple patches a month), so treat this as a snapshot — check the **Updates** tab for the version this was last compiled against, and the linked sources for anything more time-sensitive than that.

## Extending the data

Each JSON file in `data/` is hand-editable and independent — add a new weapon to `data/weapons.json`, a new deviant to `data/deviants.json`, etc, and the site picks it up automatically on reload, no build step required. Keep the shape of existing entries when adding new ones so the renderers in `assets/app.js` pick up every field.

## Disclaimer

This is an unofficial, fan-made reference project. It is not affiliated with, endorsed by, or sponsored by Starry Studio or NetEase. All game content, names and trademarks belong to their respective owners.
