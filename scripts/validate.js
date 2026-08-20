#!/usr/bin/env node
// Once Human Database — data validation.
// Checks data/*.json for the things a hand-read audit can't scale to catch:
// duplicate ids, dangling cross-references, malformed URLs, invalid rarity/
// verification-status values. Exits non-zero on any failure so this can gate
// a future CI step (npm run build already runs this via `prebuild`).

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const dataDir = path.join(root, "data");

const errors = [];
const warnings = [];
function fail(msg) { errors.push(msg); }
function warn(msg) { warnings.push(msg); }

function loadJson(name) {
  const p = path.join(dataDir, name);
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    fail(`${name}: failed to parse JSON — ${e.message}`);
    return null;
  }
}

const meta = loadJson("meta.json");
const weapons = loadJson("weapons.json");
const armor = loadJson("armor.json");
const attachments = loadJson("attachments.json");
const mods = loadJson("mods.json");
const blueprints = loadJson("blueprints.json");
const stations = loadJson("stations.json");
const builds = loadJson("builds.json");
const classes = loadJson("classes.json");
const memetics = loadJson("memetics.json");
const techtree = loadJson("techtree.json");
const deviants = loadJson("deviants.json");
const ranching = loadJson("ranching.json");
const crops = loadJson("crops.json");
const food = loadJson("food.json");
const bosses = loadJson("bosses.json");
const regions = loadJson("regions.json");
const updates = loadJson("updates.json");

if (errors.length) {
  // Can't do any further structural checks if a file failed to parse at all.
  printAndExit();
}

const VALID_RARITIES = new Set((weapons.rarities || []).map(r => r.id));
const VALID_VERIFICATION = new Set((meta.verificationLegend || []).map(l => l.id));
const URL_RE = /^https?:\/\/[^\s]+$/;

function checkUrl(url, where) {
  if (!url) return;
  if (!URL_RE.test(url)) fail(`Malformed URL in ${where}: "${url}"`);
}

function checkDuplicateIds(list, idKey, label) {
  const seen = new Map();
  list.forEach((item, i) => {
    const id = item[idKey];
    if (id == null) { warn(`${label}[${i}] has no "${idKey}"`); return; }
    if (seen.has(id)) fail(`Duplicate ${label} id "${id}" (first at index ${seen.get(id)}, again at ${i})`);
    else seen.set(id, i);
  });
  return seen;
}

function checkRarity(item, where) {
  if (item.rarity && !VALID_RARITIES.has(item.rarity)) {
    fail(`Invalid rarity "${item.rarity}" in ${where} — must be one of: ${[...VALID_RARITIES].join(", ")}`);
  }
}

function checkVerification(status, where) {
  if (status != null && !VALID_VERIFICATION.has(status)) {
    fail(`Invalid verification status "${status}" in ${where} — must be one of: ${[...VALID_VERIFICATION].join(", ")}`);
  }
}

/* ---------------------------------------------------------------------- */
/* Weapons                                                                 */
/* ---------------------------------------------------------------------- */
const weaponIds = checkDuplicateIds(weapons.weapons, "id", "weapons");
const weaponNames = new Map();
weapons.weapons.forEach((w, i) => {
  if (!w.name) fail(`weapons[${i}] (${w.id}) missing "name"`);
  if (!w.type) fail(`weapons[${i}] (${w.id}) missing "type"`);
  checkRarity(w, `weapons.${w.id}`);
  if (weaponNames.has(w.name)) fail(`Duplicate weapon name "${w.name}" (${weaponNames.get(w.name)} and ${w.id})`);
  else weaponNames.set(w.name, w.id);
  if (w.craftingStation && !stations.weaponAndGearStations.some(s => s.id === w.craftingStation)) {
    fail(`weapons.${w.id}.craftingStation "${w.craftingStation}" does not resolve to a known station`);
  }
  (w.confirmedArchetype || []).forEach(aid => {
    if (!classes.weaponEffectArchetypes.some(a => a.id === aid)) {
      fail(`weapons.${w.id}.confirmedArchetype references unknown archetype "${aid}"`);
    }
  });
});
const validWeaponTypeIds = new Set((weapons.weaponTypes || []).map(t => t.id));
weapons.weapons.forEach(w => {
  if (!validWeaponTypeIds.has(w.type)) fail(`weapons.${w.id} has unknown type "${w.type}"`);
});

/* ---------------------------------------------------------------------- */
/* Armor                                                                   */
/* ---------------------------------------------------------------------- */
armor.sets.forEach((s, i) => {
  if (!s.name) fail(`armor.sets[${i}] missing "name"`);
  checkRarity(s, `armor.${s.name}`);
});

/* ---------------------------------------------------------------------- */
/* Mods                                                                    */
/* ---------------------------------------------------------------------- */
const archetypeIds = new Set(classes.weaponEffectArchetypes.map(a => a.id));
mods.groups.forEach(g => {
  if (!g.effect) fail(`mods.groups has an entry with no "effect" name`);
  const seenModNames = new Set();
  g.mods.forEach(m => {
    if (seenModNames.has(m.name)) fail(`Duplicate mod name "${m.name}" within group "${g.effect}"`);
    seenModNames.add(m.name);
  });
});

/* ---------------------------------------------------------------------- */
/* Builds — cross-reference every weapon/mod/archetype it names            */
/* ---------------------------------------------------------------------- */
const buildIds = checkDuplicateIds(builds.builds, "id", "builds");
const allModNames = new Set();
mods.groups.forEach(g => g.mods.forEach(m => allModNames.add(m.name)));

