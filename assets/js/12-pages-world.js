// Once Human Database — Blueprints, Stations, Regions, Deviants, Ranching, Crops, Food, Bosses
window.OH = window.OH || {};

/* ---------------------------------------------------------------------- */
/* Blueprints                                                              */
/* ---------------------------------------------------------------------- */

OH.renderBlueprints = function renderBlueprints() {
  const b = OH.state.data.blueprints;
  const cats = OH.idx.blueprintCategories;
  return `
    <h2>Blueprints</h2>
    <p class="intro">${OH.esc(b.overview)}</p>
    ${OH.legacyBanner(b.techSystemNotice)}
    <div class="section-block">
      <h3>How to obtain blueprints</h3>
      <ul>${b.howToObtain.map(x => `<li>${OH.esc(x)}</li>`).join("")}</ul>
    </div>
    <div class="grid">
      ${cats.map(c => `
        ${OH.cardOpen("blueprints", c._key)}
          <h3>${OH.esc(c.name)}</h3>
          <p>${OH.esc(c.description)}</p>
          <ul>${c.examples.slice(0, 4).map(e => `<li>${OH.esc(e)}</li>`).join("")}</ul>
        </div>
      `).join("") || OH.emptyState(OH.state.query)}
    </div>
    <p class="intro mt-lg"><strong>Recent change:</strong> ${OH.esc(b.notableConstructionUpdate)}</p>
  `;
};

OH.renderBlueprintDetail = function renderBlueprintDetail(key) {
  const c = OH.findBlueprintCategory(key);
  if (!c) return null;
  OH.pushRecentlyViewed("blueprints", c._key, c.name);
  return `
    ${OH.breadcrumb("blueprints", "Blueprints", c.name)}
    <h2>${OH.esc(c.name)}</h2>
    <p>${OH.esc(c.description)}</p>
    <div class="section-block">
      <h3>Example items in this category</h3>
      <ul>${c.examples.map(e => `<li>${OH.esc(e)}</li>`).join("")}</ul>
    </div>
    <div class="section-block">
      <h3>Unlocked by</h3>
      <p class="intro intro-tight">${OH.esc(c.unlockedBy || "See the general acquisition methods below.")}</p>
      <h3>How to obtain</h3>
      <ul>${OH.state.data.blueprints.howToObtain.map(x => `<li>${OH.esc(x)}</li>`).join("")}</ul>
    </div>
    ${OH.backLink("blueprints", "Blueprints")}
  `;
};

/* ---------------------------------------------------------------------- */
/* Stations                                                                */
/* ---------------------------------------------------------------------- */

OH.renderStations = function renderStations() {
  const s = OH.state.data.stations;
  const items = OH.idx.stationsAll;
  const groups = ["Weapon & Gear", "Cooking", "Other"];
  return `
    <h2>Crafting &amp; Cooking Stations</h2>
    <p class="intro">${OH.esc(s.overview)}</p>
    ${OH.legacyBanner(s.techSystemNotice)}
    ${groups.map(g => {
      const gi = items.filter(x => x._group === g);
      if (!gi.length) return "";
      return `<div class="section-block"><h3>${OH.esc(g)}</h3><div class="grid">${gi.map(x => `
        ${OH.cardOpen("stations", x._key)}
          <h3>${OH.esc(x.name)}</h3>
          <div class="meta">${x.tier ? `<span class="tag">Tier ${OH.esc(x.tier)}</span>` : ""}${OH.verificationBadge(x.unlockVerification, { compact: true })}</div>
          <p>${OH.esc(x.produces || "")}</p>
        </div>
      `).join("")}</div></div>`;
    }).join("") || OH.emptyState(OH.state.query)}
  `;
};

OH.renderStationDetail = function renderStationDetail(key) {
  const s = OH.findStation(key);
  if (!s) return null;
  OH.pushRecentlyViewed("stations", s._key, s.name);
  return `
    ${OH.breadcrumb("stations", "Stations", s.name)}
    <h2>${OH.esc(s.name)}</h2>
    <div class="meta detail-meta">${s.tier ? `<span class="tag">Tier ${OH.esc(s.tier)}</span>` : ""}<span class="tag">${OH.esc(s._group)}</span>${OH.verificationBadge(s.unlockVerification)}</div>
    ${s.unlock ? `<p><strong>Unlock:</strong> ${OH.esc(s.unlock)}</p>` : ""}
    ${s.materials ? `<p><strong>Materials to build:</strong> ${s.materials.map(OH.esc).join(", ")}</p>` : ""}
    <p><strong>Produces:</strong> ${OH.esc(s.produces || "")}</p>
    <div class="section-block">
      <h3>Data verification</h3>
      ${OH.verificationObjectBlock(s.verification)}
    </div>
    ${OH.backLink("stations", "Stations")}
  `;
};

