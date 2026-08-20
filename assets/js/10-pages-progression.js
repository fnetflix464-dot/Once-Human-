// Once Human Database — Builds & Classes, Tech Tree (current), Memetics (legacy)
window.OH = window.OH || {};

/* ---------------------------------------------------------------------- */
/* Builds & Classes (weapon-effect archetypes + named builds)             */
/* ---------------------------------------------------------------------- */

const BUILD_FILTER_CONFIG = () => [
  { key: "pvpPve", label: "PvE/PvP", accessor: b => b._pvpPve, options: [
    { value: "pve", label: "PvE" }, { value: "pvp", label: "PvP" }, { value: "both", label: "PvE / PvP" }
  ] },
  { key: "archetype", label: "Weapon Effect", accessor: b => b.archetype, options: OH.idx.archetypes.map(a => ({ value: a._key, label: a.name })) }
];
const BUILD_SORT_CONFIG = [
  { key: "name", label: "Name", accessor: b => b.name }
];

OH.renderBuilds = function renderBuilds() {
  const classes = OH.state.data.classes;
  const tab = "builds";
  const filterConfig = BUILD_FILTER_CONFIG();
  const active = OH.getActiveFilters(tab);
  let builds = OH.applyFilters(OH.idx.builds, filterConfig, active);
  builds = OH.applySort(builds, BUILD_SORT_CONFIG, OH.state.sort[tab]);
  const archetypes = OH.idx.archetypes;

  return `
    <h2>Builds &amp; Classes</h2>
    <p class="intro">${OH.esc(classes.overview)}</p>
    <p class="intro">${OH.esc(OH.state.data.builds.mechanicNote)}</p>
    ${OH.legacyBanner(classes.techSystemNotice)}
    <div class="section-block">
      <h3>Weapon Effect Archetypes ("Classes")</h3>
      <div class="grid">
        ${archetypes.map(a => `
          ${OH.cardOpen("classes", a._key)}
            <h3>${OH.esc(a.name)}</h3>
            <div class="meta"><span class="tag">${OH.esc(a.role)}</span></div>
            <p>${OH.esc(a.summary)}</p>
          </div>
        `).join("")}
      </div>
    </div>
    <div class="section-block">
      <h3>Progression system <span class="tag v-badge v-current">current</span></h3>
      <p class="intro">Loadouts below are built around a weapon effect, but the perks/nodes that support a build now come from the <a href="#techtree">Tech Tree</a> (Survival / Production / Combat / Building) — not the old Memetics menu. See the <a href="#memetics">Memetics (Legacy)</a> page for the superseded system.</p>
    </div>
    <div class="section-block">
      <h3>Named Builds</h3>
      ${OH.renderFilterBar(tab, filterConfig, active, BUILD_SORT_CONFIG, OH.state.sort[tab])}
      <div class="grid">
        ${builds.map(b => `
          ${OH.cardOpen("builds", b._key)}
            <div class="card-top-row">
              <h3>${OH.esc(b.name)}</h3>
              ${OH.favoriteButton("builds", b._key, b.name)}
            </div>
            <div class="meta"><span class="tag">${OH.esc(b.role)}</span>${OH.pvpPveTag(b._pvpPve)}</div>
            <p>${OH.esc(b.summary)}</p>
          </div>
        `).join("") || OH.emptyState(OH.state.query)}
      </div>
    </div>
  `;
};

