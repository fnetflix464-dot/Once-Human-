// Once Human Database — navigation structure & shared constants
window.OH = window.OH || {};

// Grouped navigation: DATABASE / BUILD / WORLD / INFO instead of one long
// row of 16 tabs. Each entry's `id` is the route/tab id used everywhere else
// (parseHash, DATA_FILES keys where applicable, render dispatch).
OH.NAV_GROUPS = [
  {
    id: "database",
    label: "Database",
    items: [
      { id: "weapons", label: "Weapons" },
      { id: "armor", label: "Armor" },
      { id: "mods", label: "Mods" },
      { id: "attachments", label: "Accessories" },
      { id: "deviants", label: "Deviants" },
      { id: "ranching", label: "Ranching" },
      { id: "crops", label: "Crops" },
      { id: "food", label: "Food & Cooking" },
      { id: "bosses", label: "Bosses" }
    ]
  },
  {
    id: "build",
    label: "Build",
    items: [
      { id: "buildfinder", label: "Build Finder" },
      { id: "builds", label: "Builds & Classes" },
      { id: "techtree", label: "Tech Tree" },
      { id: "memetics", label: "Memetics (Legacy)" }
    ]
  },
  {
    id: "world",
    label: "World",
    items: [
      { id: "regions", label: "Regions" },
      { id: "stations", label: "Stations" },
      { id: "blueprints", label: "Blueprints" }
    ]
  },
  {
    id: "info",
    label: "Info",
    items: [
      { id: "favorites", label: "Favorites" },
      { id: "updates", label: "Updates" },
      { id: "sources", label: "Sources" }
    ]
  }
];

// Flat lookup derived from the groups above, plus routes with no nav entry
// (home is reached via logo/search, compare is reached via the Compare
// button, not a nav link).
OH.FLAT_TABS = [{ id: "home", label: "Overview" }]
  .concat(OH.NAV_GROUPS.flatMap(g => g.items))
  .concat([{ id: "compare", label: "Compare" }]);

OH.TAB_LABELS = Object.fromEntries(OH.FLAT_TABS.map(t => [t.id, t.label]));

// Tabs whose cards open a dedicated detail page.
OH.DETAIL_TABS = new Set([
  "weapons", "armor", "attachments", "mods", "blueprints", "stations",
  "builds", "classes", "memetics", "deviants", "ranching", "crops", "food", "bosses"
]);
OH.LIST_ONLY_TABS = new Set(["regions", "updates", "sources", "favorites", "buildfinder", "techtree", "home"]);

// archetype id -> exact mods.json group.effect string (kept explicit rather
// than derived from slugify() because "Marked / Bull's Eye" doesn't
// round-trip through the slug the same way the others do).
OH.ARCHETYPE_GROUP_NAME = {
  shrapnel: "Shrapnel",
  "power-surge": "Power Surge",
  "frost-vortex": "Frost Vortex",
  bounce: "Bounce",
  "fast-gunner": "Fast Gunner",
  burn: "Burn",
  "unstable-bomber": "Unstable Bomber",
  "fortress-warfare": "Fortress Warfare",
  marked: "Marked / Bull's Eye"
};

// Verification status -> visual treatment. Kept in sync with
// data/meta.json's verificationLegend (that's the source of truth for the
// legend *text*; this is the source of truth for how each status *looks*).
OH.VERIFICATION_STYLE = {
  confirmed: { symbol: "✓", cls: "v-confirmed" },
  partial: { symbol: "⚠", cls: "v-partial" },
  community: { symbol: "◐", cls: "v-community" },
  unverified: { symbol: "!", cls: "v-unverified" },
  legacy: { symbol: "⧗", cls: "v-legacy" }
};

OH.RARITY_ORDER = ["standard", "rare", "epic", "legendary"];