/* ---------------------------------------------------------------------- */
/* Regions (no per-item detail page — a browsable table/grid)             */
/* ---------------------------------------------------------------------- */

OH.renderRegions = function renderRegions() {
  const r = OH.state.data.regions;
  return `
    <h2>Regions</h2>
    <p class="intro">${OH.esc(r.overview)}</p>
    <div class="section-block">
      <h3>${OH.esc(r.manibus.name)}</h3>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Region</th><th>Stronghold</th><th>Biome</th><th>Level Range</th><th>Notes</th></tr></thead>
        <tbody>
          ${r.manibus.regions.map(a => `<tr><td>${OH.esc(a.region)}</td><td>${OH.esc(a.stronghold)}</td><td>${OH.esc(a.biome)}</td><td>${OH.esc(a.levelRange)}</td><td>${OH.esc(a.notes || "")}</td></tr>`).join("")}
        </tbody>
      </table></div>
    </div>
    <div class="section-block">
      <h3>Special Worlds &amp; Scenarios</h3>
      <div class="grid">
        ${r.specialWorldsAndScenarios.map(a => `
          <div class="card">
            <h3>${OH.esc(a.name)}</h3>
            <div class="meta"><span class="tag">${OH.esc(a.type)}</span></div>
            <p>${OH.esc(a.notes || "")}</p>
          </div>
        `).join("")}
      </div>
    </div>
  `;
};

/* ---------------------------------------------------------------------- */
/* Deviants                                                                */
/* ---------------------------------------------------------------------- */

const DEVIANT_FILTER_CONFIG = () => [
  { key: "category", label: "Category", accessor: v => v.category, options: OH.state.data.deviants.categories.map(c => ({ value: c, label: c })) },
  { key: "pvpPve", label: "PvE/PvP", accessor: v => v._pvpPve, options: [
    { value: "pve", label: "PvE" }, { value: "pvp", label: "PvP" }, { value: "both", label: "PvE / PvP" }
  ] }
];
const DEVIANT_SORT_CONFIG = [
  { key: "name", label: "Name", accessor: v => v.name },
  { key: "category", label: "Category", accessor: v => v.category }
];

OH.renderDeviants = function renderDeviants() {
  const d = OH.state.data.deviants;
  const tab = "deviants";
  const filterConfig = DEVIANT_FILTER_CONFIG();
  const active = OH.getActiveFilters(tab);
  let items = OH.applyFilters(OH.idx.deviants, filterConfig, active);
  items = OH.applySort(items, DEVIANT_SORT_CONFIG, OH.state.sort[tab]);
  return `
    <h2>Deviants</h2>
    <p class="intro">${OH.esc(d.overview)}</p>
    ${OH.renderFilterBar(tab, filterConfig, active, DEVIANT_SORT_CONFIG, OH.state.sort[tab])}
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th></th><th>Name</th><th>Category</th><th>Ability</th><th>Location</th><th>PvE/PvP</th></tr></thead>
      <tbody>
        ${items.map(x => `<tr class="card-link row-link" role="link" data-tab="deviants" data-id="${OH.esc(x._key)}" tabindex="0"><td>${OH.favoriteButton("deviants", x._key, x.name)}</td><td>${OH.link("deviants", x._key, x.name)}</td><td><span class="tag">${OH.esc(x.category)}</span></td><td>${OH.esc(x.ability)}</td><td>${x.location ? OH.esc(x.location) : `<span class="intro">Not found</span>`}</td><td>${OH.pvpPveTag(x._pvpPve)}</td></tr>`).join("")}
      </tbody>
    </table></div>
    ${!items.length ? OH.emptyState(OH.state.query) : ""}
  `;
};

