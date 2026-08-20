// Once Human Database — client-side app
// Loads /data/*.json and renders tabbed, searchable panels with a
// hash-based router (#tab or #tab/item-slug) so every item gets its own
// deep-linkable detail page. No build step required.

const DATA_FILES = {
  meta: "data/meta.json",
  weapons: "data/weapons.json",
  mods: "data/mods.json",
  blueprints: "data/blueprints.json",
  stations: "data/stations.json",
  builds: "data/builds.json",
  classes: "data/classes.json",
  memetics: "data/memetics.json",
  deviants: "data/deviants.json",
  crops: "data/crops.json",
  food: "data/food.json",
  bosses: "data/bosses.json",
  regions: "data/regions.json",
  updates: "data/updates.json"
};

const TABS = [
  { id: "home", label: "Overview" },
  { id: "weapons", label: "Weapons" },
  { id: "mods", label: "Mods" },
  { id: "blueprints", label: "Blueprints" },
  { id: "stations", label: "Stations" },
  { id: "builds", label: "Builds & Classes" },
  { id: "memetics", label: "Memetics" },
  { id: "deviants", label: "Deviants (Animals)" },
  { id: "crops", label: "Crops & Ranching" },
  { id: "food", label: "Food & Cooking" },
  { id: "bosses", label: "Bosses" },
  { id: "regions", label: "Regions" },
  { id: "updates", label: "Updates" },
  { id: "sources", label: "Sources" }
];

// Tabs whose cards open a dedicated detail page.
const DETAIL_TABS = new Set(["weapons", "mods", "blueprints", "stations", "builds", "classes", "memetics", "deviants", "crops", "food", "bosses"]);

const ARCHETYPE_GROUP_NAME = {
  shrapnel: "Shrapnel",
  "power-surge": "Power Surge",
  "frost-vortex": "Frost Vortex",
  bounce: "Bounce",
  "fast-gunner": "Fast Gunner",
  burn: "Burn",
  "unstable-bomber": "Unstable Bomber",
  "fortress-warfare": "Fortress Warfare",
  marked: "Marked / Bull's Eye"
};

const state = { data: {}, active: "home", detailId: null, query: "" };

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[''"()!.]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
}

function keyFor(item) {
  return item.id || slugify(item.name);
}

async function loadAll() {
  // Standalone/preview builds may embed the data directly on window.__OH_DATA
  // (see build-standalone.js) so the page works without a fetch()-capable server.
  if (window.__OH_DATA) {
    state.data = window.__OH_DATA;
    return;
  }
  const entries = Object.entries(DATA_FILES);
  const results = await Promise.all(entries.map(async ([key, path]) => {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
    return [key, await res.json()];
  }));
  results.forEach(([key, val]) => { state.data[key] = val; });
}

/* ---------------------------------------------------------------------- */
/* Cross-reference indexes, built once data is loaded                     */
/* ---------------------------------------------------------------------- */

const idx = {};

function buildIndexes() {
  const d = state.data;

  idx.weapons = d.weapons.weapons.map(w => ({ ...w, _key: keyFor(w) }));
  idx.weaponTypeById = Object.fromEntries(d.weapons.weaponTypes.map(t => [t.id, t]));

  idx.modGroups = d.mods.groups.map(g => ({ ...g, _key: slugify(g.effect) }));
  idx.mods = [];
  idx.modGroups.forEach(g => {
    g.mods.forEach(m => {
      idx.mods.push({ ...m, groupEffect: g.effect, groupDescription: g.description, groupObtainedFrom: g.obtainedFrom, _key: g._key + "--" + slugify(m.name) });
    });
  });

  idx.blueprintCategories = d.blueprints.categories.map(c => ({ ...c, _key: c.id }));

  idx.stationsAll = [
    ...d.stations.weaponAndGearStations.map(s => ({ ...s, _group: "Weapon & Gear", _key: s.id })),
    ...d.stations.cookingStations.map(s => ({ ...s, _group: "Cooking", _key: s.id })),
    ...d.stations.otherStations.map(s => ({ ...s, _group: "Other", _key: s.id }))
  ];

  idx.builds = d.builds.builds.map(b => ({ ...b, _key: b.id }));
  idx.archetypes = d.classes.weaponEffectArchetypes.map(a => ({ ...a, _key: a.id }));

  idx.memetics = [];
  Object.entries(d.memetics.branches).forEach(([branch, list]) => {
    list.forEach(m => idx.memetics.push({ ...m, branch, _key: slugify(branch) + "--" + slugify(m.name) }));
  });

  idx.deviants = d.deviants.deviants.map(v => ({ ...v, _key: slugify(v.name) }));

  idx.crops = d.crops.crops.map(c => ({ ...c, _kind: "crop", _key: c.id }));
  idx.livestock = d.crops.livestock.map(l => ({ ...l, _kind: "livestock", _key: slugify(l.name) }));

  idx.foodRecipes = [];
  d.food.categories.forEach(cat => {
    cat.recipes.forEach(r => idx.foodRecipes.push({ ...r, category: cat.name, _key: slugify(r.name) }));
  });

  idx.bosses = [
    ...d.bosses.greatOnes.map(b => ({ ...b, _kind: "greatOne", _key: b.id })),
    ...d.bosses.seasonalAndEventBosses.map(b => ({ ...b, _kind: "seasonal", _key: b.id }))
  ];
}

