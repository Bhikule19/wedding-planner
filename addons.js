/* Add-ons / experiences: optional extras (food counters, photo booths, effects) with approve→committed wiring. */
import { compact } from './format.js';

export const ADDON_STATUSES = ['Idea', 'Researching', 'Considering', 'Shortlisted', 'Approved', 'Rejected', 'Booked', 'Completed'];
export const ADDON_CATEGORIES = ['Food', 'Entertainment', 'Effects', 'Other'];
const COMMITTING = ['Approved', 'Booked', 'Completed'];

const nowIso = () => new Date().toISOString();
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isCommitting = (status) => COMMITTING.includes(status);
const bestCost = (addon) => addon.finalCost || addon.negotiated || addon.quoted || addon.estimated || 0;
const desiredCommitted = (addon) => (isCommitting(addon.status) ? bestCost(addon) : 0);

export const ADDON_SEED = [
  { id: 'a-paan', name: 'Live paan counter', category: 'Food', event: 'Reception', budgetCategory: 'Add-ons & experiences', vendorId: '', status: 'Considering', priority: 'Medium', estimated: 15000, quoted: 0, negotiated: 0, finalCost: 0, description: 'Traditional + fusion paan.', notes: '', decisionReason: '', committedAmount: 0, createdAt: '2026-08-08T00:00:00.000Z', updatedAt: '2026-08-08T00:00:00.000Z' },
  { id: 'a-booth', name: '360° photo booth', category: 'Entertainment', event: 'Sangeet', budgetCategory: 'Add-ons & experiences', vendorId: '', status: 'Shortlisted', priority: 'High', estimated: 22000, quoted: 20000, negotiated: 0, finalCost: 0, description: 'Slow-motion video booth with props.', notes: 'Needs a 3x3m space.', decisionReason: '', committedAmount: 0, createdAt: '2026-08-09T00:00:00.000Z', updatedAt: '2026-08-09T00:00:00.000Z' },
  { id: 'a-pyro', name: 'Cold pyro entry', category: 'Effects', event: 'Reception', budgetCategory: 'Add-ons & experiences', vendorId: '', status: 'Considering', priority: 'Medium', estimated: 18000, quoted: 0, negotiated: 0, finalCost: 0, description: 'Cold sparklers for the couple entry.', notes: 'Confirm venue permits it.', decisionReason: '', committedAmount: 0, createdAt: '2026-08-10T00:00:00.000Z', updatedAt: '2026-08-10T00:00:00.000Z' },
  { id: 'a-dhol', name: 'Dhol for baraat', category: 'Entertainment', event: 'Wedding', budgetCategory: 'Add-ons & experiences', vendorId: '', status: 'Idea', priority: 'Low', estimated: 12000, quoted: 0, negotiated: 0, finalCost: 0, description: '', notes: '', decisionReason: '', committedAmount: 0, createdAt: '2026-08-11T00:00:00.000Z', updatedAt: '2026-08-11T00:00:00.000Z' }
];

const budgetCategoryNames = (state) => state.categories.filter((c) => !c.reserve).map((c) => c.name);

/* --- Immutable state operations --- */
function adjustCommitted(categories, name, delta) {
  if (!delta) return categories;
  return categories.map((c) => (c.name === name ? { ...c, committed: Math.max((c.committed || 0) + delta, 0) } : c));
}

function reconcile(state, oldAddon, nextAddon) {
  let categories = state.categories;
  const prev = oldAddon ? (oldAddon.committedAmount || 0) : 0;
  if (prev) categories = adjustCommitted(categories, oldAddon.budgetCategory, -prev);
  const desired = desiredCommitted(nextAddon);
  if (desired) categories = adjustCommitted(categories, nextAddon.budgetCategory, desired);
  return { applied: { ...nextAddon, committedAmount: desired }, categories };
}

