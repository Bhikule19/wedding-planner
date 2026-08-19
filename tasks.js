/* Task list: operational to-dos with owners, priorities, due dates, and links to any entity. */
import { formatDate } from './format.js';

export const TASK_STATUSES = ['Pending', 'In Progress', 'Blocked', 'Completed', 'Cancelled'];
export const TASK_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

const nowIso = () => new Date().toISOString();
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isClosed = (status) => status === 'Completed' || status === 'Cancelled';
const isOpen = (status) => !isClosed(status);

export const TASK_SEED = [
  { id: 't-photo-timeline', name: 'Finalize photography timeline', description: 'Agree the shot list and hour-by-hour plan.', owner: 'Abhishek', priority: 'High', status: 'Pending', event: 'Shared', linkRef: 'vendor:v-studio-a', dueDate: '2026-09-05', reminderDate: '2026-09-01', notes: '', createdAt: '2026-08-08T00:00:00.000Z', updatedAt: '2026-08-08T00:00:00.000Z' },
  { id: 't-sherwani-trials', name: 'Book two sherwani trials', description: '', owner: 'Abhishek', priority: 'Medium', status: 'In Progress', event: 'Reception', linkRef: 'shopping:s-sherwani', dueDate: '2026-09-15', reminderDate: '', notes: 'Manyavar + one boutique.', createdAt: '2026-08-09T00:00:00.000Z', updatedAt: '2026-08-09T00:00:00.000Z' },
  { id: 't-savedates', name: 'Send save-the-dates', description: 'WhatsApp + printed for close family.', owner: 'Sanika', priority: 'Critical', status: 'Pending', event: 'Shared', linkRef: '', dueDate: '2026-08-10', reminderDate: '', notes: '', createdAt: '2026-07-28T00:00:00.000Z', updatedAt: '2026-07-28T00:00:00.000Z' },
  { id: 't-booth', name: 'Decide on the 360° photo booth', description: '', owner: 'Sanika', priority: 'Medium', status: 'Pending', event: 'Sangeet', linkRef: 'addon:a-booth', dueDate: '2026-08-22', reminderDate: '', notes: '', createdAt: '2026-08-10T00:00:00.000Z', updatedAt: '2026-08-10T00:00:00.000Z' },
  { id: 't-venue-balance', name: 'Arrange venue balance payment', description: '', owner: 'Family', priority: 'High', status: 'Pending', event: 'Shared', linkRef: '', dueDate: '2026-11-10', reminderDate: '2026-11-01', notes: '', createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z' },
  { id: 't-shortlist-decor', name: 'Shortlist decorators', description: '', owner: 'Abhishek', priority: 'Medium', status: 'Completed', event: 'Reception', linkRef: '', dueDate: '2026-08-06', reminderDate: '', notes: 'Down to Citrus Canopy and Marigold.', createdAt: '2026-07-25T00:00:00.000Z', updatedAt: '2026-08-06T00:00:00.000Z' }
];

function resolveLink(state, linkRef) {
  if (!linkRef) return '';
  const [type, id] = linkRef.split(':');
  if (type === 'vendor') return (state.vendors || []).find((v) => v.id === id)?.name || '';
  if (type === 'shopping') return (state.shopping || []).find((s) => s.id === id)?.name || '';
  if (type === 'addon') return (state.addons || []).find((a) => a.id === id)?.name || '';
  if (type === 'event') return id;
  return '';
}

function isOverdue(task, now) {
  return isOpen(task.status) && !!task.dueDate && new Date(task.dueDate).getTime() < now;
}
function isDueThisWeek(task, now) {
  if (!isOpen(task.status) || !task.dueDate) return false;
  const due = new Date(task.dueDate).getTime();
  return due >= now && due <= now + 7 * 86400000;
}

/* --- Immutable state operations --- */
function addTask(state, data) {
  const task = {
    id: `t-${Date.now()}`,
    name: data.name,
    description: data.description || '',
    owner: data.owner || '',
    priority: data.priority || 'Medium',
    status: data.status || 'Pending',
    event: data.event || 'Shared',
    linkRef: data.linkRef || '',
    dueDate: data.dueDate || '',
    reminderDate: data.reminderDate || '',
    notes: data.notes || '',
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  return { ...state, tasks: [task, ...state.tasks] };
}
function updateTask(state, id, patch) {
  return { ...state, tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: nowIso() } : t)) };
}
function deleteTask(state, id) {
  return { ...state, tasks: state.tasks.filter((t) => t.id !== id) };
}

/* --- Rendering --- */
function priorityPill(priority) {
  const tone = priority === 'Critical' ? 'critical' : priority === 'High' ? 'high' : priority === 'Low' ? 'low' : 'medium';
  return `<span class="task-priority ${tone}">${esc(priority)}</span>`;
}
function statusBadge(task, now) {
  const overdue = isOverdue(task, now);
  const tone = task.status === 'Completed' ? 'done' : task.status === 'Cancelled' ? 'cancelled' : task.status === 'Blocked' ? 'blocked' : overdue ? 'overdue' : task.status === 'In Progress' ? 'progress' : 'open';
  const label = overdue ? 'Overdue' : task.status;
  return `<span class="task-badge ${tone}">${esc(label)}</span>`;
}

