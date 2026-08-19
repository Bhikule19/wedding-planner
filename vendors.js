/* Vendor candidate management: lifecycle, comparison, and committed-budget wiring. */
import { compact } from './format.js';

export const VENDOR_STATUSES = [
  'Idea', 'Researching', 'Contacted', 'Quotation Requested', 'Quotation Received',
  'Shortlisted', 'Negotiating', 'Selected', 'Rejected', 'Booked', 'Completed', 'Cancelled'
];

const COMMITTING = ['Selected', 'Booked', 'Completed'];
const isCommitting = (status) => COMMITTING.includes(status);
const nowIso = () => new Date().toISOString();

export const VENDOR_SEED = [
  { id: 'v-studio-a', name: 'Studio A', category: 'Photography', event: 'Shared', status: 'Shortlisted', contactPerson: 'Rohan', phone: '', instagram: 'studioa.films', website: '', location: 'Pune', score: 8.5, priority: 'High', quotes: [{ amount: 105000, date: '2026-08-02', note: 'Full wedding + reception, 2 shooters' }], finalAmount: 0, advance: 0, paid: 0, decisionReason: '', committedApplied: false, createdAt: '2026-08-02T00:00:00.000Z', updatedAt: '2026-08-02T00:00:00.000Z' },
  { id: 'v-studio-b', name: 'Studio B', category: 'Photography', event: 'Shared', status: 'Shortlisted', contactPerson: 'Meera', phone: '', instagram: 'studiob.photo', website: '', location: 'Mumbai', score: 7.8, priority: 'Medium', quotes: [{ amount: 115000, date: '2026-08-03', note: 'Candid + traditional' }], finalAmount: 0, advance: 0, paid: 0, decisionReason: '', committedApplied: false, createdAt: '2026-08-03T00:00:00.000Z', updatedAt: '2026-08-03T00:00:00.000Z' },
  { id: 'v-studio-c', name: 'Studio C', category: 'Photography', event: 'Shared', status: 'Contacted', contactPerson: '', phone: '', instagram: 'studioc.weddings', website: '', location: 'Pune', score: 9.1, priority: 'Medium', quotes: [{ amount: 128000, date: '2026-08-05', note: 'Premium album included' }], finalAmount: 0, advance: 0, paid: 0, decisionReason: '', committedApplied: false, createdAt: '2026-08-05T00:00:00.000Z', updatedAt: '2026-08-05T00:00:00.000Z' },
  { id: 'v-citrus', name: 'Citrus Canopy Studio', category: 'Decor & flowers', event: 'Reception', status: 'Negotiating', contactPerson: 'Anita', phone: '', instagram: 'citruscanopy', website: '', location: 'Pune', score: 8.0, priority: 'High', quotes: [{ amount: 160000, date: '2026-08-06', note: 'Citrus canopy concept' }], finalAmount: 0, advance: 0, paid: 0, decisionReason: '', committedApplied: false, createdAt: '2026-08-06T00:00:00.000Z', updatedAt: '2026-08-06T00:00:00.000Z' },
  { id: 'v-marigold', name: 'Marigold & Co', category: 'Decor & flowers', event: 'Reception', status: 'Shortlisted', contactPerson: 'Sameer', phone: '', instagram: 'marigoldco', website: '', location: 'Nashik', score: 7.5, priority: 'Medium', quotes: [{ amount: 135000, date: '2026-08-07', note: 'Floral minimal' }], finalAmount: 0, advance: 0, paid: 0, decisionReason: '', committedApplied: false, createdAt: '2026-08-07T00:00:00.000Z', updatedAt: '2026-08-07T00:00:00.000Z' }
];

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const firstQuote = (vendor) => vendor.quotes?.[0]?.amount || 0;
const effectiveCost = (vendor) => vendor.finalAmount || firstQuote(vendor);
const remaining = (vendor) => Math.max((vendor.finalAmount || 0) - (vendor.paid || 0), 0);
const budgetCategoryNames = (state) => state.categories.filter((c) => !c.reserve).map((c) => c.name);

