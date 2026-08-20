// Once Human Database — shared render helpers (cards, badges, icons, links)
window.OH = window.OH || {};
const esc = OH.esc;

OH.link = function link(tab, id, label, opts) {
  opts = opts || {};
  const cls = opts.cls ? ` class="${esc(opts.cls)}"` : "";
  return `<a href="#${tab}/${encodeURIComponent(id)}"${cls}>${esc(label)}</a>`;
};

OH.breadcrumb = function breadcrumb(tabId, tabLabel, itemLabel) {
  return `<nav class="breadcrumb" aria-label="Breadcrumb"><a href="#home">Overview</a> <span class="sep" aria-hidden="true">/</span> <a href="#${esc(tabId)}">${esc(tabLabel)}</a> <span class="sep" aria-hidden="true">/</span> <span aria-current="page">${esc(itemLabel)}</span></nav>`;
};

OH.backLink = function backLink(tabId, tabLabel) {
  return `<a class="back-link" href="#${esc(tabId)}">&larr; Back to ${esc(tabLabel)}</a>`;
};

OH.emptyState = function emptyState(query) {
  return `<div class="empty-state">No matches for “${esc(query)}” in this section.</div>`;
};

// --- verification / legacy badges ------------------------------------------
// `status` is one of confirmed/partial/community/unverified/legacy (see
// data/meta.json's verificationLegend, which is the human-readable source
// of truth this just visualizes).
OH.verificationBadge = function verificationBadge(status, opts) {
  if (!status) return "";
  const style = OH.VERIFICATION_STYLE[status];
  if (!style) return "";
  const legend = (OH.state.data.meta && OH.state.data.meta.verificationLegend || []).find(l => l.id === status);
  const label = (opts && opts.compact) ? style.symbol : `${style.symbol} ${legend ? legend.label : status}`;
  const title = legend ? esc(legend.meaning) : "";
  return `<span class="v-badge ${style.cls}" title="${title}">${esc(label)}</span>`;
};

OH.legacyBanner = function legacyBanner(text) {
  return `<div class="notice notice-legacy">${OH.VERIFICATION_STYLE.legacy.symbol} <strong>LEGACY / HISTORICAL</strong> — ${esc(text)}</div>`;
};
// Same banner, but for callers that need to embed a pre-built (already-safe,
// developer-authored) link inside the message — never pass untrusted text here.
OH.legacyBannerRaw = function legacyBannerRaw(html) {
  return `<div class="notice notice-legacy">${OH.VERIFICATION_STYLE.legacy.symbol} <strong>LEGACY / HISTORICAL</strong> — ${html}</div>`;
};

OH.notice = function notice(text) {
  return `<div class="notice">⚠️ ${esc(text)}</div>`;
};

// Renders the unified {status, sourceIds, lastVerified, verifiedPatch, notes}
// verification object used across weapons/armor/mods/bosses/stations/builds/
// deviants — resolves sourceIds into clickable links via data/sources.json
// instead of the plain source-name tags OH.sourceBlock uses for older,
// looser {name,url} arrays.
OH.verificationObjectBlock = function verificationObjectBlock(v) {
  if (!v) return "";
  const parts = [];
  parts.push(`<div class="source-row"><span class="source-label">Status</span> ${OH.verificationBadge(v.status)}</div>`);
  if (v.verifiedPatch) parts.push(`<div class="source-row"><span class="source-label">Verified against</span> <span class="mono">v${esc(v.verifiedPatch)}</span></div>`);
  if (v.lastVerified) parts.push(`<div class="source-row"><span class="source-label">Last verified</span> <span class="mono">${esc(v.lastVerified)}</span></div>`);
  const resolved = OH.resolveSourceIds(v.sourceIds);
  if (resolved.length) {
    parts.push(`<div class="source-row"><span class="source-label">Sources</span> ${resolved.map(s => `<a class="tag" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>`).join(" ")}</div>`);
  }
  if (v.notes) parts.push(`<div class="source-row source-notes">${esc(v.notes)}</div>`);
  return `<div class="source-block">${parts.join("")}</div>`;
};

