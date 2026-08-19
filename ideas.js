/* Ideas / wishlist: lightweight capture that converts into a vendor, shopping item, add-on, task, or decision. */
import { compact } from './format.js';

const nowIso = () => new Date().toISOString();
const today = () => nowIso().slice(0, 10);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const IDEA_SEED = [
  { id: 'i-welcome', title: 'Welcome drinks on arrival', note: 'Kokum sherbet + lemonade station near the entrance.', event: 'Reception', estimate: 8000, createdAt: '2026-08-12T00:00:00.000Z' },
  { id: 'i-hashtag', title: 'Custom hashtag & signage', note: '', event: 'Shared', estimate: 5000, createdAt: '2026-08-13T00:00:00.000Z' },
  { id: 'i-choreo', title: 'Sangeet choreographer', note: 'Two or three sessions for the family performances.', event: 'Sangeet', estimate: 30000, createdAt: '2026-08-14T00:00:00.000Z' }
];

export const CONVERT_TARGETS = [
  { key: 'vendor', label: 'Vendor', view: 'vendors' },
  { key: 'shopping', label: 'Shopping item', view: 'shopping' },
  { key: 'addon', label: 'Add-on', view: 'addons' },
  { key: 'task', label: 'Task', view: 'tasks' },
  { key: 'decision', label: 'Decision', view: 'decisions' }
];

const firstCategory = (state) => (state.categories.find((c) => !c.reserve) || {}).name || '';
const addonCategory = (state) => (state.categories.some((c) => c.name === 'Add-ons & experiences') ? 'Add-ons & experiences' : firstCategory(state));

/* Build a full, valid record for the target module from an idea. */
function buildRecord(targetKey, idea, state) {
  const stamp = { createdAt: nowIso(), updatedAt: nowIso() };
  const est = idea.estimate || 0;
  if (targetKey === 'vendor') return { key: 'vendors', record: { id: `v-${Date.now()}`, name: idea.title, category: firstCategory(state), event: idea.event, status: 'Idea', contactPerson: '', phone: '', instagram: '', website: '', location: '', score: 0, priority: 'Medium', quotes: est ? [{ amount: est, date: today(), note: 'From idea' }] : [], finalAmount: 0, advance: 0, paid: 0, decisionReason: '', committedApplied: false, ...stamp } };
  if (targetKey === 'shopping') return { key: 'shopping', record: { id: `s-${Date.now()}`, name: idea.title, person: 'Shared', event: idea.event, category: firstCategory(state), status: 'Idea', shopName: '', shopContact: '', instagram: '', website: '', budget: est, quoted: 0, actualPrice: 0, size: '', alteration: false, trialDate: '', purchaseDate: '', deliveryDate: '', notes: idea.note, committedAmount: 0, ...stamp } };
  if (targetKey === 'addon') return { key: 'addons', record: { id: `a-${Date.now()}`, name: idea.title, category: 'Other', event: idea.event, budgetCategory: addonCategory(state), vendorId: '', status: 'Idea', priority: 'Medium', estimated: est, quoted: 0, negotiated: 0, finalCost: 0, description: idea.note, notes: '', decisionReason: '', committedAmount: 0, ...stamp } };
  if (targetKey === 'task') return { key: 'tasks', record: { id: `t-${Date.now()}`, name: idea.title, description: idea.note, owner: '', priority: 'Medium', status: 'Pending', event: idea.event, linkRef: '', dueDate: '', reminderDate: '', notes: '', ...stamp } };
  return { key: 'decisions', record: { id: `d-${Date.now()}`, title: idea.title, category: '', event: idea.event, options: est ? [{ label: 'Option 1', price: est, score: 0, pros: '', cons: '' }] : [], deadline: '', estimate: est, status: 'Open', finalChoice: '', decisionReason: '', decisionDate: '', notes: idea.note, linkRef: '', ...stamp } };
}

