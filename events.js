/* Events / functions: the hub that shows what's linked to each function, with live counts across modules. */
import { compact } from './format.js';

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function linkedFor(state, name) {
  return {
    vendors: (state.vendors || []).filter((v) => v.event === name),
    shopping: (state.shopping || []).filter((s) => s.event === name),
    addons: (state.addons || []).filter((a) => a.event === name),
    tasks: (state.tasks || []).filter((t) => t.event === name),
    decisions: (state.decisions || []).filter((d) => d.event === name)
  };
}

/* --- Immutable state operations --- */
function addEvent(state, data) {
  const event = {
    name: data.name,
    date: data.date || '',
    startTime: data.startTime || '',
    endTime: data.endTime || '',
    venue: data.venue || '',
    guestCount: Number(data.guestCount) || 0,
    budget: Number(data.budget) || 0,
    forecast: Number(data.forecast) || 0,
    notes: data.notes || ''
  };
  return { ...state, events: [...state.events, event] };
}
function updateEvent(state, originalName, data) {
  return {
    ...state,
    events: state.events.map((e) => (e.name === originalName ? {
      ...e, name: data.name, date: data.date || '', startTime: data.startTime || '', endTime: data.endTime || '',
      venue: data.venue || '', guestCount: Number(data.guestCount) || 0, budget: Number(data.budget) || 0,
      forecast: Number(data.forecast) || 0, notes: data.notes || ''
    } : e))
  };
}
function deleteEvent(state, name) {
  return { ...state, events: state.events.filter((e) => e.name !== name) };
}