OH.renderDeviantDetail = function renderDeviantDetail(key) {
  const v = OH.findDeviant(key);
  if (!v) return null;
  OH.pushRecentlyViewed("deviants", v._key, v.name);
  const cm = OH.state.data.deviants.captureMethod;
  return `
    ${OH.breadcrumb("deviants", "Deviants", v.name)}
    <div class="detail-head">
      <h2>${OH.esc(v.name)}</h2>
      ${OH.favoriteButton("deviants", v._key, v.name)}
    </div>
    <div class="meta detail-meta"><span class="tag">${OH.esc(v.category)}</span>${OH.pvpPveTag(v._pvpPve)}</div>
    <p>${OH.esc(v.ability)}</p>
    ${v.crossRef ? `<p class="intro"><strong>Connects to:</strong> ${OH.esc(v.crossRef)}</p>` : ""}
    <div class="section-block">
      <h3>Where to find it ${v.locationVerification ? OH.verificationBadge(v.locationVerification, { compact: true }) : ""}</h3>
      ${v.location
        ? `<p class="intro" style="margin-top:0">${OH.esc(v.location)}</p><p class="intro">${OH.esc(OH.state.data.deviants.locationNote || "")}</p>${OH.sourceBlock(null, null, [OH.state.data.deviants.locationSource ? OH.state.data.deviants.locationSource.name : ""].filter(Boolean))}`
        : `<p class="intro" style="margin-top:0">No specific spawn location was found in the sources checked for this database — see the general capture method below.</p>`}
    </div>
    <div class="section-block">
      <h3>How to capture it</h3>
      <ul>
        <li>${OH.esc(cm.wildCapture)}</li>
        <li>${OH.esc(cm.bindingCapsule)}</li>
        <li>${OH.esc(cm.placement)}</li>
        <li>${OH.esc(cm.power)}</li>
      </ul>
      <p class="intro">${OH.esc(cm.cookingLink)}</p>
    </div>
    <div class="section-block">
      <h3>Data verification</h3>
      ${OH.verificationObjectBlock(v.abilityVerification)}
    </div>
    ${OH.backLink("deviants", "Deviants")}
  `;
};

/* ---------------------------------------------------------------------- */
/* Ranching (separate from Deviants AND from Crops/Farming)               */
/* ---------------------------------------------------------------------- */

OH.renderRanching = function renderRanching() {
  const r = OH.state.data.ranching;
  const items = OH.idx.livestock;
  return `
    <h2>Ranching</h2>
    <p class="intro">${OH.esc(r.overview)}</p>
    ${OH.notice(r.breedingNote)}
    <div class="grid">
      ${items.map(x => `
        ${OH.cardOpen("ranching", x._key)}
          <div class="card-top-row"><h3>${OH.esc(x.name)}</h3>${OH.favoriteButton("ranching", x._key, x.name)}</div>
          <div class="meta"><span class="tag tier-${OH.esc(x.tier || "")}">Tier ${OH.esc(x.tier || "?")}</span></div>
          <p><strong>Products:</strong> ${OH.esc(x.products)}</p>
          ${x.notes ? `<p>${OH.esc(x.notes)}</p>` : ""}
        </div>
      `).join("") || OH.emptyState(OH.state.query)}
    </div>
  `;
};

OH.renderRanchingDetail = function renderRanchingDetail(key) {
  const c = OH.findAnimal(key);
  if (!c) return null;
  OH.pushRecentlyViewed("ranching", c._key, c.name);
  return `
    ${OH.breadcrumb("ranching", "Ranching", c.name)}
    <div class="detail-head"><h2>${OH.esc(c.name)}</h2>${OH.favoriteButton("ranching", c._key, c.name)}</div>
    <div class="meta detail-meta"><span class="tag tier-${OH.esc(c.tier || "")}">Tier ${OH.esc(c.tier || "?")}</span></div>
    <p><strong>Products:</strong> ${OH.esc(c.products)}</p>
    ${c.notes ? `<p>${OH.esc(c.notes)}</p>` : ""}
    <div class="section-block">
      <h3>Taming &amp; breeding</h3>
      ${OH.notice(OH.state.data.ranching.breedingNote)}
      <p><strong>Feed:</strong> ${OH.link("food", OH.slugify("Mixed Grain Feed"), "Mixed Grain Feed")} or ${OH.link("food", OH.slugify("Mixed Herb Feed"), "Mixed Herb Feed")} both grant +20% Tameness.</p>
    </div>
    ${OH.backLink("ranching", "Ranching")}
  `;
};

/* ---------------------------------------------------------------------- */
/* Crops & Farming                                                         */
/* ---------------------------------------------------------------------- */

