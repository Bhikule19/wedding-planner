const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const compact = (number) => number >= 100000 ? `₹${(number / 100000).toFixed(number % 100000 ? 2 : 0)}L` : number >= 1000 ? `₹${Math.round(number / 1000)}k` : currency.format(number);
const defaultState = {
  categories: [
    { name: 'Venue & catering', budget: 360000, forecast: 310000, committed: 165000, paid: 45000, event: 'Shared' },
    { name: 'Photography', budget: 150000, forecast: 115000, committed: 0, paid: 0, event: 'Shared' },
    { name: 'Decor & flowers', budget: 140000, forecast: 160000, committed: 0, paid: 0, event: 'Reception' },
    { name: 'Outfits & jewellery', budget: 155000, forecast: 118000, committed: 60000, paid: 20000, event: 'Shared' },
    { name: 'Makeup & mehendi', budget: 70000, forecast: 56000, committed: 40000, paid: 0, event: 'Wedding' },
    { name: 'Music & entertainment', budget: 85000, forecast: 47000, committed: 0, paid: 0, event: 'Sangeet' },
    { name: 'Invitations & gifts', budget: 60000, forecast: 42000, committed: 0, paid: 0, event: 'Shared' },
    { name: 'Transport & stay', budget: 60000, forecast: 28000, committed: 0, paid: 0, event: 'Shared' },
    { name: 'Reserve / contingency', budget: 120000, forecast: 0, committed: 0, paid: 0, event: 'Shared', reserve: true }
  ],
  decisions: [
    { id: 1, title: 'Choose a photography team', category: 'Photography', event: 'Shared', deadline: 'By 28 Aug', urgent: true, estimate: 115000, status: 'open', candidates: ['Studio A · ₹1.05L', 'Studio B · ₹1.15L', 'Studio C · ₹1.28L'] },
    { id: 2, title: 'Set reception decor direction', category: 'Decor & flowers', event: 'Reception', deadline: 'By 31 Aug', urgent: true, estimate: 160000, status: 'shortlisted', candidates: ['Floral minimal · ₹1.35L', 'Citrus canopy · ₹1.60L', 'Stage-led · ₹1.85L'] },
    { id: 3, title: 'Decide on a live food counter', category: 'Music & entertainment', event: 'Sangeet', deadline: 'By 05 Sep', urgent: false, estimate: 22000, status: 'open', candidates: ['Paan counter · ₹15k', 'Chaat counter · ₹22k', 'Skip it · ₹0'] },
    { id: 4, title: 'Shortlist the reception outfit', category: 'Outfits & jewellery', event: 'Reception', deadline: 'By 08 Sep', urgent: false, estimate: 58000, status: 'open', candidates: ['Black bandhgala · ₹48k', 'Ivory tuxedo · ₹58k', 'Navy suit · ₹39k'] }
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
    { name: 'Haldi', date: '15 Dec 2026', budget: 65000, forecast: 51000, decisions: 0, items: 3 },
    { name: 'Sangeet', date: '16 Dec 2026', budget: 165000, forecast: 139000, decisions: 1, items: 5 },
    { name: 'Wedding', date: '17 Dec 2026', budget: 525000, forecast: 439000, decisions: 0, items: 7 },
    { name: 'Reception', date: '18 Dec 2026', budget: 245000, forecast: 287000, decisions: 2, items: 6 }
  ]
};
let state = JSON.parse(localStorage.getItem('vaibhav-wedding-plan')) || structuredClone(defaultState);
let activeFilter = 'open';

