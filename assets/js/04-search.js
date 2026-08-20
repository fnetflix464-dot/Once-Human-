// Once Human Database — real cross-category search
// Builds one flat corpus across every browsable entity (name, type/effect,
// tags, acquisition, notes) and returns results grouped by category, instead
// of the old per-tab substring filter. This is what lets a query like
// "Power Surge" surface matching Weapons, Mods, Builds, Deviants etc. in one
// place.
window.OH = window.OH || {};

OH.SEARCH_CATEGORIES = [
  { tab: "weapons", label: "Weapons" },
  { tab: "armor", label: "Armor" },
  { tab: "mods", label: "Mods" },
  { tab: "attachments", label: "Accessories" },
  { tab: "builds", label: "Builds" },
  { tab: "classes", label: "Weapon Effects" },
  { tab: "deviants", label: "Deviants" },
  { tab: "ranching", label: "Ranching" },
  { tab: "crops", label: "Crops" },
  { tab: "food", label: "Food & Cooking" },
  { tab: "bosses", label: "Bosses" },
  { tab: "blueprints", label: "Blueprints" },
  { tab: "stations", label: "Stations" },
  { tab: "memetics", label: "Memetics (Legacy)" }
];

OH.buildSearchCorpus = function buildSearchCorpus() {
  const idx = OH.idx;
  const corpus = [];
  const push = (tab, id, title, fields, subtitle) => {
    corpus.push({ tab, id, title, subtitle: subtitle || "", haystack: [title, ...fields].filter(Boolean).join(" ␟ ").toLowerCase() });
  };

  idx.weapons.forEach(w => push("weapons", w._key, w.name, [
    w.type, w.rarity, w.notes, w.acquisition, (w.confirmedArchetype || []).join(" ")
  ], OH.idx.weaponTypeById[w.type] ? OH.idx.weaponTypeById[w.type].name : w.type));

  idx.armorSets.forEach(s => push("armor", s._key, s.name, [
    s.rarity, s.playstyle, (s.bonusesByPiece || []).map(b => b.effect).join(" ")
  ], "Armor Set"));

  idx.mods.forEach(m => push("mods", m._key, m.name, [m.effect, m.groupEffect, m.groupObtainedFrom], m.groupEffect));

  idx.attachmentTypes.forEach(t => push("attachments", t._key, t.name, [t.effect, ...(t.examples || [])], "Accessory Type"));

  idx.builds.forEach(b => push("builds", b._key, b.name, [b.summary, b.role, b.archetype], b.role));

  idx.archetypes.forEach(a => push("classes", a._key, a.name, [a.summary, a.role], "Weapon Effect"));

  idx.deviants.forEach(v => push("deviants", v._key, v.name, [v.ability, v.category, v.crossRef], v.category));

  idx.livestock.forEach(l => push("ranching", l._key, l.name, [l.products, l.tier, l.notes], "Ranching"));

  idx.crops.forEach(c => push("crops", c._key, c.name, [c.uses, c.foundNear], "Crop"));

  idx.foodRecipes.forEach(r => push("food", r._key, r.name, [r.effect, ...(r.ingredients || []), r.category], r.category));

  idx.bosses.forEach(b => push("bosses", b._key, b.name, [b.mechanics, b.context, b.drops, b.location], b._kind === "greatOne" ? "Great One" : b.type));

  idx.blueprintCategories.forEach(c => push("blueprints", c._key, c.name, [c.description, ...(c.examples || [])], "Blueprint Category"));

  idx.stationsAll.forEach(s => push("stations", s._key, s.name, [s.produces, s.unlock], s._group));

  idx.memetics.forEach(m => push("memetics", m._key, m.name, [m.effect, m.branch], "Legacy Memetic"));

  return corpus;
};

// Very small scoring function: exact title match > title starts-with >
// title contains > body contains. Good enough for a dataset this size
// without pulling in a fuzzy-search dependency.
OH.searchCorpus = function searchCorpus(corpus, query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored = [];
  for (const entry of corpus) {
    const title = entry.title.toLowerCase();
    let score = 0;
    if (title === q) score = 100;
    else if (title.startsWith(q)) score = 80;
    else if (title.includes(q)) score = 60;
    else if (entry.haystack.includes(q)) score = 30;
    if (score > 0) scored.push({ ...entry, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored;
};

OH.groupSearchResults = function groupSearchResults(results, maxPerCategory) {
  const byTab = {};
  results.forEach(r => {
    if (!byTab[r.tab]) byTab[r.tab] = [];
    byTab[r.tab].push(r);
  });
  return OH.SEARCH_CATEGORIES
    .map(cat => ({ ...cat, results: (byTab[cat.tab] || []).slice(0, maxPerCategory || 6), total: (byTab[cat.tab] || []).length }))
    .filter(cat => cat.results.length);
};
