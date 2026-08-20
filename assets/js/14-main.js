// Once Human Database — navigation chrome, global search UI, render dispatch, boot
window.OH = window.OH || {};

/* ---------------------------------------------------------------------- */
/* Grouped navigation (desktop dropdowns + mobile drawer)                 */
/* ---------------------------------------------------------------------- */

function navItemHtml(item, activeTab) {
  const current = item.id === activeTab ? ` aria-current="page"` : "";
  return `<a href="#${OH.esc(item.id)}" class="nav-item"${current}>${OH.esc(item.label)}</a>`;
}

OH.buildNav = function buildNav(activeTab) {
  const groupsEl = document.getElementById("nav-groups");
  const drawerEl = document.getElementById("mobile-drawer");
  if (groupsEl) {
    groupsEl.innerHTML = OH.NAV_GROUPS.map(g => {
      const groupHasActive = g.items.some(i => i.id === activeTab);
      return `
        <div class="nav-group">
          <button type="button" class="nav-group-btn${groupHasActive ? " is-active-group" : ""}" aria-expanded="false" aria-haspopup="true">${OH.esc(g.label)}</button>
          <div class="nav-dropdown" role="menu">
            ${g.items.map(i => navItemHtml(i, activeTab)).join("")}
          </div>
        </div>
      `;
    }).join("");
  }
  if (drawerEl) {
    drawerEl.innerHTML = `
      <div class="drawer-head">
        <span>Menu</span>
        <button type="button" class="drawer-close" id="drawer-close" aria-label="Close menu">&times;</button>
      </div>
      <a href="#home" class="nav-item drawer-home"${activeTab === "home" ? ' aria-current="page"' : ""}>Overview</a>
      ${OH.NAV_GROUPS.map(g => `
        <div class="drawer-group">
          <div class="drawer-group-label">${OH.esc(g.label)}</div>
          ${g.items.map(i => navItemHtml(i, activeTab)).join("")}
        </div>
      `).join("")}
    `;
  }
};

function closeAllDropdowns() {
  document.querySelectorAll(".nav-group-btn[aria-expanded='true']").forEach(b => b.setAttribute("aria-expanded", "false"));
}

