// Once Human Database — Weapons / Armor / Attachments / Mods pages
window.OH = window.OH || {};
const esc11 = OH.esc;

function matchesQuery(text) {
  if (!OH.state.query) return true;
  return String(text).toLowerCase().includes(OH.state.query);
}
function labelForType(id, types) {
  const t = types.find(t => t.id === id);
  return t ? t.name : id;
}

/* ---------------------------------------------------------------------- */
/* Weapons                                                                 */
/* ---------------------------------------------------------------------- */

const WEAPON_FILTER_CONFIG = () => [
  { key: "type", label: "Weapon Type", accessor: w => w.type, options: OH.state.data.weapons.weaponTypes.map(t => ({ value: t.id, label: t.name })) },
  { key: "rarity", label: "Rarity", accessor: w => w.rarity, options: OH.state.data.weapons.rarities.map(r => ({ value: r.id, label: r.name })) },
  { key: "tier", label: "Tier", accessor: w => w.tier, options: ["S", "A", "B", "C"].map(t => ({ value: t, label: `Tier ${t}` })) },
  { key: "archetype", label: "Weapon Effect", accessor: w => w.confirmedArchetype || [], options: OH.idx.archetypes.map(a => ({ value: a._key, label: a.name })) },
  { key: "pvpPve", label: "PvE/PvP", accessor: w => w._pvpPve, options: [{ value: "pve", label: "PvE" }, { value: "pvp", label: "PvP" }, { value: "both", label: "PvE / PvP" }, { value: "unspecified", label: "Unspecified" }] }
];
const WEAPON_SORT_CONFIG = [
  { key: "name", label: "Name", accessor: w => w.name },
  { key: "tier", label: "Tier", accessor: w => ({ S: 0, A: 1, B: 2, C: 3 }[w.tier] ?? 9) },
  { key: "rarity", label: "Rarity", accessor: w => OH.RARITY_ORDER.indexOf(w.rarity) },
  { key: "damage", label: "Damage", accessor: w => typeof w.damage === "number" ? w.damage : parseFloat(w.damage) || null },
  { key: "fireRate", label: "Fire Rate", accessor: w => w.fireRate || null }
];

OH.renderWeapons = function renderWeapons() {
  const w = OH.state.data.weapons;
  const filterConfig = WEAPON_FILTER_CONFIG();
  const active = OH.getActiveFilters("weapons");
  let items = OH.idx.weapons.filter(x => matchesQuery(x.name + x.type + (x.notes || "")));
  items = OH.applyFilters(items, filterConfig, active);
  items = OH.applySort(items, WEAPON_SORT_CONFIG, OH.state.sort.weapons);
  const compareBar = OH.renderCompareBar("weapons");
  return `
    <h2>Weapons</h2>
    <p class="intro">${esc11(w.note)}</p>
    <div class="badge-list">${w.weaponTypes.map(t => `<span class="tag" title="${esc11(t.description)}">${esc11(t.name)}</span>`).join("")}</div>
    ${OH.renderFilterBar("weapons", filterConfig, active, WEAPON_SORT_CONFIG, OH.state.sort.weapons)}
    ${compareBar}
    <div class="grid">
      ${items.map(x => `
        ${OH.cardOpen("weapons", x._key)}
          <div class="card-top-row">
            ${OH.weaponTypeIcon(x.type)}
            <input type="checkbox" class="compare-check" data-compare-kind="weapons" data-compare-id="${esc11(x._key)}" ${OH.state.compareSelection.some(c => c.kind === "weapons" && c.id === x._key) ? "checked" : ""} aria-label="Select ${esc11(x.name)} to compare">
            ${OH.favoriteButton("weapons", x._key, x.name)}
          </div>
          <h3>${esc11(x.name)}</h3>
          <div class="meta">
            ${OH.rarityDot(x.rarity)}
            <span class="tag">${esc11(labelForType(x.type, w.weaponTypes))}</span>
            <span class="tag tier-${esc11(x.tier || "")}">Tier ${esc11(x.tier || "?")}</span>
            <span class="tag">${esc11(OH.capitalize(x.rarity))}</span>
          </div>
          ${x.damage ? `<p><strong>Damage:</strong> ${esc11(x.damage)}${x.fireRate ? ` · <strong>RPM:</strong> ${esc11(x.fireRate)}` : ""}</p>` : ""}
          <p>${esc11(x.notes || "")}</p>
          <div class="meta">${OH.pvpPveTag(x._pvpPve)}</div>
        </div>
      `).join("") || OH.emptyState(OH.state.query)}
    </div>
  `;
};