/* --- Rendering --- */
function timeLabel(event) {
  if (event.startTime && event.endTime) return `${event.startTime}–${event.endTime}`;
  return event.startTime || '';
}
function countLabel(linked) {
  const parts = [
    linked.vendors.length && `${linked.vendors.length} vendor${linked.vendors.length === 1 ? '' : 's'}`,
    linked.shopping.length && `${linked.shopping.length} shopping`,
    linked.addons.length && `${linked.addons.length} add-on${linked.addons.length === 1 ? '' : 's'}`,
    linked.tasks.length && `${linked.tasks.length} task${linked.tasks.length === 1 ? '' : 's'}`,
    linked.decisions.length && `${linked.decisions.length} decision${linked.decisions.length === 1 ? '' : 's'}`
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Nothing linked yet';
}

export function createEvents(ctx) {
  let selectedName = null;
  let editingName = null;

  const grid = document.querySelector('#event-grid');
  const detail = document.querySelector('#event-detail');
  const modal = document.querySelector('#event-modal');
  const form = document.querySelector('#event-form');

  function commit(next, message) {
    ctx.setState(next);
    if (message) ctx.toast(message);
  }

  function linkBlock(title, items, mapName) {
    if (!items.length) return '';
    const chips = items.map((i) => `<span class="event-chip">${esc(mapName(i))}</span>`).join('');
    return `<div class="edp-links-block"><p class="edp-links-label">${title} <b>${items.length}</b></p><div class="edp-chips">${chips}</div></div>`;
  }

  function renderDetail(state) {
    if (!selectedName) { detail.innerHTML = ''; return; }
    const event = state.events.find((e) => e.name === selectedName);
    if (!event) { detail.innerHTML = ''; selectedName = null; return; }
    const linked = linkedFor(state, event.name);
    const meta = [
      event.date && `<span><b>Date</b> ${esc(event.date)}</span>`,
      timeLabel(event) && `<span><b>Time</b> ${esc(timeLabel(event))}</span>`,
      event.venue && `<span><b>Venue</b> ${esc(event.venue)}</span>`,
      event.guestCount && `<span><b>Guests</b> ${event.guestCount}</span>`,
      `<span><b>Allocated</b> ${compact(event.budget)}</span>`,
      `<span><b>Forecast</b> ${compact(event.forecast)}</span>`
    ].filter(Boolean).join('');
    const links = [
      linkBlock('Vendors', linked.vendors, (v) => v.name),
      linkBlock('Shopping', linked.shopping, (s) => s.name),
      linkBlock('Add-ons', linked.addons, (a) => a.name),
      linkBlock('Tasks', linked.tasks, (t) => t.name),
      linkBlock('Decisions', linked.decisions, (d) => d.title)
    ].filter(Boolean).join('') || '<p class="no-results">Nothing is linked to this event yet. Set an item\'s event to this function to see it here.</p>';
    detail.innerHTML = `<div class="event-detail-panel">
      <div class="edp-head"><div><p class="eyebrow">Event detail</p><h2>${esc(event.name)}</h2></div>
        <div class="edp-actions"><button type="button" class="text-button" data-edit-event="${esc(event.name)}">Edit</button><button type="button" class="text-button danger" data-delete-event="${esc(event.name)}">Delete</button></div></div>
      <div class="edp-meta">${meta}</div>
      ${event.notes ? `<p class="edp-notes">${esc(event.notes)}</p>` : ''}
      <div class="edp-links">${links}</div>
    </div>`;
  }

  function render() {
    const state = ctx.getState();
    grid.innerHTML = state.events.map((event, i) => {
      const linked = linkedFor(state, event.name);
      const selected = event.name === selectedName;
      const guests = event.guestCount ? `<div><span>Guests</span><strong>${event.guestCount}</strong></div>` : '';
      const sub = [event.date, event.venue].filter(Boolean).join(' · ');
      return `<article class="event-card ${selected ? 'selected' : ''}" data-index="0${i + 1}" data-event-select="${esc(event.name)}">
        <h2>${esc(event.name)}</h2>
        <div class="event-date">${esc(sub)}</div>
        <div class="event-numbers"><div><span>Allocated</span><strong>${compact(event.budget)}</strong></div><div><span>Forecast</span><strong>${compact(event.forecast)}</strong></div>${guests}</div>
        <div class="event-open">${countLabel(linked)}</div>
      </article>`;
    }).join('');
    renderDetail(state);
  }

  function openModal(name) {
    editingName = name || null;
    const state = ctx.getState();
    if (name) {
      const e = state.events.find((x) => x.name === name);
      form.querySelector('.event-modal-title').textContent = 'Edit event';
      form.querySelector('.event-rename-note').style.display = '';
      for (const key of ['name', 'date', 'startTime', 'endTime', 'venue', 'notes']) {
        if (form.elements[key]) form.elements[key].value = e[key] ?? '';
      }
      form.elements.guestCount.value = e.guestCount || '';
      form.elements.budget.value = e.budget || '';
      form.elements.forecast.value = e.forecast || '';
    } else {
      form.reset();
      form.querySelector('.event-modal-title').textContent = 'Add event';
      form.querySelector('.event-rename-note').style.display = 'none';
    }
    modal.showModal();
  }

  /* Event wiring */
  document.querySelector('#open-add-event').addEventListener('click', () => openModal(null));

  grid.addEventListener('click', (e) => {
    const card = e.target.closest('[data-event-select]');
    if (!card) return;
    const name = card.dataset.eventSelect;
    selectedName = selectedName === name ? null : name;
    render();
    if (selectedName) detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  detail.addEventListener('click', (e) => {
    const state = ctx.getState();
    const editName = e.target.closest('[data-edit-event]')?.dataset.editEvent;
    if (editName) { openModal(editName); return; }
    const deleteName = e.target.closest('[data-delete-event]')?.dataset.deleteEvent;
    if (deleteName) {
      if (confirm(`Delete "${deleteName}"? Linked items keep their event label but won't roll up here.`)) {
        selectedName = null;
        commit(deleteEvent(state, deleteName), `${deleteName} removed.`);
      }
    }
  });

  form.addEventListener('submit', (e) => {
    if (e.submitter?.value === 'cancel') return;
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    if (!data.name?.trim()) return;
    const state = ctx.getState();
    if (editingName) {
      commit(updateEvent(state, editingName, data), `${data.name} updated.`);
      if (selectedName === editingName) selectedName = data.name;
    } else {
      commit(addEvent(state, data), `${data.name} added.`);
    }
    modal.close();
    form.reset();
    editingName = null;
  });

  return { render };
}
