// Once Human Database — data loading, cross-reference indexes, finders
window.OH = window.OH || {};

OH.DATA_FILES = {
  meta: "data/meta.json",
  sources: "data/sources.json",
  weapons: "data/weapons.json",
  armor: "data/armor.json",
  attachments: "data/attachments.json",
  mods: "data/mods.json",
  blueprints: "data/blueprints.json",
  stations: "data/stations.json",
  builds: "data/builds.json",
  classes: "data/classes.json",
  memetics: "data/memetics.json",
  techtree: "data/techtree.json",
  deviants: "data/deviants.json",
  ranching: "data/ranching.json",
  crops: "data/crops.json",
  food: "data/food.json",
  bosses: "data/bosses.json",
  regions: "data/regions.json",
  updates: "data/updates.json"
};

OH.state = { data: {}, active: "home", detailId: null, query: "", filters: {}, sort: {}, compareSelection: [] };
OH.idx = {};

OH.loadAll = async function loadAll() {
  // Standalone/preview builds embed the data directly on window.__OH_DATA
  // (see scripts/build-standalone.js) so the page works without a
  // fetch()-capable server.
  if (window.__OH_DATA) {
    OH.state.data = window.__OH_DATA;
    return;
  }
  const entries = Object.entries(OH.DATA_FILES);
  const results = await Promise.all(entries.map(async ([key, path]) => {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
    return [key, await res.json()];
  }));
  results.forEach(([key, val]) => { OH.state.data[key] = val; });
};

// --- derived, computed-not-stored facts ------------------------------------
// PvE/PvP and "how to obtain" badges are computed from existing sourced text
// rather than hand-added as new per-item fields nobody verified — see
// data/meta.json's completenessNote / verificationLegend for why that
// matters here.

const OBTAIN_PATTERNS = [
  { id: "craft", label: "Craft", re: /\bcraft(ed|ing)?\b/i },
  { id: "wish-machine", label: "Wish Machine", re: /wish machine/i },
  { id: "crate", label: "Crate", re: /\bcrate\b/i },
  { id: "drop", label: "Boss/Enemy Drop", re: /\bdrop(s|ped)?\b/i },
  { id: "vendor", label: "Vendor/Shop", re: /\b(vendor|shop|purchas)/i },
  { id: "dungeon", label: "Dungeon/Silo", re: /\b(dungeon|silo)\b/i },
  { id: "reward", label: "Quest/Objective Reward", re: /\b(objective|settlement) reward\b/i }
];
OH.deriveObtainMethods = function deriveObtainMethods(text) {
  if (!text) return [];
  return OBTAIN_PATTERNS.filter(p => p.re.test(text)).map(p => ({ id: p.id, label: p.label }));
};

// Heuristic NEW/CHANGED/REMOVED/FIXED labeling for patch-note bullet points —
// computed from the bullet's own wording (a scanability aid), not an
// official per-line changelog classification from the developers.
const CHANGE_TYPE_PATTERNS = [
  { id: "removed", label: "REMOVED", re: /\b(remov(ed|al)|discontinued|no longer)\b/i },
  { id: "fixed", label: "FIXED", re: /\b(bug fix|fixed|fixes|fix(es)?\b)/i },
  { id: "new", label: "NEW", re: /\b(new |launch|announced|added|introduc)/i }
];
OH.classifyChangeType = function classifyChangeType(text) {
  const hit = CHANGE_TYPE_PATTERNS.find(p => p.re.test(text));
  return hit ? { id: hit.id, label: hit.label } : { id: "changed", label: "CHANGED" };
};

OH.derivePvpPve = function derivePvpPve(text) {
  if (!text) return "unspecified";
  const hasPve = /\(pve\)|\bpve\b/i.test(text);
  const hasPvp = /\(pvp\)|\bpvp\b/i.test(text);
  if (hasPve && hasPvp) return "both";
  if (hasPvp) return "pvp";
  if (hasPve) return "pve";
  return "unspecified";
};

