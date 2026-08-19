/* Decision center: options with pros/cons/price, deliberate lifecycle, and a recorded final choice. */
import { compact, formatDate } from './format.js';

export const DECISION_STATUSES = ['Open', 'Under Discussion', 'Shortlisted', 'Decided', 'Cancelled'];
const OPEN_STATES = ['Open', 'Under Discussion', 'Shortlisted'];

const nowIso = () => new Date().toISOString();
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isIso = (value) => /^\d{4}-\d{2}-\d{2}/.test(value || '');
const estimateOf = (options) => (options.length ? Math.max(0, ...options.map((o) => o.price || 0)) : 0);
export const isUndecided = (d) => OPEN_STATES.includes(d.status);

/* Normalize legacy-shaped decisions (flat candidate strings, lowercase status) to the current model. */
export function normalizeDecision(d) {
  const options = Array.isArray(d.options)
    ? d.options
    : (d.candidates || []).map((c) => {
        const [label, price] = String(c).split('·').map((s) => s.trim());
        return { label: label || String(c), price: 0, score: 0, pros: '', cons: '' };
      });
  const statusMap = { open: 'Open', shortlisted: 'Shortlisted', decided: 'Decided', cancelled: 'Cancelled' };
  const status = statusMap[d.status] || (DECISION_STATUSES.includes(d.status) ? d.status : 'Open');
  return {
    id: String(d.id != null ? d.id : `d-${Math.round((d.createdAt ? new Date(d.createdAt).getTime() : 0))}`),
    title: d.title || '', category: d.category || '', event: d.event || 'Shared',
    options, deadline: d.deadline || '', estimate: d.estimate || estimateOf(options),
    status, finalChoice: d.finalChoice || '', decisionReason: d.decisionReason || '', decisionDate: d.decisionDate || '',
    notes: d.notes || '', linkRef: d.linkRef || '',
    createdAt: d.createdAt || nowIso(), updatedAt: d.updatedAt || nowIso()
  };
}

function isUrgent(deadline) {
  if (!isIso(deadline)) return false;
  const days = (new Date(deadline).getTime() - Date.now()) / 86400000;
  return days <= 14;
}
function deadlineLabel(deadline) {
  if (!deadline) return 'No deadline';
  return isIso(deadline) ? `By ${formatDate(deadline)}` : esc(deadline);
}

/* --- Immutable state operations --- */
function withEstimate(decision) {
  return { ...decision, estimate: estimateOf(decision.options), updatedAt: nowIso() };
}
function addDecision(state, data) {
  const decision = normalizeDecision({
    id: `d-${Date.now()}`, title: data.title, category: data.category || '', event: data.event || 'Shared',
    options: [], deadline: data.deadline || '', status: data.status || 'Open', notes: data.notes || '',
    createdAt: nowIso(), updatedAt: nowIso()
  });
  return { ...state, decisions: [decision, ...state.decisions] };
}
function updateDecision(state, id, patch) {
  return { ...state, decisions: state.decisions.map((d) => (d.id === id ? withEstimate({ ...d, ...patch }) : d)) };
}
function deleteDecision(state, id) {
  return { ...state, decisions: state.decisions.filter((d) => d.id !== id) };
}
function addOption(state, id, option) {
  return { ...state, decisions: state.decisions.map((d) => (d.id === id ? withEstimate({ ...d, options: [...d.options, option] }) : d)) };
}
function removeOption(state, id, index) {
  return { ...state, decisions: state.decisions.map((d) => (d.id === id ? withEstimate({ ...d, options: d.options.filter((_, i) => i !== index) }) : d)) };
}

/* --- Rendering --- */
function statusText(d) {
  if (d.status === 'Decided') return `decided · ${esc(d.finalChoice || 'chosen')}`;
  if (d.status === 'Shortlisted') return 'options shortlisted';
  if (d.status === 'Under Discussion') return 'under discussion';
  if (d.status === 'Cancelled') return 'cancelled';
  return 'research still open';
}

