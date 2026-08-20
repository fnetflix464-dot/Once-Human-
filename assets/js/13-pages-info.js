// Once Human Database — Updates/patch history, Sources
window.OH = window.OH || {};

OH.renderUpdates = function renderUpdates() {
  const u = OH.state.data.updates;
  const changeTag = t => `<span class="tag tag-change-${t.id}">${t.label}</span>`;
  return `
    <h2>Updates &amp; Patch History</h2>
    <p class="intro"><strong>Current version:</strong> v${OH.esc(u.current.version)} (${OH.esc(u.current.date)}) — ${OH.esc(u.current.title)}</p>
    <p class="intro">${OH.esc(u.current.note)}</p>
    <p class="intro">Each bullet below is auto-tagged NEW / CHANGED / REMOVED / FIXED based on its own wording, to make scanning faster — this is a scanability aid computed by this database, not an official per-line category from the developers.</p>
    <div class="section-block">
      ${u.history.map(h => `
        <div class="timeline-entry">
          <h3>v${OH.esc(h.version)}</h3>
          <div class="date">${OH.esc(h.date)}</div>
          <ul>${h.highlights.map(x => `<li>${changeTag(OH.classifyChangeType(x))} ${OH.esc(x)}</li>`).join("")}</ul>
        </div>
      `).join("")}
    </div>
    <div class="section-block">
      <h3>Major Content Eras</h3>
      <div class="grid">
        ${u.majorContentEras.map(e => `<div class="card"><h3>${OH.esc(e.name)}</h3><p>${OH.esc(e.notes)}</p></div>`).join("")}
      </div>
    </div>
  `;
};

OH.renderSources = function renderSources() {
  const meta = OH.state.data.meta;
  return `
    <h2>Sources</h2>
    <p class="intro">${OH.esc(meta.disclaimer)}</p>
    ${meta.currentVsLegacySystems ? `
      <div class="section-block">
        <h3>Current vs. Legacy systems, at a glance</h3>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Area</th><th>Current</th><th>Legacy</th></tr></thead>
          <tbody>${meta.currentVsLegacySystems.map(r => `<tr><td>${OH.esc(r.area)}</td><td>${OH.esc(r.current)}</td><td>${OH.esc(r.legacy)}</td></tr>`).join("")}</tbody>
        </table></div>
      </div>
    ` : ""}
    <div class="section-block">
      <h3>Verification legend</h3>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th></th><th>Meaning</th></tr></thead>
        <tbody>${(meta.verificationLegend || []).map(l => `<tr><td>${OH.verificationBadge(l.id)}</td><td>${OH.esc(l.meaning)}</td></tr>`).join("")}</tbody>
      </table></div>
    </div>
    <div class="section-block">
      <h3>Reference sources used to compile this database</h3>
      <ul class="sources-list">
        ${meta.sources.map(s => `<li><a href="${OH.esc(s.url)}" target="_blank" rel="noopener">${OH.esc(s.name)}</a></li>`).join("")}
      </ul>
    </div>
  `;
};
