/* Guest list: RSVP tracking, sides, per-event attendance, meal/stay/travel needs, with search. */

export const GUEST_RSVP = ['Not Contacted', 'Invited', 'Pending', 'Confirmed', 'Declined'];
export const GUEST_SIDES = ["Groom's", "Bride's", 'Both'];
export const GUEST_MEALS = ['Veg', 'Non-veg', 'Jain', 'Vegan'];

const nowIso = () => new Date().toISOString();
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const GUEST_SEED = [
  { id: 'g-sharma', name: 'Sharma family', group: 'Sharma family', side: "Bride's", relationship: 'Relatives', phone: '', email: '', events: ['Wedding', 'Reception'], rsvp: 'Confirmed', meal: 'Veg', accommodation: true, transport: false, notes: 'Party of 4.', createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z' },
  { id: 'g-rohan', name: 'Rohan Mehta', group: 'College friends', side: "Groom's", relationship: 'Best friend', phone: '+91 98765 43210', email: 'rohan@example.com', events: ['Haldi', 'Sangeet', 'Wedding', 'Reception'], rsvp: 'Confirmed', meal: 'Non-veg', accommodation: true, transport: false, notes: '', createdAt: '2026-08-02T00:00:00.000Z', updatedAt: '2026-08-02T00:00:00.000Z' },
  { id: 'g-priya', name: 'Priya Aunty', group: 'Bride family', side: "Bride's", relationship: 'Aunt', phone: '', email: '', events: ['Wedding', 'Reception'], rsvp: 'Confirmed', meal: 'Jain', accommodation: true, transport: true, notes: '', createdAt: '2026-08-03T00:00:00.000Z', updatedAt: '2026-08-03T00:00:00.000Z' },
  { id: 'g-verma', name: 'Verma family', group: 'Verma family', side: "Groom's", relationship: 'Neighbours', phone: '', email: '', events: ['Reception'], rsvp: 'Invited', meal: 'Veg', accommodation: false, transport: false, notes: '', createdAt: '2026-08-04T00:00:00.000Z', updatedAt: '2026-08-04T00:00:00.000Z' },
  { id: 'g-neha', name: 'Neha Kulkarni', group: 'Work', side: "Groom's", relationship: 'Colleague', phone: '', email: '', events: ['Reception'], rsvp: 'Pending', meal: 'Non-veg', accommodation: false, transport: false, notes: '', createdAt: '2026-08-05T00:00:00.000Z', updatedAt: '2026-08-05T00:00:00.000Z' },
  { id: 'g-arjun', name: 'Arjun Desai', group: 'College friends', side: "Groom's", relationship: 'Friend', phone: '', email: '', events: ['Sangeet', 'Reception'], rsvp: 'Declined', meal: 'Veg', accommodation: false, transport: false, notes: 'Out of town that week.', createdAt: '2026-08-06T00:00:00.000Z', updatedAt: '2026-08-06T00:00:00.000Z' },
  { id: 'g-iyer', name: 'Iyer family', group: 'Iyer family', side: "Bride's", relationship: 'Family friends', phone: '', email: '', events: ['Wedding'], rsvp: 'Not Contacted', meal: 'Veg', accommodation: false, transport: false, notes: '', createdAt: '2026-08-07T00:00:00.000Z', updatedAt: '2026-08-07T00:00:00.000Z' }
];

const isAwaiting = (rsvp) => rsvp === 'Invited' || rsvp === 'Pending';

/* --- Immutable state operations --- */
function addGuest(state, data, events) {
  const guest = {
    id: `g-${Date.now()}`,
    name: data.name, group: data.group || '', side: data.side || "Groom's", relationship: data.relationship || '',
    phone: data.phone || '', email: data.email || '', events,
    rsvp: data.rsvp || 'Not Contacted', meal: data.meal || 'Veg',
    accommodation: data.accommodation === 'on', transport: data.transport === 'on',
    notes: data.notes || '', createdAt: nowIso(), updatedAt: nowIso()
  };
  return { ...state, guests: [guest, ...state.guests] };
}
function updateGuest(state, id, patch) {
  return { ...state, guests: state.guests.map((g) => (g.id === id ? { ...g, ...patch, updatedAt: nowIso() } : g)) };
}
function deleteGuest(state, id) {
  return { ...state, guests: state.guests.filter((g) => g.id !== id) };
}

/* --- Rendering --- */
function rsvpBadge(rsvp) {
  const tone = rsvp === 'Confirmed' ? 'confirmed' : rsvp === 'Declined' ? 'declined' : rsvp === 'Pending' || rsvp === 'Invited' ? 'awaiting' : 'open';
  return `<span class="guest-badge ${tone}">${esc(rsvp)}</span>`;
}

export function createGuests(ctx) {
  let activeFilter = 'All';
  let query = '';
  let expandedId = null;
  let editingId = null;

  const modal = document.querySelector('#guest-modal');
  const form = document.querySelector('#guest-form');
  const grid = document.querySelector('#guest-table-wrap');
  const tabs = document.querySelector('#guest-filter-tabs');
  const summary = document.querySelector('#guest-summary');
  const search = document.querySelector('#guest-search');

  function commit(next, message) {
    ctx.setState(next);
    if (message) ctx.toast(message);
  }

  function renderSummary(guests) {
    const confirmed = guests.filter((g) => g.rsvp === 'Confirmed').length;
    const awaiting = guests.filter((g) => isAwaiting(g.rsvp)).length;
    const declined = guests.filter((g) => g.rsvp === 'Declined').length;
    const needStay = guests.filter((g) => g.accommodation).length;
    summary.innerHTML = `
      <div class="guest-stat"><span>Total guests</span><strong>${guests.length}</strong><small>${needStay} need accommodation</small></div>
      <div class="guest-stat"><span>Confirmed</span><strong>${confirmed}</strong><small>Coming for sure</small></div>
      <div class="guest-stat"><span>Awaiting</span><strong>${awaiting}</strong><small>Invited or pending</small></div>
      <div class="guest-stat"><span>Declined</span><strong>${declined}</strong><small>Can't make it</small></div>`;
  }

  function detailRow(guest, colspan) {
    const contact = [
      guest.phone && `<a href="tel:${esc(guest.phone)}">${esc(guest.phone)}</a>`,
      guest.email && `<a href="mailto:${esc(guest.email)}">${esc(guest.email)}</a>`
    ].filter(Boolean).join('<span class="sep">·</span>');
    const needs = [
      `<span><b>Meal</b> ${esc(guest.meal)}</span>`,
      guest.accommodation && `<span class="guest-need">Needs stay</span>`,
      guest.transport && `<span class="guest-need">Needs travel</span>`
    ].filter(Boolean).join('');
    const events = guest.events.length ? guest.events.map((e) => `<span class="guest-chip">${esc(e)}</span>`).join('') : '<small>No events selected.</small>';
    const rsvpOptions = GUEST_RSVP.map((r) => `<option ${r === guest.rsvp ? 'selected' : ''}>${r}</option>`).join('');
    return `<tr class="guest-detail"><td colspan="${colspan}"><div class="guest-detail-grid">
      <div class="gd-block"><p class="gd-label">Contact</p><div class="gd-links">${contact || '<small>No contact details.</small>'}</div><div class="gd-meta">${needs}</div>${guest.notes ? `<p class="gd-notes">${esc(guest.notes)}</p>` : ''}</div>
      <div class="gd-block"><p class="gd-label">Attending</p><div class="gd-chips">${events}</div></div>
      <div class="gd-block"><p class="gd-label">Update</p><div class="gd-controls"><label class="gd-status">RSVP <select data-guest-rsvp="${guest.id}">${rsvpOptions}</select></label>
        <button type="button" class="text-button" data-edit-guest="${guest.id}">Edit</button>
        <button type="button" class="text-button danger" data-delete-guest="${guest.id}">Delete</button></div></div>
    </div></td></tr>`;
  }

  function matchesFilter(g) {
    if (activeFilter === 'Confirmed') return g.rsvp === 'Confirmed';
    if (activeFilter === 'Awaiting') return isAwaiting(g.rsvp);
    if (activeFilter === 'Declined') return g.rsvp === 'Declined';
    return true;
  }
  function matchesQuery(g) {
    if (!query) return true;
    const hay = `${g.name} ${g.group} ${g.relationship}`.toLowerCase();
    return hay.includes(query);
  }

  function render() {
    const state = ctx.getState();
    const guests = state.guests || [];
    renderSummary(guests);
    const counts = {
      All: guests.length,
      Confirmed: guests.filter((g) => g.rsvp === 'Confirmed').length,
      Awaiting: guests.filter((g) => isAwaiting(g.rsvp)).length,
      Declined: guests.filter((g) => g.rsvp === 'Declined').length
    };
    tabs.innerHTML = ['All', 'Confirmed', 'Awaiting', 'Declined']
      .map((f) => `<button class="${f === activeFilter ? 'selected' : ''}" data-gfilter="${f}">${f} <span>${counts[f]}</span></button>`)
      .join('');

    if (!guests.length) {
      grid.innerHTML = '<p class="no-results">No guests yet. Add the first one.</p>';
      return;
    }
    const shown = guests.filter((g) => matchesFilter(g) && matchesQuery(g)).sort((a, b) => a.name.localeCompare(b.name));
    const rows = shown.map((g) => {
      const expanded = g.id === expandedId;
      const context = [g.relationship, g.group].filter(Boolean).join(' · ');
      const eventsLabel = g.events.length ? `${g.events.length} event${g.events.length === 1 ? '' : 's'}` : '—';
      const main = `<tr class="guest-row ${expanded ? 'is-open' : ''}" data-expand="${g.id}">
        <td class="guest-name"><button type="button" class="guest-expand" aria-expanded="${expanded}">${expanded ? '▾' : '▸'}</button><span>${esc(g.name)}<small>${esc(context) || 'No group'}</small></span></td>
        <td>${esc(g.side)}</td>
        <td>${eventsLabel}</td>
        <td>${rsvpBadge(g.rsvp)}</td></tr>`;
      return main + (expanded ? detailRow(g, 4) : '');
    }).join('');
    grid.innerHTML = `<div class="item-table-wrap"><table class="guest-table"><thead><tr><th>Guest</th><th>Side</th><th>Events</th><th>RSVP</th></tr></thead><tbody>${rows || '<tr><td colspan="4" class="no-results">No guests match this view.</td></tr>'}</tbody></table></div>`;
  }

  function openModal(id) {
    editingId = id || null;
    const state = ctx.getState();
    form.querySelector('[name=side]').innerHTML = GUEST_SIDES.map((s) => `<option>${esc(s)}</option>`).join('');
    form.querySelector('[name=rsvp]').innerHTML = GUEST_RSVP.map((r) => `<option>${r}</option>`).join('');
    form.querySelector('[name=meal]').innerHTML = GUEST_MEALS.map((m) => `<option>${m}</option>`).join('');
    const guest = id ? state.guests.find((x) => x.id === id) : null;
    const attending = guest ? guest.events : [];
    form.querySelector('#guest-events-boxes').innerHTML = state.events.map((e) =>
      `<label class="checkbox-label"><input type="checkbox" name="events" value="${esc(e.name)}" ${attending.includes(e.name) ? 'checked' : ''} /> <span>${esc(e.name)}</span></label>`
    ).join('');
    if (guest) {
      form.querySelector('.guest-modal-title').textContent = 'Edit guest';
      for (const key of ['name', 'group', 'side', 'relationship', 'phone', 'email', 'rsvp', 'meal', 'notes']) {
        if (form.elements[key]) form.elements[key].value = guest[key] ?? '';
      }
      form.elements.accommodation.checked = !!guest.accommodation;
      form.elements.transport.checked = !!guest.transport;
    } else {
      form.querySelector('.guest-modal-title').textContent = 'Add guest';
      form.reset();
      form.querySelector('[name=rsvp]').value = 'Not Contacted';
      // reset() clears checkboxes we just built, so rebuild unchecked
      form.querySelector('#guest-events-boxes').innerHTML = state.events.map((e) => `<label class="checkbox-label"><input type="checkbox" name="events" value="${esc(e.name)}" /> <span>${esc(e.name)}</span></label>`).join('');
    }
    modal.showModal();
  }

  /* Event wiring */
  document.querySelector('#open-add-guest').addEventListener('click', () => openModal(null));

  search.addEventListener('input', (e) => { query = e.target.value.trim().toLowerCase(); render(); });

  tabs.addEventListener('click', (e) => {
    const filter = e.target.closest('[data-gfilter]')?.dataset.gfilter;
    if (!filter) return;
    activeFilter = filter;
    render();
  });

  grid.addEventListener('click', (e) => {
    const state = ctx.getState();
    const expandBtn = e.target.closest('.guest-expand');
    if (expandBtn) {
      const id = expandBtn.closest('[data-expand]').dataset.expand;
      expandedId = expandedId === id ? null : id;
      render();
      return;
    }
    const editId = e.target.closest('[data-edit-guest]')?.dataset.editGuest;
    if (editId) { openModal(editId); return; }
    const deleteId = e.target.closest('[data-delete-guest]')?.dataset.deleteGuest;
    if (deleteId) {
      const g = state.guests.find((x) => x.id === deleteId);
      if (confirm(`Remove "${g.name}" from the guest list?`)) {
        if (expandedId === deleteId) expandedId = null;
        commit(deleteGuest(state, deleteId), `${g.name} removed.`);
      }
    }
  });

  grid.addEventListener('change', (e) => {
    const id = e.target.dataset.guestRsvp;
    if (id) commit(updateGuest(ctx.getState(), id, { rsvp: e.target.value }), `RSVP updated to ${e.target.value}.`);
  });

  form.addEventListener('submit', (e) => {
    if (e.submitter?.value === 'cancel') return;
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    if (!data.name?.trim()) return;
    const events = new FormData(form).getAll('events');
    const state = ctx.getState();
    if (editingId) commit(updateGuest(state, editingId, {
      name: data.name, group: data.group || '', side: data.side, relationship: data.relationship || '',
      phone: data.phone || '', email: data.email || '', events, rsvp: data.rsvp, meal: data.meal,
      accommodation: data.accommodation === 'on', transport: data.transport === 'on', notes: data.notes || ''
    }), `${data.name} updated.`);
    else commit(addGuest(state, data, events), `${data.name} added to the guest list.`);
    modal.close();
    form.reset();
    editingId = null;
  });

  return { render };
}
