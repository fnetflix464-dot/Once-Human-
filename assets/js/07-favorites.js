// Once Human Database — favorites + recently viewed (localStorage)
window.OH = window.OH || {};

const FAV_KEY = "oh-db:favorites:v1";
const RECENT_KEY = "oh-db:recently-viewed:v1";
const RECENT_MAX = 12;

OH.getFavorites = function getFavorites() {
  return OH.storage.get(FAV_KEY, []);
};

OH.isFavorite = function isFavorite(kind, id) {
  return OH.getFavorites().some(f => f.kind === kind && f.id === id);
};

OH.toggleFavorite = function toggleFavorite(kind, id, title) {
  const favs = OH.getFavorites();
  const idx = favs.findIndex(f => f.kind === kind && f.id === id);
  if (idx >= 0) favs.splice(idx, 1);
  else favs.unshift({ kind, id, title, addedAt: new Date().toISOString() });
  OH.storage.set(FAV_KEY, favs);
  return idx < 0; // true if it was just added
};

OH.getRecentlyViewed = function getRecentlyViewed() {
  return OH.storage.get(RECENT_KEY, []);
};

OH.pushRecentlyViewed = function pushRecentlyViewed(kind, id, title) {
  if (!kind || !id) return;
  let list = OH.getRecentlyViewed();
  list = list.filter(r => !(r.kind === kind && r.id === id));
  list.unshift({ kind, id, title, viewedAt: new Date().toISOString() });
  list = list.slice(0, RECENT_MAX);
  OH.storage.set(RECENT_KEY, list);
};

// A favorited/recently-viewed entry only stores {kind,id,title} — this
// resolves it back to a live item from the current indexes so titles/notes
// stay in sync with the data even if it changes after the fact.
OH.resolveEntry = function resolveEntry(entry) {
  const finders = {
    weapons: OH.findWeapon, armor: OH.findArmorSet, mods: OH.findMod,
    builds: OH.findBuild, deviants: OH.findDeviant, crops: OH.findCrop,
    food: OH.findFoodRecipe, bosses: OH.findBoss
  };
  const finder = finders[entry.kind];
  const item = finder ? finder(entry.id) : null;
  return { entry, item, exists: !!item };
};
