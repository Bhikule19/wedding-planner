/* Shopping pipeline: clothing/jewellery/gifts with a research→purchase lifecycle and committed-budget wiring. */
import { compact, formatDate } from './format.js';

export const SHOPPING_STATUSES = ['Idea', 'Researching', 'Shortlisted', 'Decided', 'Purchased', 'Delivered', 'Alteration Required', 'Completed', 'Cancelled'];
export const SHOPPING_PERSONS = ['Groom', 'Bride', 'Family', 'Shared', 'Other'];
const COMMITTING = ['Purchased', 'Delivered', 'Alteration Required', 'Completed'];

const nowIso = () => new Date().toISOString();
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isCommitting = (status) => COMMITTING.includes(status);
const committedValue = (item) => item.actualPrice || item.quoted || item.budget || 0;
const desiredCommitted = (item) => (isCommitting(item.status) ? committedValue(item) : 0);

export const SHOPPING_SEED = [
  { id: 's-sherwani', name: 'Reception sherwani', person: 'Groom', event: 'Reception', category: 'Outfits & jewellery', status: 'Decided', shopName: 'Manyavar', shopContact: '', instagram: '', website: '', budget: 60000, quoted: 52000, actualPrice: 0, size: '40', alteration: true, trialDate: '2026-09-20', purchaseDate: '', deliveryDate: '', notes: 'Ivory with subtle zari.', committedAmount: 0, createdAt: '2026-08-08T00:00:00.000Z', updatedAt: '2026-08-08T00:00:00.000Z' },
  { id: 's-bride-lehenga', name: 'Wedding lehenga', person: 'Bride', event: 'Wedding', category: 'Outfits & jewellery', status: 'Researching', shopName: '', shopContact: '', instagram: 'sabyasachi', website: '', budget: 120000, quoted: 0, actualPrice: 0, size: 'M', alteration: false, trialDate: '', purchaseDate: '', deliveryDate: '', notes: 'Shortlisting three boutiques.', committedAmount: 0, createdAt: '2026-08-09T00:00:00.000Z', updatedAt: '2026-08-09T00:00:00.000Z' },
  { id: 's-shoes', name: 'Groom shoes (juttis)', person: 'Groom', event: 'Wedding', category: 'Outfits & jewellery', status: 'Purchased', shopName: 'Needledust', shopContact: '', instagram: '', website: '', budget: 8000, quoted: 6500, actualPrice: 6500, size: '9', alteration: false, trialDate: '', purchaseDate: '2026-08-10', deliveryDate: '2026-08-15', notes: '', committedAmount: 6500, createdAt: '2026-08-10T00:00:00.000Z', updatedAt: '2026-08-10T00:00:00.000Z' },
  { id: 's-return-gifts', name: 'Return gifts', person: 'Family', event: 'Shared', category: 'Invitations & gifts', status: 'Shortlisted', shopName: '', shopContact: '', instagram: '', website: '', budget: 30000, quoted: 25000, actualPrice: 0, size: '', alteration: false, trialDate: '', purchaseDate: '', deliveryDate: '', notes: 'Brass diya sets vs plant kits.', committedAmount: 0, createdAt: '2026-08-11T00:00:00.000Z', updatedAt: '2026-08-11T00:00:00.000Z' }
];

const budgetCategoryNames = (state) => state.categories.filter((c) => !c.reserve).map((c) => c.name);

/* --- Immutable state operations --- */
function adjustCommitted(categories, name, delta) {
  if (!delta) return categories;
  return categories.map((c) => (c.name === name ? { ...c, committed: Math.max((c.committed || 0) + delta, 0) } : c));
}

function reconcile(state, oldItem, nextItem) {
  let categories = state.categories;
  const prev = oldItem ? (oldItem.committedAmount || 0) : 0;
  if (prev) categories = adjustCommitted(categories, oldItem.category, -prev);
  const desired = desiredCommitted(nextItem);
  if (desired) categories = adjustCommitted(categories, nextItem.category, desired);
  return { applied: { ...nextItem, committedAmount: desired }, categories };
}

