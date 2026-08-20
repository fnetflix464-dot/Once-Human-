// Once Human Database — shared utilities
// Everything attaches to window.OH so plain <script> tags (no build step,
// no ES modules) can share state across files in load order.
window.OH = window.OH || {};

OH.esc = function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
};

OH.slugify = function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[''"()!.]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
};

OH.keyFor = function keyFor(item) {
  return item.id || OH.slugify(item.name);
};

OH.capitalize = function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
};

OH.debounce = function debounce(fn, ms) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), ms);
  };
};

// --- localStorage helpers (favorites / recently viewed) -------------------
// Every call is wrapped because localStorage can throw (private mode,
// storage disabled, quota) and a broken favorites feature should never take
// the rest of the page down with it.
OH.storage = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }
};

OH.formatList = function formatList(arr) {
  return (arr || []).map(OH.esc).join(", ");
};
