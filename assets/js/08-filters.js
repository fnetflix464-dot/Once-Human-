// Once Human Database — generic filter + sort framework for list pages
window.OH = window.OH || {};

// A filterConfig entry: { key, label, accessor(item) -> value|value[], options: [{value,label}] }
// Multi-value accessors (e.g. an item tagged with several archetypes) are
// supported — the item matches if the active filter value is included.
OH.getActiveFilters = function getActiveFilters(tab) {
  return OH.state.filters[tab] || {};
};
OH.setFilter = function setFilter(tab, key, value) {
  OH.state.filters[tab] = OH.state.filters[tab] || {};
  if (value === "" || value == null) delete OH.state.filters[tab][key];
  else OH.state.filters[tab][key] = value;
};
OH.clearFilters = function clearFilters(tab) {
  OH.state.filters[tab] = {};
};

OH.applyFilters = function applyFilters(items, filterConfig, activeFilters) {
  return items.filter(item => {
    return filterConfig.every(f => {
      const active = activeFilters[f.key];
      if (!active) return true;
      const val = f.accessor(item);
      if (Array.isArray(val)) return val.includes(active);
      return val === active;
    });
  });
};

OH.applySort = function applySort(items, sortConfig, activeSort) {
  if (!activeSort || !activeSort.key) return items;
  const cfg = sortConfig.find(s => s.key === activeSort.key);
  if (!cfg) return items;
  const dir = activeSort.dir === "desc" ? -1 : 1;
  return [...items].sort((a, b) => {
    const av = cfg.accessor(a), bv = cfg.accessor(b);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "string") return dir * av.localeCompare(bv);
    return dir * (av - bv);
  });
};

OH.renderFilterBar = function renderFilterBar(tab, filterConfig, activeFilters, sortConfig, activeSort) {
  const esc = OH.esc;
  const hasActive = Object.keys(activeFilters).length > 0 || (activeSort && activeSort.key);
  const selects = filterConfig.map(f => `
    <label class="filter-field">
      <span>${esc(f.label)}</span>
      <select data-filter-tab="${esc(tab)}" data-filter-key="${esc(f.key)}">
        <option value="">All</option>
        ${f.options.map(o => `<option value="${esc(o.value)}" ${activeFilters[f.key] === o.value ? "selected" : ""}>${esc(o.label)}</option>`).join("")}
      </select>
    </label>
  `).join("");
  const sortSelect = sortConfig && sortConfig.length ? `
    <label class="filter-field">
      <span>Sort by</span>
      <select data-sort-tab="${esc(tab)}">
        <option value="">Default</option>
        ${sortConfig.map(s => `
          <option value="${esc(s.key)}:asc" ${activeSort && activeSort.key === s.key && activeSort.dir !== "desc" ? "selected" : ""}>${esc(s.label)} ↑</option>
          <option value="${esc(s.key)}:desc" ${activeSort && activeSort.key === s.key && activeSort.dir === "desc" ? "selected" : ""}>${esc(s.label)} ↓</option>
        `).join("")}
      </select>
    </label>
  ` : "";
  return `
    <div class="filter-bar" role="group" aria-label="Filter and sort">
      ${selects}
      ${sortSelect}
      ${hasActive ? `<button type="button" class="filter-clear" data-filter-clear="${esc(tab)}">Clear filters</button>` : ""}
    </div>
  `;
};

OH.wireFilterBar = function wireFilterBar(root, onChange) {
  root.querySelectorAll("[data-filter-tab]").forEach(sel => {
    sel.addEventListener("change", () => {
      OH.setFilter(sel.dataset.filterTab, sel.dataset.filterKey, sel.value);
      onChange();
    });
  });
  root.querySelectorAll("[data-sort-tab]").forEach(sel => {
    sel.addEventListener("change", () => {
      const tab = sel.dataset.sortTab;
      if (!sel.value) { OH.state.sort[tab] = null; }
      else {
        const [key, dir] = sel.value.split(":");
        OH.state.sort[tab] = { key, dir };
      }
      onChange();
    });
  });
  root.querySelectorAll("[data-filter-clear]").forEach(btn => {
    btn.addEventListener("click", () => {
      OH.clearFilters(btn.dataset.filterClear);
      OH.state.sort[btn.dataset.filterClear] = null;
      onChange();
    });
  });
};