OH.renderCrops = function renderCrops() {
  const c = OH.state.data.crops;
  const items = OH.idx.crops;
  return `
    <h2>Crops &amp; Farming</h2>
    <p class="intro">${OH.esc(c.overview)}</p>
    <div class="section-block">
      <h3>How to farm</h3>
      <ul>${c.howToFarm.map(x => `<li>${OH.esc(x)}</li>`).join("")}</ul>
    </div>
    <div class="grid">
      ${items.map(x => `
        ${OH.cardOpen("crops", x._key)}
          <h3>${OH.esc(x.name)}</h3>
          <p><strong>Uses:</strong> ${OH.esc(x.uses)}</p>
          <p><strong>Found near:</strong> ${OH.esc(x.foundNear)}</p>
        </div>
      `).join("") || OH.emptyState(OH.state.query)}
    </div>
    <div class="section-block">
      <h3>Deviant helpers</h3>
      <div class="grid">
        ${c.deviantHelpers.map(x => `<div class="card"><h3>${OH.esc(x.name)}</h3><p>${OH.esc(x.helps)}</p></div>`).join("")}
      </div>
    </div>
    ${c.deviatedCrops ? `
      <div class="section-block">
        <h3>Deviated Crops ${OH.verificationBadge(c.deviatedCrops.verification, { compact: true })}</h3>
        <p class="intro" style="margin-top:0">${OH.esc(c.deviatedCrops.overview)}</p>
        <p><strong>How to increase mutation odds:</strong></p>
        <ul>${c.deviatedCrops.howToIncrease.map(x => `<li>${OH.esc(x)}</li>`).join("")}</ul>
        <p class="intro">${OH.esc(c.deviatedCrops.note)}</p>
        ${OH.sourceBlock(null, null, c.deviatedCrops.sources.map(s => s.name))}
      </div>
    ` : ""}
    <p class="intro">Looking for animals instead of plants? See <a href="#ranching">Ranching</a>.</p>
  `;
};

OH.renderCropDetail = function renderCropDetail(key) {
  const c = OH.findCrop(key);
  if (!c) return null;
  OH.pushRecentlyViewed("crops", c._key, c.name);
  const recipes = (c.usedInRecipes || []).map(OH.foodRecipeByLooseName).filter(Boolean);
  return `
    ${OH.breadcrumb("crops", "Crops & Farming", c.name)}
    <h2>${OH.esc(c.name)}</h2>
    <p><strong>Found near:</strong> ${OH.esc(c.foundNear)}</p>
    <p>${OH.esc(c.uses)}</p>
    <div class="section-block">
      <h3>How to farm</h3>
      <ul>${OH.state.data.crops.howToFarm.map(x => `<li>${OH.esc(x)}</li>`).join("")}</ul>
    </div>
    ${recipes.length ? `<div class="section-block"><h3>Used in food recipes</h3><div class="grid">${recipes.map(r => `${OH.cardOpen("food", r._key)}<h3>${OH.esc(r.name)}</h3><p>${OH.esc(r.effect)}</p></div>`).join("")}</div></div>` : ""}
    ${OH.backLink("crops", "Crops & Farming")}
  `;
};

/* ---------------------------------------------------------------------- */
/* Food & Cooking                                                          */
/* ---------------------------------------------------------------------- */