function addAddon(state, data) {
  const addon = {
    id: `a-${Date.now()}`,
    name: data.name,
    category: data.category || 'Other',
    event: data.event || 'Shared',
    budgetCategory: data.budgetCategory,
    vendorId: data.vendorId || '',
    status: data.status || 'Considering',
    priority: data.priority || 'Medium',
    estimated: Number(data.estimated) || 0,
    quoted: Number(data.quoted) || 0,
    negotiated: Number(data.negotiated) || 0,
    finalCost: 0,
    description: data.description || '',
    notes: data.notes || '',
    decisionReason: '',
    committedAmount: 0,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  const { applied, categories } = reconcile(state, null, addon);
  return { ...state, categories, addons: [applied, ...state.addons] };
}

function updateAddon(state, id, patch) {
  const old = state.addons.find((a) => a.id === id);
  if (!old) return state;
  const next = { ...old, ...patch, updatedAt: nowIso() };
  const { applied, categories } = reconcile(state, old, next);
  return { ...state, categories, addons: state.addons.map((a) => (a.id === id ? applied : a)) };
}

function deleteAddon(state, id) {
  const old = state.addons.find((a) => a.id === id);
  if (!old) return state;
  const categories = old.committedAmount ? adjustCommitted(state.categories, old.budgetCategory, -old.committedAmount) : state.categories;
  return { ...state, categories, addons: state.addons.filter((a) => a.id !== id) };
}

/* --- Rendering --- */
function statusBadge(status) {
  const tone = isCommitting(status) ? 'done' : status === 'Rejected' ? 'rejected' : status === 'Shortlisted' ? 'shortlisted' : 'open';
  return `<span class="addon-badge ${tone}">${esc(status)}</span>`;
}

export function createAddons(ctx) {
  let activeFilter = 'All';
  let expandedId = null;
  let editingId = null;

  const modal = document.querySelector('#addon-modal');
  const form = document.querySelector('#addon-form');
  const decideModal = document.querySelector('#addon-decide-modal');
  const decideForm = document.querySelector('#addon-decide-form');
  const grid = document.querySelector('#addon-table-wrap');
  const tabs = document.querySelector('#addon-filter-tabs');
  const summary = document.querySelector('#addon-summary');

  function commit(next, message) {
    ctx.setState(next);
    if (message) ctx.toast(message);
  }

  function vendorName(state, vendorId) {
    const vendor = (state.vendors || []).find((v) => v.id === vendorId);
    return vendor ? vendor.name : '';
  }

  function renderSummary(addons) {
    const active = addons.filter((a) => a.status !== 'Rejected');
    const totalEstimated = active.reduce((sum, a) => sum + bestCost(a), 0);
    const committed = addons.reduce((sum, a) => sum + (a.committedAmount || 0), 0);
    const ideas = addons.filter((a) => a.status === 'Idea').length;
    summary.innerHTML = `
      <div class="addon-stat"><span>Likely add-on cost</span><strong>${compact(totalEstimated)}</strong><small>Across ${active.length} extras in play</small></div>
      <div class="addon-stat"><span>Approved &amp; committed</span><strong>${compact(committed)}</strong><small>${addons.filter((a) => (a.committedAmount || 0) > 0).length} locked in</small></div>
      <div class="addon-stat"><span>Just ideas</span><strong>${ideas}</strong><small>Not yet researched</small></div>`;
  }

  function detailRow(addon, colspan) {
    const state = ctx.getState();
    const vendor = vendorName(state, addon.vendorId);
    const costs = [
      addon.quoted && `<span><b>Quoted</b> ${compact(addon.quoted)}</span>`,
      addon.negotiated && `<span><b>Negotiated</b> ${compact(addon.negotiated)}</span>`,
      addon.finalCost && `<span><b>Final</b> ${compact(addon.finalCost)}</span>`,
      vendor && `<span><b>Vendor</b> ${esc(vendor)}</span>`,
      `<span><b>Priority</b> ${esc(addon.priority)}</span>`
    ].filter(Boolean).join('');
    const statusOptions = ADDON_STATUSES.map((s) => `<option ${s === addon.status ? 'selected' : ''}>${s}</option>`).join('');
    return `<tr class="addon-detail"><td colspan="${colspan}"><div class="addon-detail-grid">
      <div class="ad-block"><p class="ad-label">About</p>${addon.description ? `<p class="ad-desc">${esc(addon.description)}</p>` : '<small>No description.</small>'}<div class="ad-meta">${costs}</div>${addon.notes ? `<p class="ad-notes">${esc(addon.notes)}</p>` : ''}</div>
      <div class="ad-block"><p class="ad-label">Decision</p>${addon.decisionReason ? `<p class="ad-reason">${esc(addon.decisionReason)}</p>` : '<small>No decision recorded.</small>'}<div class="ad-controls">
        ${!isCommitting(addon.status) ? `<button type="button" class="add-button" data-approve-addon="${addon.id}">Approve</button>` : ''}
        <label class="ad-status">Status <select data-addon-status="${addon.id}">${statusOptions}</select></label>
        <button type="button" class="text-button" data-edit-addon="${addon.id}">Edit</button>
        <button type="button" class="text-button danger" data-delete-addon="${addon.id}">Delete</button>
      </div></div>
    </div></td></tr>`;
  }

  function render() {
    const state = ctx.getState();
    const addons = state.addons || [];
    renderSummary(addons);
    const categories = [...new Set(addons.map((a) => a.category))];
    tabs.innerHTML = ['All', ...categories]
      .map((c) => `<button class="${c === activeFilter ? 'selected' : ''}" data-afilter="${esc(c)}">${esc(c)}${c === 'All' ? ` <span>${addons.length}</span>` : ''}</button>`)
      .join('');

    if (!addons.length) {
      grid.innerHTML = '<p class="no-results">No add-ons yet. Capture an idea to see what the extras add up to.</p>';
      return;
    }
    const shown = activeFilter === 'All' ? categories : categories.filter((c) => c === activeFilter);
    grid.innerHTML = shown.map((category) => {
      const group = addons.filter((a) => a.category === category);
      const rows = group.map((addon) => {
        const expanded = addon.id === expandedId;
        const main = `<tr class="addon-row ${expanded ? 'is-open' : ''}" data-expand="${addon.id}">
          <td class="addon-name"><button type="button" class="addon-expand" aria-expanded="${expanded}">${expanded ? '▾' : '▸'}</button><span>${esc(addon.name)}<small>${esc(addon.event)}</small></span></td>
          <td>${bestCost(addon) ? compact(bestCost(addon)) : '—'}</td>
          <td>${addon.finalCost ? compact(addon.finalCost) : '—'}</td>
          <td>${statusBadge(addon.status)}</td></tr>`;
        return main + (expanded ? detailRow(addon, 4) : '');
      }).join('');
      return `<section class="addon-group"><div class="addon-group-head"><h2>${esc(category)}</h2><span>${group.length} idea${group.length === 1 ? '' : 's'}</span></div>
        <div class="item-table-wrap"><table class="addon-table"><thead><tr><th>Add-on</th><th>Est. cost</th><th>Final</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
    }).join('');
  }

  function openModal(id) {
    editingId = id || null;
    const state = ctx.getState();
    form.querySelector('[name=category]').innerHTML = ADDON_CATEGORIES.map((c) => `<option>${c}</option>`).join('');
    form.querySelector('[name=budgetCategory]').innerHTML = budgetCategoryNames(state).map((n) => `<option ${n === 'Add-ons & experiences' ? 'selected' : ''}>${esc(n)}</option>`).join('');
    form.querySelector('[name=vendorId]').innerHTML = '<option value="">No vendor</option>' + (state.vendors || []).map((v) => `<option value="${esc(v.id)}">${esc(v.name)}</option>`).join('');
    form.querySelector('[name=status]').innerHTML = ADDON_STATUSES.map((s) => `<option>${s}</option>`).join('');
    if (id) {
      const a = state.addons.find((x) => x.id === id);
      form.querySelector('.addon-modal-title').textContent = 'Edit add-on';
      for (const key of ['name', 'category', 'event', 'budgetCategory', 'vendorId', 'status', 'priority', 'description', 'notes']) {
        if (form.elements[key]) form.elements[key].value = a[key] ?? '';
      }
      form.elements.estimated.value = a.estimated || '';
      form.elements.quoted.value = a.quoted || '';
      form.elements.negotiated.value = a.negotiated || '';
    } else {
      form.reset();
      form.querySelector('.addon-modal-title').textContent = 'Add an add-on';
      form.querySelector('[name=status]').value = 'Considering';
      form.querySelector('[name=budgetCategory]').value = 'Add-ons & experiences';
    }
    modal.showModal();
  }

  function openDecideModal(id, mode) {
    const a = ctx.getState().addons.find((x) => x.id === id);
    decideForm.dataset.addonId = id;
    decideForm.dataset.mode = mode;
    decideForm.querySelector('.addon-decide-title').textContent = mode === 'reject' ? 'Reject add-on' : 'Approve add-on';
    decideForm.querySelector('.addon-decide-amounts').style.display = mode === 'reject' ? 'none' : '';
    decideForm.elements.finalCost.value = bestCost(a) || '';
    decideForm.elements.reason.value = a.decisionReason || '';
    decideModal.showModal();
  }

  /* Event wiring */
  document.querySelector('#open-add-addon').addEventListener('click', () => openModal(null));

  tabs.addEventListener('click', (e) => {
    const filter = e.target.closest('[data-afilter]')?.dataset.afilter;
    if (!filter) return;
    activeFilter = filter;
    render();
  });

  grid.addEventListener('click', (e) => {
    const state = ctx.getState();
    const expandBtn = e.target.closest('.addon-expand');
    if (expandBtn) {
      const id = expandBtn.closest('[data-expand]').dataset.expand;
      expandedId = expandedId === id ? null : id;
      render();
      return;
    }
    const approveId = e.target.closest('[data-approve-addon]')?.dataset.approveAddon;
    if (approveId) { openDecideModal(approveId, 'approve'); return; }
    const editId = e.target.closest('[data-edit-addon]')?.dataset.editAddon;
    if (editId) { openModal(editId); return; }
    const deleteId = e.target.closest('[data-delete-addon]')?.dataset.deleteAddon;
    if (deleteId) {
      const a = state.addons.find((x) => x.id === deleteId);
      if (confirm(`Delete "${a.name}"? This cannot be undone.`)) {
        if (expandedId === deleteId) expandedId = null;
        commit(deleteAddon(state, deleteId), `${a.name} removed.`);
      }
    }
  });

  grid.addEventListener('change', (e) => {
    const id = e.target.dataset.addonStatus;
    if (!id) return;
    const status = e.target.value;
    if (status === 'Approved') { openDecideModal(id, 'approve'); return; }
    if (status === 'Rejected') { openDecideModal(id, 'reject'); return; }
    commit(updateAddon(ctx.getState(), id, { status }), `Status updated to ${status}.`);
  });

  decideForm.addEventListener('submit', (e) => {
    if (e.submitter?.value === 'cancel') return;
    e.preventDefault();
    const id = decideForm.dataset.addonId;
    const mode = decideForm.dataset.mode;
    const reason = decideForm.elements.reason.value.trim();
    const state = ctx.getState();
    if (mode === 'reject') {
      commit(updateAddon(state, id, { status: 'Rejected', decisionReason: reason }), 'Add-on rejected — reason saved.');
    } else {
      const finalCost = Number(decideForm.elements.finalCost.value) || 0;
      commit(updateAddon(state, id, { status: 'Approved', finalCost, decisionReason: reason }), `Approved — ${compact(finalCost)} added to committed budget.`);
    }
    decideModal.close();
  });

  form.addEventListener('submit', (e) => {
    if (e.submitter?.value === 'cancel') return;
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    if (!data.name?.trim()) return;
    const state = ctx.getState();
    if (editingId) commit(updateAddon(state, editingId, {
      name: data.name, category: data.category, event: data.event, budgetCategory: data.budgetCategory,
      vendorId: data.vendorId || '', status: data.status, priority: data.priority,
      estimated: Number(data.estimated) || 0, quoted: Number(data.quoted) || 0, negotiated: Number(data.negotiated) || 0,
      description: data.description || '', notes: data.notes || ''
    }), `${data.name} updated.`);
    else commit(addAddon(state, data), `${data.name} added to add-ons.`);
    modal.close();
    form.reset();
    editingId = null;
  });

  return { render };
}
