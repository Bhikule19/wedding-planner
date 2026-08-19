import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import { GoogleAuthProvider, getAuth, getRedirectResult, onAuthStateChanged, signInWithRedirect, signOut } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import { doc, getDoc, getFirestore, setDoc } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { firebaseConfig, allowedEmail, planDocumentId } from './firebase-config.js';
import { compact } from './format.js';
import { createVendors, VENDOR_SEED } from './vendors.js';
import { createPayments, PAYMENT_SEED } from './payments.js';
import { createShopping, SHOPPING_SEED } from './shopping.js';
import { createAddons, ADDON_SEED } from './addons.js';
import { createTasks, TASK_SEED } from './tasks.js';
import { createEvents } from './events.js';
import { createDecisions, normalizeDecision, isUndecided } from './decisions.js';
import { createGuests, GUEST_SEED } from './guests.js';
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
  items: [
    { name: 'Photography team', type: 'Vendor', event: 'Shared', stage: 'Shortlisted', forecast: 115000, action: 'Compare final quotations' },
    { name: 'Reception decor', type: 'Vendor', event: 'Reception', stage: 'Shortlisted', forecast: 160000, action: 'Approve one direction' },
    { name: 'Reception outfit', type: 'Shopping', event: 'Reception', stage: 'Researching', forecast: 58000, action: 'Book two trials' },
    { name: 'Live food counter', type: 'Add-on', event: 'Sangeet', stage: 'Considering', forecast: 22000, action: 'Check venue space' },
    { name: 'Mehendi artist', type: 'Vendor', event: 'Wedding', stage: 'Booked', forecast: 40000, action: 'Confirm timing' },
    { name: 'Invitation suite', type: 'Shopping', event: 'Shared', stage: 'Researching', forecast: 26000, action: 'Request paper samples' }
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
  guests: GUEST_SEED
};
let state = JSON.parse(localStorage.getItem('wedding-plan')) || structuredClone(defaultState);
if (!state.vendors) state.vendors = structuredClone(VENDOR_SEED);
if (!state.payments) state.payments = structuredClone(PAYMENT_SEED);
if (!state.shopping) state.shopping = structuredClone(SHOPPING_SEED);
if (!state.addons) state.addons = structuredClone(ADDON_SEED);
if (!state.tasks) state.tasks = structuredClone(TASK_SEED);
if (Array.isArray(state.decisions)) state.decisions = state.decisions.map(normalizeDecision);
if (!state.guests) state.guests = structuredClone(GUEST_SEED);
let auth = null;
let db = null;
let user = null;
let saving = false;
const authButton = document.querySelector('#auth-button');

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
    return `<article class="category-card"><div class="category-top"><span class="category-name">${category.name}</span><span class="state">${over ? 'over forecast' : isCommitted ? 'part committed' : 'planning'}</span></div><div class="category-value">${compact(category.forecast)}</div><div class="category-meta"><span>of ${compact(category.budget)} allocated</span><span>${over ? `+${compact(category.forecast - category.budget)}` : `${Math.round(ratio)}%`}</span></div><div class="progress ${!over ? 'safe' : ''}"><span style="width:${ratio}%"></span></div></article>`;
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
function renderItems() { document.querySelector('#item-table').innerHTML = state.items.map(item => `<tr><td>${item.name}<br><small>${item.type}</small></td><td>${item.event}</td><td><span class="stage">${item.stage}</span></td><td>${compact(item.forecast || 0)}</td><td>${item.action}</td></tr>`).join(''); }
function render() { renderBudget(); renderItems(); decisionsModule.render(); vendorsModule.render(); paymentsModule.render(); shoppingModule.render(); addonsModule.render(); tasksModule.render(); eventsModule.render(); guestsModule.render(); }
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
          state = snapshot.data();
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
const modal = document.querySelector('#item-modal');
document.querySelector('#open-add-modal').addEventListener('click', () => modal.showModal());
document.querySelector('#open-idea-modal').addEventListener('click', () => { modal.querySelector('[name=name]').placeholder = 'e.g. Floral entrance reference'; modal.showModal(); });
document.querySelector('#item-form').addEventListener('submit', event => { event.preventDefault(); const form = new FormData(event.target); const item = { name: form.get('name'), type: form.get('type'), event: form.get('event'), stage: 'Researching', forecast: Number(form.get('forecast')) || 0, action: form.get('action') }; state.items.unshift(item); const category = { name: item.name, budget: Number(form.get('budget')), forecast: item.forecast, committed: 0, paid: 0, event: item.event }; state.categories.splice(-1, 0, category); state.decisions.unshift({ id: Date.now(), title: `Decide on ${item.name}`, category: item.name, event: item.event, deadline: 'No deadline set', urgent: false, estimate: item.forecast, status: 'open', candidates: ['Research first option', 'Research second option'] }); save(); render(); event.target.reset(); modal.close(); toast(`${item.name} added as an open planning decision.`); });
document.querySelector('#reset-data').addEventListener('click', () => { if (!confirm('Reset all locally saved planning data to the original demo?')) return; state = structuredClone(defaultState); save(); render(); toast('Demo data restored.'); });
authButton.addEventListener('click', connectCloud);
window.addEventListener('hashchange', () => { const view = location.hash.slice(1); if (['budget','decisions','vendors','shopping','addons','tasks','payments','events','guests','items','notes'].includes(view)) showView(view); });
const vendorsModule = createVendors({ getState: () => state, setState, render, toast });
const paymentsModule = createPayments({ getState: () => state, setState, render, toast });
const shoppingModule = createShopping({ getState: () => state, setState, render, toast });
const addonsModule = createAddons({ getState: () => state, setState, render, toast });
const tasksModule = createTasks({ getState: () => state, setState, render, toast });
const eventsModule = createEvents({ getState: () => state, setState, render, toast });
const decisionsModule = createDecisions({ getState: () => state, setState, render, toast });
const guestsModule = createGuests({ getState: () => state, setState, render, toast });
render();
initializeCloud();
