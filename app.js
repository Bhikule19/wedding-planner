import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import { GoogleAuthProvider, getAuth, getRedirectResult, onAuthStateChanged, signInWithRedirect, signOut } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import { doc, getDoc, getFirestore, setDoc } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { firebaseConfig, allowedEmail, planDocumentId } from './firebase-config.js';
import { compact, formatDate } from './format.js';
import { createVendors, VENDOR_SEED } from './vendors.js';
import { createPayments, PAYMENT_SEED } from './payments.js';
import { createShopping, SHOPPING_SEED } from './shopping.js';
import { createAddons, ADDON_SEED } from './addons.js';
import { createTasks, TASK_SEED } from './tasks.js';
import { createEvents } from './events.js';
import { createDecisions, normalizeDecision, isUndecided } from './decisions.js';
import { createGuests, GUEST_SEED } from './guests.js';
import { createIdeas, IDEA_SEED } from './ideas.js';
import { createSearch } from './search.js';
import { createSettings, DEFAULT_SETTINGS } from './settings.js';
import { createDocuments, DOCUMENT_SEED } from './documents.js';
const defaultState = {
  categories: [
    { name: 'Venue & catering', budget: 360000, forecast: 310000, committed: 165000, paid: 45000, event: 'Shared' },
    { name: 'Photography', budget: 150000, forecast: 115000, committed: 0, paid: 0, event: 'Shared' },
    { name: 'Decor & flowers', budget: 140000, forecast: 160000, committed: 0, paid: 0, event: 'Reception' },
    { name: 'Outfits & jewellery', budget: 155000, forecast: 118000, committed: 66500, paid: 20000, event: 'Shared' },
    { name: 'Makeup & mehendi', budget: 70000, forecast: 56000, committed: 40000, paid: 0, event: 'Wedding' },
    { name: 'Music & entertainment', budget: 85000, forecast: 47000, committed: 0, paid: 0, event: 'Sangeet' },
    { name: 'Invitations & gifts', budget: 60000, forecast: 42000, committed: 0, paid: 0, event: 'Shared' },
    { name: 'Transport & stay', budget: 60000, forecast: 28000, committed: 0, paid: 0, event: 'Shared' },
    { name: 'Add-ons & experiences', budget: 90000, forecast: 55000, committed: 0, paid: 0, event: 'Shared' },
    { name: 'Reserve / contingency', budget: 120000, forecast: 0, committed: 0, paid: 0, event: 'Shared', reserve: true }
  ],
  decisions: [
    { id: 1, title: 'Choose a photography team', category: 'Photography', event: 'Shared', deadline: '2026-08-28', estimate: 128000, status: 'Open', finalChoice: '', decisionReason: '', decisionDate: '', notes: '', options: [
      { label: 'Studio A', price: 105000, score: 8.5, pros: 'Best price, candid style', cons: 'Album basic' },
      { label: 'Studio B', price: 115000, score: 7.8, pros: 'Strong traditional', cons: 'Slower delivery' },
      { label: 'Studio C', price: 128000, score: 9.1, pros: 'Premium album', cons: 'Over budget' }
    ] },
    { id: 2, title: 'Set reception decor direction', category: 'Decor & flowers', event: 'Reception', deadline: '2026-08-31', estimate: 185000, status: 'Shortlisted', finalChoice: '', decisionReason: '', decisionDate: '', notes: '', options: [
      { label: 'Floral minimal', price: 135000, score: 7.5, pros: 'Elegant, on budget', cons: '' },
      { label: 'Citrus canopy', price: 160000, score: 8, pros: 'Distinctive', cons: '' },
      { label: 'Stage-led', price: 185000, score: 8.4, pros: 'High impact', cons: 'Expensive' }
    ] },
    { id: 3, title: 'Decide on a live food counter', category: 'Add-ons & experiences', event: 'Sangeet', deadline: '2026-09-05', estimate: 22000, status: 'Open', finalChoice: '', decisionReason: '', decisionDate: '', notes: '', options: [
      { label: 'Paan counter', price: 15000, score: 0, pros: '', cons: '' },
      { label: 'Chaat counter', price: 22000, score: 0, pros: '', cons: '' },
      { label: 'Skip it', price: 0, score: 0, pros: 'Save money', cons: '' }
    ] },
    { id: 4, title: 'Shortlist the reception outfit', category: 'Outfits & jewellery', event: 'Reception', deadline: '2026-09-08', estimate: 58000, status: 'Open', finalChoice: '', decisionReason: '', decisionDate: '', notes: '', options: [
      { label: 'Black bandhgala', price: 48000, score: 0, pros: '', cons: '' },
      { label: 'Ivory tuxedo', price: 58000, score: 0, pros: '', cons: '' },
      { label: 'Navy suit', price: 39000, score: 0, pros: '', cons: '' }
    ] }
  ],
  events: [
    { name: 'Haldi', date: '15 Dec 2026', startTime: '10:00', endTime: '13:00', venue: 'Home lawn', guestCount: 80, budget: 65000, forecast: 51000, notes: '' },
    { name: 'Sangeet', date: '16 Dec 2026', startTime: '19:00', endTime: '23:00', venue: 'Grand Ballroom', guestCount: 250, budget: 165000, forecast: 139000, notes: '' },
    { name: 'Wedding', date: '17 Dec 2026', startTime: '20:00', endTime: '23:30', venue: 'Riverside Lawns', guestCount: 400, budget: 525000, forecast: 439000, notes: '' },
    { name: 'Reception', date: '18 Dec 2026', startTime: '19:30', endTime: '23:30', venue: 'Grand Ballroom', guestCount: 450, budget: 245000, forecast: 287000, notes: '' }
  ],
  vendors: VENDOR_SEED,
  payments: PAYMENT_SEED,
  shopping: SHOPPING_SEED,
  addons: ADDON_SEED,
  tasks: TASK_SEED,
  guests: GUEST_SEED,
  ideas: IDEA_SEED,
  documents: DOCUMENT_SEED,
  settings: DEFAULT_SETTINGS
};
function hydrate(raw) {
  const base = raw && typeof raw === 'object' ? { ...raw } : structuredClone(defaultState);
  base.categories = Array.isArray(base.categories) ? base.categories : structuredClone(defaultState.categories);
  base.events = Array.isArray(base.events) ? base.events : structuredClone(defaultState.events);
  base.vendors = Array.isArray(base.vendors) ? base.vendors : structuredClone(VENDOR_SEED);
  base.payments = Array.isArray(base.payments) ? base.payments : structuredClone(PAYMENT_SEED);
  base.shopping = Array.isArray(base.shopping) ? base.shopping : structuredClone(SHOPPING_SEED);
  base.addons = Array.isArray(base.addons) ? base.addons : structuredClone(ADDON_SEED);
  base.tasks = Array.isArray(base.tasks) ? base.tasks : structuredClone(TASK_SEED);
  base.guests = Array.isArray(base.guests) ? base.guests : structuredClone(GUEST_SEED);
  base.ideas = Array.isArray(base.ideas) ? base.ideas : structuredClone(IDEA_SEED);
  base.documents = Array.isArray(base.documents) ? base.documents : structuredClone(DOCUMENT_SEED);
  base.settings = { ...DEFAULT_SETTINGS, ...(base.settings && typeof base.settings === 'object' ? base.settings : {}) };
  base.decisions = (Array.isArray(base.decisions) ? base.decisions : structuredClone(defaultState.decisions)).map(normalizeDecision);
  return base;
}
let state = hydrate(JSON.parse(localStorage.getItem('wedding-plan')));
let auth = null;
let db = null;
let user = null;
let saving = false;
const authButton = document.querySelector('#auth-button');
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function syncLabel(kind, label) { authButton.className = `sync-status ${kind}`; authButton.innerHTML = `<span></span>${label}`; }
function updateSyncUi() { if (!firebaseConfig) syncLabel('offline', 'Set up sync'); else if (saving) syncLabel('saving', 'Saving…'); else if (user) syncLabel('online', 'Synced · sign out'); else syncLabel('offline', 'Sign in to sync'); }
function save() {
  localStorage.setItem('wedding-plan', JSON.stringify(state));
  if (!db || !user) return;
  saving = true;
  updateSyncUi();
  setDoc(doc(db, 'weddings', planDocumentId), { ...state, updatedAt: new Date().toISOString(), owner: user.email })
    .catch(() => { syncLabel('error', 'Sync failed'); toast('Could not sync. Your browser copy is still saved.'); })
    .finally(() => { saving = false; updateSyncUi(); });
}
function totals() { return state.categories.reduce((acc, c) => { acc.budget += c.budget; acc.forecast += c.forecast; acc.committed += c.committed; acc.paid += c.paid; return acc; }, { budget: 0, forecast: 0, committed: 0, paid: 0 }); }
function renderBudget() {
  const total = totals();
  document.querySelector('#budget-total').textContent = compact(total.budget);
  document.querySelector('#forecast-total').textContent = compact(total.forecast);
  document.querySelector('#committed-total').textContent = compact(total.committed);
  document.querySelector('#paid-total').textContent = compact(total.paid);
  document.querySelector('#forecast-detail').textContent = `${Math.round(total.forecast / total.budget * 100)}% of allocation`;
  document.querySelector('#committed-detail').textContent = `${Math.round(total.committed / total.budget * 100)}% of allocation`;
  document.querySelector('#category-count-label').textContent = `Across ${state.categories.length} planned categories`;
  const grid = document.querySelector('#category-grid');
  grid.innerHTML = state.categories.filter(c => !c.reserve).map(category => {
    const ratio = Math.min(category.forecast / category.budget * 100, 100);
    const over = category.forecast > category.budget;
    const isCommitted = category.committed > 0;
    const paidNote = category.committed || category.paid ? `<div class="category-sub">${compact(category.committed)} committed · ${compact(category.paid)} paid</div>` : '';
    return `<article class="category-card" data-cat-edit="${esc(category.name)}" role="button" tabindex="0"><div class="category-top"><span class="category-name">${esc(category.name)}</span><span class="state">${over ? 'over forecast' : isCommitted ? 'part committed' : 'planning'}</span></div><div class="category-value">${compact(category.forecast)}</div><div class="category-meta"><span>of ${compact(category.budget)} allocated</span><span>${over ? `+${compact(category.forecast - category.budget)}` : `${Math.round(ratio)}%`}</span></div><div class="progress ${!over ? 'safe' : ''}"><span style="width:${ratio}%"></span></div>${paidNote}</article>`;
  }).join('');
  const undecided = state.decisions.filter(isUndecided);
  const uncertain = [...undecided].sort((a,b) => b.estimate - a.estimate).slice(0, 3);
  document.querySelector('#uncertainty-list').innerHTML = uncertain.length ? uncertain.map((item, index) => `<div class="uncertainty-row"><div><strong>${item.title}</strong><small>${item.event} · ${item.options.length} options in play</small></div><div class="range">up to ${compact(item.estimate)}</div><div class="range-bar"><span style="width:${[92, 74, 46][index]}%"></span></div></div>`).join('') : '<p class="no-results">No open decisions—everything is decided.</p>';
  const undecidedTotal = undecided.reduce((sum, d) => sum + (d.estimate || 0), 0);
  const attention = document.querySelector('#attention-strip strong');
  const attentionText = document.querySelector('#attention-text');
  if (undecided.length) {
    attention.textContent = `${compact(undecidedTotal)} of likely cost is still undecided.`;
    attentionText.textContent = `${undecided.slice(0, 2).map(d => d.title.replace(/^(Choose|Set|Decide on|Shortlist)( a| the| an)? /i, '')).join(' and ')} need a choice before committing.`;
  } else {
    attention.textContent = 'Every decision is made.';
    attentionText.textContent = 'Nothing is waiting on a choice right now.';
  }
  const reserve = state.categories.find(c => c.reserve);
  document.querySelector('#reserve-total').textContent = compact(reserve.budget);
}
function renderChrome() {
  const s = state.settings || {};
  const names = (s.coupleNames || '').trim() || 'Our wedding';
  document.querySelector('#brand-name').textContent = names;
  document.querySelector('#brand-mark').textContent = (names[0] || 'W').toUpperCase();
  const daysEl = document.querySelector('#countdown-days');
  const dateEl = document.querySelector('#countdown-date');
  const wd = s.weddingDate ? new Date(s.weddingDate) : null;
  if (wd && !Number.isNaN(wd.getTime())) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days = Math.round((wd.getTime() - today.getTime()) / 86400000);
    daysEl.textContent = days > 0 ? `${days} days` : days === 0 ? 'Today!' : `${Math.abs(days)} days ago`;
    dateEl.textContent = formatDate(s.weddingDate);
  } else {
    daysEl.textContent = '—';
    dateEl.textContent = 'Set a date';
  }
  document.querySelector('#crumb-now').textContent = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}
