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
const sources = loadJson("sources.json");

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

// Validates the shared {status, sourceIds, lastVerified, verifiedPatch, notes?}
// shape used across weapons/armor/mods/bosses/stations/builds/deviants: status
// must be a legend id, every sourceId must resolve to a real sources.json
// entry, and the two date/patch fields must be present (even if their value
// is honestly "unverified"-flavored — the point is the shape is never
// silently missing pieces on a record that claims to have it at all).
const validSourceIds = new Set((sources && sources.sources || []).map(s => s.id));
function checkVerificationObject(obj, where) {
  if (!obj) return;
  checkVerification(obj.status, where);
  if (!Array.isArray(obj.sourceIds)) fail(`${where}: verification.sourceIds must be an array`);
  else obj.sourceIds.forEach(id => {
    if (!validSourceIds.has(id)) fail(`${where}: verification.sourceIds references unknown source id "${id}"`);
  });
  if (!obj.lastVerified) fail(`${where}: verification missing lastVerified`);
  if (!obj.verifiedPatch) fail(`${where}: verification missing verifiedPatch`);
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
  checkVerificationObject(w.verification, `weapons.${w.id}.verification`);
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
  checkVerificationObject(s.verification, `armor.${s.name}.verification`);
});

/* ---------------------------------------------------------------------- */
/* Attachments                                                             */
/* ---------------------------------------------------------------------- */
attachments.types.forEach(t => {
  if (t.confirmedStats) {
    checkVerificationObject(t.confirmedStats.verification, `attachments.${t.id}.confirmedStats.verification`);
    Object.keys(t.confirmedStats.byName).forEach(name => {
      if (!t.examples.includes(name)) fail(`attachments.${t.id}.confirmedStats.byName references "${name}" which isn't in this type's examples list`);
    });
  }
  if (t.rarityStatPattern) checkVerificationObject(t.rarityStatPattern.verification, `attachments.${t.id}.rarityStatPattern.verification`);
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
  checkVerificationObject(g.effectVerification, `mods.${g.effect}.effectVerification`);
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
  checkVerificationObject(b.verification, `builds.${b.id}.verification`);
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
  checkVerificationObject(v.abilityVerification, `deviants.${v.name}.abilityVerification`);
});
if (deviants.locationSource) checkUrl(deviants.locationSource.url, "deviants.locationSource");

/* ---------------------------------------------------------------------- */
/* Bosses                                                                  */
/* ---------------------------------------------------------------------- */
[...bosses.greatOnes, ...bosses.seasonalAndEventBosses].forEach((b, i) => {
  if (!b.name) fail(`bosses entry [${i}] missing "name"`);
  if (bosses.greatOnes.includes(b) && !b.location) fail(`bosses.${b.name} (Great One) missing "location"`);
  checkVerificationObject(b.verification, `bosses.${b.name}.verification`);
});

/* ---------------------------------------------------------------------- */
/* Stations — unlockVerification values                                   */
/* ---------------------------------------------------------------------- */
[...stations.weaponAndGearStations, ...stations.cookingStations, ...stations.otherStations].forEach(s => {
  checkVerification(s.unlockVerification, `stations.${s.id}.unlockVerification`);
  checkVerificationObject(s.verification, `stations.${s.id}.verification`);
});

/* ---------------------------------------------------------------------- */
/* Techtree — verification values                                         */
/* ---------------------------------------------------------------------- */
(techtree.unlockMethods || []).forEach(m => {
  checkVerification(m.verification, `techtree.unlockMethods.${m.id}`);
  (m.sourceIds || []).forEach(id => { if (!validSourceIds.has(id)) fail(`techtree.unlockMethods.${m.id}.sourceIds references unknown source id "${id}"`); });
});
(techtree.branches || []).forEach(b => {
  checkVerification(b.verification, `techtree.branches.${b.id}`);
  (b.sourceIds || []).forEach(id => { if (!validSourceIds.has(id)) fail(`techtree.branches.${b.id}.sourceIds references unknown source id "${id}"`); });
});
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
/* sources.json — the registry itself                                     */
/* ---------------------------------------------------------------------- */
if (!sources || !sources.sources || !sources.sources.length) {
  fail("sources.json missing or empty — every verification.sourceIds reference depends on this file");
} else {
  const VALID_SOURCE_TYPES = new Set(["official", "database", "wiki", "community"]);
  checkDuplicateIds(sources.sources, "id", "sources");
  sources.sources.forEach(s => {
    checkUrl(s.url, `sources.${s.id}`);
    if (!VALID_SOURCE_TYPES.has(s.type)) fail(`sources.${s.id} has invalid type "${s.type}" — must be one of: ${[...VALID_SOURCE_TYPES].join(", ")}`);
    if (!s.lastChecked) fail(`sources.${s.id} missing lastChecked`);
  });
}

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