OH.sourceBlock = function sourceBlock(status, lastVerified, sources) {
  const parts = [];
  if (status) parts.push(`<div class="source-row"><span class="source-label">Status</span> ${OH.verificationBadge(status)}</div>`);
  if (lastVerified) parts.push(`<div class="source-row"><span class="source-label">Last verified</span> <span class="mono">${esc(lastVerified)}</span></div>`);
  if (sources && sources.length) parts.push(`<div class="source-row"><span class="source-label">Sources</span> ${sources.map(s => `<span class="tag">${esc(s)}</span>`).join(" ")}</div>`);
  if (!parts.length) return "";
  return `<div class="source-block">${parts.join("")}</div>`;
};

// --- cards -------------------------------------------------------------
OH.cardOpen = function cardOpen(tab, id, extraCls) {
  return `<div class="card card-link${extraCls ? " " + extraCls : ""}" role="link" tabindex="0" data-tab="${esc(tab)}" data-id="${esc(id)}">`;
};

OH.favoriteButton = function favoriteButton(kind, id, label) {
  const isFav = OH.isFavorite(kind, id);
  return `<button type="button" class="fav-btn${isFav ? " is-fav" : ""}" data-fav-kind="${esc(kind)}" data-fav-id="${esc(id)}" aria-pressed="${isFav}" aria-label="${isFav ? "Remove from favorites" : "Add to favorites"}: ${esc(label)}">${isFav ? "★" : "☆"}</button>`;
};

// --- weapon-type / rarity iconography --------------------------------------
// Small inline-SVG glyphs, not photos or game screenshots — a consistent
// pictographic system so cards are scannable at a glance without claiming to
// be official art.
const ICONS = {
  pistol: '<path d="M4 14h9v3H4z"/><path d="M13 11h6v3h-6z"/><path d="M4 11h9v3H4z"/>',
  smg: '<path d="M3 12h13v3H3z"/><path d="M14 9h5v3h-5z"/><path d="M6 15v4h2v-4z"/>',
  "assault-rifle": '<path d="M2 12h16v2H2z"/><path d="M16 10h4v4h-4z"/><path d="M6 14v4h2v-4z"/>',
  shotgun: '<path d="M2 12h18v2H2z"/><path d="M8 14v4h2v-4z"/>',
  "sniper-rifle": '<path d="M1 13h20v1H1z"/><circle cx="17" cy="13" r="3" fill="none" stroke="currentColor" stroke-width="1"/><path d="M6 14v4h2v-4z"/>',
  lmg: '<path d="M2 12h15v3H2z"/><path d="M6 15v5h3v-5z"/><path d="M15 9h4v3h-4z"/>',
  bow: '<path d="M18 3c-5 2-8 7-8 9s3 7 8 9" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10 12h9" stroke="currentColor" stroke-width="1"/>',
  heavy: '<circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 8v8M8 12h8"/>',
  melee: '<path d="M4 20 16 8" stroke="currentColor" stroke-width="2" fill="none"/><path d="M14 4l6 6-2 2-6-6z"/>'
};
OH.weaponTypeIcon = function weaponTypeIcon(type) {
  const body = ICONS[type] || '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.4"/>';
  return `<svg class="type-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`;
};

OH.rarityDot = function rarityDot(rarity) {
  if (!rarity) return "";
  return `<span class="rarity-dot rarity-${esc(rarity)}" title="${esc(OH.capitalize(rarity))}" aria-hidden="true"></span>`;
};

OH.pvpPveTag = function pvpPveTag(v) {
  const labels = { pve: "PvE", pvp: "PvP", both: "PvE / PvP", unspecified: "Unspecified" };
  const label = labels[v] || labels.unspecified;
  return `<span class="tag tag-pvp-${esc(v || "unspecified")}">${esc(label)}</span>`;
};

OH.obtainBadges = function obtainBadges(methods) {
  if (!methods || !methods.length) return `<span class="tag">Not specified</span>`;
  return methods.map(m => `<span class="tag tag-obtain">✓ ${esc(m.label)}</span>`).join(" ");
};