builds.builds.forEach(b => {
  checkVerification(b.gearVerification, `builds.${b.id}.gearVerification`);
  checkVerification(b.dpsClaimVerification, `builds.${b.id}.dpsClaimVerification`);
  if (b.archetype && !archetypeIds.has(b.archetype)) {
    fail(`builds.${b.id}.archetype references unknown archetype "${b.archetype}"`);
  }
  if (b.primaryWeapon && !weaponIds.has(b.primaryWeapon)) {
    fail(`builds.${b.id}.primaryWeapon references unknown weapon id "${b.primaryWeapon}"`);
  }
  (b.secondaryWeapons || []).forEach(wid => {
    if (!weaponIds.has(wid)) fail(`builds.${b.id}.secondaryWeapons references unknown weapon id "${wid}"`);
  });
  if (b.meleeOption && !weaponIds.has(b.meleeOption)) {
    fail(`builds.${b.id}.meleeOption references unknown weapon id "${b.meleeOption}"`);
  }
  (b.suggestedMods || []).forEach(name => {
    if (!allModNames.has(name)) warn(`builds.${b.id}.suggestedMods references mod "${name}" not found in mods.json (may be a legacy/renamed mod)`);
  });
  (b.gearSources || []).forEach(s => checkUrl(s.url, `builds.${b.id}.gearSources`));
});

/* ---------------------------------------------------------------------- */
/* Deviants                                                                */
/* ---------------------------------------------------------------------- */
const deviantIds = new Set();
deviants.deviants.forEach((v, i) => {
  if (deviantIds.has(v.name)) fail(`Duplicate deviant name "${v.name}"`);
  deviantIds.add(v.name);
  if (!v.category) fail(`deviants[${i}] (${v.name}) missing "category"`);
  else if (!deviants.categories.includes(v.category) && !v.category.includes("/")) {
    // allow combo categories like "Territory/Crafting" that reference two known categories
    const parts = v.category.split("/");
    if (!parts.every(p => deviants.categories.includes(p))) {
      warn(`deviants.${v.name} has category "${v.category}" not in the declared categories list`);
    }
  }
  checkVerification(v.locationVerification, `deviants.${v.name}.locationVerification`);
});
if (deviants.locationSource) checkUrl(deviants.locationSource.url, "deviants.locationSource");

/* ---------------------------------------------------------------------- */
/* Bosses                                                                  */
/* ---------------------------------------------------------------------- */
[...bosses.greatOnes, ...bosses.seasonalAndEventBosses].forEach((b, i) => {
  if (!b.name) fail(`bosses entry [${i}] missing "name"`);
  if (bosses.greatOnes.includes(b) && !b.location) fail(`bosses.${b.name} (Great One) missing "location"`);
});

/* ---------------------------------------------------------------------- */
/* Stations — unlockVerification values                                   */
/* ---------------------------------------------------------------------- */
[...stations.weaponAndGearStations, ...stations.cookingStations, ...stations.otherStations].forEach(s => {
  checkVerification(s.unlockVerification, `stations.${s.id}.unlockVerification`);
});

/* ---------------------------------------------------------------------- */
/* Techtree — verification values                                         */
/* ---------------------------------------------------------------------- */
(techtree.unlockMethods || []).forEach(m => checkVerification(m.verification, `techtree.unlockMethods.${m.id}`));
(techtree.branches || []).forEach(b => checkVerification(b.verification, `techtree.branches.${b.id}`));
checkVerification(techtree.nodeDataStatus, "techtree.nodeDataStatus");
(techtree.sources || []).forEach(s => checkUrl(s.url, "techtree.sources"));

/* ---------------------------------------------------------------------- */
/* Crops / Ranching — cross reference deviant helper names                */
/* ---------------------------------------------------------------------- */
(crops.deviantHelpers || []).forEach(h => {
  if (!deviantIds.has(h.name)) warn(`crops.deviantHelpers references deviant "${h.name}" not found in deviants.json`);
});
if (crops.deviatedCrops) {
  checkVerification(crops.deviatedCrops.verification, "crops.deviatedCrops.verification");
  (crops.deviatedCrops.sources || []).forEach(s => checkUrl(s.url, "crops.deviatedCrops.sources"));
}

/* ---------------------------------------------------------------------- */
/* meta.json — sources + legend sanity                                    */
/* ---------------------------------------------------------------------- */
(meta.sources || []).forEach(s => checkUrl(s.url, "meta.sources"));
if (!meta.currentGameVersion) fail("meta.json missing currentGameVersion");
if (!meta.lastVerifiedDate) fail("meta.json missing lastVerifiedDate");
if (!meta.verificationLegend || !meta.verificationLegend.length) fail("meta.json missing verificationLegend");

/* ---------------------------------------------------------------------- */
/* Report                                                                  */
/* ---------------------------------------------------------------------- */
function printAndExit() {
  if (warnings.length) {
    console.log(`⚠ ${warnings.length} warning(s):`);
    warnings.forEach(w => console.log("  - " + w));
  }
  if (errors.length) {
    console.error(`\n✗ ${errors.length} error(s):`);
    errors.forEach(e => console.error("  - " + e));
    console.error(`\nValidation FAILED (${errors.length} error(s), ${warnings.length} warning(s)).`);
    process.exit(1);
  } else {
    console.log(`\n✓ Validation passed (0 errors, ${warnings.length} warning(s)).`);
    process.exit(0);
  }
}

printAndExit();