function instaHref(handle) {
  if (!handle) return '';
  return /^https?:\/\//i.test(handle) ? handle : `https://instagram.com/${handle.replace(/^@/, '')}`;
}
function webHref(url) {
  if (!url) return '';
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/* --- Immutable state operations --- */
function adjustCommitted(categories, categoryName, delta) {
  if (!delta) return categories;
  return categories.map((c) =>
    c.name === categoryName ? { ...c, committed: Math.max((c.committed || 0) + delta, 0) } : c
  );
}

function reconcile(state, oldVendor, nextVendor) {
  let categories = state.categories;
  if (oldVendor?.committedApplied) {
    categories = adjustCommitted(categories, oldVendor.category, -(oldVendor.finalAmount || 0));
  }
  const shouldApply = isCommitting(nextVendor.status) && (nextVendor.finalAmount || 0) > 0;
  const applied = { ...nextVendor, committedApplied: shouldApply };
  if (shouldApply) categories = adjustCommitted(categories, applied.category, applied.finalAmount || 0);
  return { applied, categories };
}

function addVendor(state, data) {
  const vendor = {
    id: `v-${Date.now()}`,
    name: data.name,
    category: data.category,
    event: data.event,
    status: data.status || 'Researching',
    contactPerson: data.contactPerson || '',
    phone: data.phone || '',
    instagram: data.instagram || '',
    website: data.website || '',
    location: data.location || '',
    score: Number(data.score) || 0,
    priority: data.priority || 'Medium',
    quotes: Number(data.quote) > 0 ? [{ amount: Number(data.quote), date: nowIso().slice(0, 10), note: 'Initial quote' }] : [],
    finalAmount: 0,
    advance: 0,
    paid: 0,
    decisionReason: '',
    committedApplied: false,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  const { applied, categories } = reconcile(state, null, vendor);
  return { ...state, categories, vendors: [applied, ...state.vendors] };
}

function updateVendor(state, id, patch) {
  const old = state.vendors.find((v) => v.id === id);
  if (!old) return state;
  const next = { ...old, ...patch, updatedAt: nowIso() };
  const { applied, categories } = reconcile(state, old, next);
  return { ...state, categories, vendors: state.vendors.map((v) => (v.id === id ? applied : v)) };
}

function editVendorFields(state, id, data) {
  const old = state.vendors.find((v) => v.id === id);
  if (!old) return state;
  const quotes = old.quotes.length
    ? old.quotes.map((q, i) => (i === 0 ? { ...q, amount: Number(data.quote) || q.amount } : q))
    : Number(data.quote) > 0 ? [{ amount: Number(data.quote), date: nowIso().slice(0, 10), note: 'Initial quote' }] : [];
  return updateVendor(state, id, {
    name: data.name, category: data.category, event: data.event,
    contactPerson: data.contactPerson || '', phone: data.phone || '',
    instagram: data.instagram || '', website: data.website || '', location: data.location || '',
    score: Number(data.score) || 0, priority: data.priority || 'Medium', quotes
  });
}

function addQuote(state, id, amount, note) {
  const old = state.vendors.find((v) => v.id === id);
  if (!old || !(amount > 0)) return state;
  const quotes = [...old.quotes, { amount, date: nowIso().slice(0, 10), note: note || '' }];
  return { ...state, vendors: state.vendors.map((v) => (v.id === id ? { ...v, quotes, updatedAt: nowIso() } : v)) };
}

function deleteVendor(state, id) {
  const old = state.vendors.find((v) => v.id === id);
  if (!old) return state;
  const categories = old.committedApplied
    ? adjustCommitted(state.categories, old.category, -(old.finalAmount || 0))
    : state.categories;
  return { ...state, categories, vendors: state.vendors.filter((v) => v.id !== id) };
}

/* --- Rendering --- */
function bestVendorId(group) {
  const active = group.filter((v) => !['Rejected', 'Cancelled'].includes(v.status));
  if (!active.length) return null;
  return [...active].sort((a, b) => (b.score - a.score) || (effectiveCost(a) - effectiveCost(b)))[0].id;
}

function statusBadge(status) {
  const tone = isCommitting(status) ? 'committed' : ['Rejected', 'Cancelled'].includes(status) ? 'rejected' : 'open';
  return `<span class="vendor-badge ${tone}">${esc(status)}</span>`;
}

function detailRow(vendor, colspan) {
  const savings = vendor.finalAmount && firstQuote(vendor) > vendor.finalAmount ? firstQuote(vendor) - vendor.finalAmount : 0;
  const links = [
    vendor.contactPerson && `<span>${esc(vendor.contactPerson)}</span>`,
    vendor.phone && `<a href="tel:${esc(vendor.phone)}">${esc(vendor.phone)}</a>`,
    vendor.instagram && `<a href="${esc(instaHref(vendor.instagram))}" target="_blank" rel="noopener">@${esc(vendor.instagram.replace(/^@/, ''))}</a>`,
    vendor.website && `<a href="${esc(webHref(vendor.website))}" target="_blank" rel="noopener">website</a>`,
    vendor.location && `<span>${esc(vendor.location)}</span>`
  ].filter(Boolean).join('<span class="sep">·</span>');
  const quoteHistory = vendor.quotes.length
    ? vendor.quotes.map((q) => `<li><strong>${compact(q.amount)}</strong> <small>${esc(q.date)}${q.note ? ` · ${esc(q.note)}` : ''}</small></li>`).join('')
    : '<li><small>No quotes recorded yet.</small></li>';
  const statusOptions = VENDOR_STATUSES.map((s) => `<option ${s === vendor.status ? 'selected' : ''}>${s}</option>`).join('');
  return `<tr class="vendor-detail"><td colspan="${colspan}"><div class="vendor-detail-grid">
    <div class="vd-block"><p class="vd-label">Contact</p><div class="vd-links">${links || '<small>No contact details.</small>'}</div></div>
    <div class="vd-block"><p class="vd-label">Quote history${savings ? ` · saved ${compact(savings)}` : ''}</p><ul class="vd-quotes">${quoteHistory}</ul>
      <div class="vd-addquote"><input type="number" min="0" placeholder="New quote ₹" data-quote-input="${vendor.id}" /><input type="text" placeholder="Note (optional)" data-quote-note="${vendor.id}" /><button type="button" class="text-button" data-add-quote="${vendor.id}">Add quote</button></div></div>
    <div class="vd-block"><p class="vd-label">Decision</p>${vendor.decisionReason ? `<p class="vd-reason">${esc(vendor.decisionReason)}</p>` : '<small>No decision recorded.</small>'}
      <div class="vd-controls"><label class="vd-status">Status <select data-status-for="${vendor.id}">${statusOptions}</select></label>
        <button type="button" class="text-button" data-edit-vendor="${vendor.id}">Edit</button>
        <button type="button" class="text-button danger" data-delete-vendor="${vendor.id}">Delete</button></div></div>
  </div></td></tr>`;
}

export function createVendors(ctx) {
  let activeFilter = 'All';
  let expandedId = null;
  let editingId = null;

  const vendorModal = document.querySelector('#vendor-modal');
  const vendorForm = document.querySelector('#vendor-form');
  const decideModal = document.querySelector('#vendor-decide-modal');
  const decideForm = document.querySelector('#vendor-decide-form');
  const grid = document.querySelector('#vendor-table-wrap');
  const tabs = document.querySelector('#vendor-filter-tabs');

  function render() {
    const state = ctx.getState();
    const vendors = state.vendors || [];
    const categories = [...new Set(vendors.map((v) => v.category))];
    tabs.innerHTML = ['All', ...categories]
      .map((c) => `<button class="${c === activeFilter ? 'selected' : ''}" data-vfilter="${esc(c)}">${esc(c)}${c === 'All' ? ` <span>${vendors.length}</span>` : ''}</button>`)
      .join('');

    const shown = activeFilter === 'All' ? categories : categories.filter((c) => c === activeFilter);
    if (!vendors.length) {
      grid.innerHTML = '<p class="no-results">No vendor candidates yet. Add your first one to start comparing.</p>';
      return;
    }
    grid.innerHTML = shown.map((category) => {
      const group = vendors.filter((v) => v.category === category);
      const best = bestVendorId(group);
      const rows = group.map((v) => {
        const isBest = v.id === best;
        const expanded = v.id === expandedId;
        const main = `<tr class="vendor-row ${isBest ? 'best' : ''} ${expanded ? 'is-open' : ''}" data-expand="${v.id}">
          <td class="vendor-name"><button type="button" class="vendor-expand" aria-expanded="${expanded}">${expanded ? '▾' : '▸'}</button><span>${esc(v.name)}${isBest ? '<b class="best-tag">best fit</b>' : ''}<small>${esc(v.priority)} priority${v.event ? ` · ${esc(v.event)}` : ''}</small></span></td>
          <td>${firstQuote(v) ? compact(firstQuote(v)) : '—'}</td>
          <td>${v.finalAmount ? compact(v.finalAmount) : '—'}</td>
          <td>${v.advance ? compact(v.advance) : '—'}</td>
          <td>${v.finalAmount ? compact(remaining(v)) : '—'}</td>
          <td>${v.score ? `${v.score}/10` : '—'}</td>
          <td>${statusBadge(v.status)}</td></tr>`;
        return main + (expanded ? detailRow(v, 7) : '');
      }).join('');
      return `<section class="vendor-group"><div class="vendor-group-head"><h2>${esc(category)}</h2><span>${group.length} candidate${group.length === 1 ? '' : 's'}</span></div>
        <div class="item-table-wrap"><table class="vendor-table"><thead><tr><th>Vendor</th><th>Quote</th><th>Final</th><th>Advance</th><th>Remaining</th><th>Score</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
    }).join('');
  }

  function commit(next, message) {
    ctx.setState(next);
    if (message) ctx.toast(message);
  }

  function openVendorModal(id) {
    editingId = id || null;
    const state = ctx.getState();
    const categorySelect = vendorForm.querySelector('[name=category]');
    categorySelect.innerHTML = budgetCategoryNames(state).map((n) => `<option>${esc(n)}</option>`).join('');
    vendorForm.querySelector('[name=status]').innerHTML = VENDOR_STATUSES.map((s) => `<option>${s}</option>`).join('');
    if (id) {
      const v = state.vendors.find((x) => x.id === id);
      vendorForm.querySelector('.vendor-modal-title').textContent = 'Edit vendor';
      for (const key of ['name', 'category', 'event', 'contactPerson', 'phone', 'instagram', 'website', 'location', 'priority']) {
        if (vendorForm.elements[key]) vendorForm.elements[key].value = v[key] ?? '';
      }
      vendorForm.elements.score.value = v.score || '';
      vendorForm.elements.quote.value = firstQuote(v) || '';
      vendorForm.querySelector('[name=status]').closest('label').style.display = 'none';
    } else {
      vendorForm.reset();
      vendorForm.querySelector('.vendor-modal-title').textContent = 'Add vendor candidate';
      vendorForm.querySelector('[name=status]').closest('label').style.display = '';
    }
    vendorModal.showModal();
  }

  function openDecideModal(id, mode) {
    const state = ctx.getState();
    const v = state.vendors.find((x) => x.id === id);
    decideForm.dataset.vendorId = id;
    decideForm.dataset.mode = mode;
    decideForm.querySelector('.decide-title').textContent = mode === 'reject' ? 'Reject vendor' : 'Select vendor';
    decideForm.querySelector('.decide-amounts').style.display = mode === 'reject' ? 'none' : '';
    decideForm.elements.finalAmount.value = v.finalAmount || firstQuote(v) || '';
    decideForm.elements.advance.value = v.advance || '';
    decideForm.elements.reason.value = v.decisionReason || '';
    decideModal.showModal();
  }

  /* Event wiring */
  document.querySelector('#open-add-vendor').addEventListener('click', () => openVendorModal(null));

  tabs.addEventListener('click', (e) => {
    const filter = e.target.closest('[data-vfilter]')?.dataset.vfilter;
    if (!filter) return;
    activeFilter = filter;
    render();
  });

  grid.addEventListener('click', (e) => {
    const state = ctx.getState();
    const expandBtn = e.target.closest('.vendor-expand');
    if (expandBtn) {
      const id = expandBtn.closest('[data-expand]').dataset.expand;
      expandedId = expandedId === id ? null : id;
      render();
      return;
    }
    const addQuoteId = e.target.closest('[data-add-quote]')?.dataset.addQuote;
    if (addQuoteId) {
      const amount = Number(grid.querySelector(`[data-quote-input="${addQuoteId}"]`).value);
      const note = grid.querySelector(`[data-quote-note="${addQuoteId}"]`).value;
      if (!(amount > 0)) { ctx.toast('Enter a quote amount first.'); return; }
      commit(addQuote(state, addQuoteId, amount, note), 'Quote added — original quote kept.');
      return;
    }
    const editId = e.target.closest('[data-edit-vendor]')?.dataset.editVendor;
    if (editId) { openVendorModal(editId); return; }
    const deleteId = e.target.closest('[data-delete-vendor]')?.dataset.deleteVendor;
    if (deleteId) {
      const v = state.vendors.find((x) => x.id === deleteId);
      if (confirm(`Delete "${v.name}"? This cannot be undone.`)) {
        if (expandedId === deleteId) expandedId = null;
        commit(deleteVendor(state, deleteId), `${v.name} removed.`);
      }
    }
  });

  grid.addEventListener('change', (e) => {
    const id = e.target.dataset.statusFor;
    if (!id) return;
    const status = e.target.value;
    if (status === 'Selected') { openDecideModal(id, 'select'); return; }
    if (status === 'Rejected') { openDecideModal(id, 'reject'); return; }
    commit(updateVendor(ctx.getState(), id, { status }), `Status updated to ${status}.`);
  });

  vendorForm.addEventListener('submit', (e) => {
    if (e.submitter?.value === 'cancel') return;
    e.preventDefault();
    const data = Object.fromEntries(new FormData(vendorForm));
    if (!data.name?.trim()) return;
    const state = ctx.getState();
    if (editingId) commit(editVendorFields(state, editingId, data), `${data.name} updated.`);
    else commit(addVendor(state, data), `${data.name} added as a candidate.`);
    vendorModal.close();
    vendorForm.reset();
    editingId = null;
  });

  decideForm.addEventListener('submit', (e) => {
    if (e.submitter?.value === 'cancel') return;
    e.preventDefault();
    const id = decideForm.dataset.vendorId;
    const mode = decideForm.dataset.mode;
    const reason = decideForm.elements.reason.value.trim();
    const state = ctx.getState();
    if (mode === 'reject') {
      commit(updateVendor(state, id, { status: 'Rejected', decisionReason: reason }), 'Vendor rejected — reason saved.');
    } else {
      const finalAmount = Number(decideForm.elements.finalAmount.value) || 0;
      const advance = Number(decideForm.elements.advance.value) || 0;
      commit(
        updateVendor(state, id, { status: 'Selected', finalAmount, advance, decisionReason: reason }),
        `Selected — ${compact(finalAmount)} added to committed budget. Not yet a payment.`
      );
    }
    decideModal.close();
  });

  return { render };
}