function wireNavChrome() {
  const groupsEl = document.getElementById("nav-groups");
  if (groupsEl) {
    groupsEl.addEventListener("click", e => {
      const btn = e.target.closest(".nav-group-btn");
      if (!btn) return;
      const wasOpen = btn.getAttribute("aria-expanded") === "true";
      closeAllDropdowns();
      btn.setAttribute("aria-expanded", wasOpen ? "false" : "true");
    });
    document.addEventListener("click", e => {
      if (!groupsEl.contains(e.target)) closeAllDropdowns();
    });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") closeAllDropdowns();
    });
  }

  const menuToggle = document.getElementById("menu-toggle");
  const drawer = document.getElementById("mobile-drawer");
  const backdrop = document.getElementById("drawer-backdrop");
  let lastFocusBeforeDrawer = null;

  function drawerFocusables() {
    return Array.from(drawer.querySelectorAll("a, button")).filter(el => el.offsetParent !== null);
  }
  function openDrawer() {
    lastFocusBeforeDrawer = document.activeElement;
    drawer.hidden = false;
    backdrop.hidden = false;
    menuToggle.setAttribute("aria-expanded", "true");
    const focusables = drawerFocusables();
    if (focusables.length) focusables[0].focus();
  }
  function closeDrawer() {
    drawer.hidden = true;
    backdrop.hidden = true;
    menuToggle.setAttribute("aria-expanded", "false");
    if (lastFocusBeforeDrawer && document.body.contains(lastFocusBeforeDrawer)) lastFocusBeforeDrawer.focus();
    else menuToggle.focus();
  }
  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      if (drawer.hidden) openDrawer(); else closeDrawer();
    });
  }
  if (backdrop) backdrop.addEventListener("click", closeDrawer);
  if (drawer) {
    drawer.addEventListener("click", e => {
      if (e.target.id === "drawer-close" || e.target.closest("a.nav-item")) closeDrawer();
    });
    // Escape closes the drawer; Tab/Shift+Tab wrap focus inside it while open
    // (a simple focus trap) so keyboard users never tab "through" it into
    // the page content sitting behind it.
    drawer.addEventListener("keydown", e => {
      if (e.key === "Escape") { e.preventDefault(); closeDrawer(); return; }
      if (e.key !== "Tab") return;
      const focusables = drawerFocusables();
      if (!focusables.length) return;
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }
}

/* ---------------------------------------------------------------------- */
/* Global search (categorized cross-entity results dropdown)              */
/* ---------------------------------------------------------------------- */

let searchCorpus = [];
let searchActiveIndex = -1; // index into the flat list of currently-rendered .search-result options

function closeSearch() {
  const box = document.getElementById("search-results");
  const input = document.getElementById("global-search");
  box.hidden = true;
  input.setAttribute("aria-expanded", "false");
  input.removeAttribute("aria-activedescendant");
  searchActiveIndex = -1;
}

function searchOptionEls() {
  return Array.from(document.querySelectorAll("#search-results .search-result"));
}

function setActiveSearchOption(index) {
  const opts = searchOptionEls();
  if (!opts.length) return;
  const input = document.getElementById("global-search");
  const clamped = (index + opts.length) % opts.length;
  opts.forEach((el, i) => {
    const isActive = i === clamped;
    el.setAttribute("aria-selected", isActive ? "true" : "false");
    el.classList.toggle("is-active", isActive);
  });
  searchActiveIndex = clamped;
  input.setAttribute("aria-activedescendant", opts[clamped].id);
  opts[clamped].scrollIntoView({ block: "nearest" });
}

function renderSearchResults(query) {
  const box = document.getElementById("search-results");
  const input = document.getElementById("global-search");
  if (!query.trim()) { closeSearch(); box.innerHTML = ""; return; }
  const results = OH.searchCorpus(searchCorpus, query);
  const grouped = OH.groupSearchResults(results, 5);
  searchActiveIndex = -1;
  let optIndex = 0;
  if (!grouped.length) {
    box.innerHTML = `<div class="search-empty">No matches for &ldquo;${OH.esc(query)}&rdquo;.</div>`;
  } else {
    box.innerHTML = grouped.map(cat => `
      <div class="search-group" role="group" aria-label="${OH.esc(cat.label)}">
        <div class="search-group-label">${OH.esc(cat.label)}${cat.total > cat.results.length ? ` <span class="tag">${cat.total}</span>` : ""}</div>
        ${cat.results.map(r => `
          <a class="search-result" id="search-opt-${optIndex++}" role="option" aria-selected="false" href="#${OH.esc(cat.tab)}/${encodeURIComponent(r.id)}">
            <span class="search-result-title">${OH.esc(r.title)}</span>
            ${r.subtitle ? `<span class="search-result-sub">${OH.esc(r.subtitle)}</span>` : ""}
          </a>
        `).join("")}
      </div>
    `).join("");
  }
  box.hidden = false;
  input.setAttribute("aria-expanded", "true");
}

function wireSearch() {
  const input = document.getElementById("global-search");
  const box = document.getElementById("search-results");
  const debounced = OH.debounce(() => renderSearchResults(input.value), 120);
  input.addEventListener("input", debounced);
  input.addEventListener("focus", () => { if (input.value.trim()) renderSearchResults(input.value); });
  input.addEventListener("keydown", e => {
    const opts = searchOptionEls();
    if (e.key === "Escape") { closeSearch(); return; }
    if (!opts.length || box.hidden) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveSearchOption(searchActiveIndex + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveSearchOption(searchActiveIndex - 1); }
    else if (e.key === "Enter" && searchActiveIndex >= 0) {
      e.preventDefault();
      opts[searchActiveIndex].click();
    }
  });
  document.addEventListener("click", e => {
    if (!e.target.closest(".search-box")) closeSearch();
  });
  box.addEventListener("click", e => {
    if (e.target.closest(".search-result")) { closeSearch(); input.value = ""; }
  });
}

/* ---------------------------------------------------------------------- */
/* Render dispatch                                                        */
/* ---------------------------------------------------------------------- */

const LIST_RENDERERS = {
  home: OH.renderHome, weapons: () => OH.renderWeapons(), armor: () => OH.renderArmor(),
  attachments: () => OH.renderAttachments(), mods: () => OH.renderMods(),
  blueprints: () => OH.renderBlueprints(), stations: () => OH.renderStations(),
  builds: () => OH.renderBuilds(), techtree: () => OH.renderTechTree(),
  memetics: () => OH.renderMemetics(), deviants: () => OH.renderDeviants(),
  ranching: () => OH.renderRanching(), crops: () => OH.renderCrops(),
  food: () => OH.renderFood(), bosses: () => OH.renderBosses(),
  regions: () => OH.renderRegions(), updates: () => OH.renderUpdates(),
  sources: () => OH.renderSources(), favorites: () => OH.renderFavorites(),
  buildfinder: () => OH.renderBuildFinder(OH.state.buildFinderGoal)
};

const DETAIL_RENDERERS = {
  weapons: OH.renderWeaponDetail, armor: OH.renderArmorSetDetail, attachments: OH.renderAttachmentTypeDetail,
  mods: OH.renderModDetail, blueprints: OH.renderBlueprintDetail, stations: OH.renderStationDetail,
  builds: OH.renderBuildDetail, classes: OH.renderArchetypeDetail, memetics: OH.renderMemeticDetail,
  deviants: OH.renderDeviantDetail, ranching: OH.renderRanchingDetail, crops: OH.renderCropDetail,
  food: OH.renderFoodDetail, bosses: OH.renderBossDetail
};

function renderDetail(tab, id) {
  const fn = DETAIL_RENDERERS[tab];
  if (!fn) return `<div class="empty-state">Unknown page.</div>`;
  const html = fn(id);
  return html != null ? html : `<div class="empty-state">Item not found. ${OH.backLink(tab, OH.tabLabel(tab))}</div>`;
}

function render() {
  const main = document.getElementById("main");
  const panel = document.createElement("div");
  panel.className = "panel active";

  const { tab, id, segments } = OH.parseHash();
  OH.state.active = tab;
  OH.state.detailId = id;

  if (tab === "compare") {
    panel.innerHTML = OH.renderCompare(segments);
  } else if (id && (OH.DETAIL_TABS.has(tab) || tab === "classes")) {
    panel.innerHTML = renderDetail(tab, id);
  } else {
    const fn = LIST_RENDERERS[tab] || LIST_RENDERERS.home;
    panel.innerHTML = fn();
  }

  main.innerHTML = "";
  main.appendChild(panel);
  wirePanel(panel);
  OH.buildNav(OH.ROUTE_TO_NAV_TAB[tab] || tab);
  document.title = tab === "home" ? "Once Human Database" : `${OH.tabLabel(tab)} — Once Human Database`;
}

/* ---------------------------------------------------------------------- */
/* Panel-level event wiring (cards, favorites, filters, compare, goals)    */
/* ---------------------------------------------------------------------- */

const INTERACTIVE_SELECTOR = "a, button, input, select, label, textarea";

function wirePanel(root) {
  // Card / row navigation — ignore clicks that started on a nested
  // interactive control (link, button, checkbox, favorite star, select).
  root.querySelectorAll(".card-link").forEach(card => {
    const go = () => OH.navigate(card.dataset.tab, card.dataset.id);
    card.addEventListener("click", e => {
      if (e.target.closest(INTERACTIVE_SELECTOR)) return;
      go();
    });
    card.addEventListener("keydown", e => {
      if ((e.key === "Enter" || e.key === " ") && !e.target.closest(INTERACTIVE_SELECTOR)) {
        e.preventDefault();
        go();
      }
    });
  });

  // Plain nav buttons (home page stat cards / quick tools use data-nav-tab)
  root.querySelectorAll("[data-nav-tab]").forEach(el => {
    el.addEventListener("click", () => OH.navigate(el.dataset.navTab, null));
  });

  // Favorites
  root.querySelectorAll("[data-fav-kind]").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const { favKind, favId } = btn.dataset;
      const label = btn.getAttribute("aria-label").replace(/^(Add to favorites|Remove from favorites):\s*/, "");
      OH.toggleFavorite(favKind, favId, label);
      render();
    });
  });

  // Generic filter/sort bars (data-filter-tab / data-sort-tab / data-filter-clear)
  OH.wireFilterBar(root, render);

  // Compare checkboxes + controls
  root.querySelectorAll("[data-compare-kind]").forEach(cb => {
    cb.addEventListener("change", () => {
      const { compareKind, compareId } = cb.dataset;
      const sel = OH.state.compareSelection;
      const idx = sel.findIndex(c => c.kind === compareKind && c.id === compareId);
      if (cb.checked) {
        if (idx < 0) sel.push({ kind: compareKind, id: compareId });
      } else if (idx >= 0) {
        sel.splice(idx, 1);
      }
      render();
    });
  });
  root.querySelectorAll("[data-compare-go]").forEach(btn => {
    btn.addEventListener("click", () => {
      const kind = btn.dataset.compareGo;
      const ids = OH.state.compareSelection.filter(c => c.kind === kind).map(c => c.id);
      OH.navigateSegments("compare", [kind, ...ids]);
    });
  });
  root.querySelectorAll("[data-compare-clear]").forEach(btn => {
    btn.addEventListener("click", () => {
      const kind = btn.dataset.compareClear;
      OH.state.compareSelection = OH.state.compareSelection.filter(c => c.kind !== kind);
      render();
    });
  });

  // Build Finder goal buttons
  root.querySelectorAll("[data-goal]").forEach(btn => {
    btn.addEventListener("click", () => {
      OH.state.buildFinderGoal = btn.dataset.goal;
      render();
    });
  });
  root.querySelectorAll("[data-goal-clear]").forEach(btn => {
    btn.addEventListener("click", () => {
      OH.state.buildFinderGoal = null;
      render();
    });
  });
}

/* ---------------------------------------------------------------------- */
/* Boot                                                                    */
/* ---------------------------------------------------------------------- */

async function init() {
  try {
    await OH.loadAll();
    OH.buildIndexes();
    searchCorpus = OH.buildSearchCorpus();
    document.getElementById("version-pill").textContent = "v" + OH.state.data.meta.gameVersionAtCompile;
    document.getElementById("footer").textContent =
      `${OH.state.data.meta.siteName} · unofficial fan-made reference · compiled ${OH.state.data.meta.lastCompiled} · not affiliated with Starry Studio / NetEase`;
    wireNavChrome();
    wireSearch();
    window.addEventListener("hashchange", render);
    render();
  } catch (err) {
    document.getElementById("main").innerHTML = `<div class="empty-state">Failed to load data: ${OH.esc(err.message)}<br>If you opened this file directly in a browser, serve it over HTTP instead (e.g. <code>python3 -m http.server</code>) so fetch() can read the /data JSON files.</div>`;
    console.error(err);
  }
}

document.addEventListener("DOMContentLoaded", init);
