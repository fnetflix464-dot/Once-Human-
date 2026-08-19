# Once Human Database

A static, searchable reference database for **Once Human** (Starry Studio / NetEase) covering:

- **Weapons** — weapon types, rarity tiers, top-tier/legendary picks
- **Mods** — weapon effect mods (Shrapnel, Power Surge, Frost Vortex, Bounce, Fast Gunner, Burn, Unstable Bomber, Fortress Warfare, Marked)
- **Blueprints** — how the blueprint system works and the main construction/furniture/defense categories
- **Builds & Classes** — Once Human's weapon-effect archetypes (its closest equivalent to "classes") plus named meta loadouts
- **Memetics** — the full Gathering / Crafting / Management / Building specialization system
- **Deviants (Animals)** — companion creatures, their category and abilities
- **Crops** — farming system and notable crops with uses
- **Bosses** — the Great Ones plus seasonal/event bosses
- **Regions** — Manibus strongholds and other notable areas/scenarios
- **Updates** — patch history through the current live version

It's a plain HTML/CSS/JS site (no build step, no framework) backed by JSON data files, so it can be hosted anywhere that serves static files (GitHub Pages, Netlify, a simple `python3 -m http.server`, etc).

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
index.html          Page shell, tab bar, search box
assets/style.css     Styling (dark theme)
assets/app.js        Loads /data/*.json and renders each tab, plus global search
data/*.json          The actual database — one file per category
```

## Data & sources

All data is compiled from publicly available sources: the official Once Human site's patch notes, the Once Human Fandom wiki, oncehumandb.com, Game8, and other community guides. Full source list and a "when was this compiled" timestamp live in `data/meta.json` and are rendered on the **Sources** tab of the site itself.

Once Human updates frequently (multiple patches a month), so treat this as a snapshot — check the **Updates** tab for the version this was last compiled against, and the linked sources for anything more time-sensitive than that.

## Extending the data

Each JSON file in `data/` is hand-editable and independent — add a new weapon to `data/weapons.json`, a new deviant to `data/deviants.json`, etc, and the site picks it up automatically on reload, no build step required. Keep the shape of existing entries when adding new ones so the renderers in `assets/app.js` pick up every field.

## Disclaimer

This is an unofficial, fan-made reference project. It is not affiliated with, endorsed by, or sponsored by Starry Studio or NetEase. All game content, names and trademarks belong to their respective owners.