function findWeapon(key) { return idx.weapons.find(w => w._key === key); }
function findMod(key) { return idx.mods.find(m => m._key === key); }
function findModGroup(key) { return idx.modGroups.find(g => g._key === key); }
function findBlueprintCategory(key) { return idx.blueprintCategories.find(c => c._key === key); }
function findStation(key) { return idx.stationsAll.find(s => s._key === key); }
function findBuild(key) { return idx.builds.find(b => b._key === key); }
function findArchetype(key) { return idx.archetypes.find(a => a._key === key); }
function findMemetic(key) { return idx.memetics.find(m => m._key === key); }
function findDeviant(key) { return idx.deviants.find(v => v._key === key); }
function findCrop(key) { return idx.crops.find(c => c._key === key) || idx.livestock.find(l => l._key === key); }
function findFoodRecipe(key) { return idx.foodRecipes.find(r => r._key === key); }
function findBoss(key) { return idx.bosses.find(b => b._key === key); }

function findModGroupByArchetype(archetypeId) {
  const name = ARCHETYPE_GROUP_NAME[archetypeId];
  return name ? idx.modGroups.find(g => g.effect === name) : null;
}
function weaponsByArchetype(archetypeId) {
  return idx.weapons.filter(w => (w.commonArchetypes || []).includes(archetypeId));
}
function buildsByArchetype(archetypeId) {
  return idx.builds.filter(b => b.archetype === archetypeId);
}
function buildsByWeapon(weaponKey) {
  return idx.builds.filter(b => (b.suggestedWeapons || []).includes(weaponKey));
}
function foodRecipeByLooseName(name) {
  const base = String(name).replace(/\s*\([^)]*\)\s*$/, "").trim();
  return idx.foodRecipes.find(r => r.name === name) || idx.foodRecipes.find(r => r.name === base);
}
function cropByIngredientName(ingredient) {
  const clean = String(ingredient).replace(/^Deviated\s+/i, "").replace(/\s*\(.*\)$/, "").trim().toLowerCase();
  return idx.crops.find(c => clean.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(clean));
}

/* ---------------------------------------------------------------------- */
/* Routing                                                                 */
/* ---------------------------------------------------------------------- */

// "classes" is a detail-only sub-route (archetype pages) that lives under the
// "Builds & Classes" nav tab rather than having its own tab button.
const ROUTE_TO_NAV_TAB = { classes: "builds" };

