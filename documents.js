/* Documents: a registry of links (Drive/Dropbox/etc.) tagged by type and linked to any entity. Uploads come later. */

export const DOC_KINDS = ['Quotation', 'Contract', 'Invoice', 'Receipt', 'Design', 'Reference', 'Other'];

const nowIso = () => new Date().toISOString();
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = (url) => (/^https?:\/\//i.test(url) ? url : url ? `https://${url}` : '');

export const DOCUMENT_SEED = [
  { id: 'doc-studioa-quote', title: 'Studio A quotation', url: 'https://drive.google.com/', kind: 'Quotation', linkRef: 'vendor:v-studio-a', notes: '', createdAt: '2026-08-02T00:00:00.000Z' },
  { id: 'doc-venue-contract', title: 'Venue contract', url: '', kind: 'Contract', linkRef: '', notes: 'Awaiting the signed copy.', createdAt: '2026-08-04T00:00:00.000Z' },
  { id: 'doc-venue-receipt', title: 'Venue advance receipt', url: 'https://drive.google.com/', kind: 'Receipt', linkRef: 'payment:p-venue-adv', notes: '', createdAt: '2026-07-20T00:00:00.000Z' }
];

function resolveLink(state, linkRef) {
  if (!linkRef) return '';
  const [type, id] = linkRef.split(':');
  if (type === 'vendor') return (state.vendors || []).find((v) => v.id === id)?.name || '';
  if (type === 'shopping') return (state.shopping || []).find((s) => s.id === id)?.name || '';
  if (type === 'addon') return (state.addons || []).find((a) => a.id === id)?.name || '';
  if (type === 'payment') return (state.payments || []).find((p) => p.id === id)?.description || '';
  if (type === 'decision') return (state.decisions || []).find((d) => String(d.id) === id)?.title || '';
  if (type === 'event') return id;
  if (type === 'task') return (state.tasks || []).find((t) => t.id === id)?.name || '';
  return '';
}

/* --- Immutable state operations --- */
function addDoc(state, data) {
  const doc = { id: `doc-${Date.now()}`, title: data.title, url: safeUrl((data.url || '').trim()), kind: data.kind || 'Other', linkRef: data.linkRef || '', notes: data.notes || '', createdAt: nowIso() };
  return { ...state, documents: [doc, ...state.documents] };
}
function updateDoc(state, id, patch) {
  return { ...state, documents: state.documents.map((d) => (d.id === id ? { ...d, ...patch } : d)) };
}
function deleteDoc(state, id) {
  return { ...state, documents: state.documents.filter((d) => d.id !== id) };
}

export function createDocuments(ctx) {
  let activeFilter = 'All';
  let editingId = null;
  const modal = document.querySelector('#document-modal');
  const form = document.querySelector('#document-form');
  const grid = document.querySelector('#document-table-wrap');
  const tabs = document.querySelector('#document-filter-tabs');

  function commit(next, message) {
    ctx.setState(next);
    if (message) ctx.toast(message);
  }

  function linkOptions(state, selected) {
    const group = (label, items) => (items.length ? `<optgroup label="${label}">${items.map((o) => `<option value="${esc(o.value)}" ${o.value === selected ? 'selected' : ''}>${esc(o.name)}</option>`).join('')}</optgroup>` : '');
    return '<option value="">Not linked</option>'
      + group('Vendors', (state.vendors || []).map((v) => ({ value: `vendor:${v.id}`, name: v.name })))
      + group('Shopping', (state.shopping || []).map((s) => ({ value: `shopping:${s.id}`, name: s.name })))
      + group('Add-ons', (state.addons || []).map((a) => ({ value: `addon:${a.id}`, name: a.name })))
      + group('Payments', (state.payments || []).map((p) => ({ value: `payment:${p.id}`, name: p.description })))
      + group('Events', (state.events || []).map((e) => ({ value: `event:${e.name}`, name: e.name })))
      + group('Decisions', (state.decisions || []).map((d) => ({ value: `decision:${d.id}`, name: d.title })));
  }

  function render() {
    const state = ctx.getState();
    const docs = state.documents || [];
    const kinds = [...new Set(docs.map((d) => d.kind))];
    tabs.innerHTML = ['All', ...kinds].map((k) => `<button class="${k === activeFilter ? 'selected' : ''}" data-docfilter="${esc(k)}">${esc(k)}${k === 'All' ? ` <span>${docs.length}</span>` : ''}</button>`).join('');

    if (!docs.length) {
      grid.innerHTML = '<p class="no-results">No documents yet. Add a link to a quotation, contract, or receipt.</p>';
      return;
    }
    const shown = activeFilter === 'All' ? docs : docs.filter((d) => d.kind === activeFilter);
    const rows = shown.map((d) => {
      const linked = resolveLink(state, d.linkRef);
      const meta = [linked && `Linked to ${esc(linked)}`, d.notes && esc(d.notes)].filter(Boolean).join(' · ');
      return `<tr class="doc-row">
        <td class="doc-name"><span>${esc(d.title)}<small>${meta || 'Unlinked'}</small></span></td>
        <td><span class="doc-badge">${esc(d.kind)}</span></td>
        <td class="doc-actions">${d.url ? `<a href="${esc(d.url)}" target="_blank" rel="noopener noreferrer" class="text-button">Open ↗</a>` : '<span class="doc-nolink">no link</span>'}<button type="button" class="text-button" data-edit-doc="${d.id}">Edit</button><button type="button" class="text-button danger" data-delete-doc="${d.id}">Delete</button></td>
      </tr>`;
    }).join('');
    grid.innerHTML = `<div class="item-table-wrap"><table class="doc-table"><thead><tr><th>Document</th><th>Type</th><th>Link</th></tr></thead><tbody>${rows || '<tr><td colspan="3" class="no-results">Nothing in this view.</td></tr>'}</tbody></table></div>`;
  }

  function openModal(id) {
    editingId = id || null;
    const state = ctx.getState();
    form.querySelector('[name=kind]').innerHTML = DOC_KINDS.map((k) => `<option>${k}</option>`).join('');
    const doc = id ? state.documents.find((x) => x.id === id) : null;
    form.querySelector('[name=linkRef]').innerHTML = linkOptions(state, doc ? doc.linkRef : '');
    if (doc) {
      form.querySelector('.document-modal-title').textContent = 'Edit document';
      form.elements.title.value = doc.title;
      form.elements.url.value = doc.url;
      form.elements.kind.value = doc.kind;
      form.elements.notes.value = doc.notes || '';
    } else {
      form.querySelector('.document-modal-title').textContent = 'Add document';
      form.reset();
      form.querySelector('[name=linkRef]').innerHTML = linkOptions(state, '');
    }
    modal.showModal();
  }

  document.querySelector('#open-add-document').addEventListener('click', () => openModal(null));

  tabs.addEventListener('click', (e) => {
    const filter = e.target.closest('[data-docfilter]')?.dataset.docfilter;
    if (!filter) return;
    activeFilter = filter;
    render();
  });

  grid.addEventListener('click', (e) => {
    const editId = e.target.closest('[data-edit-doc]')?.dataset.editDoc;
    if (editId) { openModal(editId); return; }
    const deleteId = e.target.closest('[data-delete-doc]')?.dataset.deleteDoc;
    if (deleteId) {
      const d = ctx.getState().documents.find((x) => x.id === deleteId);
      if (confirm(`Delete "${d.title}"?`)) commit(deleteDoc(ctx.getState(), deleteId), `${d.title} removed.`);
    }
  });

  form.addEventListener('submit', (e) => {
    if (e.submitter?.value === 'cancel') return;
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    if (!data.title?.trim()) return;
    const state = ctx.getState();
    if (editingId) commit(updateDoc(state, editingId, { title: data.title, url: safeUrl((data.url || '').trim()), kind: data.kind, linkRef: data.linkRef || '', notes: data.notes || '' }), `${data.title} updated.`);
    else commit(addDoc(state, data), `${data.title} added.`);
    modal.close();
    form.reset();
    editingId = null;
  });

  return { render };
}
