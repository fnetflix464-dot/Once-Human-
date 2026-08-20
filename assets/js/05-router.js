// Once Human Database — hash router (#tab or #tab/item-slug)
window.OH = window.OH || {};

// Sub-routes that live under a nav item without being a nav item themselves
// (an archetype page is reached from a weapon/build/mod link, not the nav).
OH.ROUTE_TO_NAV_TAB = { classes: "builds" };

OH.parseHash = function parseHash() {
  const raw = (location.hash || "").replace(/^#\/?/, "");
  const [tab, ...rest] = raw.split("/").filter(Boolean);
  const validTab = (OH.FLAT_TABS.some(t => t.id === tab) || OH.DETAIL_TABS.has(tab) || tab === "classes" || tab === "compare")
    ? tab : "home";
  const decodedRest = rest.map(decodeURIComponent);
  return {
    tab: validTab,
    id: decodedRest.length ? decodedRest.join("/") : null,
    // raw segments, for routes that need more than one id (e.g. #compare/weapons/a/b)
    segments: decodedRest
  };
};

OH.navigate = function navigate(tab, id) {
  location.hash = id ? `${tab}/${encodeURIComponent(id)}` : tab;
};
OH.navigateSegments = function navigateSegments(tab, segments) {
  location.hash = segments && segments.length ? `${tab}/${segments.map(encodeURIComponent).join("/")}` : tab;
};
window.__ohNav = (tab, id) => OH.navigate(tab, id);

OH.tabLabel = function tabLabel(id) {
  return OH.TAB_LABELS[id] || id;
};
