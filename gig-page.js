// Page behaviour for gig.html: keep the log of shifts, and show what is left.
// The sums are in gig.js; this file reads the form, keeps the log in this
// browser's own storage, and draws the result. Nothing is sent anywhere.
'use strict';
(function () {
  const G = window.Gig;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const SHIFT_FIELDS = ['hours', 'miles', 'jobs', 'pay', 'tips', 'other'];

  let shifts = [];            // the log
  let settings = { ...G.DEFAULTS };
  let period = 'all';
  let showingExample = false; // example shifts are shown, never saved

  // ── Storage: this browser, this device ───────────────────────────────────
  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem('gig-shifts') || '[]');
      if (Array.isArray(saved)) shifts = saved;
      settings = G.settingsOf(JSON.parse(localStorage.getItem('gig-settings') || '{}'));
    } catch (_) { /* storage is unavailable or unreadable: start empty */ }
  }
  function save() {
    if (showingExample) return;
    try {
      localStorage.setItem('gig-shifts', JSON.stringify(shifts));
      localStorage.setItem('gig-settings', JSON.stringify(settings));
      $('save-note').textContent = '';
    } catch (_) { $('save-note').textContent = 'This browser is not letting the page save. Your log will be lost when you close it, so download the spreadsheet before you go.'; }
  }

  // ── Numbers ──────────────────────────────────────────────────────────────
  const parse = (text) => { const v = parseFloat(String(text).replace(/[^0-9.]/g, '')); return Number.isFinite(v) ? v : 0; };
  const money = (v) => `${v < 0 ? '-' : ''}$${Math.abs(v).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  const whole = (v) => `${v < 0 ? '-' : ''}$${Math.round(Math.abs(v)).toLocaleString('en-US')}`;
  const count = (v) => (Number.isInteger(v) ? v.toLocaleString('en-US') : (+v.toFixed(1)).toLocaleString('en-US'));
  const cents = (v) => `${Math.round(v * 100)} cents`;

  // ── An example week, so the page can be seen working before anything is typed ──
  function exampleWeek() {
    const day = (back) => { const d = new Date(); d.setDate(d.getDate() - back); return G.iso(d); };
    return [
      { date: day(4), what: 'deliveries', hours: 4.5, miles: 62, jobs: 11, pay: 48, tips: 39, other: 0 },
      { date: day(3), what: 'deliveries', hours: 5, miles: 71, jobs: 13, pay: 55, tips: 44, other: 3 },
      { date: day(2), what: 'rides', hours: 6, miles: 118, jobs: 14, pay: 132, tips: 21, other: 6.5 },
      { date: day(1), what: 'deliveries', hours: 3.5, miles: 44, jobs: 8, pay: 36, tips: 31, other: 0 },
      { date: day(0), what: 'rides', hours: 5.5, miles: 96, jobs: 12, pay: 118, tips: 18, other: 4 },
    ];
  }

  // ── The answer ───────────────────────────────────────────────────────────
  function renderAnswer() {
    const list = G.inPeriod(shifts, period);
    const t = G.totals(list, settings);
    for (const b of document.querySelectorAll('#period button')) b.setAttribute('aria-pressed', String(b.dataset.period === period));
    document.querySelector('.main').classList.toggle('asking', shifts.length === 0);   // on a phone, the form comes first until there is something to show

    if (t.count === 0 || !t.hours) {
      $('status').className = 'status wait';
      $('status-ico').textContent = '';
      $('status-text').textContent = shifts.length ? 'No shifts in this period' : 'Waiting for your first shift';
      $('verdict-art').hidden = true;
      $('verdict-line').textContent = shifts.length ? '' : 'Add a shift to see what you really made.';
      $('tiles').innerHTML = ''; $('lines').innerHTML = ''; $('levers').innerHTML = '';
      $('work').innerHTML = '<tbody><tr><td>Nothing to show yet.</td><td></td></tr></tbody>';
      return;
    }
    // The 50 cent line is the one used across the site: more than half gone is "barely".
    const tone = t.kept <= 0 ? 'bad' : t.keptPerDollar < 0.5 ? 'mixed' : 'good';
    $('status').className = 'status ' + tone;
    $('status-ico').textContent = { good: '✓', mixed: '!', bad: '✕' }[tone];
    $('status-text').textContent = t.kept <= 0 ? 'This work cost you money' : `You keep ${cents(t.keptPerDollar)} of each $1`;
    $('verdict-art').src = `art/${{ good: 'pig-whole', mixed: 'pig-cracked', bad: 'pig-broken' }[tone]}.png`;
    $('verdict-art').hidden = false;
    $('verdict-line').textContent = `The payouts say ${money(t.statedHourly)} an hour. You really made ${money(t.realHourly)}.`;

    const tile = (k, v, cls = '') => `<div class="tile ${cls}"><span class="k">${k}</span><span class="v">${v}</span></div>`;
    $('tiles').innerHTML =
      tile(`Paid out <small>${whole(t.pay)} pay + ${whole(t.tips)} tips</small>`, whole(t.gross))
      + tile(`The car <small>${count(t.miles)} miles x ${money(settings.costPerMile)}</small>`, whole(-t.carCost))
      + (t.other > 0 ? tile('Other costs <small>tolls, parking, supplies</small>', whole(-t.other)) : '')
      + tile('Taxes to set aside <small>an estimate, US rules</small>', whole(-t.taxes))
      + tile('You keep', whole(t.kept), 'keep');

    const lines = [];
    if (t.keptPerJob !== null) lines.push(`That is ${money(t.keptPerJob)} kept for each of the ${count(t.jobs)} jobs, against ${money(t.grossPerJob)} paid.`);
    if (t.grossPerMile !== null) lines.push(`You were paid ${money(t.grossPerMile)} a mile and kept ${money(t.keptPerMile)} a mile.`);
    if (t.tipShare !== null && t.tips > 0) lines.push(`Tips were ${Math.round(t.tipShare * 100)}% of what you were paid.`);
    if (t.deduction > 0) lines.push(`For your taxes: ${count(t.miles)} business miles, a deduction of ${whole(t.deduction)} at the standard rate.`);
    $('lines').innerHTML = lines.map((l) => `<li>${l}</li>`).join('');

    // What would change it: each lever moved by a tenth, biggest gain first.
    const leverList = G.levers(list, settings);
    const least = G.leastPayPerMile(settings, t.profitForTax > 0);
    $('levers').innerHTML = (leverList.length ? '<div class="group-title">What would change it most</div>'
      + leverList.map((l, i) => `<div class="irow" data-best="${i === 0}"><span class="in">10% ${l.label}</span><span class="iv">+${money(l.gain)} an hour</span></div>`).join('') : '')
      + (t.miles > 0 ? `<p class="hinge">A trip has to pay more than <b>${money(least)}</b> a mile to leave you anything. You were paid <b>${money(t.grossPerMile)}</b> a mile.</p>` : '');

    const row = (k, v) => `<tr><td>${k}</td><td>${v}</td></tr>`;
    $('work').innerHTML = '<tbody>'
      + row('Gross', `${money(t.pay)} + ${money(t.tips)} = ${money(t.gross)}`)
      + row('Car cost', `${count(t.miles)} x ${money(settings.costPerMile)} = ${money(t.carCost)}`)
      + row('Kept before tax', `${money(t.gross)} - ${money(t.carCost)} - ${money(t.other)} = ${money(t.keptBeforeTax)}`)
      + row('Mileage deduction', `${count(t.miles)} x ${money(settings.deductionPerMile)} = ${money(t.deduction)}`)
      + row('Profit for tax', `${money(t.gross)} - ${money(t.deduction)} - ${money(t.other)} = ${money(t.profitForTax)}`)
      + row('Self-employment tax', settings.selfEmployed ? `${money(t.profitForTax)} x 0.9235 x 0.153 = ${money(t.selfEmploymentTax)}` : 'switched off')
      + row('Income tax', `(${money(t.profitForTax)} - ${money(t.selfEmploymentTax / 2)}) x ${Math.round(settings.incomeTaxRate * 1000) / 10}% = ${money(t.incomeTax)}`)
      + row('You keep', `${money(t.keptBeforeTax)} - ${money(t.taxes)} = ${money(t.kept)}`)
      + row('Stated hourly', `${money(t.gross)} / ${count(t.hours)} = ${money(t.statedHourly)}`)
      + row('Real hourly', `${money(t.kept)} / ${count(t.hours)} = ${money(t.realHourly)}`)
      + '</tbody>';
  }

  // ── The log ──────────────────────────────────────────────────────────────
  function renderLog() {
    const list = G.inPeriod(shifts, period).slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    $('log-card').hidden = shifts.length === 0;
    $('example-note').hidden = !showingExample;
    $('log').innerHTML = `<thead><tr><th>Date</th><th>Work</th><th>Hours</th><th>Miles</th><th>Jobs</th><th>Paid</th><th>Kept</th><th>Kept an hour</th><th></th></tr></thead><tbody>`
      + list.map((x) => {
        const t = G.totals([x], settings);
        return `<tr><td>${esc(x.date)}</td><td>${esc(x.what || '')}</td><td>${count(t.hours)}</td><td>${count(t.miles)}</td><td>${count(t.jobs)}</td><td>${money(t.gross)}</td><td>${money(t.kept)}</td><td>${t.realHourly === null ? '' : money(t.realHourly)}</td>`
          + `<td><button type="button" class="del" data-id="${esc(x.id || '')}" aria-label="Delete the shift of ${esc(x.date)}"${showingExample ? ' disabled' : ''}>Delete</button></td></tr>`;
      }).join('') + '</tbody>';

    const kinds = G.byWhat(G.inPeriod(shifts, period), settings);
    $('by-card').hidden = kinds.length < 2;
    $('by').innerHTML = '<thead><tr><th>Work</th><th>Shifts</th><th>Hours</th><th>Paid an hour</th><th>Kept an hour</th><th>Kept a mile</th></tr></thead><tbody>'
      + kinds.map((k) => `<tr><td>${esc(k.what)}</td><td>${k.count}</td><td>${count(k.hours)}</td><td>${k.statedHourly === null ? '' : money(k.statedHourly)}</td><td>${k.realHourly === null ? '' : money(k.realHourly)}</td><td>${k.keptPerMile === null ? '' : money(k.keptPerMile)}</td></tr>`).join('')
      + '</tbody>';
    // Kinds of work already used, offered as suggestions in the form.
    $('what-list').innerHTML = [...new Set(shifts.map((x) => String(x.what || '').trim()).filter(Boolean))].map((w) => `<option value="${esc(w)}">`).join('');
  }

  function render() { renderAnswer(); renderLog(); }

  // ── Adding and removing shifts ───────────────────────────────────────────
  function addShift() {
    const x = { id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`, date: $('g-date').value || G.iso(new Date()), what: $('g-what').value.trim() };
    for (const f of SHIFT_FIELDS) x[f] = parse($('g-' + f).value);
    if (!(x.hours > 0)) { $('add-note').textContent = 'Put in the hours, waiting time included.'; $('g-hours').focus(); return; }
    if (!(x.pay + x.tips > 0)) { $('add-note').textContent = 'Put in what you were paid, or the tips.'; $('g-pay').focus(); return; }
    if (showingExample) { shifts = []; showingExample = false; }      // the first real shift replaces the example
    shifts.push(x);
    save();
    for (const f of SHIFT_FIELDS) $('g-' + f).value = '';
    $('add-note').textContent = `Added. ${shifts.length} shift${shifts.length === 1 ? '' : 's'} in your log.`;
    render();
    $('g-hours').focus();
  }

  function download() {
    const blob = new Blob([G.toCsv(shifts, settings)], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `gig-work-log-${G.iso(new Date())}.csv`;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  // ── Rates ────────────────────────────────────────────────────────────────
  function showSettings() {
    $('r-cost').value = settings.costPerMile.toFixed(2);
    $('r-deduct').value = settings.deductionPerMile.toFixed(2);
    $('r-tax').value = String(Math.round(settings.incomeTaxRate * 1000) / 10);
    $('r-se').checked = settings.selfEmployed;
  }
  function readSettings() {
    settings = G.settingsOf({ costPerMile: parse($('r-cost').value), deductionPerMile: parse($('r-deduct').value), incomeTaxRate: parse($('r-tax').value) / 100, selfEmployed: $('r-se').checked });
    save(); render();
  }

  // ── Start ────────────────────────────────────────────────────────────────
  load();
  $('g-date').value = G.iso(new Date());
  showSettings();
  $('add').addEventListener('click', addShift);
  $('shift-form').addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); addShift(); } });
  $('example').addEventListener('click', () => { shifts = exampleWeek().map((x, i) => ({ ...x, id: 'example-' + i })); showingExample = true; period = 'all'; render(); });
  $('period').addEventListener('click', (e) => { const b = e.target.closest('button[data-period]'); if (b) { period = b.dataset.period; render(); } });
  $('log').addEventListener('click', (e) => {
    const b = e.target.closest('button.del');
    if (!b || showingExample) return;
    shifts = shifts.filter((x) => x.id !== b.dataset.id);
    save(); render();
  });
  $('download').addEventListener('click', download);
  $('clear-all').addEventListener('click', () => {
    if (showingExample) { shifts = []; showingExample = false; render(); return; }
    if (!window.confirm(`Delete all ${shifts.length} shifts from this device? This cannot be undone. Download the spreadsheet first if you want a copy.`)) return;
    shifts = []; save(); render();
  });
  for (const id of ['r-cost', 'r-deduct', 'r-tax', 'r-se']) $(id).addEventListener('change', readSettings);
  render();
})();