OH.renderFood = function renderFood() {
  const f = OH.state.data.food;
  return `
    <h2>Food &amp; Cooking</h2>
    <p class="intro">${OH.esc(f.overview)}</p>
    ${f.categories.map(cat => {
      const recipes = cat.recipes.map(r => ({ ...r, _key: OH.slugify(r.name), _pvpPve: OH.derivePvpPve(r.effect) }));
      if (!recipes.length) return "";
      return `
        <div class="section-block">
          <h3>${OH.esc(cat.name)} <span class="tag">${recipes.length}</span></h3>
          <div class="grid">
            ${recipes.map(r => `
              ${OH.cardOpen("food", r._key)}
                <div class="card-top-row"><h3>${OH.esc(r.name)}</h3>${OH.favoriteButton("food", r._key, r.name)}</div>
                <p><strong>Ingredients:</strong> ${r.ingredients.map(OH.esc).join(", ")}</p>
                <p>${OH.esc(r.effect)}</p>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    }).join("") || OH.emptyState(OH.state.query)}
  `;
};

OH.renderFoodDetail = function renderFoodDetail(key) {
  const r = OH.findFoodRecipe(key);
  if (!r) return null;
  OH.pushRecentlyViewed("food", r._key, r.name);
  const cropLinks = r.ingredients.map(i => ({ raw: i, crop: OH.cropByIngredientName(i) }));
  return `
    ${OH.breadcrumb("food", "Food & Cooking", r.name)}
    <div class="detail-head"><h2>${OH.esc(r.name)}</h2>${OH.favoriteButton("food", r._key, r.name)}</div>
    <div class="meta detail-meta"><span class="tag">${OH.esc(r.category)}</span>${OH.pvpPveTag(r._pvpPve)}</div>
    <div class="section-block">
      <h3>Ingredients</h3>
      <ul>${cropLinks.map(({ raw, crop }) => `<li>${crop ? OH.link("crops", crop._key, raw) : OH.esc(raw)}</li>`).join("")}</ul>
    </div>
    <div class="section-block">
      <h3>Effect</h3>
      <p class="intro intro-tight">${OH.esc(r.effect)}</p>
    </div>
    <div class="section-block">
      <h3>Where to cook it</h3>
      <p class="intro intro-tight">Cooked at a ${OH.link("stations", "stove", "Stove")}, ${OH.link("stations", "electric-stove", "Electric Stove")}, or the endgame ${OH.link("stations", "integrated-kitchen", "Integrated Kitchen / Kitchen Set")} depending on the recipe's tier.</p>
    </div>
    ${OH.backLink("food", "Food & Cooking")}
  `;
};

/* ---------------------------------------------------------------------- */
/* Bosses                                                                  */
/* ---------------------------------------------------------------------- */

OH.renderBosses = function renderBosses() {
  const b = OH.state.data.bosses;
  const great = OH.idx.bosses.filter(x => x._kind === "greatOne");
  const seasonal = OH.idx.bosses.filter(x => x._kind === "seasonal");
  return `
    <h2>Bosses</h2>
    <p class="intro">${OH.esc(b.overview)}</p>
    <div class="section-block">
      <h3>The Great Ones</h3>
      <div class="grid">
        ${great.map(x => `
          ${OH.cardOpen("bosses", x._key)}
            <div class="card-top-row"><h3>${OH.esc(x.name)}</h3>${OH.favoriteButton("bosses", x._key, x.name)}</div>
            <div class="meta"><span class="tag">Lv ${OH.esc(x.level)}</span><span class="tag">${OH.esc(x.location)}</span></div>
            <p>${OH.esc(x.mechanics)}</p>
          </div>
        `).join("") || OH.emptyState(OH.state.query)}
      </div>
    </div>
    <div class="section-block">
      <h3>Seasonal &amp; Event Bosses</h3>
      <div class="grid">
        ${seasonal.map(x => `
          ${OH.cardOpen("bosses", x._key)}
            <h3>${OH.esc(x.name)}</h3>
            <div class="meta"><span class="tag">${OH.esc(x.type)}</span></div>
            <p>${OH.esc(x.context)}</p>
          </div>
        `).join("")}
      </div>
    </div>
    <p class="intro mt-lg">${OH.esc(b.note)}</p>
  `;
};

OH.renderBossDetail = function renderBossDetail(key) {
  const b = OH.findBoss(key);
  if (!b) return null;
  OH.pushRecentlyViewed("bosses", b._key, b.name);
  if (b._kind === "seasonal") {
    return `
      ${OH.breadcrumb("bosses", "Bosses", b.name)}
      <h2>${OH.esc(b.name)}</h2>
      <div class="meta detail-meta"><span class="tag">${OH.esc(b.type)}</span></div>
      <p>${OH.esc(b.context)}</p>
      <div class="section-block"><h3>Drops</h3><p class="intro intro-tight">${OH.esc(b.drops)}</p></div>
      <div class="section-block"><h3>Data verification</h3>${OH.verificationObjectBlock(b.verification)}</div>
      ${OH.backLink("bosses", "Bosses")}
    `;
  }
  return `
    ${OH.breadcrumb("bosses", "Bosses", b.name)}
    <div class="detail-head"><h2>${OH.esc(b.name)}</h2>${OH.favoriteButton("bosses", b._key, b.name)}</div>
    <div class="meta detail-meta"><span class="tag">Lv ${OH.esc(b.level)}</span><span class="tag">${OH.esc(b.location)}</span></div>
    <div class="section-block">
      <h3>Fight mechanics</h3>
      <p class="intro intro-tight">${OH.esc(b.mechanics)}</p>
    </div>
    <div class="section-block">
      <h3>Drops</h3>
      <p class="intro intro-tight">${OH.esc(b.drops)}</p>
    </div>
    <div class="section-block">
      <h3>Data verification</h3>
      ${OH.verificationObjectBlock(b.verification)}
    </div>
    ${OH.backLink("bosses", "Bosses")}
  `;
};
