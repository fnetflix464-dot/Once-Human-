// Once Human Database — Home, Build Finder, Favorites/Recently Viewed pages
window.OH = window.OH || {};

/* ---------------------------------------------------------------------- */
/* Home — search-first, quick tools, then stats                           */
/* ---------------------------------------------------------------------- */

OH.statCard = function statCard(label, value, tab) {
  return `<button type="button" class="card stat-card" data-nav-tab="${OH.esc(tab)}">
    <div class="meta">${OH.esc(label)}</div>
    <h3 class="stat-value">${value}</h3>
  </button>`;
};

function quickToolCard(icon, title, desc, tab) {
  return `
    <button type="button" class="card quick-tool" data-nav-tab="${OH.esc(tab)}">
      <span class="quick-tool-icon" aria-hidden="true">${icon}</span>
      <h3>${OH.esc(title)}</h3>
      <p>${OH.esc(desc)}</p>
    </button>
  `;
}

OH.renderHome = function renderHome() {
  const meta = OH.state.data.meta;
  const idx = OH.idx;
  const counts = {
    weapons: idx.weapons.length,
    armorSets: idx.armorSets.length,
    mods: idx.mods.length,
    deviants: idx.deviants.length,
    crops: idx.crops.length,
    animals: idx.livestock.length,
    bosses: idx.bosses.length,
    builds: idx.builds.length
  };
  const u = OH.state.data.updates;
  const recent = OH.getRecentlyViewed().slice(0, 6).map(OH.resolveEntry).filter(r => r.exists);

  return `
    <div class="hero">
      <h2 class="hero-title">${OH.esc(meta.siteName)}</h2>
      <p class="hero-tagline">${OH.esc(meta.tagline || meta.description)}</p>
      <div class="hero-search-hint">Use the search box above — try “Power Surge”, “Shrapnel”, or a weapon name — to jump straight to any weapon, mod, build, deviant or boss.</div>
    </div>

    <div class="section-block">
      <h3>Quick tools</h3>
      <div class="grid quick-tools-grid">
        ${quickToolCard("🧭", "Build Finder", "Answer a goal (boss DPS, solo, PvP…) and get recommended builds.", "buildfinder")}
        ${quickToolCard("⚖️", "Compare", "Put two weapons or armor sets side by side.", "weapons")}
        ${quickToolCard("★", "My Favorites", "Everything you've starred, in one place.", "favorites")}
        ${quickToolCard("🌳", "Tech Tree", "Current Survival / Production / Combat / Building system.", "techtree")}
      </div>
    </div>

    ${recent.length ? `
      <div class="section-block">
        <h3>Jump back in</h3>
        <div class="grid">
          ${recent.map(r => `
            ${OH.cardOpen(OH.ROUTE_TAB_FOR_KIND[r.entry.kind] || r.entry.kind, r.item._key)}
              <h3>${OH.esc(r.item.name)}</h3>
              <div class="meta"><span class="tag">${OH.esc(OH.TAB_LABELS[OH.ROUTE_TAB_FOR_KIND[r.entry.kind]] || r.entry.kind)}</span></div>
            </div>
          `).join("")}
        </div>
      </div>
    ` : ""}

    <div class="section-block">
      <h3>Latest update</h3>
      <div class="card">
        <div class="meta"><span class="tag">v${OH.esc(u.current.version)}</span><span class="tag">${OH.esc(u.current.date)}</span></div>
        <h3>${OH.esc(u.current.title)}</h3>
        <p>${OH.esc(u.current.note)}</p>
        <p><a href="#updates">See full patch history &rarr;</a></p>
      </div>
    </div>

    <div class="section-block">
      <h3>What's covered here</h3>
      <div class="grid stats-grid">
        ${OH.statCard("Weapons", counts.weapons, "weapons")}
        ${OH.statCard("Armor Sets", counts.armorSets, "armor")}
        ${OH.statCard("Named Mods", counts.mods, "mods")}
        ${OH.statCard("Deviants", counts.deviants, "deviants")}
        ${OH.statCard("Crops", counts.crops, "crops")}
        ${OH.statCard("Ranching Animals", counts.animals, "ranching")}
        ${OH.statCard("Great Ones (Bosses)", counts.bosses, "bosses")}
        ${OH.statCard("Named Builds", counts.builds, "builds")}
      </div>
      <p class="intro">${OH.esc(meta.completenessNote || "")}</p>
    </div>

    <div class="section-block">
      <h3>⚠️ About this database</h3>
      <p class="intro">${OH.esc(meta.disclaimer)}</p>
    </div>
  `;
};