export function createDecisions(ctx) {
  let activeFilter = 'Open';
  let expandedId = null;
  let editingId = null;

  const list = document.querySelector('#decision-list');
  const tabs = document.querySelector('#decision-filter-tabs');
  const modal = document.querySelector('#decision-modal');
  const form = document.querySelector('#decision-form');
  const decideModal = document.querySelector('#decision-decide-modal');
  const decideForm = document.querySelector('#decision-decide-form');

  function commit(next, message) {
    ctx.setState(next);
    if (message) ctx.toast(message);
  }

  function matchesFilter(d) {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Open') return d.status === 'Open' || d.status === 'Under Discussion';
    if (activeFilter === 'Shortlisted') return d.status === 'Shortlisted';
    if (activeFilter === 'Decided') return d.status === 'Decided';
    return true;
  }

  function detailBlock(d) {
    const options = d.options.length
      ? d.options.map((o, i) => `<div class="dd-option"><div><strong>${esc(o.label)}</strong>${o.price ? ` · ${compact(o.price)}` : ''}${o.score ? ` · ${o.score}/10` : ''}${o.pros ? `<small class="pro">+ ${esc(o.pros)}</small>` : ''}${o.cons ? `<small class="con">− ${esc(o.cons)}</small>` : ''}</div><button type="button" class="text-button danger" data-remove-option="${d.id}:${i}">Remove</button></div>`).join('')
      : '<small>No options yet. Add the ones you\'re weighing.</small>';
    const statusOptions = DECISION_STATUSES.map((s) => `<option ${s === d.status ? 'selected' : ''}>${s}</option>`).join('');
    const decided = d.status === 'Decided'
      ? `<div class="dd-decided"><p class="dd-label">Decision</p><p class="dd-final">Chose <strong>${esc(d.finalChoice || '—')}</strong>${d.decisionReason ? ` — ${esc(d.decisionReason)}` : ''}</p>${d.decisionDate ? `<p class="dd-date">${formatDate(d.decisionDate)}</p>` : ''}</div>`
      : '';
    return `<div class="decision-detail">
      <div class="dd-options"><p class="dd-label">Options</p>${options}
        <div class="dd-add-option"><input data-opt-label="${d.id}" placeholder="Option name" /><input type="number" min="0" data-opt-price="${d.id}" placeholder="₹ price" /><input type="number" min="0" max="10" step="0.1" data-opt-score="${d.id}" placeholder="/10" /><button type="button" class="text-button" data-add-option="${d.id}">Add option</button></div>
      </div>
      <div class="dd-side">${decided}${d.notes ? `<p class="dd-notes">${esc(d.notes)}</p>` : ''}
        <div class="dd-controls"><label class="dd-status">Status <select data-decision-status="${d.id}">${statusOptions}</select></label>
          <button type="button" class="text-button" data-edit-decision="${d.id}">Edit</button>
          <button type="button" class="text-button danger" data-delete-decision="${d.id}">Delete</button></div>
      </div>
    </div>`;
  }

  function render() {
    const state = ctx.getState();
    const decisions = state.decisions || [];
    const undecided = decisions.filter(isUndecided).length;
    document.querySelector('#decision-badge').textContent = undecided;
    const counts = {
      All: decisions.length,
      Open: decisions.filter((d) => d.status === 'Open' || d.status === 'Under Discussion').length,
      Shortlisted: decisions.filter((d) => d.status === 'Shortlisted').length,
      Decided: decisions.filter((d) => d.status === 'Decided').length
    };
    tabs.innerHTML = ['Open', 'Shortlisted', 'Decided', 'All']
      .map((f) => `<button class="${f === activeFilter ? 'selected' : ''}" data-dfilter="${f}">${f} <span>${counts[f]}</span></button>`)
      .join('');

    const shown = decisions.filter(matchesFilter);
    if (!shown.length) {
      list.innerHTML = '<p class="no-results">Nothing in this view.</p>';
      return;
    }
    list.innerHTML = shown.map((d, i) => {
      const expanded = d.id === expandedId;
      const urgent = isUrgent(d.deadline) && d.status !== 'Decided';
      const pills = d.options.map((o) => `<span class="candidate-pill ${o.label === d.finalChoice ? 'selected' : ''}">${esc(o.label)}${o.price ? ` · ${compact(o.price)}` : ''}</span>`).join('');
      const card = `<article class="decision-card ${expanded ? 'is-open' : ''}">
        <div class="decision-number">0${i + 1}</div>
        <div class="decision-main">
          <div class="decision-title">${esc(d.title)}</div>
          <div class="decision-context">${esc(d.event)} · ${esc(d.category) || 'Uncategorised'} · ${statusText(d)}</div>
          <div class="candidate-pills">${pills || '<span class="candidate-pill muted">No options yet</span>'}</div>
        </div>
        <div class="decision-right">
          <div class="deadline ${urgent ? 'urgent' : ''}">${deadlineLabel(d.deadline)}</div>
          <div class="decision-cost">${d.estimate ? `${compact(d.estimate)} forecast` : '—'}</div>
          <div class="decision-actions">${d.status !== 'Decided' ? `<button class="choose-button" data-decide-open="${d.id}">Make a choice →</button>` : ''}<button type="button" class="text-button" data-expand-decision="${d.id}">${expanded ? 'Hide' : 'Details'}</button></div>
        </div>
      </article>`;
      return card + (expanded ? detailBlock(d) : '');
    }).join('');
  }

  function openModal(id) {
    editingId = id || null;
    const state = ctx.getState();
    form.querySelector('[name=status]').innerHTML = DECISION_STATUSES.map((s) => `<option>${s}</option>`).join('');
    if (id) {
      const d = state.decisions.find((x) => x.id === id);
      form.querySelector('.decision-modal-title').textContent = 'Edit decision';
      for (const key of ['title', 'category', 'event', 'status', 'deadline', 'notes']) {
        if (form.elements[key]) form.elements[key].value = d[key] ?? '';
      }
    } else {
      form.reset();
      form.querySelector('.decision-modal-title').textContent = 'Add decision';
      form.querySelector('[name=status]').value = 'Open';
    }
    modal.showModal();
  }

  function openDecideModal(id) {
    const d = ctx.getState().decisions.find((x) => x.id === id);
    if (!d.options.length) { ctx.toast('Add at least one option before deciding.'); expandedId = id; render(); return; }
    decideForm.dataset.decisionId = id;
    decideForm.elements.finalChoice.innerHTML = d.options.map((o) => `<option ${o.label === d.finalChoice ? 'selected' : ''}>${esc(o.label)}</option>`).join('');
    decideForm.elements.reason.value = d.decisionReason || '';
    decideModal.showModal();
  }

  /* Event wiring */
  document.querySelector('#open-add-decision').addEventListener('click', () => openModal(null));

  tabs.addEventListener('click', (e) => {
    const filter = e.target.closest('[data-dfilter]')?.dataset.dfilter;
    if (!filter) return;
    activeFilter = filter;
    render();
  });

  list.addEventListener('click', (e) => {
    const state = ctx.getState();
    const decideId = e.target.closest('[data-decide-open]')?.dataset.decideOpen;
    if (decideId) { openDecideModal(decideId); return; }
    const expandId = e.target.closest('[data-expand-decision]')?.dataset.expandDecision;
    if (expandId) { expandedId = expandedId === expandId ? null : expandId; render(); return; }
    const addOptId = e.target.closest('[data-add-option]')?.dataset.addOption;
    if (addOptId) {
      const label = list.querySelector(`[data-opt-label="${addOptId}"]`).value.trim();
      if (!label) { ctx.toast('Give the option a name.'); return; }
      const price = Number(list.querySelector(`[data-opt-price="${addOptId}"]`).value) || 0;
      const score = Number(list.querySelector(`[data-opt-score="${addOptId}"]`).value) || 0;
      commit(addOption(state, addOptId, { label, price, score, pros: '', cons: '' }), 'Option added.');
      return;
    }
    const removeOpt = e.target.closest('[data-remove-option]')?.dataset.removeOption;
    if (removeOpt) {
      const [id, idx] = removeOpt.split(':');
      commit(removeOption(state, id, Number(idx)), 'Option removed.');
      return;
    }
    const editId = e.target.closest('[data-edit-decision]')?.dataset.editDecision;
    if (editId) { openModal(editId); return; }
    const deleteId = e.target.closest('[data-delete-decision]')?.dataset.deleteDecision;
    if (deleteId) {
      const d = state.decisions.find((x) => x.id === deleteId);
      if (confirm(`Delete "${d.title}"? This cannot be undone.`)) {
        if (expandedId === deleteId) expandedId = null;
        commit(deleteDecision(state, deleteId), `${d.title} removed.`);
      }
    }
  });

  list.addEventListener('change', (e) => {
    const id = e.target.dataset.decisionStatus;
    if (!id) return;
    const status = e.target.value;
    if (status === 'Decided') { openDecideModal(id); return; }
    commit(updateDecision(ctx.getState(), id, { status }), `Status updated to ${status}.`);
  });

  decideForm.addEventListener('submit', (e) => {
    if (e.submitter?.value === 'cancel') return;
    e.preventDefault();
    const id = decideForm.dataset.decisionId;
    const finalChoice = decideForm.elements.finalChoice.value;
    const reason = decideForm.elements.reason.value.trim();
    commit(updateDecision(ctx.getState(), id, { status: 'Decided', finalChoice, decisionReason: reason, decisionDate: new Date().toISOString().slice(0, 10) }), `Decided: ${finalChoice}. It's a choice, not yet a booking.`);
    decideModal.close();
  });

  form.addEventListener('submit', (e) => {
    if (e.submitter?.value === 'cancel') return;
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    if (!data.title?.trim()) return;
    const state = ctx.getState();
    if (editingId) commit(updateDecision(state, editingId, { title: data.title, category: data.category || '', event: data.event, status: data.status, deadline: data.deadline || '', notes: data.notes || '' }), `${data.title} updated.`);
    else commit(addDecision(state, data), `${data.title} added — now add its options.`);
    modal.close();
    form.reset();
    editingId = null;
  });

  return { render };
}
