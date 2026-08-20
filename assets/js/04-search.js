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

  idx.weapons.forEach(w => {
    const typeLabel = OH.idx.weaponTypeById[w.type] ? OH.idx.weaponTypeById[w.type].name : w.type;
    push("weapons", w._key, w.name, [
      w.type, typeLabel, w.rarity, w.notes, w.acquisition, (w.confirmedArchetype || []).join(" ")
    ], typeLabel);
  });

  idx.armorSets.forEach(s => push("armor", s._key, s.name, [
    s.rarity, s.playstyle, (s.bonusesByPiece || []).map(b => b.effect).join(" ")
  ], "Armor Set"));

  idx.mods.forEach(m => push("mods", m._key, m.name, [m.effect, m.groupEffect, m.groupObtainedFrom], m.groupEffect));

  idx.attachmentTypes.forEach(t => push("attachments", t._key, t.name, [t.effect, ...(t.examples || [])], "Accessory Type"));

  idx.builds.forEach(b => push("builds", b._key, b.name, [b.summary, b.role, b.archetype, ...(b.recommendedArmor || []), ...(b.recommendedFood || [])], b.role));

  idx.archetypes.forEach(a => push("classes", a._key, a.name, [a.summary, a.role], "Weapon Effect"));

  idx.deviants.forEach(v => push("deviants", v._key, v.name, [v.ability, v.category, v.crossRef, v.location], v.category));

  idx.livestock.forEach(l => push("ranching", l._key, l.name, [l.products, l.tier, l.notes], "Ranching"));

  idx.crops.forEach(c => push("crops", c._key, c.name, [c.uses, c.foundNear], "Crop"));

  idx.foodRecipes.forEach(r => push("food", r._key, r.name, [r.effect, ...(r.ingredients || []), r.category], r.category));

  idx.bosses.forEach(b => push("bosses", b._key, b.name, [
    b.mechanics, b.context, b.drops, b.location,
    ...(b.weakPoints || []), ...(b.phases || []).map(p => p.phase + " " + p.description)
  ], b._kind === "greatOne" ? "Great One" : b.type));

  idx.blueprintCategories.forEach(c => push("blueprints", c._key, c.name, [c.description, ...(c.examples || [])], "Blueprint Category"));

  idx.stationsAll.forEach(s => push("stations", s._key, s.name, [s.produces, s.unlock], s._group));

  idx.memetics.forEach(m => push("memetics", m._key, m.name, [m.effect, m.branch], "Legacy Memetic"));

  return corpus;
};

// Small set of common weapon-category shorthand — expanding these lets
// "AR", "SR", "SMG" etc. match the full type name even though the corpus
// stores the human-readable label, not the abbreviation.
OH.SEARCH_ALIASES = {
  ar: "assault rifle", sr: "sniper rifle", sg: "shotgun",
  smg: "submachine gun", lmg: "light machine gun", mg: "machine gun"
};

// Plain Levenshtein edit distance — small dataset, no need for a library.
function editDistance(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const row = new Array(n + 1);
  for (let j = 0; j <= n; j++) row[j] = j;
  for (let i = 1; i <= m; i++) {
    let prevDiag = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = row[j];
      row[j] = Math.min(
        row[j] + 1,          // deletion
        row[j - 1] + 1,      // insertion
        prevDiag + (a[i - 1] === b[j - 1] ? 0 : 1) // substitution
      );
      prevDiag = tmp;
    }
  }
  return row[n];
}

// Scoring: exact title match > title starts-with > title contains > body
// contains > (only if nothing above matched anything) a fuzzy title match
// tolerant of a typo or two, so "Shrapnal"/"Pwoer Surge" still find something
// instead of the dead-end an exact-substring-only search gives.
OH.searchCorpus = function searchCorpus(corpus, query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const qExpanded = OH.SEARCH_ALIASES[q];
  const scored = [];
  for (const entry of corpus) {
    const title = entry.title.toLowerCase();
    let score = 0;
    if (title === q) score = 100;
    else if (title.startsWith(q)) score = 80;
    else if (title.includes(q)) score = 60;
    else if (entry.haystack.includes(q)) score = 30;
    else if (qExpanded && entry.haystack.includes(qExpanded)) score = 30;
    if (score > 0) scored.push({ ...entry, score });
  }
  if (scored.length) {
    scored.sort((a, b) => b.score - a.score);
    return scored;
  }
  // Nothing matched even loosely — fall back to fuzzy title matching only
  // (not the whole haystack, which would produce noisy false positives).
  // Tolerance scales gently with query length so a short query doesn't
  // fuzzy-match half the database.
  if (q.length < 3) return [];
  const maxDistance = q.length <= 5 ? 1 : q.length <= 9 ? 2 : 3;
  const fuzzy = [];
  for (const entry of corpus) {
    const title = entry.title.toLowerCase();
    // Compare against the whole title and each individual word, since a
    // typo'd single word inside a multi-word title shouldn't be penalized
    // by the length of the rest of the title.
    let best = editDistance(title, q);
    title.split(/\s+/).forEach(word => { best = Math.min(best, editDistance(word, q)); });
    if (best <= maxDistance) fuzzy.push({ ...entry, score: 20 - best });
  }
  fuzzy.sort((a, b) => b.score - a.score);
  return fuzzy;
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