OH.renderBuildDetail = function renderBuildDetail(key) {
  const b = OH.findBuild(key);
  if (!b) return null;
  OH.pushRecentlyViewed("builds", b._key, b.name);
  const arch = OH.findArchetype(b.archetype);
  const primary = b.primaryWeapon ? OH.findWeapon(b.primaryWeapon) : null;
  const secondaries = (b.secondaryWeapons || []).map(OH.findWeapon).filter(Boolean);
  const melee = b.meleeOption ? OH.findWeapon(b.meleeOption) : null;
  const weaponCard = (w, roleLabel) => `
    ${OH.cardOpen("weapons", w._key)}
      <h3>${OH.esc(w.name)}</h3>
      <div class="meta"><span class="tag">${OH.esc(roleLabel)}</span>${OH.rarityDot(w.rarity)}</div>
      <p>${OH.esc(w.notes || "")}</p>
    </div>`;
  const modLinks = (b.suggestedMods || []).map(name => {
    const found = OH.idx.mods.find(m => m.name === name);
    return found ? OH.link("mods", found._key, name) : OH.esc(name);
  });

  return `
    ${OH.breadcrumb("builds", "Builds & Classes", b.name)}
    <div class="detail-head">
      <h2>${OH.esc(b.name)}</h2>
      ${OH.favoriteButton("builds", b._key, b.name)}
    </div>
    <div class="meta detail-meta">
      <span class="tag">${OH.esc(b.role)}</span>
      ${arch ? `<span class="tag">${OH.link("classes", arch._key, arch.name)}</span>` : ""}
      ${OH.pvpPveTag(b._pvpPve)}
    </div>
    <p>${OH.esc(b.summary)}</p>
    ${b.dpsClaimNote ? OH.notice(b.dpsClaimNote) : ""}

    <div class="section-block">
      <h3>Weapons</h3>
      <div class="grid">
        ${primary ? weaponCard(primary, "Primary weapon") : ""}
        ${secondaries.map(w => weaponCard(w, "Secondary weapon")).join("")}
        ${melee ? weaponCard(melee, "Melee option") : ""}
        ${!primary && !secondaries.length && !melee ? "<p class='intro'>None listed.</p>" : ""}
      </div>
    </div>

    <div class="loadout-grid">
      <div class="section-block">
        <h3>Key stats to prioritize</h3>
        ${b.keyStats ? `<ul>${b.keyStats.map(s => `<li>${OH.esc(s)}</li>`).join("")}</ul>` : `<p class="intro">Not specified in this build's source notes.</p>`}
      </div>
      <div class="section-block">
        <h3>Suggested mods</h3>
        ${modLinks.length ? `<ul>${modLinks.map(m => `<li>${m}</li>`).join("")}</ul>` : `<p class="intro">Not specified in this build's source notes.</p>`}
      </div>
      <div class="section-block">
        <h3>Armor ${b.gearVerification ? OH.verificationBadge(b.gearVerification, { compact: true }) : ""}</h3>
        ${b.recommendedArmor && b.recommendedArmor.length
          ? `<ul>${b.recommendedArmor.map(a => `<li>${OH.esc(a)}</li>`).join("")}</ul>`
          : `<p class="intro">This database's build notes don't specify a required armor set for this build — see <a href="#armor">Armor</a> for general set-bonus options that fit the role above.</p>`}
      </div>
      <div class="section-block">
        <h3>Food &amp; buffs ${b.gearVerification && b.recommendedFood && b.recommendedFood.length ? OH.verificationBadge(b.gearVerification, { compact: true }) : ""}</h3>
        ${b.recommendedFood && b.recommendedFood.length
          ? `<ul>${b.recommendedFood.map(f => {
              const found = OH.foodRecipeByLooseName(f);
              return `<li>${found ? OH.link("food", found._key, f) : OH.esc(f)}</li>`;
            }).join("")}</ul><p class="intro">${OH.esc(b.foodNote || "")}</p>`
          : `<p class="intro">${b.foodNote ? OH.esc(b.foodNote) : `Not specified in this build's source notes — see <a href="#food">Food &amp; Cooking</a> for general buff options.`}</p>`}
      </div>
    </div>

    ${b.recommendedDeviant ? `<div class="section-block"><h3>Deviant</h3><p class="intro">${OH.esc(b.recommendedDeviant)}</p></div>` : ""}

    <div class="section-block">
      <h3>How to obtain the core weapon</h3>
      ${primary ? OH.obtainBadges(primary._obtainMethods) : `<p class="intro">No primary weapon listed.</p>`}
    </div>

    <div class="section-block">
      <h3>Data verification</h3>
      ${OH.verificationObjectBlock(b.verification)}
      <p class="intro"><strong>Patch compatibility:</strong> compiled against game version ${OH.esc(OH.state.data.meta.gameVersionAtCompile)}; not independently re-verified against every subsequent patch. Check <a href="#updates">Updates</a> for anything that might have changed this build's weapon effect or mods since.</p>
    </div>

    ${OH.backLink("builds", "Builds & Classes")}
  `;
};

OH.renderArchetypeDetail = function renderArchetypeDetail(key) {
  const a = OH.findArchetype(key);
  if (!a) return null;
  const group = OH.findModGroupByArchetype(a._key);
  const weapons = OH.weaponsByArchetype(a._key);
  const builds = OH.buildsByArchetype(a._key);
  return `
    ${OH.breadcrumb("builds", "Builds & Classes", a.name)}
    <h2>${OH.esc(a.name)}</h2>
    <div class="meta detail-meta"><span class="tag">${OH.esc(a.role)}</span></div>
    <p>${OH.esc(a.summary)}</p>
    ${group ? `
      <div class="section-block">
        <h3>Mods</h3>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Mod</th><th>Effect</th></tr></thead>
          <tbody>${group.mods.map(m => `<tr><td data-label="Mod">${OH.link("mods", group._key + "--" + OH.slugify(m.name), m.name)}</td><td data-label="Effect">${OH.esc(m.effect)}</td></tr>`).join("")}</tbody>
        </table></div>
        <p class="intro">${OH.esc(group.obtainedFrom)}</p>
      </div>` : ""}
    ${weapons.length ? `
      <div class="section-block">
        <h3>Weapons with this confirmed built-in effect</h3>
        <div class="grid">${weapons.map(w => `${OH.cardOpen("weapons", w._key)}<h3>${OH.esc(w.name)}</h3><p>${OH.esc(w.notes || "")}</p></div>`).join("")}</div>
      </div>` : ""}
    ${builds.length ? `
      <div class="section-block">
        <h3>Named builds using this</h3>
        <div class="grid">${builds.map(b => `${OH.cardOpen("builds", b._key)}<h3>${OH.esc(b.name)}</h3><p>${OH.esc(b.summary)}</p></div>`).join("")}</div>
      </div>` : ""}
    ${OH.backLink("builds", "Builds & Classes")}
  `;
};

/* ---------------------------------------------------------------------- */
/* Tech Tree — the CURRENT progression system                             */
/* ---------------------------------------------------------------------- */

OH.renderTechTree = function renderTechTree() {
  const t = OH.state.data.techtree;
  return `
    <h2>Tech Tree <span class="tag">current system</span></h2>
    <p class="intro">${OH.esc(t.overview)}</p>
    ${OH.sourceBlock("confirmed", t.lastVerified, t.sources.map(s => s.name))}

    <div class="section-block">
      <h3>How nodes are unlocked</h3>
      <div class="grid">
        ${t.unlockMethods.map(m => `
          <div class="card">
            <div class="card-top-row"><h3>${OH.esc(m.name)}</h3>${OH.verificationBadge(m.verification, { compact: true })}</div>
            <p>${OH.esc(m.description)}</p>
          </div>
        `).join("")}
      </div>
    </div>

    <div class="section-block">
      <h3>Branches</h3>
      <div class="grid">
        ${t.branches.map(b => `
          <div class="card">
            <div class="card-top-row"><h3>${OH.esc(b.name)}</h3>${OH.verificationBadge(b.verification, { compact: true })}</div>
            <p>${OH.esc(b.focus)}</p>
            ${b.likelyLegacyOverlap && b.likelyLegacyOverlap.length ? `<p class="intro">Likely overlaps old Memetics branch(es): ${b.likelyLegacyOverlap.map(id => OH.esc(id)).join(", ")} (see <a href="#memetics">Memetics — Legacy</a>).</p>` : ""}
          </div>
        `).join("")}
      </div>
    </div>

    <div class="section-block">
      <h3>Per-node data ${OH.verificationBadge(t.nodeDataStatus)}</h3>
      <p class="intro">${OH.esc(t.nodeDataNote)}</p>
    </div>

    <div class="section-block">
      <h3>Materials simplification ${OH.verificationBadge(t.materialSimplification.verification, { compact: true })}</h3>
      <p class="intro">${OH.esc(t.materialSimplification.description)}</p>
    </div>
  `;
};

/* ---------------------------------------------------------------------- */
/* Memetics — LEGACY, clearly separated                                   */
/* ---------------------------------------------------------------------- */

const BRANCH_LABELS = { gathering: "Gathering", crafting: "Crafting", management: "Management", building: "Building" };

OH.renderMemetics = function renderMemetics() {
  const m = OH.state.data.memetics;
  const branches = m.branches;
  return `
    <h2>${OH.esc(m.displayLabel || "Memetics")} <span class="tag v-badge v-legacy">${OH.VERIFICATION_STYLE.legacy.symbol} legacy</span></h2>
    <p class="intro">${OH.esc(m.overview)}</p>
    ${OH.legacyBannerRaw(`Superseded by the Tech Tree in patch 2.3.6 (April 8, 2026). See the ${OH.link("techtree", "", "Tech Tree")} page for the current system. This page is kept only as a historical reference for what each old node did.`)}
    ${Object.entries(branches).map(([bkey, list]) => {
      const filtered = list.map(x => ({ ...x, _key: OH.slugify(bkey) + "--" + OH.slugify(x.name) }));
      if (!filtered.length) return "";
      return `
        <div class="section-block">
          <h3>${OH.esc(BRANCH_LABELS[bkey] || bkey)} <span class="tag">${filtered.length}</span></h3>
          <div class="table-wrap"><table class="data-table">
            <thead><tr><th>Specialization</th><th>Effect</th></tr></thead>
            <tbody>${filtered.map(x => `<tr><td data-label="Specialization">${OH.link("memetics", x._key, x.name)}</td><td data-label="Effect">${OH.esc(x.effect)}</td></tr>`).join("")}</tbody>
          </table></div>
        </div>
      `;
    }).join("")}
  `;
};

OH.renderMemeticDetail = function renderMemeticDetail(key) {
  const m = OH.findMemetic(key);
  if (!m) return null;
  return `
    ${OH.breadcrumb("memetics", "Memetics (Legacy)", m.name)}
    <h2>${OH.esc(m.name)} <span class="tag v-badge v-legacy">${OH.VERIFICATION_STYLE.legacy.symbol} legacy</span></h2>
    <div class="meta detail-meta"><span class="tag">${OH.esc(BRANCH_LABELS[m.branch] || m.branch)} branch</span></div>
    ${OH.legacyBannerRaw(`This specialization belonged to the old Memetics system, removed in patch 2.3.6. See the ${OH.link("techtree", "", "Tech Tree")} for the current equivalent system.`)}
    <p>${OH.esc(m.effect)}</p>
    ${OH.backLink("memetics", "Memetics (Legacy)")}
  `;
};
