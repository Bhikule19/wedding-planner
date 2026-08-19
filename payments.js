/* Payment ledger: tracks planned/due/paid payments and wires paid amounts into the budget. */
import { compact, formatDate } from './format.js';

export const PAYMENT_STATUSES = ['Planned', 'Due', 'Paid', 'Partially Paid', 'Overdue', 'Cancelled'];
export const PAYMENT_METHODS = ['UPI', 'Bank transfer', 'Cash', 'Card', 'Cheque'];

const nowIso = () => new Date().toISOString();
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const PAYMENT_SEED = [
  { id: 'p-venue-adv', description: 'Venue booking advance', vendorId: '', category: 'Venue & catering', amount: 45000, dueDate: '2026-07-20', paidDate: '2026-07-20', method: 'Bank transfer', reference: 'NEFT-8842', status: 'Paid', paidAmount: 0, notes: '', appliedAmount: 45000, createdAt: '2026-07-20T00:00:00.000Z', updatedAt: '2026-07-20T00:00:00.000Z' },
  { id: 'p-outfit-token', description: 'Outfit token advance', vendorId: '', category: 'Outfits & jewellery', amount: 20000, dueDate: '2026-07-28', paidDate: '2026-07-28', method: 'UPI', reference: 'UPI-3391', status: 'Paid', paidAmount: 0, notes: '', appliedAmount: 20000, createdAt: '2026-07-28T00:00:00.000Z', updatedAt: '2026-07-28T00:00:00.000Z' },
  { id: 'p-venue-balance', description: 'Venue balance', vendorId: '', category: 'Venue & catering', amount: 120000, dueDate: '2026-11-15', paidDate: '', method: '', reference: '', status: 'Due', paidAmount: 0, notes: 'Due one month before the wedding.', appliedAmount: 0, createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z' },
  { id: 'p-makeup', description: 'Makeup & mehendi advance', vendorId: '', category: 'Makeup & mehendi', amount: 20000, dueDate: '2026-09-30', paidDate: '', method: '', reference: '', status: 'Planned', paidAmount: 0, notes: '', appliedAmount: 0, createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z' },
  { id: 'p-invites', description: 'Invitation printing', vendorId: '', category: 'Invitations & gifts', amount: 15000, dueDate: '2026-08-05', paidDate: '', method: '', reference: '', status: 'Overdue', paidAmount: 0, notes: 'Follow up with the printer.', appliedAmount: 0, createdAt: '2026-07-25T00:00:00.000Z', updatedAt: '2026-07-25T00:00:00.000Z' }
];

const budgetCategoryNames = (state) => state.categories.filter((c) => !c.reserve).map((c) => c.name);
const isSettled = (status) => status === 'Paid' || status === 'Cancelled';
const desiredApplied = (payment) =>
  payment.status === 'Paid' ? (payment.amount || 0)
    : payment.status === 'Partially Paid' ? (payment.paidAmount || 0)
      : 0;

function isOverdue(payment, now) {
  if (isSettled(payment.status)) return false;
  if (payment.status === 'Overdue') return true;
  return !!payment.dueDate && new Date(payment.dueDate).getTime() < now;
}

function statusBadge(payment, now) {
  const overdue = isOverdue(payment, now);
  const tone = payment.status === 'Paid' ? 'paid'
    : payment.status === 'Cancelled' ? 'cancelled'
      : overdue ? 'overdue'
        : payment.status === 'Partially Paid' ? 'partial' : 'open';
  const label = overdue && payment.status !== 'Overdue' ? 'Overdue' : payment.status;
  return `<span class="pay-badge ${tone}">${esc(label)}</span>`;
}

/* --- Immutable state operations --- */
function adjustCategoryPaid(categories, name, delta) {
  if (!delta) return categories;
  return categories.map((c) => (c.name === name ? { ...c, paid: Math.max((c.paid || 0) + delta, 0) } : c));
}
function adjustVendorPaid(vendors, vendorId, delta) {
  if (!delta || !vendorId) return vendors;
  return vendors.map((v) => (v.id === vendorId ? { ...v, paid: Math.max((v.paid || 0) + delta, 0) } : v));
}

function reconcile(state, oldPayment, nextPayment) {
  let categories = state.categories;
  let vendors = state.vendors || [];
  const prev = oldPayment ? (oldPayment.appliedAmount || 0) : 0;
  if (prev) {
    categories = adjustCategoryPaid(categories, oldPayment.category, -prev);
    vendors = adjustVendorPaid(vendors, oldPayment.vendorId, -prev);
  }
  const desired = desiredApplied(nextPayment);
  if (desired) {
    categories = adjustCategoryPaid(categories, nextPayment.category, desired);
    vendors = adjustVendorPaid(vendors, nextPayment.vendorId, desired);
  }
  return { applied: { ...nextPayment, appliedAmount: desired }, categories, vendors };
}

function addPayment(state, data) {
  const payment = {
    id: `p-${Date.now()}`,
    description: data.description,
    vendorId: data.vendorId || '',
    category: data.category,
    amount: Number(data.amount) || 0,
    dueDate: data.dueDate || '',
    paidDate: data.status === 'Paid' ? (data.paidDate || nowIso().slice(0, 10)) : (data.paidDate || ''),
    method: data.method || '',
    reference: data.reference || '',
    status: data.status || 'Planned',
    paidAmount: Number(data.paidAmount) || 0,
    notes: data.notes || '',
    appliedAmount: 0,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  const { applied, categories, vendors } = reconcile(state, null, payment);
  return { ...state, categories, vendors, payments: [applied, ...state.payments] };
}

function updatePayment(state, id, patch) {
  const old = state.payments.find((p) => p.id === id);
  if (!old) return state;
  const next = { ...old, ...patch, updatedAt: nowIso() };
  const { applied, categories, vendors } = reconcile(state, old, next);
  return { ...state, categories, vendors, payments: state.payments.map((p) => (p.id === id ? applied : p)) };
}

function deletePayment(state, id) {
  const old = state.payments.find((p) => p.id === id);
  if (!old) return state;
  let categories = state.categories;
  let vendors = state.vendors || [];
  if (old.appliedAmount) {
    categories = adjustCategoryPaid(categories, old.category, -old.appliedAmount);
    vendors = adjustVendorPaid(vendors, old.vendorId, -old.appliedAmount);
  }
  return { ...state, categories, vendors, payments: state.payments.filter((p) => p.id !== id) };
}

export function createPayments(ctx) {
  let activeFilter = 'All';
  let expandedId = null;
  let editingId = null;

  const modal = document.querySelector('#payment-modal');
  const form = document.querySelector('#payment-form');
  const grid = document.querySelector('#payment-table-wrap');
  const tabs = document.querySelector('#payment-filter-tabs');
  const summary = document.querySelector('#payment-summary');

  function commit(next, message) {
    ctx.setState(next);
    if (message) ctx.toast(message);
  }

  function vendorName(state, vendorId) {
    const vendor = (state.vendors || []).find((v) => v.id === vendorId);
    return vendor ? vendor.name : '';
  }

  function matchesFilter(payment, now) {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Paid') return payment.status === 'Paid';
    if (activeFilter === 'Overdue') return isOverdue(payment, now);
    if (activeFilter === 'Due') return !isSettled(payment.status) && !isOverdue(payment, now);
    return true;
  }

  function renderSummary(payments, now) {
    const totalPaid = payments.reduce((sum, p) => sum + (p.appliedAmount || 0), 0);
    const outstanding = payments.filter((p) => p.status !== 'Cancelled').reduce((sum, p) => sum + Math.max((p.amount || 0) - (p.appliedAmount || 0), 0), 0);
    const overdue = payments.filter((p) => isOverdue(p, now));
    const overdueTotal = overdue.reduce((sum, p) => sum + Math.max((p.amount || 0) - (p.appliedAmount || 0), 0), 0);
    const upcoming = payments
      .filter((p) => !isSettled(p.status) && !isOverdue(p, now) && p.dueDate)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];
    summary.innerHTML = `
      <div class="pay-stat"><span>Total paid</span><strong>${compact(totalPaid)}</strong><small>Backed by ${payments.filter((p) => (p.appliedAmount || 0) > 0).length} payments</small></div>
      <div class="pay-stat"><span>Outstanding</span><strong>${compact(outstanding)}</strong><small>Across ${payments.filter((p) => p.status !== 'Cancelled' && (p.amount || 0) > (p.appliedAmount || 0)).length} open payments</small></div>
      <div class="pay-stat"><span>Next due</span><strong>${upcoming ? compact(upcoming.amount) : '—'}</strong><small>${upcoming ? `${esc(upcoming.description)} · ${formatDate(upcoming.dueDate)}` : 'Nothing scheduled'}</small></div>
      <div class="pay-stat ${overdue.length ? 'alert' : ''}"><span>Overdue</span><strong>${compact(overdueTotal)}</strong><small>${overdue.length} payment${overdue.length === 1 ? '' : 's'} past due</small></div>`;
  }

  function detailRow(payment, colspan) {
    const state = ctx.getState();
    const vendor = vendorName(state, payment.vendorId);
    const meta = [
      payment.method && `<span><b>Method</b> ${esc(payment.method)}</span>`,
      payment.reference && `<span><b>Ref</b> ${esc(payment.reference)}</span>`,
      payment.paidDate && `<span><b>Paid</b> ${formatDate(payment.paidDate)}</span>`,
      payment.status === 'Partially Paid' && `<span><b>Paid so far</b> ${compact(payment.paidAmount)}</span>`,
      vendor && `<span><b>Vendor</b> ${esc(vendor)}</span>`
    ].filter(Boolean).join('');
    const statusOptions = PAYMENT_STATUSES.map((s) => `<option ${s === payment.status ? 'selected' : ''}>${s}</option>`).join('');
    return `<tr class="pay-detail"><td colspan="${colspan}"><div class="pay-detail-grid">
      <div class="pd-block"><p class="pd-label">Details</p><div class="pd-meta">${meta || '<small>No payment details yet.</small>'}</div>${payment.notes ? `<p class="pd-notes">${esc(payment.notes)}</p>` : ''}</div>
      <div class="pd-block"><p class="pd-label">Update</p><div class="pd-controls">
        ${payment.status !== 'Paid' ? `<button type="button" class="add-button" data-mark-paid="${payment.id}">Mark paid</button>` : ''}
        <label class="pd-status">Status <select data-pay-status="${payment.id}">${statusOptions}</select></label>
        <button type="button" class="text-button" data-edit-payment="${payment.id}">Edit</button>
        <button type="button" class="text-button danger" data-delete-payment="${payment.id}">Delete</button>
      </div></div>
    </div></td></tr>`;
  }

  function render() {
    const state = ctx.getState();
    const payments = state.payments || [];
    const now = Date.now();
    renderSummary(payments, now);
    const counts = {
      All: payments.length,
      Due: payments.filter((p) => !isSettled(p.status) && !isOverdue(p, now)).length,
      Overdue: payments.filter((p) => isOverdue(p, now)).length,
      Paid: payments.filter((p) => p.status === 'Paid').length
    };
    tabs.innerHTML = ['All', 'Due', 'Overdue', 'Paid']
      .map((f) => `<button class="${f === activeFilter ? 'selected' : ''}" data-pfilter="${f}">${f} <span>${counts[f]}</span></button>`)
      .join('');

    if (!payments.length) {
      grid.innerHTML = '<p class="no-results">No payments tracked yet. Add one to start the ledger.</p>';
      return;
    }
    const shown = payments
      .filter((p) => matchesFilter(p, now))
      .sort((a, b) => new Date(a.dueDate || '2100-01-01') - new Date(b.dueDate || '2100-01-01'));
    const rows = shown.map((p) => {
      const expanded = p.id === expandedId;
      const context = [vendorName(state, p.vendorId), p.category].filter(Boolean).join(' · ');
      const main = `<tr class="pay-row ${expanded ? 'is-open' : ''}" data-expand="${p.id}">
        <td class="pay-name"><button type="button" class="pay-expand" aria-expanded="${expanded}">${expanded ? '▾' : '▸'}</button><span>${esc(p.description)}<small>${esc(context)}</small></span></td>
        <td>${compact(p.amount)}</td>
        <td>${formatDate(p.dueDate)}</td>
        <td>${statusBadge(p, now)}</td></tr>`;
      return main + (expanded ? detailRow(p, 4) : '');
    }).join('');
    grid.innerHTML = `<div class="item-table-wrap"><table class="pay-table"><thead><tr><th>Payment</th><th>Amount</th><th>Due</th><th>Status</th></tr></thead><tbody>${rows || '<tr><td colspan="4" class="no-results">Nothing in this view.</td></tr>'}</tbody></table></div>`;
  }

  function openModal(id) {
    editingId = id || null;
    const state = ctx.getState();
    form.querySelector('[name=category]').innerHTML = budgetCategoryNames(state).map((n) => `<option>${esc(n)}</option>`).join('');
    form.querySelector('[name=vendorId]').innerHTML = '<option value="">No vendor</option>' + (state.vendors || []).map((v) => `<option value="${esc(v.id)}">${esc(v.name)}</option>`).join('');
    form.querySelector('[name=method]').innerHTML = '<option value="">—</option>' + PAYMENT_METHODS.map((m) => `<option>${m}</option>`).join('');
    form.querySelector('[name=status]').innerHTML = PAYMENT_STATUSES.map((s) => `<option>${s}</option>`).join('');
    if (id) {
      const p = state.payments.find((x) => x.id === id);
      form.querySelector('.payment-modal-title').textContent = 'Edit payment';
      for (const key of ['description', 'vendorId', 'category', 'method', 'reference', 'status', 'dueDate', 'paidDate', 'notes']) {
        if (form.elements[key]) form.elements[key].value = p[key] ?? '';
      }
      form.elements.amount.value = p.amount || '';
      form.elements.paidAmount.value = p.paidAmount || '';
    } else {
      form.reset();
      form.querySelector('.payment-modal-title').textContent = 'Add payment';
      form.querySelector('[name=status]').value = 'Planned';
    }
    modal.showModal();
  }

  /* Event wiring */
  document.querySelector('#open-add-payment').addEventListener('click', () => openModal(null));

  form.querySelector('[name=vendorId]').addEventListener('change', (e) => {
    const vendor = (ctx.getState().vendors || []).find((v) => v.id === e.target.value);
    if (vendor) form.querySelector('[name=category]').value = vendor.category;
  });

  tabs.addEventListener('click', (e) => {
    const filter = e.target.closest('[data-pfilter]')?.dataset.pfilter;
    if (!filter) return;
    activeFilter = filter;
    render();
  });

  grid.addEventListener('click', (e) => {
    const state = ctx.getState();
    const expandBtn = e.target.closest('.pay-expand');
    if (expandBtn) {
      const id = expandBtn.closest('[data-expand]').dataset.expand;
      expandedId = expandedId === id ? null : id;
      render();
      return;
    }
    const markId = e.target.closest('[data-mark-paid]')?.dataset.markPaid;
    if (markId) {
      const p = state.payments.find((x) => x.id === markId);
      commit(updatePayment(state, markId, { status: 'Paid', paidDate: new Date().toISOString().slice(0, 10) }), `${p.description} marked paid — added to the paid budget.`);
      return;
    }
    const editId = e.target.closest('[data-edit-payment]')?.dataset.editPayment;
    if (editId) { openModal(editId); return; }
    const deleteId = e.target.closest('[data-delete-payment]')?.dataset.deletePayment;
    if (deleteId) {
      const p = state.payments.find((x) => x.id === deleteId);
      if (confirm(`Delete "${p.description}"? This cannot be undone.`)) {
        if (expandedId === deleteId) expandedId = null;
        commit(deletePayment(state, deleteId), `${p.description} removed.`);
      }
    }
  });

  grid.addEventListener('change', (e) => {
    const id = e.target.dataset.payStatus;
    if (!id) return;
    const status = e.target.value;
    const patch = status === 'Paid' ? { status, paidDate: new Date().toISOString().slice(0, 10) } : { status };
    commit(updatePayment(ctx.getState(), id, patch), `Status updated to ${status}.`);
  });

  form.addEventListener('submit', (e) => {
    if (e.submitter?.value === 'cancel') return;
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    if (!data.description?.trim() || !(Number(data.amount) > 0)) { ctx.toast('A description and amount are required.'); return; }
    const state = ctx.getState();
    if (editingId) commit(updatePayment(state, editingId, {
      description: data.description, vendorId: data.vendorId || '', category: data.category,
      amount: Number(data.amount) || 0, dueDate: data.dueDate || '', paidDate: data.paidDate || '',
      method: data.method || '', reference: data.reference || '', status: data.status || 'Planned',
      paidAmount: Number(data.paidAmount) || 0, notes: data.notes || ''
    }), `${data.description} updated.`);
    else commit(addPayment(state, data), `${data.description} added to the ledger.`);
    modal.close();
    form.reset();
    editingId = null;
  });

  return { render };
}