// Build Finder "goal" tags — computed from each build's own role/summary
// text (which is sourced/curated already) rather than hand-labeled again,
// so the tags can't drift from what the build page itself says.
const GOAL_PATTERNS = [
  { id: "boss", label: "Boss DPS", re: /\b(boss|great ones?|monolith)\b/i },
  { id: "solo", label: "Solo", re: /\bsolo\b/i },
  { id: "pvp", label: "PvP", re: /\bpvp\b/i },
  { id: "farming", label: "Farming / Mob Clear", re: /\b(crowd|mobs?|farm(ing)?|dense groups)\b/i },
  { id: "melee", label: "Melee", re: /\bmelee\b/i },
  { id: "elemental", label: "Elemental", re: /\b(electric|shock|frost|freeze|fire|burn|corrosion|elemental)\b/i },
  { id: "crit", label: "Crit-focused", re: /\bcrit(ical)?\b/i },
  { id: "sustain", label: "Sustained Fire", re: /\bsustain(ed)?\b/i }
];
OH.deriveBuildGoals = function deriveBuildGoals(build) {
  const text = `${build.role || ""} ${build.summary || ""}`;
  return GOAL_PATTERNS.filter(g => g.re.test(text)).map(g => ({ id: g.id, label: g.label }));
};

function buildsByWeaponKey(weaponKey) {
  return OH.idx.builds.filter(b => b.primaryWeapon === weaponKey || (b.secondaryWeapons || []).includes(weaponKey) || b.meleeOption === weaponKey);
}

OH.buildIndexes = function buildIndexes() {
  const d = OH.state.data;
  const idx = OH.idx;

  idx.weapons = d.weapons.weapons.map(w => ({ ...w, _key: OH.keyFor(w) }));
  idx.weaponTypeById = Object.fromEntries(d.weapons.weaponTypes.map(t => [t.id, t]));

  idx.armorSets = d.armor.sets.map(s => ({ ...s, _key: OH.slugify(s.name) }));

  idx.attachmentTypes = d.attachments.types.map(t => ({ ...t, _key: t.id }));

  idx.modGroups = d.mods.groups.map(g => ({ ...g, _key: OH.slugify(g.effect) }));
  idx.mods = [];
  idx.modGroups.forEach(g => {
    g.mods.forEach(m => {
      idx.mods.push({ ...m, groupEffect: g.effect, groupDescription: g.description, groupObtainedFrom: g.obtainedFrom, _key: g._key + "--" + OH.slugify(m.name), _pvpPve: OH.derivePvpPve(m.effect) });
    });
  });

  idx.blueprintCategories = d.blueprints.categories.map(c => ({ ...c, _key: c.id }));

  idx.stationsAll = [
    ...d.stations.weaponAndGearStations.map(s => ({ ...s, _group: "Weapon & Gear", _key: s.id })),
    ...d.stations.cookingStations.map(s => ({ ...s, _group: "Cooking", _key: s.id })),
    ...d.stations.otherStations.map(s => ({ ...s, _group: "Other", _key: s.id }))
  ];

  idx.builds = d.builds.builds.map(b => ({ ...b, _key: b.id, _pvpPve: OH.derivePvpPve(b.role + " " + b.summary), _goals: OH.deriveBuildGoals(b) }));
  idx.archetypes = d.classes.weaponEffectArchetypes.map(a => ({ ...a, _key: a.id }));

  // now that idx.builds exists, backfill weapons' build cross-refs + PvE/PvP
  idx.weapons.forEach(w => {
    w._builds = buildsByWeaponKey(w._key);
    w._obtainMethods = OH.deriveObtainMethods(w.acquisition);
    const buildText = w._builds.map(b => b.role).join(" ");
    w._pvpPve = OH.derivePvpPve((w.notes || "") + " " + buildText);
  });

  idx.memetics = [];
  Object.entries(d.memetics.branches).forEach(([branch, list]) => {
    list.forEach(m => idx.memetics.push({ ...m, branch, _key: OH.slugify(branch) + "--" + OH.slugify(m.name) }));
  });

  idx.deviants = d.deviants.deviants.map(v => ({ ...v, _key: OH.slugify(v.name), _pvpPve: OH.derivePvpPve(v.ability) }));

  idx.crops = d.crops.crops.map(c => ({ ...c, _kind: "crop", _key: c.id }));
  idx.livestock = d.ranching.animals.map(l => ({ ...l, _kind: "livestock", _key: OH.slugify(l.name) }));

  idx.foodRecipes = [];
  d.food.categories.forEach(cat => {
    cat.recipes.forEach(r => idx.foodRecipes.push({ ...r, category: cat.name, _key: OH.slugify(r.name), _pvpPve: OH.derivePvpPve(r.effect) }));
  });

  idx.bosses = [
    ...d.bosses.greatOnes.map(b => ({ ...b, _kind: "greatOne", _key: b.id })),
    ...d.bosses.seasonalAndEventBosses.map(b => ({ ...b, _kind: "seasonal", _key: b.id }))
  ];
};