// Where a favorited/recently-viewed "kind" actually routes to (a couple of
// kinds share a tab name difference from their storage kind).
OH.ROUTE_TAB_FOR_KIND = {
  weapons: "weapons", armor: "armor", mods: "mods", builds: "builds",
  deviants: "deviants", crops: "crops", food: "food", bosses: "bosses"
};

/* ---------------------------------------------------------------------- */
/* Build Finder — goal buttons -> matching builds                         */
/* ---------------------------------------------------------------------- */

OH.BUILD_FINDER_GOALS = [
  { id: "boss", label: "Boss DPS" },
  { id: "solo", label: "Solo" },
  { id: "pvp", label: "PvP" },
  { id: "farming", label: "Farming / Mob Clear" },
  { id: "melee", label: "Melee" },
  { id: "elemental", label: "Elemental" },
  { id: "crit", label: "Crit-focused" }
];

OH.renderBuildFinder = function renderBuildFinder(activeGoal) {
  const matches = activeGoal
    ? OH.idx.builds.filter(b => (b._goals || []).some(g => g.id === activeGoal))
    : [];
  return `
    <h2>Build Finder</h2>
    <p class="intro">Pick what you're trying to do. Results are drawn from this database's curated build write-ups — the goal tags are computed directly from each build's own description, not a separate guess, so a build only shows up for a goal its own summary actually supports.</p>
    <div class="goal-buttons" role="group" aria-label="Build goal">
      ${OH.BUILD_FINDER_GOALS.map(g => `<button type="button" class="goal-btn${g.id === activeGoal ? " is-active" : ""}" data-goal="${OH.esc(g.id)}" aria-pressed="${g.id === activeGoal}">${OH.esc(g.label)}</button>`).join("")}
      ${activeGoal ? `<button type="button" class="filter-clear" data-goal-clear="1">Clear</button>` : ""}
    </div>
    ${activeGoal ? `
      <div class="section-block">
        <h3>${OH.esc((OH.BUILD_FINDER_GOALS.find(g => g.id === activeGoal) || {}).label)} — recommended builds</h3>
        <div class="grid">
          ${matches.map(b => `
            ${OH.cardOpen("builds", b._key)}
              <h3>${OH.esc(b.name)}</h3>
              <div class="meta"><span class="tag">${OH.esc(b.role)}</span>${OH.pvpPveTag(b._pvpPve)}</div>
              <p>${OH.esc(b.summary)}</p>
            </div>
          `).join("") || `<div class="empty-state">No curated build currently matches this goal. Try Builds &amp; Classes to browse everything.</div>`}
        </div>
      </div>
    ` : `<p class="intro">Choose a goal above to see matching builds.</p>`}
  `;
};

/* ---------------------------------------------------------------------- */
/* Favorites (localStorage)                                                */
/* ---------------------------------------------------------------------- */

OH.renderFavorites = function renderFavorites() {
  const favs = OH.getFavorites().map(OH.resolveEntry);
  const live = favs.filter(f => f.exists);
  const recent = OH.getRecentlyViewed().map(OH.resolveEntry).filter(f => f.exists);
  const byKind = {};
  live.forEach(f => { (byKind[f.entry.kind] = byKind[f.entry.kind] || []).push(f); });

  return `
    <h2>My Favorites</h2>
    <p class="intro">Stored only in your browser (localStorage) — nothing is sent anywhere. Star any weapon, mod, build, deviant, crop, food recipe or boss to add it here.</p>
    ${live.length ? Object.entries(byKind).map(([kind, items]) => `
      <div class="section-block">
        <h3>${OH.esc(OH.TAB_LABELS[OH.ROUTE_TAB_FOR_KIND[kind]] || kind)}</h3>
        <div class="grid">
          ${items.map(f => `
            ${OH.cardOpen(OH.ROUTE_TAB_FOR_KIND[kind] || kind, f.item._key)}
              <h3>${OH.esc(f.item.name)}</h3>
              ${OH.favoriteButton(kind, f.item._key, f.item.name)}
            </div>
          `).join("")}
        </div>
      </div>
    `).join("") : `<div class="empty-state">No favorites yet. Browse the database and click the ☆ on any card or detail page.</div>`}

    <div class="section-block">
      <h3>Recently viewed</h3>
      ${recent.length ? `
        <div class="grid">
          ${recent.map(r => `
            ${OH.cardOpen(OH.ROUTE_TAB_FOR_KIND[r.entry.kind] || r.entry.kind, r.item._key)}
              <h3>${OH.esc(r.item.name)}</h3>
              <div class="meta"><span class="tag">${OH.esc(OH.TAB_LABELS[OH.ROUTE_TAB_FOR_KIND[r.entry.kind]] || r.entry.kind)}</span></div>
            </div>
          `).join("")}
        </div>
      ` : `<div class="empty-state">Nothing viewed yet this session.</div>`}
    </div>
  `;
};
