// The front page: one thing to try, and real answers from the calculators.
//
// Nothing here is typed in by hand. The demonstration uses the chain formula
// (W1 on the formulas page), and each answer shown is produced by the same
// engine and the same worked example as the calculator it links to, so the
// front page cannot drift out of step with them.
'use strict';
(function () {
  const $ = (id) => document.getElementById(id);

  // ── The opening example: a cheap fare, and the add-ons put back ───────────
  // The same sum as the "Is the cheap flight really cheaper?" calculator (E13 on
  // the formulas page), with each add-on switched on or off by a button.
  (function flight() {
    const BASE = 89, FULL = 268;
    const dollars = (v) => `$${Math.round(v).toLocaleString('en-US')}`;
    function show() {
      const ticked = [...document.querySelectorAll('#fl-ticks button[aria-pressed="true"]')];
      const addOns = ticked.reduce((n, b) => n + Number(b.dataset.add), 0);
      const r = window.Worth.evaluateAddons({ people: 1, base: BASE, add1: addOns, full: FULL });
      const scale = Math.max(r.total, FULL);
      $('fl-cheap').style.width = `${100 * r.total / scale}%`; $('fl-cheap-v').textContent = dollars(r.total);
      $('fl-full').style.width = `${100 * FULL / scale}%`; $('fl-full-v').textContent = dollars(FULL);
      $('fl-line').textContent = addOns === 0 ? `It says ${dollars(BASE)}, and with nothing added it costs ${dollars(BASE)}.` : `It says ${dollars(BASE)}. It really costs ${dollars(r.total)}.`;
      $('fl-sub').textContent = r.net > 0 ? `Still ${dollars(r.net)} cheaper. It stays cheaper as long as the add-ons come to less than ${dollars(r.roomForAddons)}; these come to ${dollars(addOns)}.`
        : r.net < 0 ? `That is ${dollars(-r.net)} more than the fare that looked three times the price. Untick one to see where it tips.` : 'The two now cost the same.';
    }
    $('fl-ticks').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-add]');
      if (!b) return;
      b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
      show();
    });
    show();
  })();

  // ── Try it: five short stories, one for each number ──────────────────────
  // The number is how many things relied on what was cut. Each story is a
  // business with 20 of something, so the slider reads the same way in all of
  // them. Each thing passes on only what it received:
  //
  //     kept = (1 - cut) ^ things
  //
  // The stories are illustrations with round numbers. They assume each thing
  // relied fully on what was cut, which is the strongest form of the effect.
  const CASES = {
    1: { name: 'a delivery firm', has: 'runs 20 vans', sales: 2000000, verb: 'parks', one: 'van', many: 'vans', slider: 'How many vans it parks',
      lead: 'The vans did one job:', relied: ['making deliveries'] },
    2: { name: 'a restaurant', has: 'has 20 staff', sales: 1500000, verb: 'lets', one: 'person', many: 'people', after: ' go', slider: 'How many it lets go',
      lead: 'They were', relied: ['getting the meals out', 'the faces the regulars come back for'] },
    3: { name: 'a repair shop', has: 'has 20 people', sales: 2000000, verb: 'lets', one: 'person', many: 'people', after: ' go', slider: 'How many it lets go',
      lead: 'They were', relied: ['getting the work done', 'the know-how', 'the customers who ask for them by name'] },
    4: { name: 'a software firm', has: 'has 20 engineers', sales: 4000000, verb: 'lets', one: 'engineer', many: 'engineers', after: ' go', slider: 'How many it lets go',
      lead: 'They were', relied: ['shipping new features', 'the only ones who know the old system', 'fixing what customers report', 'mentoring the juniors'] },
    5: { name: 'a machine shop', has: 'has 20 machinists', sales: 5000000, verb: 'lets', one: 'machinist', many: 'machinists', after: ' go', slider: 'How many it lets go',
      lead: 'They were', relied: ['making the parts', 'setting up the machines', 'checking the quality', 'training the apprentices', 'improving the process'] },
  };
  const KEPT_ART = { 1: 'pig-whole', 2: 'pig-cracked', 3: 'pig-cracked' };      // 4 and 5 show the broken one
  let things = 3;
  function demo() {
    const c = CASES[things];
    const cut = Number($('d-cut').value) / 100;
    const lost = 1 - Math.pow(1 - cut, things);
    const pct = (v) => `${(+(v * 100).toFixed(1)).toLocaleString('en-US')}%`;
    const money = (v) => `$${Math.round(v).toLocaleString('en-US')}`;
    const list = (words) => (words.length < 2 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`);
    const count = Math.round(cut * 20);
    for (const b of document.querySelectorAll('#d-n button')) b.setAttribute('aria-pressed', String(Number(b.dataset.n) === things));
    $('d-case').textContent = `Case ${things} of 5: ${c.name}`;
    $('d-story').innerHTML = `${c.name.replace(/^a /, 'A ')} ${c.has} and brings in ${money(c.sales)} a year. It ${c.verb} <b>${count} ${count === 1 ? c.one : c.many}</b>${c.after || ''}: a <b>${pct(cut)}</b> cut.`;
    $('d-things').textContent = `${c.lead} ${list(c.relied)}.`;
    $('d-cut-label').textContent = c.slider;
    $('d-paper').style.width = `${cut * 100}%`; $('d-paper-k').textContent = `On paper, ${pct(cut)}`; $('d-paper-v').textContent = money(cut * c.sales);
    $('d-real').style.width = `${lost * 100}%`; $('d-real-k').textContent = `In practice, ${pct(lost)}`; $('d-real-v').textContent = money(lost * c.sales);
    $('d-line').textContent = things === 1 ? `${money(cut * c.sales)} of sales is at risk. A plain subtraction.`
      : `${money(lost * c.sales)} of sales is at risk, not ${money(cut * c.sales)}.`;
    $('d-sum').textContent = things === 1 ? 'One thing relied on them, so the loss is the size of the cut. The books have this one right.'
      : `${things} things relied on them, and each passes on only what it received: ${Array(things).fill((1 - cut).toFixed(2).replace(/0$/, '')).join(' x ')} = ${Math.pow(1 - cut, things).toFixed(3)} kept.`;
    $('d-art').src = `art/${KEPT_ART[things] || 'pig-broken'}.png`;
  }
  $('d-cut').addEventListener('input', demo);
  $('d-n').addEventListener('click', (e) => { const b = e.target.closest('button[data-n]'); if (b) { things = Number(b.dataset.n); demo(); } });
  demo();

  // ── The featured calculator: the same worked example the barriers page opens on ──
  (function feature() {
    const example = { rounds: 5, candidates: 8, passShare: 0.5, days: 7, interviewers: 3, hoursEach: 1.5, hourCost: 75, seatPerWeek: 2000,
      lostPerWeek: 0.10, lostCost: 20000, candidateHours: 3, badChance: 0.5, badCost: 60000, catchShare: 0.4 };
    const r = window.Barriers.hiring(example);
    const money = (v) => `$${Math.round(v).toLocaleString('en-US')}`;
    const past = r.firstPastBest;
    if (past) $('f-line').textContent = `Rounds ${past.round} and ${r.rounds.length} cost ${money(r.extraCost)} and take ${money(r.extraCaught)} off the risk.`;
    $('f-sub').textContent = `A worked example with illustrative figures: five rounds, a week apart, for one job. By the end there is a ${(r.stillFree * 100).toFixed(0)}% chance the first choice is still available.`;
    $('f-legend').innerHTML = window.BarriersChart.legend(r);
    const draw = () => window.BarriersChart.draw($('f-chart'), $('f-box'), r, 'Round');
    draw();
    let timer = null;
    window.addEventListener('resize', () => { clearTimeout(timer); timer = setTimeout(draw, 120); });
  })();

  // ── Real answers, each from the calculator it links to ───────────────────
  const { answer } = window.WorthAnswer;
  const scenarios = window.WorthScenarios.GROUPS.flatMap((g) => g.items);
  const fromPicker = (id, page) => {
    const s = scenarios.find((x) => x.id === id);
    const a = answer(s.kind, s.example, s.labels, s.item);
    return { ask: s.label, says: a.headline, href: `${page}#${id}` };
  };
  const supplier = (() => {
    const ex = window.HiddenCostExamples.EXAMPLES.find((e) => e.id === 'layoff');
    const r = window.HiddenCost.analyze(window.HiddenCostExamples.toInputs(ex.values));
    return { ask: 'Reducing headcount: what is the full cost?', says: `It saves $${Math.round(r.grossSaving).toLocaleString('en-US')} on paper. Every $1 saved costs $${r.multiple.toFixed(2)}.`, href: 'saving.html#layoff' };
  })();
  const cards = [
    fromPicker('flight', 'index.html'),
    fromPicker('job', 'earn.html'),
    fromPicker('fix-or-new', 'index.html'),
    fromPicker('car-repair', 'wait.html'),
    fromPicker('borrow-or-cash', 'index.html'),
    supplier,
  ];
  // ── How many times the site has been opened, from its own count ──────────
  // Shown only when the count can be read. Nothing is shown in its place if it cannot.
  fetch('/api/stats').then((r) => (r.ok ? r.json() : null)).then((s) => {
    if (!s || !(s.visits > 0)) return;
    const since = s.since ? new Date(s.since + 'T00:00:00Z').toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '';
    $('seen').textContent = `Visited ${s.visits.toLocaleString('en-US')} times, with ${s.views.toLocaleString('en-US')} pages opened${since ? `, since ${since}` : ''}.`;
    $('seen').hidden = false;
  }).catch(() => {});

  // ── What people have said: comments the owner has published, if there are any ──
  // Shown as plain text. If the request fails, or there are none, the section stays hidden.
  fetch('/api/testimonials').then((r) => (r.ok ? r.json() : { items: [] })).then((d) => {
    const items = (d.items || []).slice(0, 3);
    if (!items.length) return;
    for (const item of items) {
      const box = document.createElement('figure'); box.className = 'quote';
      const text = document.createElement('blockquote'); text.textContent = item.text;
      const who = document.createElement('figcaption'); who.textContent = item.name || 'A visitor';
      box.append(text, who); $('said').append(box);
    }
    $('said-card').hidden = false;
  }).catch(() => {});

  // Face value beside actual value: three of the same answers, each split into what it says and what it is.
  const pairCard = (c) => { const cut = c.says.indexOf('. '); return `<a class="pair-card" href="${c.href}"><span class="ask">${c.ask}</span><span class="face"><span class="k">Face value</span>${c.says.slice(0, cut + 1)}</span><span class="actual"><span class="k">Actual value</span>${c.says.slice(cut + 2)}</span><span class="more">See the working</span></a>`; };
  $('pairs').innerHTML = [cards[0], cards[1], cards[5]].map(pairCard).join('');

  $('answers').innerHTML = cards.map((c) => `<a class="answer" href="${c.href}"><span class="ask">${c.ask}</span><span class="says">${c.says}</span><span class="more">Try it with your numbers</span></a>`).join('');
})();