function renderPulse() {
  const now = Date.now();
  const committingVend = ['Selected', 'Booked', 'Completed'];
  const committingShop = ['Purchased', 'Delivered', 'Alteration Required', 'Completed'];
  const openTask = t => t.status !== 'Completed' && t.status !== 'Cancelled';
  const selVend = state.vendors.filter(v => committingVend.includes(v.status)).length;
  const purchased = state.shopping.filter(s => committingShop.includes(s.status)).length;
  const approvedAdd = state.addons.filter(a => (a.committedAmount || 0) > 0).length;
  const openTasks = state.tasks.filter(openTask).length;
  const overdueTasks = state.tasks.filter(t => openTask(t) && t.dueDate && new Date(t.dueDate).getTime() < now).length;
  const confirmedGuests = state.guests.filter(g => g.rsvp === 'Confirmed').length;
  const outstanding = state.payments.filter(p => p.status !== 'Cancelled').reduce((s, p) => s + Math.max((p.amount || 0) - (p.appliedAmount || 0), 0), 0);
  const overduePay = state.payments.filter(p => p.status !== 'Paid' && p.status !== 'Cancelled' && (p.status === 'Overdue' || (p.dueDate && new Date(p.dueDate).getTime() < now))).length;
  const tiles = [
    { view: 'vendors', label: 'Vendors', big: `${selVend}/${state.vendors.length}`, sub: 'selected / candidates' },
    { view: 'shopping', label: 'Shopping', big: `${purchased}/${state.shopping.length}`, sub: 'purchased / items' },
    { view: 'addons', label: 'Add-ons', big: `${approvedAdd}/${state.addons.length}`, sub: 'approved / ideas' },
    { view: 'tasks', label: 'Tasks', big: `${openTasks}`, sub: overdueTasks ? `${overdueTasks} overdue` : 'open', alert: overdueTasks > 0 },
    { view: 'guests', label: 'Guests', big: `${confirmedGuests}/${state.guests.length}`, sub: 'confirmed / invited' },
    { view: 'payments', label: 'Payments', big: compact(outstanding), sub: overduePay ? `${overduePay} overdue` : 'outstanding', alert: overduePay > 0 }
  ];
  document.querySelector('#dashboard-pulse').innerHTML = tiles.map(t => `<button class="pulse-tile ${t.alert ? 'alert' : ''}" data-go="${t.view}"><span>${t.label}</span><strong>${t.big}</strong><small>${t.sub}</small></button>`).join('');
}
function renderUpcoming() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const t0 = today.getTime();
  const items = [];
  const push = (dateStr, label, kind, view) => { const d = new Date(dateStr).getTime(); if (!Number.isNaN(d)) items.push({ d, date: dateStr, label, kind, view }); };
  state.payments.forEach(p => { if (p.status !== 'Paid' && p.status !== 'Cancelled' && p.dueDate) push(p.dueDate, p.description, 'Payment', 'payments'); });
  state.tasks.forEach(t => { if (t.status !== 'Completed' && t.status !== 'Cancelled' && t.dueDate) push(t.dueDate, t.name, 'Task', 'tasks'); });
  state.shopping.forEach(s => { if (s.trialDate) push(s.trialDate, `${s.name} trial`, 'Trial', 'shopping'); });
  state.decisions.filter(isUndecided).forEach(dec => { if (dec.deadline) push(dec.deadline, dec.title, 'Decision', 'decisions'); });
  state.events.forEach(e => { if (e.date) push(e.date, e.name, 'Event', 'events'); });
  const upcoming = items.filter(i => i.d >= t0).sort((a, b) => a.d - b.d).slice(0, 7);
  document.querySelector('#upcoming-list').innerHTML = upcoming.length
    ? upcoming.map(i => `<button class="upcoming-row" data-go="${i.view}"><span class="up-date">${formatDate(i.date)}</span><span class="up-label">${esc(i.label)}</span><span class="up-kind">${i.kind}</span></button>`).join('')
    : '<p class="no-results">Nothing scheduled ahead. Add due dates to payments, tasks, and decisions.</p>';
}
function render() { renderChrome(); renderBudget(); renderPulse(); renderUpcoming(); decisionsModule.render(); vendorsModule.render(); paymentsModule.render(); shoppingModule.render(); addonsModule.render(); tasksModule.render(); eventsModule.render(); guestsModule.render(); ideasModule.render(); documentsModule.render(); settingsModule.render(); }
function setState(next) { state = next; save(); render(); }
function showView(view) { document.querySelectorAll('.view').forEach(el => el.classList.toggle('active', el.id === `${view}-view`)); document.querySelectorAll('.nav-link').forEach(el => el.classList.toggle('active', el.dataset.view === view)); document.querySelector('#view-kicker').textContent = view === 'budget' ? 'MASTER PLAN' : view.toUpperCase(); }
function toast(message) { const el = document.querySelector('#toast'); el.textContent = message; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2600); }
async function connectCloud() {
  if (!firebaseConfig) { toast('Add your Firebase config in firebase-config.js first.'); return; }
  if (user) { await signOut(auth); return; }
  syncLabel('saving', 'Redirecting to Google…');
  try { await signInWithRedirect(auth, new GoogleAuthProvider()); }
  catch (error) { syncLabel('error', 'Sign-in failed'); toast(`Sign-in failed: ${error.code || 'unknown error'}`); }
}
function initializeCloud() {
  if (!firebaseConfig) { updateSyncUi(); return; }
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  getRedirectResult(auth).catch(error => {
    syncLabel('error', 'Sign-in failed');
    toast(`Sign-in failed: ${error.code || 'unknown error'}`);
  });
  onAuthStateChanged(auth, async signedInUser => {
    user = signedInUser;
    if (user && allowedEmail !== 'YOUR_GOOGLE_EMAIL@example.com' && user.email !== allowedEmail) {
      toast(`This plan is restricted to ${allowedEmail}.`);
      await signOut(auth);
      return;
    }
    if (user) {
      try {
        const snapshot = await getDoc(doc(db, 'weddings', planDocumentId));
        if (snapshot.exists()) {
          state = hydrate(snapshot.data());
          localStorage.setItem('wedding-plan', JSON.stringify(state));
          render();
          toast('Wedding plan loaded from Firestore.');
        } else {
          save();
          toast('Your first shared wedding plan is ready.');
        }
      } catch { syncLabel('error', 'Sync unavailable'); toast('Firestore could not be reached.'); }
    }
    updateSyncUi();
  });
  updateSyncUi();
}
document.querySelectorAll('[data-view]').forEach(link => link.addEventListener('click', () => showView(link.dataset.view)));
document.querySelectorAll('[data-go]').forEach(button => button.addEventListener('click', () => { showView(button.dataset.go); location.hash = button.dataset.go; }));
['#dashboard-pulse', '#upcoming-list'].forEach(sel => document.querySelector(sel).addEventListener('click', e => { const go = e.target.closest('[data-go]')?.dataset.go; if (go) { showView(go); location.hash = go; } }));