function parseHash() {
  const raw = (location.hash || "").replace(/^#\/?/, "");
  const [tab, ...rest] = raw.split("/").filter(Boolean);
  const validTab = (TABS.some(t => t.id === tab) || DETAIL_TABS.has(tab)) ? tab : "home";
  return { tab: validTab, id: rest.length ? decodeURIComponent(rest.join("/")) : null };
}

function onHashChange() {
  const { tab, id } = parseHash();
  state.active = tab;
  state.detailId = id;
  syncTabButtons();
  render();
  window.scrollTo(0, 0);
}

function navigate(tab, id) {
  location.hash = id ? `${tab}/${encodeURIComponent(id)}` : tab;
}
window.__ohNav = (tab, id) => navigate(tab, id);

function syncTabButtons() {
  const navTab = ROUTE_TO_NAV_TAB[state.active] || state.active;
  document.querySelectorAll("nav.tabs button").forEach(b => {
    b.classList.toggle("active", b.dataset.tab === navTab);
  });
}

function buildTabs() {
  const nav = document.getElementById("tabs");
  nav.innerHTML = "";
  TABS.forEach(t => {
    const btn = document.createElement("button");
    btn.textContent = t.label;
    btn.dataset.tab = t.id;
    btn.addEventListener("click", () => navigate(t.id, null));
    nav.appendChild(btn);
  });
  syncTabButtons();
}

/* ---------------------------------------------------------------------- */
/* Shared small helpers for markup                                        */
/* ---------------------------------------------------------------------- */

function matchesQuery(text) {
  if (!state.query) return true;
  return String(text).toLowerCase().includes(state.query);
}

function link(tab, id, label, opts) {
  opts = opts || {};
  const cls = opts.cls ? ` class="${esc(opts.cls)}"` : "";
  return `<a href="#${tab}/${encodeURIComponent(id)}"${cls}>${esc(label)}</a>`;
}

function cardOpen(tab, id) {
  return `<div class="card card-link" role="link" tabindex="0" data-tab="${esc(tab)}" data-id="${esc(id)}">`;
}

function breadcrumb(tabId, tabLabel, itemLabel) {
  return `<div class="breadcrumb"><a href="#home">Overview</a> <span class="sep">/</span> <a href="#${esc(tabId)}">${esc(tabLabel)}</a> <span class="sep">/</span> <span>${esc(itemLabel)}</span></div>`;
}

function backLink(tabId, tabLabel) {
  return `<a class="back-link" href="#${esc(tabId)}">&larr; Back to ${esc(tabLabel)}</a>`;
}

function emptyState() {
  return `<div class="empty-state">No matches for “${esc(state.query)}” in this section.</div>`;
}

function tabLabel(id) {
  const t = TABS.find(t => t.id === id);
  return t ? t.label : id;
}

/* ---------------------------------------------------------------------- */
/* Render dispatch                                                         */
/* ---------------------------------------------------------------------- */

function render() {
  const main = document.getElementById("main");
  const panel = document.createElement("div");
  panel.className = "panel active";

  if (state.detailId && DETAIL_TABS.has(state.active)) {
    panel.innerHTML = renderDetail(state.active, state.detailId);
  } else {
    const renderers = {
      home: renderHome, weapons: renderWeapons, mods: renderMods, blueprints: renderBlueprints,
      stations: renderStations, builds: renderBuilds, memetics: renderMemetics, deviants: renderDeviants,
      crops: renderCrops, food: renderFood, bosses: renderBosses, regions: renderRegions,
      updates: renderUpdates, sources: renderSources
    };
    panel.innerHTML = (renderers[state.active] || renderHome)();
  }

  main.innerHTML = "";
  main.appendChild(panel);
  wireCardClicks(panel);
}

function wireCardClicks(root) {
  root.querySelectorAll(".card-link").forEach(card => {
    const go = () => navigate(card.dataset.tab, card.dataset.id);
    card.addEventListener("click", go);
    card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
  });
}

function renderDetail(tab, id) {
  const renderers = {
    weapons: renderWeaponDetail, mods: renderModDetail, blueprints: renderBlueprintDetail,
    stations: renderStationDetail, builds: renderBuildDetail, classes: renderArchetypeDetail,
    memetics: renderMemeticDetail, deviants: renderDeviantDetail, crops: renderCropDetail,
    food: renderFoodDetail, bosses: renderBossDetail
  };
  const fn = renderers[tab];
  if (!fn) return `<div class="empty-state">Unknown page.</div>`;
  const html = fn(id);
  return html != null ? html : `<div class="empty-state">Item not found. ${backLink(tab, tabLabel(tab))}</div>`;
}

/* ---------------------------------------------------------------------- */
/* Overview                                                                */
/* ---------------------------------------------------------------------- */

function renderHome() {
  const meta = state.data.meta;
  const counts = {
    weapons: idx.weapons.length,
    mods: idx.mods.length,
    deviants: idx.deviants.length,
    crops: idx.crops.length + idx.livestock.length,
    bosses: idx.bosses.length,
    builds: idx.builds.length,
    memetics: idx.memetics.length,
    food: idx.foodRecipes.length
  };
  return `
    <div class="hero">
      <h2 style="border:none;margin-bottom:4px;">${esc(meta.siteName)}</h2>
      <p>${esc(meta.description)}</p>
      <p><strong>Compiled:</strong> ${esc(meta.lastCompiled)} against game version <strong>${esc(meta.gameVersionAtCompile)}</strong>.</p>
    </div>
    <div class="grid">
      ${statCard("Weapons", counts.weapons, "weapons")}
      ${statCard("Named Mods", counts.mods, "mods")}
      ${statCard("Deviants & Livestock", counts.deviants, "deviants")}
      ${statCard("Crops & Animals", counts.crops, "crops")}
      ${statCard("Food & Drink Recipes", counts.food, "food")}
      ${statCard("Great Ones (Bosses)", counts.bosses, "bosses")}
      ${statCard("Builds", counts.builds, "builds")}
      ${statCard("Memetic Specializations", counts.memetics, "memetics")}
    </div>
    <div class="section-block">
      <h3>Click anything</h3>
      <p class="intro">Every weapon, mod, blueprint, build, memetic, deviant, crop, food recipe and boss has its own page — where to get it, how to craft it, and what it connects to (mods to run, food to cook, blueprints it unlocks). Click a stat above or use a tab to start browsing.</p>
    </div>
    <div class="section-block">
      <h3>⚠️ About this database</h3>
      <p class="intro">${esc(meta.disclaimer)}</p>
    </div>
  `;
}

function statCard(label, value, tab) {
  return `<div class="card" style="cursor:pointer" onclick="window.__ohNav('${tab}')">
    <div class="meta">${esc(label)}</div>
    <h3 style="font-size:1.8rem;color:var(--accent-2)">${value}</h3>
  </div>`;
}

/* ---------------------------------------------------------------------- */
/* Weapons                                                                 */
/* ---------------------------------------------------------------------- */

function renderWeapons() {
  const w = state.data.weapons;
  const items = idx.weapons.filter(x => matchesQuery(x.name + x.type + (x.notes || "")));
  return `
    <h2>Weapons</h2>
    <p class="intro">${esc(w.note)}</p>
    <div class="badge-list">${w.weaponTypes.map(t => `<span class="tag" title="${esc(t.description)}">${esc(t.name)}</span>`).join("")}</div>
    <div class="grid">
      ${items.map(x => `
        ${cardOpen("weapons", x._key)}
          <h3>${esc(x.name)}</h3>
          <div class="meta">
            <span class="tag">${esc(labelForType(x.type, w.weaponTypes))}</span>
            <span class="tag tier-${esc(x.tier || "")}">Tier ${esc(x.tier || "?")}</span>
            <span class="tag">${esc(capitalize(x.rarity))}</span>
          </div>
          ${x.damage ? `<p><strong>Damage:</strong> ${esc(x.damage)}${x.fireRate ? ` · <strong>RPM:</strong> ${esc(x.fireRate)}` : ""}</p>` : ""}
          <p>${esc(x.notes || "")}</p>
        </div>
      `).join("") || emptyState()}
    </div>
  `;
}
function labelForType(id, types) {
  const t = types.find(t => t.id === id);
  return t ? t.name : id;
}
function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

function renderWeaponDetail(key) {
  const w = findWeapon(key);
  if (!w) return null;
  const station = findStation(w.craftingStation);
  const builds = buildsByWeapon(w._key);
  const archetypeCards = (w.commonArchetypes || []).map(aid => {
    const arch = findArchetype(aid);
    const group = findModGroupByArchetype(aid);
    if (!arch) return "";
    return `
      <div class="card">
        <h3>${link("classes", arch._key, arch.name)}</h3>
        <div class="meta"><span class="tag">${esc(arch.role)}</span></div>
        <p>${esc(arch.summary)}</p>
        ${group ? `<p><strong>Mods to run:</strong></p><ul>${group.mods.slice(0, 5).map(m => `<li>${link("mods", slugify(group.effect) + "--" + slugify(m.name), m.name)} — ${esc(m.effect)}</li>`).join("")}</ul>` : ""}
      </div>`;
  }).join("");

  return `
    ${breadcrumb("weapons", "Weapons", w.name)}
    <h2>${esc(w.name)}</h2>
    <div class="meta" style="margin-bottom:10px">
      <span class="tag">${esc(labelForType(w.type, state.data.weapons.weaponTypes))}</span>
      ${w.tier ? `<span class="tag tier-${esc(w.tier)}">Tier ${esc(w.tier)}</span>` : ""}
      <span class="tag">${esc(capitalize(w.rarity))}</span>
    </div>
    ${w.damage ? `<p><strong>Damage:</strong> ${esc(w.damage)}${w.fireRate ? ` &middot; <strong>Fire rate:</strong> ${esc(w.fireRate)} RPM` : ""}</p>` : ""}
    <p>${esc(w.notes || "")}</p>

    <div class="section-block">
      <h3>Where to get it &amp; how to craft it</h3>
      <p class="intro" style="margin-top:0">${esc(w.acquisition)}</p>
      ${station ? `<div class="card"><h3>${link("stations", station._key, station.name)}</h3><div class="meta"><span class="tag">Tier ${esc(station.tier)}</span></div>${station.unlock ? `<p>${esc(station.unlock)}</p>` : ""}${station.materials ? `<p><strong>Materials:</strong> ${station.materials.map(esc).join(", ")}</p>` : ""}<p>${esc(station.produces)}</p></div>` : ""}
    </div>

    ${archetypeCards ? `<div class="section-block"><h3>Recommended weapon effects &amp; mods</h3><div class="grid">${archetypeCards}</div></div>` : ""}

    ${builds.length ? `<div class="section-block"><h3>Used in builds</h3><div class="grid">${builds.map(b => `<div class="card"><h3>${link("builds", b._key, b.name)}</h3><div class="meta"><span class="tag">${esc(b.role)}</span></div><p>${esc(b.summary)}</p></div>`).join("")}</div></div>` : ""}

    ${backLink("weapons", "Weapons")}
  `;
}

/* ---------------------------------------------------------------------- */
/* Mods                                                                    */
/* ---------------------------------------------------------------------- */

function renderMods() {
  const m = state.data.mods;
  const groups = idx.modGroups
    .map(g => ({ ...g, mods: g.mods.filter(x => matchesQuery(x.name + x.effect + g.effect)) }))
    .filter(g => g.mods.length || matchesQuery(g.effect));
  return `
    <h2>Mods</h2>
    <p class="intro">${esc(m.overview)}</p>
    <div class="section-block">
      <h3>How mods are farmed</h3>
      <ul>${m.howToFarm.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
    </div>
    ${groups.map(g => `
      <div class="section-block">
        <h3>${link("classes", g._key, g.effect)}</h3>
        <p class="intro" style="margin-top:0">${esc(g.description)} <em>${esc(g.obtainedFrom)}</em></p>
        <div class="grid">
          ${g.mods.map(x => `
            ${cardOpen("mods", g._key + "--" + slugify(x.name))}
              <h3>${esc(x.name)}</h3>
              <p>${esc(x.effect)}</p>
            </div>
          `).join("")}
        </div>
      </div>
    `).join("") || emptyState()}
  `;
}

function renderModDetail(key) {
  const mod = findMod(key);
  if (!mod) return null;
  const group = findModGroup(slugify(mod.groupEffect));
  const weapons = weaponsByArchetype(group ? group._key : "");
  return `
    ${breadcrumb("mods", "Mods", mod.name)}
    <h2>${esc(mod.name)}</h2>
    <div class="meta" style="margin-bottom:10px">${group ? `<span class="tag">${link("classes", group._key, group.effect)}</span>` : ""}</div>
    <p>${esc(mod.effect)}</p>
    <div class="section-block">
      <h3>Where to get it</h3>
      <p class="intro" style="margin-top:0">${esc(mod.groupObtainedFrom)}</p>
    </div>
    ${weapons.length ? `<div class="section-block"><h3>Pairs well with</h3><div class="grid">${weapons.map(w => `<div class="card"><h3>${link("weapons", w._key, w.name)}</h3><p>${esc(w.notes || "")}</p></div>`).join("")}</div></div>` : ""}
    ${backLink("mods", "Mods")}
  `;
}

/* ---------------------------------------------------------------------- */
/* Blueprints                                                              */
/* ---------------------------------------------------------------------- */

function renderBlueprints() {
  const b = state.data.blueprints;
  const cats = idx.blueprintCategories.filter(c => matchesQuery(c.name + c.description + c.examples.join(" ")));
  return `
    <h2>Blueprints</h2>
    <p class="intro">${esc(b.overview)}</p>
    <div class="section-block">
      <h3>How to obtain blueprints</h3>
      <ul>${b.howToObtain.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
    </div>
    <div class="grid">
      ${cats.map(c => `
        ${cardOpen("blueprints", c._key)}
          <h3>${esc(c.name)}</h3>
          <p>${esc(c.description)}</p>
          <ul>${c.examples.slice(0, 4).map(e => `<li>${esc(e)}</li>`).join("")}</ul>
        </div>
      `).join("") || emptyState()}
    </div>
    <p class="intro" style="margin-top:18px"><strong>Recent change:</strong> ${esc(b.notableConstructionUpdate)}</p>
  `;
}

function renderBlueprintDetail(key) {
  const c = findBlueprintCategory(key);
  if (!c) return null;
  return `
    ${breadcrumb("blueprints", "Blueprints", c.name)}
    <h2>${esc(c.name)}</h2>
    <p>${esc(c.description)}</p>
    <div class="section-block">
      <h3>Example items in this category</h3>
      <ul>${c.examples.map(e => `<li>${esc(e)}</li>`).join("")}</ul>
    </div>
    <div class="section-block">
      <h3>Unlocked by</h3>
      <p class="intro" style="margin-top:0">${esc(c.unlockedBy || "See the general acquisition methods below.")}</p>
      <h3>How to obtain</h3>
      <ul>${state.data.blueprints.howToObtain.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
    </div>
    ${backLink("blueprints", "Blueprints")}
  `;
}

/* ---------------------------------------------------------------------- */
/* Stations                                                                */
/* ---------------------------------------------------------------------- */

function renderStations() {
  const s = state.data.stations;
  const items = idx.stationsAll.filter(x => matchesQuery(x.name + (x.produces || "")));
  const groups = ["Weapon & Gear", "Cooking", "Other"];
  return `
    <h2>Crafting &amp; Cooking Stations</h2>
    <p class="intro">${esc(s.overview)}</p>
    ${groups.map(g => {
      const gi = items.filter(x => x._group === g);
      if (!gi.length) return "";
      return `<div class="section-block"><h3>${esc(g)}</h3><div class="grid">${gi.map(x => `
        ${cardOpen("stations", x._key)}
          <h3>${esc(x.name)}</h3>
          <div class="meta">${x.tier ? `<span class="tag">Tier ${esc(x.tier)}</span>` : ""}</div>
          <p>${esc(x.produces || "")}</p>
        </div>
      `).join("")}</div></div>`;
    }).join("") || emptyState()}
  `;
}

function renderStationDetail(key) {
  const s = findStation(key);
  if (!s) return null;
  return `
    ${breadcrumb("stations", "Stations", s.name)}
    <h2>${esc(s.name)}</h2>
    <div class="meta" style="margin-bottom:10px">${s.tier ? `<span class="tag">Tier ${esc(s.tier)}</span>` : ""}<span class="tag">${esc(s._group)}</span></div>
    ${s.unlock ? `<p><strong>Unlock:</strong> ${esc(s.unlock)}</p>` : ""}
    ${s.materials ? `<p><strong>Materials to build:</strong> ${s.materials.map(esc).join(", ")}</p>` : ""}
    <p><strong>Produces:</strong> ${esc(s.produces || "")}</p>
    ${backLink("stations", "Stations")}
  `;
}

/* ---------------------------------------------------------------------- */
/* Builds & Classes                                                        */
/* ---------------------------------------------------------------------- */

function renderBuilds() {
  const builds = idx.builds.filter(x => matchesQuery(x.name + x.summary + x.role));
  const classes = state.data.classes;
  return `
    <h2>Builds &amp; Classes</h2>
    <p class="intro">${esc(classes.overview)}</p>
    <div class="section-block">
      <h3>Weapon Effect Archetypes ("Classes")</h3>
      <div class="grid">
        ${idx.archetypes.filter(a => matchesQuery(a.name + a.summary)).map(a => `
          ${cardOpen("classes", a._key)}
            <h3>${esc(a.name)}</h3>
            <div class="meta"><span class="tag">${esc(a.role)}</span></div>
            <p>${esc(a.summary)}</p>
          </div>
        `).join("")}
      </div>
    </div>
    <div class="section-block">
      <h3>Memetic Branches</h3>
      <div class="grid">
        ${classes.memeticBranches.map(b => `
          <div class="card" style="cursor:pointer" onclick="window.__ohNav('memetics')"><h3>${esc(b.name)}</h3><p>${esc(b.focus)}</p></div>
        `).join("")}
      </div>
      <p class="intro">${esc(classes.note)}</p>
    </div>
    <div class="section-block">
      <h3>Named Builds</h3>
      <div class="grid">
        ${builds.map(x => `
          ${cardOpen("builds", x._key)}
            <h3>${esc(x.name)}</h3>
            <div class="meta"><span class="tag">${esc(x.role)}</span></div>
            <p>${esc(x.summary)}</p>
          </div>
        `).join("") || emptyState()}
      </div>
    </div>
  `;
}

function renderBuildDetail(key) {
  const b = findBuild(key);
  if (!b) return null;
  const arch = findArchetype(b.archetype);
  const weapons = (b.suggestedWeapons || []).map(findWeapon).filter(Boolean);
  return `
    ${breadcrumb("builds", "Builds & Classes", b.name)}
    <h2>${esc(b.name)}</h2>
    <div class="meta" style="margin-bottom:10px"><span class="tag">${esc(b.role)}</span>${arch ? `<span class="tag">${link("classes", arch._key, arch.name)}</span>` : ""}</div>
    <p>${esc(b.summary)}</p>
    <div class="section-block">
      <h3>Suggested weapons</h3>
      <div class="grid">${weapons.map(w => `${cardOpen("weapons", w._key)}<h3>${esc(w.name)}</h3><p>${esc(w.notes || "")}</p></div>`).join("") || "<p class='intro'>None listed.</p>"}</div>
    </div>
    <div class="section-block">
      <h3>Suggested mods</h3>
      <ul>${(b.suggestedMods || []).map(m => `<li>${esc(m)}</li>`).join("")}</ul>
    </div>
    ${backLink("builds", "Builds & Classes")}
  `;
}

function renderArchetypeDetail(key) {
  const a = findArchetype(key);
  if (!a) return null;
  const group = findModGroupByArchetype(a._key);
  const weapons = weaponsByArchetype(a._key);
  const builds = buildsByArchetype(a._key);
  return `
    ${breadcrumb("builds", "Builds & Classes", a.name)}
    <h2>${esc(a.name)}</h2>
    <div class="meta" style="margin-bottom:10px"><span class="tag">${esc(a.role)}</span></div>
    <p>${esc(a.summary)}</p>
    ${group ? `<div class="section-block"><h3>Mods</h3><div class="table-wrap"><table class="data-table"><thead><tr><th>Mod</th><th>Effect</th></tr></thead><tbody>${group.mods.map(m => `<tr><td>${link("mods", group._key + "--" + slugify(m.name), m.name)}</td><td>${esc(m.effect)}</td></tr>`).join("")}</tbody></table></div><p class="intro">${esc(group.obtainedFrom)}</p></div>` : ""}
    ${weapons.length ? `<div class="section-block"><h3>Commonly paired weapons</h3><div class="grid">${weapons.map(w => `${cardOpen("weapons", w._key)}<h3>${esc(w.name)}</h3><p>${esc(w.notes || "")}</p></div>`).join("")}</div></div>` : ""}
    ${builds.length ? `<div class="section-block"><h3>Named builds using this</h3><div class="grid">${builds.map(b => `${cardOpen("builds", b._key)}<h3>${esc(b.name)}</h3><p>${esc(b.summary)}</p></div>`).join("")}</div></div>` : ""}
    ${backLink("builds", "Builds & Classes")}
  `;
}

/* ---------------------------------------------------------------------- */
/* Memetics                                                                */
/* ---------------------------------------------------------------------- */

function renderMemetics() {
  const branches = state.data.memetics.branches;
  const branchLabels = { gathering: "Gathering", crafting: "Crafting", management: "Management", building: "Building" };
  return `
    <h2>Memetic Specializations</h2>
    <p class="intro">${esc(state.data.memetics.overview)}</p>
    ${Object.entries(branches).map(([bkey, list]) => {
      const filtered = list.filter(x => matchesQuery(x.name + x.effect)).map(x => ({ ...x, _key: slugify(bkey) + "--" + slugify(x.name) }));
      if (!filtered.length) return "";
      return `
        <div class="section-block">
          <h3>${esc(branchLabels[bkey] || bkey)} <span class="tag">${filtered.length}</span></h3>
          <div class="table-wrap"><table class="data-table">
            <thead><tr><th>Specialization</th><th>Effect</th></tr></thead>
            <tbody>${filtered.map(x => `<tr><td>${link("memetics", x._key, x.name)}</td><td>${esc(x.effect)}</td></tr>`).join("")}</tbody>
          </table></div>
        </div>
      `;
    }).join("") || emptyState()}
  `;
}

function renderMemeticDetail(key) {
  const m = findMemetic(key);
  if (!m) return null;
  const branchLabels = { gathering: "Gathering", crafting: "Crafting", management: "Management", building: "Building" };
  return `
    ${breadcrumb("memetics", "Memetics", m.name)}
    <h2>${esc(m.name)}</h2>
    <div class="meta" style="margin-bottom:10px"><span class="tag">${esc(branchLabels[m.branch] || m.branch)} branch</span></div>
    <p>${esc(m.effect)}</p>
    <p class="intro">Every 5 levels from level 5 onward you choose 1 of 4 randomly offered specializations, one per branch — up to 10 total by level 50.</p>
    ${backLink("memetics", "Memetics")}
  `;
}

/* ---------------------------------------------------------------------- */
/* Deviants                                                                */
/* ---------------------------------------------------------------------- */

function renderDeviants() {
  const d = state.data.deviants;
  const items = idx.deviants.filter(x => matchesQuery(x.name + x.category + x.ability));
  return `
    <h2>Deviants (Animals / Companions)</h2>
    <p class="intro">${esc(d.overview)}</p>
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>Name</th><th>Category</th><th>Ability</th></tr></thead>
      <tbody>
        ${items.map(x => `<tr><td>${link("deviants", x._key, x.name)}</td><td><span class="tag">${esc(x.category)}</span></td><td>${esc(x.ability)}</td></tr>`).join("")}
      </tbody>
    </table></div>
    ${!items.length ? emptyState() : ""}
  `;
}

function renderDeviantDetail(key) {
  const v = findDeviant(key);
  if (!v) return null;
  const cm = state.data.deviants.captureMethod;
  return `
    ${breadcrumb("deviants", "Deviants", v.name)}
    <h2>${esc(v.name)}</h2>
    <div class="meta" style="margin-bottom:10px"><span class="tag">${esc(v.category)}</span></div>
    <p>${esc(v.ability)}</p>
    ${v.crossRef ? `<p class="intro"><strong>Connects to:</strong> ${esc(v.crossRef)}</p>` : ""}
    <div class="section-block">
      <h3>How to capture it</h3>
      <ul>
        <li>${esc(cm.wildCapture)}</li>
        <li>${esc(cm.bindingCapsule)}</li>
        <li>${esc(cm.placement)}</li>
        <li>${esc(cm.power)}</li>
      </ul>
      <p class="intro">${esc(cm.cookingLink)}</p>
    </div>
    ${backLink("deviants", "Deviants")}
  `;
}

/* ---------------------------------------------------------------------- */
/* Crops & Ranching                                                        */
/* ---------------------------------------------------------------------- */

function renderCrops() {
  const c = state.data.crops;
  const items = idx.crops.filter(x => matchesQuery(x.name + x.uses + x.foundNear));
  const livestock = idx.livestock.filter(x => matchesQuery(x.name + (x.products || "")));
  return `
    <h2>Crops &amp; Ranching</h2>
    <p class="intro">${esc(c.overview)}</p>
    <div class="section-block">
      <h3>How to farm</h3>
      <ul>${c.howToFarm.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
    </div>
    <div class="grid">
      ${items.map(x => `
        ${cardOpen("crops", x._key)}
          <h3>${esc(x.name)}</h3>
          <p><strong>Uses:</strong> ${esc(x.uses)}</p>
          <p><strong>Found near:</strong> ${esc(x.foundNear)}</p>
        </div>
      `).join("") || emptyState()}
    </div>
    <div class="section-block">
      <h3>Deviant helpers</h3>
      <div class="grid">
        ${c.deviantHelpers.map(x => `<div class="card"><h3>${esc(x.name)}</h3><p>${esc(x.helps)}</p></div>`).join("")}
      </div>
    </div>
    <div class="section-block">
      <h3>Livestock &amp; Ranching</h3>
      <p class="intro" style="margin-top:0">${esc(c.livestockOverview)}</p>
      <div class="grid">
        ${livestock.map(x => `
          ${cardOpen("crops", x._key)}
            <h3>${esc(x.name)}</h3>
            <div class="meta"><span class="tag tier-${esc(x.tier)}">Tier ${esc(x.tier)}</span></div>
            <p><strong>Products:</strong> ${esc(x.products)}</p>
            ${x.notes ? `<p>${esc(x.notes)}</p>` : ""}
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderCropDetail(key) {
  const c = findCrop(key);
  if (!c) return null;
  if (c._kind === "livestock") {
    return `
      ${breadcrumb("crops", "Crops & Ranching", c.name)}
      <h2>${esc(c.name)}</h2>
      <div class="meta" style="margin-bottom:10px"><span class="tag tier-${esc(c.tier)}">Tier ${esc(c.tier)}</span><span class="tag">Livestock</span></div>
      <p><strong>Products:</strong> ${esc(c.products)}</p>
      ${c.notes ? `<p>${esc(c.notes)}</p>` : ""}
      <div class="section-block">
        <h3>Taming &amp; breeding</h3>
        <p class="intro" style="margin-top:0">${esc(state.data.crops.livestockOverview)}</p>
        <p><strong>Feed:</strong> ${link("food", slugify("Mixed Grain Feed"), "Mixed Grain Feed")} or ${link("food", slugify("Mixed Herb Feed"), "Mixed Herb Feed")} both grant +20% Tameness.</p>
      </div>
      ${backLink("crops", "Crops & Ranching")}
    `;
  }
  const recipes = (c.usedInRecipes || []).map(foodRecipeByLooseName).filter(Boolean);
  return `
    ${breadcrumb("crops", "Crops & Ranching", c.name)}
    <h2>${esc(c.name)}</h2>
    <p><strong>Found near:</strong> ${esc(c.foundNear)}</p>
    <p>${esc(c.uses)}</p>
    <div class="section-block">
      <h3>How to farm</h3>
      <ul>${state.data.crops.howToFarm.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
    </div>
    ${recipes.length ? `<div class="section-block"><h3>Used in food recipes</h3><div class="grid">${recipes.map(r => `${cardOpen("food", r._key)}<h3>${esc(r.name)}</h3><p>${esc(r.effect)}</p></div>`).join("")}</div></div>` : ""}
    ${backLink("crops", "Crops & Ranching")}
  `;
}

/* ---------------------------------------------------------------------- */
/* Food & Cooking                                                          */
/* ---------------------------------------------------------------------- */

function renderFood() {
  const f = state.data.food;
  return `
    <h2>Food &amp; Cooking</h2>
    <p class="intro">${esc(f.overview)}</p>
    ${f.categories.map(cat => {
      const recipes = cat.recipes.filter(r => matchesQuery(r.name + r.effect + r.ingredients.join(" "))).map(r => ({ ...r, _key: slugify(r.name) }));
      if (!recipes.length) return "";
      return `
        <div class="section-block">
          <h3>${esc(cat.name)} <span class="tag">${recipes.length}</span></h3>
          <div class="grid">
            ${recipes.map(r => `
              ${cardOpen("food", r._key)}
                <h3>${esc(r.name)}</h3>
                <p><strong>Ingredients:</strong> ${r.ingredients.map(esc).join(", ")}</p>
                <p>${esc(r.effect)}</p>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    }).join("") || emptyState()}
  `;
}

function renderFoodDetail(key) {
  const r = findFoodRecipe(key);
  if (!r) return null;
  const cropLinks = r.ingredients.map(i => ({ raw: i, crop: cropByIngredientName(i) }));
  return `
    ${breadcrumb("food", "Food & Cooking", r.name)}
    <h2>${esc(r.name)}</h2>
    <div class="meta" style="margin-bottom:10px"><span class="tag">${esc(r.category)}</span></div>
    <div class="section-block">
      <h3>Ingredients</h3>
      <ul>${cropLinks.map(({ raw, crop }) => `<li>${crop ? link("crops", crop._key, raw) : esc(raw)}</li>`).join("")}</ul>
    </div>
    <div class="section-block">
      <h3>Effect</h3>
      <p class="intro" style="margin-top:0">${esc(r.effect)}</p>
    </div>
    <div class="section-block">
      <h3>Where to cook it</h3>
      <p class="intro" style="margin-top:0">Cooked at a ${link("stations", "stove", "Stove")}, ${link("stations", "electric-stove", "Electric Stove")}, or the endgame ${link("stations", "integrated-kitchen", "Integrated Kitchen / Kitchen Set")} depending on the recipe's tier.</p>
    </div>
    ${backLink("food", "Food & Cooking")}
  `;
}

/* ---------------------------------------------------------------------- */
/* Bosses                                                                  */
/* ---------------------------------------------------------------------- */

function renderBosses() {
  const b = state.data.bosses;
  const great = idx.bosses.filter(x => x._kind === "greatOne" && matchesQuery(x.name + x.location + x.mechanics));
  const seasonal = idx.bosses.filter(x => x._kind === "seasonal" && matchesQuery(x.name + x.context));
  return `
    <h2>Bosses</h2>
    <p class="intro">${esc(b.overview)}</p>
    <div class="section-block">
      <h3>The Great Ones</h3>
      <div class="grid">
        ${great.map(x => `
          ${cardOpen("bosses", x._key)}
            <h3>${esc(x.name)}</h3>
            <div class="meta"><span class="tag">Lv ${esc(x.level)}</span><span class="tag">${esc(x.location)}</span></div>
            <p>${esc(x.mechanics)}</p>
          </div>
        `).join("") || emptyState()}
      </div>
    </div>
    <div class="section-block">
      <h3>Seasonal &amp; Event Bosses</h3>
      <div class="grid">
        ${seasonal.map(x => `
          ${cardOpen("bosses", x._key)}
            <h3>${esc(x.name)}</h3>
            <div class="meta"><span class="tag">${esc(x.type)}</span></div>
            <p>${esc(x.context)}</p>
          </div>
        `).join("")}
      </div>
    </div>
    <p class="intro" style="margin-top:14px">${esc(b.note)}</p>
  `;
}

function renderBossDetail(key) {
  const b = findBoss(key);
  if (!b) return null;
  if (b._kind === "seasonal") {
    return `
      ${breadcrumb("bosses", "Bosses", b.name)}
      <h2>${esc(b.name)}</h2>
      <div class="meta" style="margin-bottom:10px"><span class="tag">${esc(b.type)}</span></div>
      <p>${esc(b.context)}</p>
      <div class="section-block"><h3>Drops</h3><p class="intro" style="margin-top:0">${esc(b.drops)}</p></div>
      ${backLink("bosses", "Bosses")}
    `;
  }
  return `
    ${breadcrumb("bosses", "Bosses", b.name)}
    <h2>${esc(b.name)}</h2>
    <div class="meta" style="margin-bottom:10px"><span class="tag">Lv ${esc(b.level)}</span><span class="tag">${esc(b.location)}</span></div>
    <div class="section-block">
      <h3>Fight mechanics</h3>
      <p class="intro" style="margin-top:0">${esc(b.mechanics)}</p>
    </div>
    <div class="section-block">
      <h3>Drops</h3>
      <p class="intro" style="margin-top:0">${esc(b.drops)}</p>
    </div>
    ${backLink("bosses", "Bosses")}
  `;
}

/* ---------------------------------------------------------------------- */
/* Regions, Updates, Sources (no per-item detail pages)                    */
/* ---------------------------------------------------------------------- */

function renderRegions() {
  const r = state.data.regions;
  return `
    <h2>Regions</h2>
    <p class="intro">${esc(r.overview)}</p>
    <div class="section-block">
      <h3>${esc(r.manibus.name)}</h3>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Stronghold</th><th>Biome</th><th>Level Range</th><th>Notes</th></tr></thead>
        <tbody>
          ${r.manibus.areas.map(a => `<tr><td>${esc(a.stronghold)}</td><td>${esc(a.biome)}</td><td>${esc(a.levelRange)}</td><td>${esc(a.notes || "")}</td></tr>`).join("")}
        </tbody>
      </table></div>
    </div>
    <div class="section-block">
      <h3>Other Notable Areas</h3>
      <div class="grid">
        ${r.otherNotableAreas.map(a => `<div class="card"><h3>${esc(a.name)}</h3><p>${esc(a.notes)}</p></div>`).join("")}
      </div>
    </div>
    <div class="section-block">
      <h3>Special Worlds &amp; Scenarios</h3>
      <div class="grid">
        ${r.specialWorldsAndScenarios.map(a => `
          <div class="card">
            <h3>${esc(a.name)}</h3>
            <div class="meta"><span class="tag">${esc(a.type)}</span></div>
            <p>${esc(a.notes || "")}</p>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderUpdates() {
  const u = state.data.updates;
  return `
    <h2>Updates &amp; Patch History</h2>
    <p class="intro"><strong>Current version:</strong> ${esc(u.current.version)} (${esc(u.current.date)}) — ${esc(u.current.title)}</p>
    <p class="intro">${esc(u.current.note)}</p>
    <div class="section-block">
      ${u.history.map(h => `
        <div class="timeline-entry">
          <h3>v${esc(h.version)}</h3>
          <div class="date">${esc(h.date)}</div>
          <ul>${h.highlights.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
        </div>
      `).join("")}
    </div>
    <div class="section-block">
      <h3>Major Content Eras</h3>
      <div class="grid">
        ${u.majorContentEras.map(e => `<div class="card"><h3>${esc(e.name)}</h3><p>${esc(e.notes)}</p></div>`).join("")}
      </div>
    </div>
  `;
}

function renderSources() {
  const meta = state.data.meta;
  return `
    <h2>Sources</h2>
    <p class="intro">${esc(meta.disclaimer)}</p>
    <ul class="sources-list">
      ${meta.sources.map(s => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a></li>`).join("")}
    </ul>
  `;
}

/* ---------------------------------------------------------------------- */
/* Boot                                                                    */
/* ---------------------------------------------------------------------- */

function wireSearch() {
  const input = document.getElementById("global-search");
  input.addEventListener("input", () => {
    state.query = input.value.trim().toLowerCase();
    if (state.detailId) navigate(state.active, null);
    else render();
  });
}

async function init() {
  try {
    await loadAll();
    buildIndexes();
    document.getElementById("version-pill").textContent = "v" + state.data.meta.gameVersionAtCompile;
    document.getElementById("footer").textContent =
      `${state.data.meta.siteName} · unofficial fan-made reference · compiled ${state.data.meta.lastCompiled} · not affiliated with Starry Studio / NetEase`;
    buildTabs();
    wireSearch();
    window.addEventListener("hashchange", onHashChange);
    onHashChange();
  } catch (err) {
    document.getElementById("main").innerHTML = `<div class="empty-state">Failed to load data: ${esc(err.message)}<br>If you opened this file directly in a browser, serve it over HTTP instead (e.g. <code>python3 -m http.server</code>) so fetch() can read the /data JSON files.</div>`;
    console.error(err);
  }
}

init();