/* --- Immutable state operations --- */
function addIdea(state, data) {
  const idea = { id: `i-${Date.now()}`, title: data.title, note: data.note || '', event: data.event || 'Shared', estimate: Number(data.estimate) || 0, createdAt: nowIso() };
  return { ...state, ideas: [idea, ...state.ideas] };
}
function updateIdea(state, id, patch) {
  return { ...state, ideas: state.ideas.map((i) => (i.id === id ? { ...i, ...patch } : i)) };
}
function deleteIdea(state, id) {
  return { ...state, ideas: state.ideas.filter((i) => i.id !== id) };
}
function convertIdea(state, id, targetKey) {
  const idea = state.ideas.find((i) => i.id === id);
  if (!idea) return { next: state, target: null };
  const { key, record } = buildRecord(targetKey, idea, state);
  const next = { ...state, [key]: [record, ...(state[key] || [])], ideas: state.ideas.filter((i) => i.id !== id) };
  return { next, target: CONVERT_TARGETS.find((t) => t.key === targetKey) };
}

export function createIdeas(ctx) {
  let editingId = null;
  const modal = document.querySelector('#idea-modal');
  const form = document.querySelector('#idea-form');
  const list = document.querySelector('#idea-list');

  function commit(next, message) {
    ctx.setState(next);
    if (message) ctx.toast(message);
  }

  function render() {
    const ideas = ctx.getState().ideas || [];
    if (!ideas.length) {
      list.innerHTML = '<p class="no-results">No ideas yet. Capture a loose thought, then convert it when it deserves real research.</p>';
      return;
    }
    const options = CONVERT_TARGETS.map((t) => `<option value="${t.key}">${t.label}</option>`).join('');
    list.innerHTML = ideas.map((idea) => `<article class="idea-card">
      <div class="idea-main"><div class="idea-title">${esc(idea.title)}</div>
        <div class="idea-meta">${esc(idea.event)}${idea.estimate ? ` · ~${compact(idea.estimate)}` : ''}</div>
        ${idea.note ? `<p class="idea-note">${esc(idea.note)}</p>` : ''}</div>
      <div class="idea-actions">
        <label class="idea-convert">Convert to <select data-convert="${idea.id}"><option value="">…</option>${options}</select></label>
        <div class="idea-buttons"><button type="button" class="text-button" data-edit-idea="${idea.id}">Edit</button><button type="button" class="text-button danger" data-delete-idea="${idea.id}">Delete</button></div>
      </div>
    </article>`).join('');
  }

  function openModal(id) {
    editingId = id || null;
    const idea = id ? ctx.getState().ideas.find((x) => x.id === id) : null;
    form.querySelector('.idea-modal-title').textContent = id ? 'Edit idea' : 'Capture an idea';
    if (idea) {
      form.elements.title.value = idea.title;
      form.elements.event.value = idea.event;
      form.elements.estimate.value = idea.estimate || '';
      form.elements.note.value = idea.note || '';
    } else {
      form.reset();
    }
    modal.showModal();
  }

  ['#open-capture-idea', '#open-capture-idea-2'].forEach((sel) => { const el = document.querySelector(sel); if (el) el.addEventListener('click', () => openModal(null)); });

  list.addEventListener('click', (e) => {
    const editId = e.target.closest('[data-edit-idea]')?.dataset.editIdea;
    if (editId) { openModal(editId); return; }
    const deleteId = e.target.closest('[data-delete-idea]')?.dataset.deleteIdea;
    if (deleteId) {
      const idea = ctx.getState().ideas.find((x) => x.id === deleteId);
      if (confirm(`Delete idea "${idea.title}"?`)) commit(deleteIdea(ctx.getState(), deleteId), 'Idea removed.');
    }
  });

  list.addEventListener('change', (e) => {
    const id = e.target.dataset.convert;
    if (!id || !e.target.value) return;
    const idea = ctx.getState().ideas.find((x) => x.id === id);
    const { next, target } = convertIdea(ctx.getState(), id, e.target.value);
    if (!target) return;
    commit(next, `“${idea.title}” converted to a ${target.label.toLowerCase()}.`);
    location.hash = target.view;
  });

  form.addEventListener('submit', (e) => {
    if (e.submitter?.value === 'cancel') return;
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    if (!data.title?.trim()) return;
    const state = ctx.getState();
    if (editingId) commit(updateIdea(state, editingId, { title: data.title, event: data.event, estimate: Number(data.estimate) || 0, note: data.note || '' }), `${data.title} updated.`);
    else commit(addIdea(state, data), `${data.title} captured.`);
    modal.close();
    form.reset();
    editingId = null;
  });

  return { render };
}