/* --- Budget category management --- */
function remapCategoryRefs(next, oldName, newName) {
  if (oldName === newName) return next;
  return {
    ...next,
    vendors: (next.vendors || []).map(v => v.category === oldName ? { ...v, category: newName } : v),
    shopping: (next.shopping || []).map(s => s.category === oldName ? { ...s, category: newName } : s),
    addons: (next.addons || []).map(a => a.budgetCategory === oldName ? { ...a, budgetCategory: newName } : a),
    payments: (next.payments || []).map(p => p.category === oldName ? { ...p, category: newName } : p)
  };
}
const budgetModal = document.querySelector('#budget-modal');
const budgetForm = document.querySelector('#budget-form');
let editingCategory = null;
function openBudgetModal(name) {
  editingCategory = name || null;
  const cat = name ? state.categories.find(c => c.name === name) : null;
  const del = document.querySelector('#delete-category');
  const committedNote = budgetForm.querySelector('.budget-committed-note');
  const renameNote = budgetForm.querySelector('.budget-rename-note');
  budgetForm.querySelector('.budget-modal-title').textContent = cat ? 'Edit category' : 'Add category';
  if (cat) {
    budgetForm.elements.name.value = cat.name;
    budgetForm.elements.budget.value = cat.budget || '';
    budgetForm.elements.forecast.value = cat.forecast || '';
    budgetForm.elements.event.value = cat.event || 'Shared';
    const locked = (cat.committed || 0) + (cat.paid || 0) > 0;
    committedNote.textContent = locked ? `${compact(cat.committed)} committed · ${compact(cat.paid)} paid (auto-tracked, not editable here).` : '';
    renameNote.style.display = '';
    del.hidden = !!cat.reserve;
    del.disabled = locked;
    del.textContent = locked ? "Can't delete — has committed/paid" : 'Delete category';
  } else {
    budgetForm.reset();
    committedNote.textContent = '';
    renameNote.style.display = 'none';
    del.hidden = true;
  }
  budgetModal.showModal();
}
document.querySelector('#open-add-category').addEventListener('click', () => openBudgetModal(null));
document.querySelector('#edit-reserve').addEventListener('click', () => { const r = state.categories.find(c => c.reserve); if (r) openBudgetModal(r.name); });
document.querySelector('#category-grid').addEventListener('click', e => { const card = e.target.closest('[data-cat-edit]'); if (card) openBudgetModal(card.dataset.catEdit); });
document.querySelector('#category-grid').addEventListener('keydown', e => { const card = e.target.closest('[data-cat-edit]'); if (card && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openBudgetModal(card.dataset.catEdit); } });
document.querySelector('#delete-category').addEventListener('click', () => {
  if (!editingCategory) return;
  const cat = state.categories.find(c => c.name === editingCategory);
  if (!cat || cat.reserve || (cat.committed || 0) + (cat.paid || 0) > 0) return;
  if (!confirm(`Delete "${cat.name}"?`)) return;
  setState({ ...state, categories: state.categories.filter(c => c.name !== editingCategory) });
  toast(`${cat.name} removed.`);
  budgetModal.close();
  editingCategory = null;
});
budgetForm.addEventListener('submit', e => {
  if (e.submitter?.value === 'cancel') return;
  e.preventDefault();
  const data = Object.fromEntries(new FormData(budgetForm));
  const name = (data.name || '').trim();
  if (!name) return;
  const budget = Number(data.budget) || 0;
  const forecast = Number(data.forecast) || 0;
  const clash = state.categories.some(c => c.name === name && c.name !== editingCategory);
  if (clash) { toast('A category with that name already exists.'); return; }
  if (editingCategory) {
    let next = { ...state, categories: state.categories.map(c => c.name === editingCategory ? { ...c, name, budget, forecast, event: data.event } : c) };
    next = remapCategoryRefs(next, editingCategory, name);
    setState(next);
    toast(`${name} updated.`);
  } else {
    const newCat = { name, budget, forecast, committed: 0, paid: 0, event: data.event };
    const reserveIdx = state.categories.findIndex(c => c.reserve);
    const categories = [...state.categories];
    categories.splice(reserveIdx >= 0 ? reserveIdx : categories.length, 0, newCat);
    setState({ ...state, categories });
    toast(`${name} added.`);
  }
  budgetModal.close();
  budgetForm.reset();
  editingCategory = null;
});
authButton.addEventListener('click', connectCloud);
window.addEventListener('hashchange', () => { const view = location.hash.slice(1); if (['budget','decisions','vendors','shopping','addons','tasks','payments','events','guests','ideas','documents','settings'].includes(view)) showView(view); });
const vendorsModule = createVendors({ getState: () => state, setState, render, toast });
const paymentsModule = createPayments({ getState: () => state, setState, render, toast });
const shoppingModule = createShopping({ getState: () => state, setState, render, toast });
const addonsModule = createAddons({ getState: () => state, setState, render, toast });
const tasksModule = createTasks({ getState: () => state, setState, render, toast });
const eventsModule = createEvents({ getState: () => state, setState, render, toast });
const decisionsModule = createDecisions({ getState: () => state, setState, render, toast });
const guestsModule = createGuests({ getState: () => state, setState, render, toast });
const ideasModule = createIdeas({ getState: () => state, setState, render, toast });
const documentsModule = createDocuments({ getState: () => state, setState, render, toast });
const settingsModule = createSettings({ getState: () => state, setState, toast, importData: raw => setState(hydrate(raw)), resetData: () => setState(hydrate(null)) });
createSearch({ getState: () => state, setState, render, toast });
render();
initializeCloud();