function save() { localStorage.setItem('vaibhav-wedding-plan', JSON.stringify(state)); }
function totals() { return state.categories.reduce((acc, c) => { acc.budget += c.budget; acc.forecast += c.forecast; acc.committed += c.committed; acc.paid += c.paid; return acc; }, { budget: 0, forecast: 0, committed: 0, paid: 0 }); }
function renderBudget() {
  const total = totals();
  document.querySelector('#budget-total').textContent = compact(total.budget);
  document.querySelector('#forecast-total').textContent = compact(total.forecast);
  document.querySelector('#committed-total').textContent = compact(total.committed);
  document.querySelector('#paid-total').textContent = compact(total.paid);
  document.querySelector('#forecast-detail').textContent = `${Math.round(total.forecast / total.budget * 100)}% of allocation`;
  document.querySelector('#committed-detail').textContent = `${Math.round(total.committed / total.budget * 100)}% of allocation`;
  const grid = document.querySelector('#category-grid');
  grid.innerHTML = state.categories.filter(c => !c.reserve).map(category => {
    const ratio = Math.min(category.forecast / category.budget * 100, 100);
    const over = category.forecast > category.budget;
    const isCommitted = category.committed > 0;
    return `<article class="category-card"><div class="category-top"><span class="category-name">${category.name}</span><span class="state">${over ? 'over forecast' : isCommitted ? 'part committed' : 'planning'}</span></div><div class="category-value">${compact(category.forecast)}</div><div class="category-meta"><span>of ${compact(category.budget)} allocated</span><span>${over ? `+${compact(category.forecast - category.budget)}` : `${Math.round(ratio)}%`}</span></div><div class="progress ${!over ? 'safe' : ''}"><span style="width:${ratio}%"></span></div></article>`;
  }).join('');
  const uncertain = state.decisions.filter(d => d.status !== 'decided').sort((a,b) => b.estimate - a.estimate).slice(0, 3);
  document.querySelector('#uncertainty-list').innerHTML = uncertain.map((item, index) => `<div class="uncertainty-row"><div><strong>${item.title}</strong><small>${item.event} · ${item.candidates.length} options in play</small></div><div class="range">up to ${compact(item.estimate)}</div><div class="range-bar"><span style="width:${[92, 74, 46][index]}%"></span></div></div>`).join('');
  const reserve = state.categories.find(c => c.reserve);
  document.querySelector('#reserve-total').textContent = compact(reserve.budget);
}
function renderDecisions() {
  const list = state.decisions.filter(d => activeFilter === 'all' || d.status === activeFilter || (activeFilter === 'open' && d.status === 'open'));
  const openCount = state.decisions.filter(d => d.status === 'open').length;
  document.querySelector('#decision-badge').textContent = openCount;
  document.querySelector('#open-count').textContent = openCount;
  document.querySelector('#decision-list').innerHTML = list.length ? list.map((d, i) => `<article class="decision-card"><div class="decision-number">0${i + 1}</div><div><div class="decision-title">${d.title}</div><div class="decision-context">${d.event} · ${d.category} · ${d.status === 'shortlisted' ? 'options shortlisted' : 'research still open'}</div><div class="candidate-pills">${d.candidates.map(c => `<span class="candidate-pill">${c}</span>`).join('')}</div></div><div class="decision-right"><div class="deadline ${d.urgent ? 'urgent' : ''}">${d.deadline}</div><div class="decision-cost">${compact(d.estimate)} forecast</div><button class="choose-button" data-decide="${d.id}">Make a choice →</button></div></article>`).join('') : '<p class="no-results">Nothing in this view.</p>';
}
function renderEvents() {
  document.querySelector('#event-grid').innerHTML = state.events.map((event, i) => `<article class="event-card" data-index="0${i + 1}"><h2>${event.name}</h2><div class="event-date">${event.date}</div><div class="event-numbers"><div><span>Allocated</span><strong>${compact(event.budget)}</strong></div><div><span>Forecast</span><strong>${compact(event.forecast)}</strong></div></div><div class="event-open"><b>${event.decisions} open decision${event.decisions === 1 ? '' : 's'}</b> · ${event.items} linked planning items</div></article>`).join('');
}
function renderItems() { document.querySelector('#item-table').innerHTML = state.items.map(item => `<tr><td>${item.name}<br><small>${item.type}</small></td><td>${item.event}</td><td><span class="stage">${item.stage}</span></td><td>${compact(item.forecast || 0)}</td><td>${item.action}</td></tr>`).join(''); }
function render() { renderBudget(); renderDecisions(); renderEvents(); renderItems(); }
function showView(view) { document.querySelectorAll('.view').forEach(el => el.classList.toggle('active', el.id === `${view}-view`)); document.querySelectorAll('.nav-link').forEach(el => el.classList.toggle('active', el.dataset.view === view)); document.querySelector('#view-kicker').textContent = view === 'budget' ? 'MASTER PLAN' : view.toUpperCase(); }
function toast(message) { const el = document.querySelector('#toast'); el.textContent = message; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2600); }
document.querySelectorAll('[data-view]').forEach(link => link.addEventListener('click', () => showView(link.dataset.view)));
document.querySelectorAll('[data-go]').forEach(button => button.addEventListener('click', () => { showView(button.dataset.go); location.hash = button.dataset.go; }));
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => { activeFilter = button.dataset.filter; document.querySelectorAll('[data-filter]').forEach(tab => tab.classList.toggle('selected', tab === button)); renderDecisions(); }));
document.querySelector('#decision-list').addEventListener('click', event => { const id = Number(event.target.dataset.decide); if (!id) return; const decision = state.decisions.find(d => d.id === id); decision.status = 'decided'; const matching = state.items.find(item => item.name.toLowerCase().includes(decision.title.replace('Choose a ', '').replace('Set ', '').replace('Decide on a ', '').replace('Shortlist the ', '').split(' ')[0].toLowerCase())); if (matching) matching.stage = 'Decided'; save(); render(); toast(`“${decision.title}” marked decided. It is still not a booking.`); });
const modal = document.querySelector('#item-modal');
document.querySelector('#open-add-modal').addEventListener('click', () => modal.showModal());
document.querySelector('#open-idea-modal').addEventListener('click', () => { modal.querySelector('[name=name]').placeholder = 'e.g. Floral entrance reference'; modal.showModal(); });
document.querySelector('#item-form').addEventListener('submit', event => { event.preventDefault(); const form = new FormData(event.target); const item = { name: form.get('name'), type: form.get('type'), event: form.get('event'), stage: 'Researching', forecast: Number(form.get('forecast')) || 0, action: form.get('action') }; state.items.unshift(item); const category = { name: item.name, budget: Number(form.get('budget')), forecast: item.forecast, committed: 0, paid: 0, event: item.event }; state.categories.splice(-1, 0, category); state.decisions.unshift({ id: Date.now(), title: `Decide on ${item.name}`, category: item.name, event: item.event, deadline: 'No deadline set', urgent: false, estimate: item.forecast, status: 'open', candidates: ['Research first option', 'Research second option'] }); save(); render(); event.target.reset(); modal.close(); toast(`${item.name} added as an open planning decision.`); });
document.querySelector('#reset-data').addEventListener('click', () => { if (!confirm('Reset all locally saved planning data to the original demo?')) return; state = structuredClone(defaultState); save(); render(); toast('Demo data restored.'); });
window.addEventListener('hashchange', () => { const view = location.hash.slice(1); if (['budget','decisions','events','items','notes'].includes(view)) showView(view); });
render();
