// Once Human Database — client-side app
// Loads /data/*.json and renders tabbed, searchable panels. No build step required.

const DATA_FILES = {
  meta: "data/meta.json",
  weapons: "data/weapons.json",
  mods: "data/mods.json",
  blueprints: "data/blueprints.json",
  builds: "data/builds.json",
  classes: "data/classes.json",
  memetics: "data/memetics.json",
  deviants: "data/deviants.json",
  crops: "data/crops.json",
  bosses: "data/bosses.json",
  regions: "data/regions.json",
  updates: "data/updates.json"
};

const TABS = [
  { id: "home", label: "Overview" },
  { id: "weapons", label: "Weapons" },
  { id: "mods", label: "Mods" },
  { id: "blueprints", label: "Blueprints" },
  { id: "builds", label: "Builds & Classes" },
  { id: "memetics", label: "Memetics" },
  { id: "deviants", label: "Deviants (Animals)" },
  { id: "crops", label: "Crops" },
  { id: "bosses", label: "Bosses" },
  { id: "regions", label: "Regions" },
  { id: "updates", label: "Updates" },
  { id: "sources", label: "Sources" }
];

const state = { data: {}, active: "home", query: "" };

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

async function loadAll() {
  const entries = Object.entries(DATA_FILES);
  const results = await Promise.all(entries.map(async ([key, path]) => {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
    return [key, await res.json()];
  }));
  results.forEach(([key, val]) => { state.data[key] = val; });
}

function buildTabs() {
  const nav = document.getElementById("tabs");
  nav.innerHTML = "";
  TABS.forEach(t => {
    const btn = document.createElement("button");
    btn.textContent = t.label;
    btn.dataset.tab = t.id;
    btn.className = t.id === state.active ? "active" : "";
    btn.addEventListener("click", () => setActive(t.id));
    nav.appendChild(btn);
  });
}

function setActive(id) {
  state.active = id;
  document.querySelectorAll("nav.tabs button").forEach(b => {
    b.classList.toggle("active", b.dataset.tab === id);
  });
  render();
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
}

function matchesQuery(text) {
  if (!state.query) return true;
  return String(text).toLowerCase().includes(state.query);
}

function render() {
  const main = document.getElementById("main");
  const renderers = {
    home: renderHome,
    weapons: renderWeapons,
    mods: renderMods,
    blueprints: renderBlueprints,
    builds: renderBuilds,
    memetics: renderMemetics,
    deviants: renderDeviants,
    crops: renderCrops,
    bosses: renderBosses,
    regions: renderRegions,
    updates: renderUpdates,
    sources: renderSources
  };
  main.innerHTML = "";
  const panel = document.createElement("div");
  panel.className = "panel active";
  panel.innerHTML = renderers[state.active]();
  main.appendChild(panel);
}