// --- finders ----------------------------------------------------------------
OH.findWeapon = key => OH.idx.weapons.find(w => w._key === key);
OH.findArmorSet = key => OH.idx.armorSets.find(s => s._key === key);
OH.findAttachmentType = key => OH.idx.attachmentTypes.find(t => t._key === key);
OH.findMod = key => OH.idx.mods.find(m => m._key === key);
OH.findModGroup = key => OH.idx.modGroups.find(g => g._key === key);
OH.findBlueprintCategory = key => OH.idx.blueprintCategories.find(c => c._key === key);
OH.findStation = key => OH.idx.stationsAll.find(s => s._key === key);
OH.findBuild = key => OH.idx.builds.find(b => b._key === key);
OH.findArchetype = key => OH.idx.archetypes.find(a => a._key === key);
OH.findMemetic = key => OH.idx.memetics.find(m => m._key === key);
OH.findDeviant = key => OH.idx.deviants.find(v => v._key === key);
OH.findCrop = key => OH.idx.crops.find(c => c._key === key) || OH.idx.livestock.find(l => l._key === key);
OH.findAnimal = key => OH.idx.livestock.find(l => l._key === key);
OH.findFoodRecipe = key => OH.idx.foodRecipes.find(r => r._key === key);
OH.findBoss = key => OH.idx.bosses.find(b => b._key === key);

OH.findModGroupByArchetype = function (archetypeId) {
  const name = OH.ARCHETYPE_GROUP_NAME[archetypeId];
  return name ? OH.idx.modGroups.find(g => g.effect === name) : null;
};
OH.weaponsByArchetype = function (archetypeId) {
  // Only weapons with an independently-confirmed built-in effect match here —
  // there is no unsourced "commonly paired by type" fallback.
  return OH.idx.weapons.filter(w => (w.confirmedArchetype || []).includes(archetypeId));
};
OH.buildsByArchetype = archetypeId => OH.idx.builds.filter(b => b.archetype === archetypeId);
OH.buildsByWeapon = function (weaponKey) {
  return OH.idx.builds
    .filter(b => b.primaryWeapon === weaponKey || (b.secondaryWeapons || []).includes(weaponKey) || b.meleeOption === weaponKey)
    .map(b => ({ ...b, _role: b.primaryWeapon === weaponKey ? "Primary weapon" : b.meleeOption === weaponKey ? "Melee option" : "Secondary weapon" }));
};
OH.foodRecipeByLooseName = function (name) {
  const base = String(name).replace(/\s*\([^)]*\)\s*$/, "").trim();
  return OH.idx.foodRecipes.find(r => r.name === name) || OH.idx.foodRecipes.find(r => r.name === base);
};
OH.cropByIngredientName = function (ingredient) {
  const clean = String(ingredient).replace(/^Deviated\s+/i, "").replace(/\s*\(.*\)$/, "").trim().toLowerCase();
  return OH.idx.crops.find(c => clean.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(clean));
};

// --- source registry -------------------------------------------------------
// data/sources.json is the single place a URL/name/type is ever written down;
// every record's `verification.sourceIds` just points into it by id, so a
// record never re-states a source's name/url (which would drift if that
// source's entry ever changed).
OH.findSource = function findSource(id) {
  const list = (OH.state.data.sources && OH.state.data.sources.sources) || [];
  return list.find(s => s.id === id);
};
OH.resolveSourceIds = function resolveSourceIds(ids) {
  return (ids || []).map(OH.findSource).filter(Boolean);
};