export function createTasks(ctx) {
  let activeFilter = 'All';
  let expandedId = null;
  let editingId = null;

  const modal = document.querySelector('#task-modal');
  const form = document.querySelector('#task-form');
  const grid = document.querySelector('#task-table-wrap');
  const tabs = document.querySelector('#task-filter-tabs');
  const summary = document.querySelector('#task-summary');

  function commit(next, message) {
    ctx.setState(next);
    if (message) ctx.toast(message);
  }

  function renderSummary(tasks, now) {
    const overdue = tasks.filter((t) => isOverdue(t, now)).length;
    const week = tasks.filter((t) => isDueThisWeek(t, now)).length;
    const progress = tasks.filter((t) => t.status === 'In Progress').length;
    const done = tasks.filter((t) => t.status === 'Completed').length;
    summary.innerHTML = `
      <div class="task-stat ${overdue ? 'alert' : ''}"><span>Overdue</span><strong>${overdue}</strong><small>Needs attention now</small></div>
      <div class="task-stat"><span>Due this week</span><strong>${week}</strong><small>Next 7 days</small></div>
      <div class="task-stat"><span>In progress</span><strong>${progress}</strong><small>Being worked on</small></div>
      <div class="task-stat"><span>Completed</span><strong>${done}</strong><small>Of ${tasks.length} total</small></div>`;
  }

  function detailRow(task, colspan) {
    const state = ctx.getState();
    const link = resolveLink(state, task.linkRef);
    const meta = [
      link && `<span><b>Linked to</b> ${esc(link)}</span>`,
      task.event && `<span><b>Event</b> ${esc(task.event)}</span>`,
      task.reminderDate && `<span><b>Reminder</b> ${formatDate(task.reminderDate)}</span>`
    ].filter(Boolean).join('');
    const statusOptions = TASK_STATUSES.map((s) => `<option ${s === task.status ? 'selected' : ''}>${s}</option>`).join('');
    return `<tr class="task-detail"><td colspan="${colspan}"><div class="task-detail-grid">
      <div class="td-block"><p class="td-label">Details</p>${task.description ? `<p class="td-desc">${esc(task.description)}</p>` : '<small>No description.</small>'}<div class="td-meta">${meta}</div>${task.notes ? `<p class="td-notes">${esc(task.notes)}</p>` : ''}</div>
      <div class="td-block"><p class="td-label">Update</p><div class="td-controls">
        <label class="td-status">Status <select data-task-status="${task.id}">${statusOptions}</select></label>
        <button type="button" class="text-button" data-edit-task="${task.id}">Edit</button>
        <button type="button" class="text-button danger" data-delete-task="${task.id}">Delete</button>
      </div></div>
    </div></td></tr>`;
  }

  function matchesFilter(task, now) {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'To-do') return isOpen(task.status);
    if (activeFilter === 'Overdue') return isOverdue(task, now);
    if (activeFilter === 'Done') return task.status === 'Completed';
    return true;
  }

  function render() {
    const state = ctx.getState();
    const tasks = state.tasks || [];
    const now = Date.now();
    renderSummary(tasks, now);
    const counts = {
      All: tasks.length,
      'To-do': tasks.filter((t) => isOpen(t.status)).length,
      Overdue: tasks.filter((t) => isOverdue(t, now)).length,
      Done: tasks.filter((t) => t.status === 'Completed').length
    };
    tabs.innerHTML = ['All', 'To-do', 'Overdue', 'Done']
      .map((f) => `<button class="${f === activeFilter ? 'selected' : ''}" data-tfilter="${f}">${f} <span>${counts[f]}</span></button>`)
      .join('');

    if (!tasks.length) {
      grid.innerHTML = '<p class="no-results">No tasks yet. Add the first thing to do.</p>';
      return;
    }
    const shown = tasks
      .filter((t) => matchesFilter(t, now))
      .sort((a, b) => (isClosed(a.status) - isClosed(b.status)) || (new Date(a.dueDate || '2100-01-01') - new Date(b.dueDate || '2100-01-01')));
    const rows = shown.map((t) => {
      const expanded = t.id === expandedId;
      const done = t.status === 'Completed';
      const link = resolveLink(state, t.linkRef);
      const context = [link, t.event].filter(Boolean).join(' · ');
      const dueClass = isOverdue(t, now) ? 'due-overdue' : '';
      const main = `<tr class="task-row ${expanded ? 'is-open' : ''} ${done ? 'is-done' : ''}" data-expand="${t.id}">
        <td class="task-check"><input type="checkbox" data-toggle-task="${t.id}" ${done ? 'checked' : ''} aria-label="Mark complete" /></td>
        <td class="task-name"><button type="button" class="task-expand" aria-expanded="${expanded}">${expanded ? '▾' : '▸'}</button><span>${esc(t.name)}<small>${esc(context) || 'No link'}</small></span></td>
        <td>${esc(t.owner) || '—'}</td>
        <td>${priorityPill(t.priority)}</td>
        <td class="${dueClass}">${formatDate(t.dueDate)}</td>
        <td>${statusBadge(t, now)}</td></tr>`;
      return main + (expanded ? detailRow(t, 6) : '');
    }).join('');
    grid.innerHTML = `<div class="item-table-wrap"><table class="task-table"><thead><tr><th></th><th>Task</th><th>Owner</th><th>Priority</th><th>Due</th><th>Status</th></tr></thead><tbody>${rows || '<tr><td colspan="6" class="no-results">Nothing in this view.</td></tr>'}</tbody></table></div>`;
  }

  function linkOptions(state, selected) {
    const group = (label, items) => items.length ? `<optgroup label="${label}">${items.map((o) => `<option value="${esc(o.value)}" ${o.value === selected ? 'selected' : ''}>${esc(o.name)}</option>`).join('')}</optgroup>` : '';
    return '<option value="">No link</option>'
      + group('Vendors', (state.vendors || []).map((v) => ({ value: `vendor:${v.id}`, name: v.name })))
      + group('Shopping', (state.shopping || []).map((s) => ({ value: `shopping:${s.id}`, name: s.name })))
      + group('Add-ons', (state.addons || []).map((a) => ({ value: `addon:${a.id}`, name: a.name })))
      + group('Events', (state.events || []).map((e) => ({ value: `event:${e.name}`, name: e.name })));
  }

  function openModal(id) {
    editingId = id || null;
    const state = ctx.getState();
    form.querySelector('[name=priority]').innerHTML = TASK_PRIORITIES.map((p) => `<option>${p}</option>`).join('');
    form.querySelector('[name=status]').innerHTML = TASK_STATUSES.map((s) => `<option>${s}</option>`).join('');
    if (id) {
      const t = state.tasks.find((x) => x.id === id);
      form.querySelector('.task-modal-title').textContent = 'Edit task';
      for (const key of ['name', 'description', 'owner', 'priority', 'status', 'event', 'dueDate', 'reminderDate', 'notes']) {
        if (form.elements[key]) form.elements[key].value = t[key] ?? '';
      }
      form.querySelector('[name=linkRef]').innerHTML = linkOptions(state, t.linkRef);
    } else {
      form.reset();
      form.querySelector('.task-modal-title').textContent = 'Add task';
      form.querySelector('[name=priority]').value = 'Medium';
      form.querySelector('[name=status]').value = 'Pending';
      form.querySelector('[name=linkRef]').innerHTML = linkOptions(state, '');
    }
    modal.showModal();
  }

  /* Event wiring */
  document.querySelector('#open-add-task').addEventListener('click', () => openModal(null));

  tabs.addEventListener('click', (e) => {
    const filter = e.target.closest('[data-tfilter]')?.dataset.tfilter;
    if (!filter) return;
    activeFilter = filter;
    render();
  });

  grid.addEventListener('click', (e) => {
    if (e.target.matches('[data-toggle-task]')) return; // handled on change
    const state = ctx.getState();
    const expandBtn = e.target.closest('.task-expand');
    if (expandBtn) {
      const id = expandBtn.closest('[data-expand]').dataset.expand;
      expandedId = expandedId === id ? null : id;
      render();
      return;
    }
    const editId = e.target.closest('[data-edit-task]')?.dataset.editTask;
    if (editId) { openModal(editId); return; }
    const deleteId = e.target.closest('[data-delete-task]')?.dataset.deleteTask;
    if (deleteId) {
      const t = state.tasks.find((x) => x.id === deleteId);
      if (confirm(`Delete "${t.name}"? This cannot be undone.`)) {
        if (expandedId === deleteId) expandedId = null;
        commit(deleteTask(state, deleteId), `${t.name} removed.`);
      }
    }
  });

  grid.addEventListener('change', (e) => {
    const toggleId = e.target.dataset.toggleTask;
    if (toggleId) {
      const done = e.target.checked;
      commit(updateTask(ctx.getState(), toggleId, { status: done ? 'Completed' : 'Pending' }), done ? 'Task completed.' : 'Task reopened.');
      return;
    }
    const statusId = e.target.dataset.taskStatus;
    if (statusId) commit(updateTask(ctx.getState(), statusId, { status: e.target.value }), `Status updated to ${e.target.value}.`);
  });

  form.addEventListener('submit', (e) => {
    if (e.submitter?.value === 'cancel') return;
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    if (!data.name?.trim()) return;
    const state = ctx.getState();
    if (editingId) commit(updateTask(state, editingId, {
      name: data.name, description: data.description || '', owner: data.owner || '', priority: data.priority,
      status: data.status, event: data.event, linkRef: data.linkRef || '', dueDate: data.dueDate || '',
      reminderDate: data.reminderDate || '', notes: data.notes || ''
    }), `${data.name} updated.`);
    else commit(addTask(state, data), `${data.name} added.`);
    modal.close();
    form.reset();
    editingId = null;
  });

  return { render };
}