function renderHome() {
  const meta = state.data.meta;
  const counts = {
    weapons: state.data.weapons.weapons.length,
    mods: state.data.mods.groups.reduce((a, g) => a + g.mods.length, 0),
    deviants: state.data.deviants.deviants.length,
    crops: state.data.crops.crops.length,
    bosses: state.data.bosses.greatOnes.length,
    builds: state.data.builds.builds.length,
    memetics: Object.values(state.data.memetics.branches).reduce((a, arr) => a + arr.length, 0)
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
      ${statCard("Deviants (Animals)", counts.deviants, "deviants")}
      ${statCard("Crops", counts.crops, "crops")}
      ${statCard("Great Ones (Bosses)", counts.bosses, "bosses")}
      ${statCard("Builds", counts.builds, "builds")}
      ${statCard("Memetic Specializations", counts.memetics, "memetics")}
      ${statCard("Blueprint Categories", state.data.blueprints.categories.length, "blueprints")}
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
window.__ohNav = setActive;

function renderWeapons() {
  const w = state.data.weapons;
  const items = w.weapons.filter(x => matchesQuery(x.name + x.type + (x.notes || "")));
  return `
    <h2>Weapons</h2>
    <p class="intro">${esc(w.note)}</p>
    <div class="badge-list">${w.weaponTypes.map(t => `<span class="tag" title="${esc(t.description)}">${esc(t.name)}</span>`).join("")}</div>
    <div class="grid">
      ${items.map(x => `
        <div class="card">
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

function renderMods() {
  const m = state.data.mods;
  const groups = m.groups
    .map(g => ({ ...g, mods: g.mods.filter(x => matchesQuery(x.name + x.effect + g.effect)) }))
    .filter(g => g.mods.length || matchesQuery(g.effect));
  return `
    <h2>Mods</h2>
    <p class="intro">${esc(m.overview)}</p>
    ${groups.map(g => `
      <div class="section-block">
        <h3>${esc(g.effect)}</h3>
        <p class="intro" style="margin-top:0">${esc(g.description)}</p>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Mod</th><th>Effect</th></tr></thead>
          <tbody>
            ${g.mods.map(x => `<tr><td>${esc(x.name)}</td><td>${esc(x.effect)}</td></tr>`).join("")}
          </tbody>
        </table></div>
      </div>
    `).join("") || emptyState()}
  `;
}

function renderBlueprints() {
  const b = state.data.blueprints;
  const cats = b.categories.filter(c => matchesQuery(c.name + c.description + c.examples.join(" ")));
  return `
    <h2>Blueprints</h2>
    <p class="intro">${esc(b.overview)}</p>
    <div class="section-block">
      <h3>How to obtain blueprints</h3>
      <ul>${b.howToObtain.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
    </div>
    <div class="grid">
      ${cats.map(c => `
        <div class="card">
          <h3>${esc(c.name)}</h3>
          <p>${esc(c.description)}</p>
          <ul>${c.examples.map(e => `<li>${esc(e)}</li>`).join("")}</ul>
        </div>
      `).join("") || emptyState()}
    </div>
    <p class="intro" style="margin-top:18px"><strong>Recent change:</strong> ${esc(b.notableConstructionUpdate)}</p>
  `;
}

function renderBuilds() {
  const builds = state.data.builds.builds.filter(x => matchesQuery(x.name + x.summary + x.role));
  const classes = state.data.classes;
  return `
    <h2>Builds &amp; Classes</h2>
    <p class="intro">${esc(classes.overview)}</p>
    <div class="section-block">
      <h3>Weapon Effect Archetypes ("Classes")</h3>
      <div class="grid">
        ${classes.weaponEffectArchetypes.filter(a => matchesQuery(a.name + a.summary)).map(a => `
          <div class="card">
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
          <div class="card"><h3>${esc(b.name)}</h3><p>${esc(b.focus)}</p></div>
        `).join("")}
      </div>
      <p class="intro">${esc(classes.note)}</p>
    </div>
    <div class="section-block">
      <h3>Named Builds</h3>
      <div class="grid">
        ${builds.map(x => `
          <div class="card">
            <h3>${esc(x.name)}</h3>
            <div class="meta"><span class="tag">${esc(x.role)}</span></div>
            <p>${esc(x.summary)}</p>
            <p><strong>Weapons:</strong> ${x.suggestedWeapons.map(esc).join(", ")}</p>
            <ul>${x.suggestedMods.map(m => `<li>${esc(m)}</li>`).join("")}</ul>
          </div>
        `).join("") || emptyState()}
      </div>
    </div>
  `;
}

function renderMemetics() {
  const branches = state.data.memetics.branches;
  const branchLabels = { gathering: "Gathering", crafting: "Crafting", management: "Management", building: "Building" };
  return `
    <h2>Memetic Specializations</h2>
    <p class="intro">${esc(state.data.memetics.overview)}</p>
    ${Object.entries(branches).map(([key, list]) => {
      const filtered = list.filter(x => matchesQuery(x.name + x.effect));
      if (!filtered.length) return "";
      return `
        <div class="section-block">
          <h3>${esc(branchLabels[key] || key)} <span class="tag">${filtered.length}</span></h3>
          <div class="table-wrap"><table class="data-table">
            <thead><tr><th>Specialization</th><th>Effect</th></tr></thead>
            <tbody>${filtered.map(x => `<tr><td>${esc(x.name)}</td><td>${esc(x.effect)}</td></tr>`).join("")}</tbody>
          </table></div>
        </div>
      `;
    }).join("") || emptyState()}
  `;
}

function renderDeviants() {
  const d = state.data.deviants;
  const items = d.deviants.filter(x => matchesQuery(x.name + x.category + x.ability));
  return `
    <h2>Deviants (Animals / Companions)</h2>
    <p class="intro">${esc(d.overview)}</p>
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>Name</th><th>Category</th><th>Ability</th></tr></thead>
      <tbody>
        ${items.map(x => `<tr><td>${esc(x.name)}</td><td><span class="tag">${esc(x.category)}</span></td><td>${esc(x.ability)}</td></tr>`).join("")}
      </tbody>
    </table></div>
    ${!items.length ? emptyState() : ""}
  `;
}

function renderCrops() {
  const c = state.data.crops;
  const items = c.crops.filter(x => matchesQuery(x.name + x.uses + x.foundNear));
  return `
    <h2>Crops &amp; Farming</h2>
    <p class="intro">${esc(c.overview)}</p>
    <div class="section-block">
      <h3>How to farm</h3>
      <ul>${c.howToFarm.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
    </div>
    <div class="grid">
      ${items.map(x => `
        <div class="card">
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
  `;
}

function renderBosses() {
  const b = state.data.bosses;
  const great = b.greatOnes.filter(x => matchesQuery(x.name + x.location + x.mechanics));
  const seasonal = b.seasonalAndEventBosses.filter(x => matchesQuery(x.name + x.context));
  return `
    <h2>Bosses</h2>
    <p class="intro">${esc(b.overview)}</p>
    <div class="section-block">
      <h3>The Great Ones</h3>
      <div class="grid">
        ${great.map(x => `
          <div class="card">
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
          <div class="card">
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

function emptyState() {
  return `<div class="empty-state">No matches for “${esc(state.query)}” in this section.</div>`;
}

function wireSearch() {
  const input = document.getElementById("global-search");
  input.addEventListener("input", () => {
    state.query = input.value.trim().toLowerCase();
    render();
  });
}

async function init() {
  try {
    await loadAll();
    document.getElementById("version-pill").textContent = "v" + state.data.meta.gameVersionAtCompile;
    document.getElementById("footer").textContent =
      `${state.data.meta.siteName} · unofficial fan-made reference · compiled ${state.data.meta.lastCompiled} · not affiliated with Starry Studio / NetEase`;
    buildTabs();
    wireSearch();
    render();
  } catch (err) {
    document.getElementById("main").innerHTML = `<div class="empty-state">Failed to load data: ${esc(err.message)}<br>If you opened this file directly in a browser, serve it over HTTP instead (e.g. <code>python3 -m http.server</code>) so fetch() can read the /data JSON files.</div>`;
    console.error(err);
  }
}

init();