OH.renderWeaponDetail = function renderWeaponDetail(key) {
  const w = OH.findWeapon(key);
  if (!w) return null;
  OH.pushRecentlyViewed("weapons", key, w.name);
  const station = OH.findStation(w.craftingStation);
  const builds = OH.buildsByWeapon(w._key);
  const archetypeCard = aid => {
    const arch = OH.findArchetype(aid);
    const group = OH.findModGroupByArchetype(aid);
    if (!arch) return "";
    return `
      <div class="card">
        <h3>${OH.link("classes", arch._key, arch.name)}</h3>
        <div class="meta"><span class="tag">${esc11(arch.role)}</span></div>
        <p>${esc11(arch.summary)}</p>
        ${group ? `<p><strong>Mods to run:</strong></p><ul>${group.mods.slice(0, 5).map(m => `<li>${OH.link("mods", OH.slugify(group.effect) + "--" + OH.slugify(m.name), m.name)} — ${esc11(m.effect)}</li>`).join("")}</ul>` : ""}
      </div>`;
  };
  const confirmedCards = (w.confirmedArchetype || []).map(archetypeCard).join("");

  return `
    ${OH.breadcrumb("weapons", "Weapons", w.name)}
    <div class="detail-head">
      <h2>${esc11(w.name)}</h2>
      ${OH.favoriteButton("weapons", w._key, w.name)}
    </div>
    <div class="meta detail-meta">
      <span class="tag">${esc11(labelForType(w.type, OH.state.data.weapons.weaponTypes))}</span>
      ${w.tier ? `<span class="tag tier-${esc11(w.tier)}">Tier ${esc11(w.tier)}</span>` : ""}
      ${OH.rarityDot(w.rarity)}<span class="tag">${esc11(OH.capitalize(w.rarity))}</span>
      ${OH.pvpPveTag(w._pvpPve)}
    </div>
    ${w.damage ? `<p><strong>Damage:</strong> ${esc11(w.damage)}${w.fireRate ? ` &middot; <strong>Fire rate:</strong> ${esc11(w.fireRate)} RPM` : ""}</p>` : ""}
    <p>${esc11(w.notes || "")}</p>
    ${w.archetypeNote ? `<p class="intro">${esc11(w.archetypeNote)}</p>` : ""}

    <div class="section-block">
      <h3>Where to get it &amp; how to craft it</h3>
      <div class="meta mb-sm">${OH.obtainBadges(w._obtainMethods)}</div>
      <p class="intro intro-tight">${esc11(w.acquisition)}</p>
      ${station ? `<div class="card"><h3>${OH.link("stations", station._key, station.name)}</h3><div class="meta"><span class="tag">Tier ${esc11(station.tier)}</span>${station.unlockVerification ? OH.verificationBadge(station.unlockVerification) : ""}</div>${station.unlock ? `<p>${esc11(station.unlock)}</p>` : ""}${station.materials ? `<p><strong>Materials:</strong> ${station.materials.map(esc11).join(", ")}</p>` : ""}<p>${esc11(station.produces)}</p></div>` : ""}
    </div>

    ${confirmedCards
      ? `<div class="section-block"><h3>Confirmed built-in weapon effect ${OH.verificationBadge("confirmed", { compact: true })}</h3><p class="intro intro-tight">This specific weapon's own kit is independently confirmed to trigger this effect.</p><div class="grid">${confirmedCards}</div></div>`
      : `<div class="section-block"><h3>Weapon effects</h3><p class="intro intro-tight">This weapon has no confirmed intrinsic weapon effect. In Once Human, effects like Shrapnel, Power Surge, Frost Vortex, Bounce, Fast Gunner, Burn, Unstable Bomber, Fortress Warfare and Marked come from whichever core-effect mod you equip — most mods fit most weapons in that slot. Browse the ${OH.link("mods", "", "Mods section")} to pick one, or the ${OH.link("builds", "", "Builds & Classes section")} for full named loadouts.</p></div>`}

    ${builds.length ? `<div class="section-block"><h3>Used in builds</h3><div class="grid">${builds.map(b => `<div class="card"><h3>${OH.link("builds", b._key, b.name)}</h3><div class="meta"><span class="tag">${esc11(b._role)}</span><span class="tag">${esc11(b.role)}</span></div><p>${esc11(b.summary)}</p></div>`).join("")}</div></div>` : ""}

    <div class="section-block">
      <h3>Data verification</h3>
      ${OH.verificationObjectBlock(w.verification)}
    </div>

    ${OH.backLink("weapons", "Weapons")}
  `;
};

/* ---------------------------------------------------------------------- */
/* Armor                                                                   */
/* ---------------------------------------------------------------------- */

function armorBonusSummary(s) {
  if (!s.bonusesByPiece || !s.bonusesByPiece.length) return "";
  return s.bonusesByPiece.map(b => `${b.pieces}pc: ${b.effect}`).join(" ");
}

const ARMOR_FILTER_CONFIG = () => [
  { key: "rarity", label: "Rarity", accessor: s => s.rarity, options: [...new Set(OH.idx.armorSets.map(s => s.rarity))].map(r => ({ value: r, label: OH.capitalize(r) })) },
  { key: "pieces", label: "Pieces", accessor: s => String(s.pieces), options: [...new Set(OH.idx.armorSets.map(s => s.pieces))].sort().map(p => ({ value: String(p), label: `${p} pieces` })) }
];

OH.renderArmor = function renderArmor() {
  const a = OH.state.data.armor;
  const filterConfig = ARMOR_FILTER_CONFIG();
  const active = OH.getActiveFilters("armor");
  let sets = OH.idx.armorSets.filter(s => matchesQuery(s.name + armorBonusSummary(s) + (s.playstyle || "")));
  sets = OH.applyFilters(sets, filterConfig, active);
  return `
    <h2>Armor</h2>
    <p class="intro">${esc11(a.overview)}</p>
    <div class="section-block">
      <h3>Attributes</h3>
      <div class="grid">
        ${a.attributes.map(x => `<div class="card"><h3>${esc11(x.name)}</h3><p>${esc11(x.description)}</p></div>`).join("")}
      </div>
      <p class="intro">${esc11(a.craftingNote)}</p>
      <p class="intro">${esc11(a.setBonusMechanic)}</p>
    </div>
    <div class="section-block">
      <h3>Armor Sets <span class="tag">${sets.length}</span></h3>
      ${OH.renderFilterBar("armor", filterConfig, active, null, null)}
      ${OH.renderCompareBar("armor")}
      <div class="grid">
        ${sets.map(s => `
          ${OH.cardOpen("armor", s._key)}
            <div class="card-top-row">
              <input type="checkbox" class="compare-check" data-compare-kind="armor" data-compare-id="${esc11(s._key)}" ${OH.state.compareSelection.some(c => c.kind === "armor" && c.id === s._key) ? "checked" : ""} aria-label="Select ${esc11(s.name)} to compare">
              ${OH.favoriteButton("armor", s._key, s.name)}
            </div>
            <h3>${esc11(s.name)}</h3>
            <div class="meta">${OH.rarityDot(s.rarity)}<span class="tag">${esc11(OH.capitalize(s.rarity))}</span><span class="tag">${esc11(s.pieces)}pc</span><span class="tag">${esc11(s.bonusCount)} bonus${s.bonusCount === 1 ? "" : "es"}</span></div>
            ${s.bonusesByPiece && s.bonusesByPiece.length ? `<p>${esc11(s.bonusesByPiece[s.bonusesByPiece.length - 1].effect)}</p>` : `<p class="intro mt-xs">Set bonus text not confirmed by available sources — see the note below.</p>`}
          </div>
        `).join("") || OH.emptyState(OH.state.query)}
      </div>
      <p class="intro mt-lg">${esc11(a.note)}</p>
    </div>
  `;
};

OH.renderArmorSetDetail = function renderArmorSetDetail(key) {
  const s = OH.findArmorSet(key);
  if (!s) return null;
  OH.pushRecentlyViewed("armor", key, s.name);
  return `
    ${OH.breadcrumb("armor", "Armor", s.name)}
    <div class="detail-head"><h2>${esc11(s.name)}</h2>${OH.favoriteButton("armor", s._key, s.name)}</div>
    <div class="meta detail-meta">${OH.rarityDot(s.rarity)}<span class="tag">${esc11(OH.capitalize(s.rarity))}</span><span class="tag">${esc11(s.pieces)} pieces</span><span class="tag">${esc11(s.bonusCount)} bonus${s.bonusCount === 1 ? "" : "es"}</span></div>
    ${s.bonusesByPiece && s.bonusesByPiece.length ? `
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Pieces</th><th>Effect</th></tr></thead>
        <tbody>${s.bonusesByPiece.map(b => `<tr><td data-label="Pieces">${esc11(b.pieces)}</td><td data-label="Effect">${esc11(b.effect)}</td></tr>`).join("")}</tbody>
      </table></div>
    ` : `<p class="intro">Set bonus text not confirmed by available sources for this set.</p>`}
    ${s.playstyle ? `<div class="section-block"><h3>Best for</h3><p class="intro intro-tight">${esc11(s.playstyle)}</p></div>` : ""}
    ${s.notes ? `<p class="intro">${esc11(s.notes)}</p>` : ""}
    <div class="section-block">
      <h3>Attributes on this armor</h3>
      <ul>${OH.state.data.armor.attributes.map(x => `<li><strong>${esc11(x.name)}:</strong> ${esc11(x.description)}</li>`).join("")}</ul>
      <p class="intro">${esc11(OH.state.data.armor.craftingNote)}</p>
    </div>
    <div class="section-block">
      <h3>Data verification</h3>
      ${OH.verificationObjectBlock(s.verification)}
    </div>
    ${OH.backLink("armor", "Armor")}
  `;
};

/* ---------------------------------------------------------------------- */
/* Weapon Accessories / Attachments                                        */
/* ---------------------------------------------------------------------- */

OH.renderAttachments = function renderAttachments() {
  const a = OH.state.data.attachments;
  const types = OH.idx.attachmentTypes.filter(t => matchesQuery(t.name + t.effect + t.examples.join(" ")));
  return `
    <h2>Weapon Accessories</h2>
    <p class="intro">${esc11(a.overview)}</p>
    ${OH.notice(a.mechanicNotice)}
    <div class="section-block">
      <h3>How to obtain</h3>
      <ul>${a.howToObtain.map(x => `<li>${esc11(x)}</li>`).join("")}</ul>
    </div>
    <div class="section-block">
      <h3>Types <span class="tag">${types.length}</span></h3>
      <div class="grid">
        ${types.map(t => `
          ${OH.cardOpen("attachments", t._key)}
            <h3>${esc11(t.name)}</h3>
            <div class="meta"><span class="tag">${t.examples.length} known</span></div>
            <p>${esc11(t.effect)}</p>
          </div>
        `).join("") || OH.emptyState(OH.state.query)}
      </div>
    </div>
  `;
};

OH.renderAttachmentTypeDetail = function renderAttachmentTypeDetail(key) {
  const t = OH.findAttachmentType(key);
  if (!t) return null;
  return `
    ${OH.breadcrumb("attachments", "Weapon Accessories", t.name)}
    <h2>${esc11(t.name)}</h2>
    <p>${esc11(t.effect)}</p>
    <div class="section-block">
      <h3>Known ${esc11(t.name)} <span class="tag">${t.examples.length}</span></h3>
      ${t.confirmedStats ? `
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Name</th><th>Confirmed stats</th></tr></thead>
          <tbody>${t.examples.map(e => `<tr><td data-label="Name">${esc11(e)}</td><td data-label="Confirmed stats">${t.confirmedStats.byName[e] ? esc11(t.confirmedStats.byName[e]) : `<span class="intro">Not independently confirmed</span>`}</td></tr>`).join("")}</tbody>
        </table></div>
        ${OH.verificationObjectBlock(t.confirmedStats.verification)}
      ` : `<ul>${t.examples.map(e => `<li>${esc11(e)}</li>`).join("")}</ul>`}
    </div>
    ${t.rarityStatPattern ? `
      <div class="section-block">
        <h3>Confirmed stat pattern by rarity ${OH.verificationBadge(t.rarityStatPattern.verification.status, { compact: true })}</h3>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Variant</th><th>Rare</th><th>Epic</th><th>Legendary</th></tr></thead>
          <tbody>${t.rarityStatPattern.examples.map(x => `<tr>
            <td data-label="Variant">${esc11(x.variant)}</td>
            <td data-label="Rare">${esc11(x.rare)}</td>
            <td data-label="Epic">${esc11(x.epic)}</td>
            <td data-label="Legendary">${esc11(x.legendary)}</td>
          </tr>`).join("")}</tbody>
        </table></div>
        ${OH.verificationObjectBlock(t.rarityStatPattern.verification)}
      </div>
    ` : ""}
    ${t.communityAcquisition ? `
      <div class="section-block">
        <h3>Where to get them ${OH.verificationBadge(t.communityAcquisition.verification.status, { compact: true })}</h3>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Name</th><th>Region</th><th>Weapon compatibility</th></tr></thead>
          <tbody>${t.examples.filter(e => t.communityAcquisition.byName[e]).map(e => {
            const a = t.communityAcquisition.byName[e];
            const extra = [a.conflictNote, a.sourceNote, a.corroboratedNote].filter(Boolean)
              .map(n => `<div class="intro intro-tight">${esc11(n)}</div>`).join("");
            return `<tr>
              <td data-label="Name">${esc11(e)}${extra}</td>
              <td data-label="Region">${esc11(a.region)}</td>
              <td data-label="Weapon compatibility">${a.compatibility ? esc11(a.compatibility) : `<span class="intro">Not given</span>`}</td>
            </tr>`;
          }).join("")}</tbody>
        </table></div>
        ${OH.verificationObjectBlock(t.communityAcquisition.verification)}
      </div>
    ` : ""}
    <div class="section-block">
      <h3>Mechanic notes</h3>
      <p class="intro intro-tight">${esc11(OH.state.data.attachments.mechanicNotice)}</p>
    </div>
    ${OH.backLink("attachments", "Weapon Accessories")}
  `;
};

/* ---------------------------------------------------------------------- */
/* Mods                                                                    */
/* ---------------------------------------------------------------------- */

const MOD_FILTER_CONFIG = () => [
  { key: "effect", label: "Effect", accessor: m => OH.slugify(m.groupEffect), options: OH.idx.modGroups.map(g => ({ value: g._key, label: g.effect })) },
  { key: "pvpPve", label: "PvE/PvP", accessor: m => m._pvpPve, options: [{ value: "pve", label: "PvE" }, { value: "pvp", label: "PvP" }, { value: "unspecified", label: "Unspecified" }] }
];

OH.renderMods = function renderMods() {
  const m = OH.state.data.mods;
  const filterConfig = MOD_FILTER_CONFIG();
  const active = OH.getActiveFilters("mods");
  const groups = OH.idx.modGroups
    .map(g => ({ ...g, mods: OH.applyFilters(g.mods.filter(x => matchesQuery(x.name + x.effect + g.effect)).map(x => ({ ...x, groupEffect: g.effect, _pvpPve: OH.derivePvpPve(x.effect) })), filterConfig, active) }))
    .filter(g => g.mods.length || (matchesQuery(g.effect) && !active.effect));
  return `
    <h2>Mods</h2>
    <p class="intro">${esc11(m.overview)}</p>
    <div class="section-block">
      <h3>How the mod system works right now</h3>
      <p class="intro intro-tight">${esc11(m.modSystemMechanics)}</p>
      <h3>How mods are farmed</h3>
      <ul>${m.howToFarm.map(x => `<li>${esc11(x)}</li>`).join("")}</ul>
    </div>
    ${OH.renderFilterBar("mods", filterConfig, active, null, null)}
    ${groups.map(g => `
      <div class="section-block">
        <h3>${OH.link("classes", g._key, g.effect)}</h3>
        <p class="intro intro-tight">${esc11(g.description)} <em>${esc11(g.obtainedFrom)}</em></p>
        <div class="grid">
          ${g.mods.map(x => `
            ${OH.cardOpen("mods", g._key + "--" + OH.slugify(x.name))}
              <div class="card-top-row">${OH.favoriteButton("mods", g._key + "--" + OH.slugify(x.name), x.name)}</div>
              <h3>${esc11(x.name)}</h3>
              <p>${esc11(x.effect)}</p>
              <div class="meta">${OH.pvpPveTag(x._pvpPve)}</div>
            </div>
          `).join("")}
        </div>
      </div>
    `).join("") || OH.emptyState(OH.state.query)}
  `;
};

OH.renderModDetail = function renderModDetail(key) {
  const mod = OH.findMod(key);
  if (!mod) return null;
  OH.pushRecentlyViewed("mods", key, mod.name);
  const group = OH.findModGroup(OH.slugify(mod.groupEffect));
  const weapons = group ? OH.weaponsByArchetype(group._key) : [];
  return `
    ${OH.breadcrumb("mods", "Mods", mod.name)}
    <div class="detail-head"><h2>${esc11(mod.name)}</h2>${OH.favoriteButton("mods", mod._key, mod.name)}</div>
    <div class="meta detail-meta">${group ? `<span class="tag">${OH.link("classes", group._key, group.effect)}</span>` : ""}${OH.pvpPveTag(OH.derivePvpPve(mod.effect))}</div>
    <p>${esc11(mod.effect)}</p>
    <div class="section-block">
      <h3>Where to get it</h3>
      <p class="intro intro-tight">${esc11(mod.groupObtainedFrom)}</p>
    </div>
    ${weapons.length ? `<div class="section-block"><h3>Weapons with this confirmed built-in effect</h3><div class="grid">${weapons.map(w => `<div class="card"><h3>${OH.link("weapons", w._key, w.name)}</h3><p>${esc11(w.notes || "")}</p></div>`).join("")}</div></div>` : ""}
    <div class="section-block">
      <h3>Data verification</h3>
      ${OH.verificationObjectBlock(group ? group.effectVerification : null)}
    </div>
    ${OH.backLink("mods", "Mods")}
  `;
};

/* ---------------------------------------------------------------------- */
/* Compare                                                                 */
/* ---------------------------------------------------------------------- */

const COMPARE_FINDERS = { weapons: OH.findWeapon, armor: OH.findArmorSet };

OH.renderCompareBar = function renderCompareBar(kind) {
  const sel = OH.state.compareSelection.filter(c => c.kind === kind);
  if (!sel.length) return "";
  const finder = COMPARE_FINDERS[kind] || OH.findWeapon;
  return `
    <div class="compare-bar">
      <span>Comparing: ${sel.map(c => esc11((finder(c.id) || {}).name || c.id)).join(" vs ")}</span>
      ${sel.length >= 2 ? `<button type="button" class="btn-primary" data-compare-go="${esc11(kind)}">Compare now</button>` : `<span class="intro">Pick one more to compare.</span>`}
      <button type="button" class="filter-clear" data-compare-clear="${esc11(kind)}">Clear</button>
    </div>
  `;
};

// Renders a compare table with data-label on every cell so the mobile
// stacked layout (table.data-table td{display:block}) still shows which
// value belongs to which column instead of an unlabeled stack of text.
function compareTable(rows, items, colLabelFor) {
  return `
    <div class="table-wrap"><table class="data-table compare-table">
      <thead><tr><th></th>${items.map(colLabelFor).join("")}</tr></thead>
      <tbody>
        ${rows.map(r => `<tr>
          <td data-label="">${esc11(r.label)}</td>
          ${items.map(it => `<td data-label="${esc11(r.label)}">${esc11(r.get(it))}</td>`).join("")}
        </tr>`).join("")}
      </tbody>
    </table></div>
  `;
}

OH.renderCompare = function renderCompare(segments) {
  const [kind, ...ids] = segments;
  if (kind === "weapons" && ids.length >= 2) {
    const items = ids.map(OH.findWeapon).filter(Boolean);
    if (items.length < 2) return `<div class="empty-state">Couldn't find those weapons to compare. ${OH.backLink("weapons", "Weapons")}</div>`;
    const rows = [
      { label: "Type", get: w => labelForType(w.type, OH.state.data.weapons.weaponTypes) },
      { label: "Tier", get: w => w.tier || "—" },
      { label: "Rarity", get: w => OH.capitalize(w.rarity) },
      { label: "Damage", get: w => w.damage ?? "—" },
      { label: "Fire Rate", get: w => w.fireRate ? w.fireRate + " RPM" : "—" },
      { label: "Confirmed effect", get: w => (w.confirmedArchetype || []).map(a => (OH.findArchetype(a) || {}).name).join(", ") || "None confirmed" },
      { label: "PvE/PvP", get: w => ({ pve: "PvE", pvp: "PvP", both: "PvE / PvP", unspecified: "Unspecified" }[w._pvpPve]) },
      { label: "Acquisition", get: w => w.acquisition }
    ];
    return `
      <h2>Compare Weapons</h2>
      ${compareTable(rows, items, w => `<th>${OH.link("weapons", w._key, w.name)}</th>`)}
      ${OH.backLink("weapons", "Weapons")}
    `;
  }
  if (kind === "armor" && ids.length >= 2) {
    const items = ids.map(OH.findArmorSet).filter(Boolean);
    if (items.length < 2) return `<div class="empty-state">Couldn't find those armor sets to compare. ${OH.backLink("armor", "Armor")}</div>`;
    const rows = [
      { label: "Rarity", get: s => OH.capitalize(s.rarity) },
      { label: "Pieces", get: s => s.pieces },
      { label: "Bonus thresholds", get: s => s.bonusCount },
      { label: "Playstyle", get: s => s.playstyle || "—" },
      { label: "Best/last bonus", get: s => (s.bonusesByPiece && s.bonusesByPiece.length) ? s.bonusesByPiece[s.bonusesByPiece.length - 1].effect : "Not confirmed" },
      { label: "Verification", get: s => (s.verification && s.verification.status) || "unverified" }
    ];
    return `
      <h2>Compare Armor</h2>
      ${compareTable(rows, items, s => `<th>${OH.link("armor", s._key, s.name)}</th>`)}
      ${OH.backLink("armor", "Armor")}
    `;
  }
  return `<div class="empty-state">Select 2 items from the Weapons or Armor page to compare. ${OH.backLink("weapons", "Weapons")}</div>`;
};
