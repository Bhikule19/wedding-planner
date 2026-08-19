/* Global search across every module, surfaced from the top bar. */

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const SOURCES = [
  { key: 'vendors', view: 'vendors', kind: 'Vendor', label: (v) => v.name, sub: (v) => v.category, text: (v) => [v.name, v.category, v.contactPerson, v.location, v.instagram, v.decisionReason].join(' ') },
  { key: 'shopping', view: 'shopping', kind: 'Shopping', label: (s) => s.name, sub: (s) => s.person, text: (s) => [s.name, s.person, s.category, s.shopName, s.notes].join(' ') },
  { key: 'addons', view: 'addons', kind: 'Add-on', label: (a) => a.name, sub: (a) => a.category, text: (a) => [a.name, a.category, a.description, a.notes].join(' ') },
  { key: 'tasks', view: 'tasks', kind: 'Task', label: (t) => t.name, sub: (t) => t.owner, text: (t) => [t.name, t.description, t.owner, t.notes].join(' ') },
  { key: 'decisions', view: 'decisions', kind: 'Decision', label: (d) => d.title, sub: (d) => d.category, text: (d) => [d.title, d.category, (d.options || []).map((o) => o.label).join(' '), d.notes].join(' ') },
  { key: 'events', view: 'events', kind: 'Event', label: (e) => e.name, sub: (e) => e.venue, text: (e) => [e.name, e.venue, e.notes].join(' ') },
  { key: 'guests', view: 'guests', kind: 'Guest', label: (g) => g.name, sub: (g) => g.group, text: (g) => [g.name, g.group, g.relationship, g.email].join(' ') },
  { key: 'payments', view: 'payments', kind: 'Payment', label: (p) => p.description, sub: (p) => p.category, text: (p) => [p.description, p.reference, p.notes, p.category].join(' ') },
  { key: 'ideas', view: 'ideas', kind: 'Idea', label: (i) => i.title, sub: (i) => i.event, text: (i) => [i.title, i.note].join(' ') },
  { key: 'documents', view: 'documents', kind: 'Document', label: (d) => d.title, sub: (d) => d.kind, text: (d) => [d.title, d.kind, d.notes].join(' ') }
];

export function createSearch(ctx) {
  const wrap = document.querySelector('#search-wrap');
  const input = document.querySelector('#global-search');
  const panel = document.querySelector('#search-results');

  function hide() { panel.hidden = true; panel.innerHTML = ''; }

  function render() {
    const query = input.value.trim().toLowerCase();
    if (query.length < 2) { hide(); return; }
    const state = ctx.getState();
    const groups = SOURCES
      .map((src) => ({ src, items: (state[src.key] || []).filter((r) => src.text(r).toLowerCase().includes(query)).slice(0, 5) }))
      .filter((g) => g.items.length);
    if (!groups.length) {
      panel.innerHTML = `<p class="search-empty">No matches for “${esc(input.value.trim())}”.</p>`;
      panel.hidden = false;
      return;
    }
    const total = groups.reduce((n, g) => n + g.items.length, 0);
    panel.innerHTML = `<p class="search-count">${total} result${total === 1 ? '' : 's'}</p>` + groups.map((g) =>
      `<div class="search-group"><p class="search-group-label">${g.src.kind}</p>${g.items.map((r) => {
        const sub = g.src.sub(r);
        return `<button type="button" class="search-result" data-go="${g.src.view}"><span class="sr-label">${esc(g.src.label(r))}</span>${sub ? `<span class="sr-sub">${esc(sub)}</span>` : ''}</button>`;
      }).join('')}</div>`
    ).join('');
    panel.hidden = false;
  }

  input.addEventListener('input', render);
  input.addEventListener('focus', render);
  input.addEventListener('keydown', (e) => { if (e.key === 'Escape') { input.value = ''; hide(); input.blur(); } });
  panel.addEventListener('click', (e) => {
    const go = e.target.closest('[data-go]')?.dataset.go;
    if (!go) return;
    location.hash = go;
    hide();
    input.value = '';
    input.blur();
  });
  document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) hide(); });

  return { render };
}