function addItem(state, data) {
  const item = {
    id: `s-${Date.now()}`,
    name: data.name,
    person: data.person || 'Shared',
    event: data.event || 'Shared',
    category: data.category,
    status: data.status || 'Researching',
    shopName: data.shopName || '',
    shopContact: data.shopContact || '',
    instagram: data.instagram || '',
    website: data.website || '',
    budget: Number(data.budget) || 0,
    quoted: Number(data.quoted) || 0,
    actualPrice: Number(data.actualPrice) || 0,
    size: data.size || '',
    alteration: data.alteration === 'on' || data.alteration === true,
    trialDate: data.trialDate || '',
    purchaseDate: data.purchaseDate || '',
    deliveryDate: data.deliveryDate || '',
    notes: data.notes || '',
    committedAmount: 0,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  const { applied, categories } = reconcile(state, null, item);
  return { ...state, categories, shopping: [applied, ...state.shopping] };
}

function updateItem(state, id, patch) {
  const old = state.shopping.find((s) => s.id === id);
  if (!old) return state;
  const next = { ...old, ...patch, updatedAt: nowIso() };
  const { applied, categories } = reconcile(state, old, next);
  return { ...state, categories, shopping: state.shopping.map((s) => (s.id === id ? applied : s)) };
}

function deleteItem(state, id) {
  const old = state.shopping.find((s) => s.id === id);
  if (!old) return state;
  const categories = old.committedAmount ? adjustCommitted(state.categories, old.category, -old.committedAmount) : state.categories;
  return { ...state, categories, shopping: state.shopping.filter((s) => s.id !== id) };
}

/* --- Rendering --- */
function statusBadge(status) {
  const tone = isCommitting(status) ? 'done' : status === 'Cancelled' ? 'cancelled' : status === 'Decided' ? 'decided' : 'open';
  return `<span class="shop-badge ${tone}">${esc(status)}</span>`;
}

function bestCost(item) {
  return item.actualPrice ? compact(item.actualPrice) : item.quoted ? compact(item.quoted) : '—';
}

export function createShopping(ctx) {
  let activeFilter = 'All';
  let expandedId = null;
  let editingId = null;

  const modal = document.querySelector('#shopping-modal');
  const form = document.querySelector('#shopping-form');
  const purchaseModal = document.querySelector('#shopping-purchase-modal');
  const purchaseForm = document.querySelector('#shopping-purchase-form');
  const grid = document.querySelector('#shopping-table-wrap');
  const tabs = document.querySelector('#shopping-filter-tabs');

  function commit(next, message) {
    ctx.setState(next);
    if (message) ctx.toast(message);
  }

  function detailRow(item, colspan) {
    const shop = [
      item.shopName && `<span>${esc(item.shopName)}</span>`,
      item.shopContact && `<a href="tel:${esc(item.shopContact)}">${esc(item.shopContact)}</a>`,
      item.instagram && `<a href="https://instagram.com/${esc(item.instagram.replace(/^@/, ''))}" target="_blank" rel="noopener">@${esc(item.instagram.replace(/^@/, ''))}</a>`,
      item.website && `<a href="${/^https?:\/\//i.test(item.website) ? esc(item.website) : `https://${esc(item.website)}`}" target="_blank" rel="noopener">website</a>`
    ].filter(Boolean).join('<span class="sep">·</span>');
    const dates = [
      item.trialDate && `<span><b>Trial</b> ${formatDate(item.trialDate)}</span>`,
      item.purchaseDate && `<span><b>Purchased</b> ${formatDate(item.purchaseDate)}</span>`,
      item.deliveryDate && `<span><b>Delivery</b> ${formatDate(item.deliveryDate)}</span>`,
      item.size && `<span><b>Size</b> ${esc(item.size)}</span>`,
      item.alteration && `<span class="tag-alter">Needs alteration</span>`
    ].filter(Boolean).join('');
    const statusOptions = SHOPPING_STATUSES.map((s) => `<option ${s === item.status ? 'selected' : ''}>${s}</option>`).join('');
    return `<tr class="shop-detail"><td colspan="${colspan}"><div class="shop-detail-grid">
      <div class="sd-block"><p class="sd-label">Shop</p><div class="sd-links">${shop || '<small>No shop details yet.</small>'}</div>${item.notes ? `<p class="sd-notes">${esc(item.notes)}</p>` : ''}</div>
      <div class="sd-block"><p class="sd-label">Dates &amp; fit</p><div class="sd-meta">${dates || '<small>No dates set.</small>'}</div></div>
      <div class="sd-block"><p class="sd-label">Update</p><div class="sd-controls">
        ${!isCommitting(item.status) ? `<button type="button" class="add-button" data-mark-purchased="${item.id}">Mark purchased</button>` : ''}
        <label class="sd-status">Status <select data-shop-status="${item.id}">${statusOptions}</select></label>
        <button type="button" class="text-button" data-edit-shopping="${item.id}">Edit</button>
        <button type="button" class="text-button danger" data-delete-shopping="${item.id}">Delete</button>
      </div></div>
    </div></td></tr>`;
  }

  function render() {
    const state = ctx.getState();
    const shopping = state.shopping || [];
    const persons = [...new Set(shopping.map((s) => s.person))];
    tabs.innerHTML = ['All', ...persons]
      .map((p) => `<button class="${p === activeFilter ? 'selected' : ''}" data-sfilter="${esc(p)}">${esc(p)}${p === 'All' ? ` <span>${shopping.length}</span>` : ''}</button>`)
      .join('');

    if (!shopping.length) {
      grid.innerHTML = '<p class="no-results">No shopping items yet. Add the first thing to buy.</p>';
      return;
    }
    const shown = activeFilter === 'All' ? persons : persons.filter((p) => p === activeFilter);
    grid.innerHTML = shown.map((person) => {
      const group = shopping.filter((s) => s.person === person);
      const rows = group.map((item) => {
        const expanded = item.id === expandedId;
        const main = `<tr class="shop-row ${expanded ? 'is-open' : ''}" data-expand="${item.id}">
          <td class="shop-name"><button type="button" class="shop-expand" aria-expanded="${expanded}">${expanded ? '▾' : '▸'}</button><span>${esc(item.name)}<small>${esc(item.event)}</small></span></td>
          <td>${item.budget ? compact(item.budget) : '—'}</td>
          <td>${item.quoted ? compact(item.quoted) : '—'}</td>
          <td>${item.actualPrice ? compact(item.actualPrice) : '—'}</td>
          <td>${statusBadge(item.status)}</td></tr>`;
        return main + (expanded ? detailRow(item, 5) : '');
      }).join('');
      return `<section class="shop-group"><div class="shop-group-head"><h2>${esc(person)}</h2><span>${group.length} item${group.length === 1 ? '' : 's'}</span></div>
        <div class="item-table-wrap"><table class="shop-table"><thead><tr><th>Item</th><th>Budget</th><th>Quoted</th><th>Actual</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
    }).join('');
  }

  function openModal(id) {
    editingId = id || null;
    const state = ctx.getState();
    form.querySelector('[name=category]').innerHTML = budgetCategoryNames(state).map((n) => `<option>${esc(n)}</option>`).join('');
    form.querySelector('[name=person]').innerHTML = SHOPPING_PERSONS.map((p) => `<option>${p}</option>`).join('');
    form.querySelector('[name=status]').innerHTML = SHOPPING_STATUSES.map((s) => `<option>${s}</option>`).join('');
    if (id) {
      const item = state.shopping.find((x) => x.id === id);
      form.querySelector('.shopping-modal-title').textContent = 'Edit shopping item';
      for (const key of ['name', 'person', 'event', 'category', 'status', 'shopName', 'shopContact', 'instagram', 'website', 'size', 'trialDate', 'deliveryDate', 'notes']) {
        if (form.elements[key]) form.elements[key].value = item[key] ?? '';
      }
      form.elements.budget.value = item.budget || '';
      form.elements.quoted.value = item.quoted || '';
      form.elements.actualPrice.value = item.actualPrice || '';
      form.elements.alteration.checked = !!item.alteration;
    } else {
      form.reset();
      form.querySelector('.shopping-modal-title').textContent = 'Add shopping item';
      form.querySelector('[name=status]').value = 'Researching';
    }
    modal.showModal();
  }

  function openPurchaseModal(id) {
    const item = ctx.getState().shopping.find((x) => x.id === id);
    purchaseForm.dataset.itemId = id;
    purchaseForm.elements.actualPrice.value = item.actualPrice || item.quoted || item.budget || '';
    purchaseForm.elements.purchaseDate.value = item.purchaseDate || new Date().toISOString().slice(0, 10);
    purchaseModal.showModal();
  }

  /* Event wiring */
  document.querySelector('#open-add-shopping').addEventListener('click', () => openModal(null));

  tabs.addEventListener('click', (e) => {
    const filter = e.target.closest('[data-sfilter]')?.dataset.sfilter;
    if (!filter) return;
    activeFilter = filter;
    render();
  });

  grid.addEventListener('click', (e) => {
    const state = ctx.getState();
    const expandBtn = e.target.closest('.shop-expand');
    if (expandBtn) {
      const id = expandBtn.closest('[data-expand]').dataset.expand;
      expandedId = expandedId === id ? null : id;
      render();
      return;
    }
    const purchaseId = e.target.closest('[data-mark-purchased]')?.dataset.markPurchased;
    if (purchaseId) { openPurchaseModal(purchaseId); return; }
    const editId = e.target.closest('[data-edit-shopping]')?.dataset.editShopping;
    if (editId) { openModal(editId); return; }
    const deleteId = e.target.closest('[data-delete-shopping]')?.dataset.deleteShopping;
    if (deleteId) {
      const item = state.shopping.find((x) => x.id === deleteId);
      if (confirm(`Delete "${item.name}"? This cannot be undone.`)) {
        if (expandedId === deleteId) expandedId = null;
        commit(deleteItem(state, deleteId), `${item.name} removed.`);
      }
    }
  });

  grid.addEventListener('change', (e) => {
    const id = e.target.dataset.shopStatus;
    if (!id) return;
    const status = e.target.value;
    if (status === 'Purchased') { openPurchaseModal(id); return; }
    commit(updateItem(ctx.getState(), id, { status }), `Status updated to ${status}.`);
  });

  purchaseForm.addEventListener('submit', (e) => {
    if (e.submitter?.value === 'cancel') return;
    e.preventDefault();
    const id = purchaseForm.dataset.itemId;
    const actualPrice = Number(purchaseForm.elements.actualPrice.value) || 0;
    const purchaseDate = purchaseForm.elements.purchaseDate.value || new Date().toISOString().slice(0, 10);
    commit(updateItem(ctx.getState(), id, { status: 'Purchased', actualPrice, purchaseDate }), `Marked purchased — ${compact(actualPrice)} added to committed budget.`);
    purchaseModal.close();
  });

  form.addEventListener('submit', (e) => {
    if (e.submitter?.value === 'cancel') return;
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    if (!data.name?.trim()) return;
    const state = ctx.getState();
    if (editingId) commit(updateItem(state, editingId, {
      name: data.name, person: data.person, event: data.event, category: data.category, status: data.status,
      shopName: data.shopName || '', shopContact: data.shopContact || '', instagram: data.instagram || '', website: data.website || '',
      budget: Number(data.budget) || 0, quoted: Number(data.quoted) || 0, actualPrice: Number(data.actualPrice) || 0,
      size: data.size || '', alteration: data.alteration === 'on', trialDate: data.trialDate || '', deliveryDate: data.deliveryDate || '', notes: data.notes || ''
    }), `${data.name} updated.`);
    else commit(addItem(state, data), `${data.name} added to shopping.`);
    modal.close();
    form.reset();
    editingId = null;
  });

  return { render };
}
