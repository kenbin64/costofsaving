// Page behaviour for barriers.html: what each step costs, what it catches, and who it screens out.
// The sums are in barriers.js and the chart is in barriers-chart.js. This file
// holds the worked examples, reads the form for whichever of the two
// calculations an example uses, and writes the answer in words.
'use strict';
(function () {
  const B = window.Barriers, Chart = window.BarriersChart;
  const $ = (id) => document.getElementById(id);

  // ── Numbers ──────────────────────────────────────────────────────────────
  const parse = (text) => { const v = parseFloat(String(text).replace(/[^0-9.\-]/g, '')); return Number.isFinite(v) ? v : 0; };
  const money = (v) => `${v < 0 ? '-' : ''}$${Math.round(Math.abs(v)).toLocaleString('en-US')}`;
  const pct = (v) => `${(+(v * 100).toFixed(1)).toLocaleString('en-US')}%`;
  const count = (v) => (+v.toFixed(1)).toLocaleString('en-US');
  const range = (from, to, unit) => (from === to ? `${unit} ${from}` : to === from + 1 ? `${unit}s ${from} and ${to}` : `${unit}s ${from} to ${to}`);
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  // ── The two calculations ─────────────────────────────────────────────────
  // Each lists its fields in the order the engine names them, and which of
  // them are typed as whole percentages.
  const MODES = {
    hiring: {
      prefix: 'h-', unit: 'Round', compute: B.hiring,
      fields: window.BarrierExamples.HIRING_FIELDS,
      percent: window.BarrierExamples.HIRING_PERCENT,
      needs: 'candidates', waiting: 'Enter how many candidates are in the first round to see what each round costs.',
    },
    gate: {
      prefix: 'g-', unit: 'Step', compute: B.gate,
      fields: window.BarrierExamples.GATE_FIELDS,
      percent: window.BarrierExamples.GATE_PERCENT,
      needs: 'people', waiting: 'Enter how many people arrive each month to see what each step costs and what it catches.',
    },
  };
  // The words an answer uses for the people involved, unless an example names them.
  const PLAIN = { people: 'people', good: 'people you wanted', bad: 'people it was meant to stop' };

  // The worked examples live in barriers-examples.js, which the build reads too.
  const GROUPS = window.BarrierExamples.GROUPS;
  const EXAMPLES = GROUPS.flatMap((g) => g.items.map((e) => ({ mode: 'gate', ...e })));
  $('examples').innerHTML = GROUPS.map((g) => `<div class="ex-group"><span class="eyebrow">${g.title}</span><span class="chips">${g.items.map((e) => `<button type="button" class="ex" data-ex="${e.id}">${e.label}</button>`).join('')}</span></div>`).join('');

  let mode = 'hiring';
  let words = PLAIN;

  // ── Form ─────────────────────────────────────────────────────────────────
  function readForm() {
    const m = MODES[mode], raw = {};
    for (const f of m.fields) raw[f] = parse($(m.prefix + f).value) / (m.percent.includes(f) ? 100 : 1);
    return raw;
  }
  function showMode(next) {
    mode = MODES[next] ? next : 'hiring';
    $('form-hiring').hidden = mode !== 'hiring'; $('form-gate').hidden = mode !== 'gate';
    $('cannot-hiring').hidden = mode !== 'hiring'; $('cannot-gate').hidden = mode !== 'gate';
    $('rounds-for').hidden = mode !== 'hiring';
    for (const b of document.querySelectorAll('#own button')) b.setAttribute('aria-pressed', 'false');
  }
  function lit(id) { for (const b of document.querySelectorAll('#examples button')) b.setAttribute('aria-pressed', String(b.dataset.ex === id)); }
  // Show a worked example, or an empty form for the reader's own figures.
  function show(example) {
    showMode(example.mode);
    words = example.words || PLAIN;
    for (const f of MODES[mode].fields) $(MODES[mode].prefix + f).value = example.values ? example.values[f] : '';
    $('example-note').textContent = example.note ? `Example: ${example.note} The figures are illustrative, and the shares are guesses. Type over any of them with your own.` : '';
    $('example-note').hidden = !example.note;
    lit(example.id || '');
    render();
  }

  // ── The answer in words ──────────────────────────────────────────────────
  function hiringWords(r) {
    const x = r.inputs, n = r.rounds.length, past = r.firstPastBest;
    const allPay = !past, lines = [];
    const status = allPay ? (n === 1 ? 'One round' : 'Every round pays for itself') : `${range(r.best + 1, n, 'Round')} cost${r.best + 1 === n ? 's' : ''} more than ${r.best + 1 === n ? 'it catches' : 'they catch'}`;
    const line = allPay ? `${n} round${n === 1 ? '' : 's'} cost ${money(r.totalCost)} and take ${money(r.totalCaught)} off the risk of a hire that does not work out.`
      : `Stopping after round ${r.best} would leave you ${money(r.extraCost - r.extraCaught)} better off.`;
    if (!allPay) lines.push(`${range(r.best + 1, n, 'Round')} cost <b>${money(r.extraCost)}</b> and take <b>${money(r.extraCaught)}</b> off the risk of a hire that does not work out.`);
    if (x.lostPerWeek > 0 && x.days > 0) {
      lines.push(`After ${n} round${n === 1 ? '' : 's'} there is a <b>${pct(r.stillFree)}</b> chance your first choice is still available${allPay || r.best === n ? '' : `. After round ${r.best} it is <b>${pct(r.rounds[r.best - 1].stillFree)}</b>`}.`);
      lines.push(`That is ${pct(x.lostPerWeek)} a week, multiplied: ${(1 - x.lostPerWeek).toFixed(2)} to the power of ${count(r.days / 7)} weeks is ${r.stillFree.toFixed(3)}.`);
    }
    lines.push(`The process takes <b>${count(r.days)} days</b>. The seat is empty for all of them, at ${money(x.seatPerWeek)} a week.`);
    lines.push(`The chance of a hire that does not work out falls from ${pct(x.badChance)} to <b>${pct(r.badLeft)}</b>. Each round has less left to catch than the one before.`);
    let hinge = '';
    if (past && past.needCatch !== null) hinge = past.needCatch > 1 ? `Round ${past.round} cannot pay for itself on these figures: it costs <b>${money(past.cost)}</b>, more than all the risk left for it to remove.`
      : `Round ${past.round} would have to catch <b>${pct(past.needCatch)}</b> of the mistakes still left to pay for itself. You put <b>${pct(x.catchShare)}</b>.`;
    return { good: allPay, status, line, lines, hinge };
  }
  function gateWords(r) {
    const x = r.inputs, n = r.rounds.length, past = r.firstPastBest, lines = [];
    if (n === 0) return { good: true, status: 'No steps', line: 'With no steps, nothing is lost and nothing is caught.', lines, hinge: '' };
    const allPay = !past, one = n === 1;
    const fee = x.feeIncome > 0, nothingToStop = r.badStart * x.badCost === 0;
    const gets = fee ? (nothingToStop ? 'brings in' : 'gets back') : 'catches';
    const status = allPay ? (one ? 'It pays for itself' : 'Every step pays for itself') : one ? `It costs more than it ${gets}`
      : r.best === 0 ? 'On these figures no step pays for itself' : `${range(r.best + 1, n, 'Step')} cost${r.best + 1 === n ? 's' : ''} more than ${r.best + 1 === n ? 'it catches' : 'they catch'}`;
    const line = allPay ? `It costs ${money(r.totalCost)} a month and ${gets} ${money(r.totalCaught)}.`
      : one ? `It costs ${money(r.totalCost)} a month and ${gets} ${money(r.totalCaught)}: ${money(r.totalCost - r.totalCaught)} a month worse off.`
        : r.best === 0 ? `With no steps at all you would be ${money(r.extraCost - r.extraCaught)} a month better off.`
          : `Stopping after step ${r.best} would leave you ${money(r.extraCost - r.extraCaught)} a month better off.`;
    if (!allPay && !one) lines.push(`${range(r.best + 1, n, 'Step')} cost <b>${money(r.extraCost)}</b> a month and catch <b>${money(r.extraCaught)}</b>.`);
    if (fee) lines.push(`The fee brings in <b>${money(r.rounds.reduce((s, q) => s + q.income, 0))}</b> a month. The ${words.good} it turns away were worth <b>${money(r.rounds.reduce((s, q) => s + q.parts.lost, 0))}</b>.`);
    if (x.dropShare > 0 && n > 1) lines.push(`Losing ${pct(x.dropShare)} at each of ${n} steps is not ${pct(Math.min(1, x.dropShare * n))}. It multiplies: ${(1 - x.dropShare).toFixed(2)} to the power of ${n} is ${r.goodKeptShare.toFixed(3)}, so <b>${pct(1 - r.goodKeptShare)}</b> of the ${words.good} are lost.`);
    let hinge = '';
    const what = one ? 'It' : past ? `Step ${past.round}` : '';
    // A step that pays still has a limit worth knowing: how many it can afford to turn away.
    if (!past && one && r.rounds[0].maxDrop !== null && r.rounds[0].maxDrop < 1 && x.dropShare > 0) hinge = `It keeps paying as long as it turns away fewer than <b>${pct(r.rounds[0].maxDrop)}</b> of the ${words.good}. You put <b>${pct(x.dropShare)}</b>.`;
    if (past) {
      // Two ways it could pay: by turning away fewer of the people wanted, or by stopping more of the others.
      const parts = [];
      if (past.maxDrop !== null && past.maxDrop > 0) parts.push(`${what} would pay for itself if it turned away fewer than <b>${pct(past.maxDrop)}</b> of the ${words.good}. You put <b>${pct(x.dropShare)}</b>.`);
      if (past.needCatch !== null && past.needCatch > 0 && past.needCatch <= 1) parts.push(`${parts.length ? 'Or if it' : what + ' would pay for itself if it'} stopped <b>${pct(past.needCatch)}</b> of the ${words.bad}. You put <b>${pct(x.catchShare)}</b>.`);
      else if (past.needCatch !== null && past.needCatch > 1 && !fee) parts.push(`Stopping every one of the ${words.bad} would be worth <b>${money(past.allItCouldCatch)}</b> a month, less than the <b>${money(past.cost)}</b> it costs.`);
      hinge = parts.join(' ');
    }
    return { good: allPay, status, line, lines, hinge };
  }

  // Who it screens out: two bars, the wanted beside the ones it was for.
  function whoKeptOut(r) {
    const out = r.keptOutGood + r.keptOutBad, show = out > 0.05;
    const onlyWanted = r.badStart === 0;      // a fee with nothing to stop turns away only people who were wanted
    $('who-card').hidden = !show;
    if (!show) return;
    const scale = Math.max(r.keptOutGood, r.keptOutBad, 0.0001);
    const row = (name, n, of, colour) => `<div class="vrow"><span class="vn">${cap(name)}</span><span class="track"><span class="bar" style="width: ${100 * n / scale}%; background: var(${colour})"></span></span><span class="amt">${count(n)}<small> of ${count(of)}</small></span></div>`;
    $('who-line').textContent = onlyWanted ? `It turns away ${count(out)} of ${count(r.goodStart)} ${words.good} each month.` : `Of the ${count(out)} ${words.people} it screens out each month, ${count(r.keptOutGood)} are ${words.good}.`;
    $('who-bars').innerHTML = row(words.good, r.keptOutGood, r.goodStart, '--o2') + (onlyWanted ? '' : row(words.bad, r.keptOutBad, r.badStart, '--o3'));
    $('who-lines').innerHTML = onlyWanted ? `<li>It is not there to stop anyone, so everyone it turns away is someone who was wanted: <b>${pct(r.keptOutGood / r.goodStart)}</b> of them.</li>` : `<li>That is <b>${pct(r.keptOutGoodShare)}</b> of everyone it screens out.</li>`
      + `<li>Still getting through: <b>${count(r.badThrough)}</b> of the ${count(r.badStart)} ${words.bad}.</li>`;
  }
  // The other bottom line: what going through it costs the people themselves.
  function peopleSide(r) {
    const show = r.peopleHours > 0 || r.peopleCost > 0;
    $('people-card').hidden = !show;
    if (!show) return;
    const both = r.peopleHours > 0 && r.peopleCost > 0;
    const spent = `${r.peopleHours > 0 ? `${count(r.peopleHours)} hours` : ''}${both ? ' and ' : ''}${r.peopleCost > 0 ? money(r.peopleCost) : ''}`;
    const nothing = `${r.peopleHours > 0 ? `${count(r.peopleHoursForNothing)} hours` : ''}${both ? ' and ' : ''}${r.peopleCost > 0 ? money(r.peopleCostForNothing) : ''}`;
    $('people-line').textContent = `It costs the ${words.people === 'requests' || words.people === 'orders' ? 'people behind those ' + words.people : words.people} ${spent} a month.`;
    $('people-lines').innerHTML = `<li><b>${nothing}</b> of that is spent by people who do not get through.</li>`
      + (r.peopleHours >= 40 ? `<li>${count(r.peopleHours)} hours is about <b>${count(r.peopleHours / 40)}</b> working weeks of other people's time, every month.</li>` : '');
  }

  // ── Show it ──────────────────────────────────────────────────────────────
  function render() {
    const m = MODES[mode], raw = readForm();
    const waiting = !(raw[m.needs] > 0);
    $('answers').hidden = waiting; $('deep').hidden = waiting; $('waiting').hidden = !waiting;
    $('waiting').textContent = m.waiting;
    if (waiting) return;
    const r = m.compute(raw);
    const w = mode === 'hiring' ? hiringWords(r) : gateWords(r);
    $('status-wrap').className = `status ${w.good ? 'good' : 'bad'}`;
    $('status').textContent = w.status;
    $('verdict').textContent = w.line;
    $('lines').innerHTML = w.lines.map((l) => `<li>${l}</li>`).join('');
    $('hinge').innerHTML = w.hinge; $('hinge').hidden = !w.hinge;
    $('chart-title').textContent = mode === 'hiring' ? 'The cost of each round' : r.rounds.length === 1 ? 'What it costs, and what it gets back' : 'The cost of each step';
    $('chart-note').textContent = mode === 'hiring' ? 'For each round: what it costs on the left, what it takes off the risk of a hire that does not work out on the right. The figure under each round is the difference.'
      : 'For a month: what it costs on the left, what it gets back on the right. The figure underneath is the difference.';
    $('chart-card').hidden = r.rounds.length === 0;
    $('legend').innerHTML = Chart.legend(r);
    Chart.draw($('chart'), $('chart-box'), r, m.unit);

    $('candidates-card').hidden = true; $('who-card').hidden = true; $('people-card').hidden = true;
    if (mode === 'gate') { whoKeptOut(r); peopleSide(r); }
    if (mode === 'hiring' && r.inputs.candidateHours > 0) {
      const x = r.inputs;
      $('candidates-card').hidden = false;
      $('cand-line').textContent = `Candidates put ${count(r.candidateHoursAll)} hours into this process.`;
      $('cand-lines').innerHTML = `<li><b>${count(r.candidateHoursNotHired)} of those hours</b> come from people who are not hired.</li>`
        + `<li>Anyone who reaches the last round has given <b>${count(r.candidateHoursEach)} hours</b>, about ${count(r.candidateHoursEach / 8)} working days, and waited ${count(r.days)} days for an answer.</li>`
        + (x.lostPerWeek > 0 ? '<li><b>Time to hire:</b> candidates with other offers are the ones most likely to accept elsewhere while they wait. A shorter process keeps more of them in play.</li>' : '');
    }

    // The working: every step, every part.
    const parts = r.partNames;
    $('work').innerHTML = `<thead><tr><th>${m.unit}</th>${mode === 'hiring' ? '<th>Candidates</th>' : `<th>${cap(words.good)} left</th>`}${parts.map((p) => `<th>${p.name}</th>`).join('')}<th>Costs</th><th>${mode === 'hiring' ? 'Catches' : 'Gets back'}</th><th>Difference</th></tr></thead><tbody>`
      + r.rounds.map((s) => `<tr><td>${s.round}</td><td>${count(mode === 'hiring' ? s.candidates : s.goodLeft)}</td>${parts.map((p) => `<td>${money(s.parts[p.key])}</td>`).join('')}<td>${money(s.cost)}</td><td>${money(s.caught)}</td><td>${s.net >= 0 ? '+' : ''}${money(s.net)}</td></tr>`).join('')
      + `<tr><td><b>All</b></td><td></td>${parts.map((p) => `<td>${money(r.rounds.reduce((n, s) => n + s.parts[p.key], 0))}</td>`).join('')}<td><b>${money(r.totalCost)}</b></td><td><b>${money(r.totalCaught)}</b></td><td><b>${r.net >= 0 ? '+' : ''}${money(r.net)}</b></td></tr></tbody>`;
  }

  // ── Start ────────────────────────────────────────────────────────────────
  document.querySelector('.wrap').addEventListener('input', (e) => {
    if (e.target.tagName !== 'INPUT') return;
    $('example-note').hidden = true; lit('');
    render();
  });
  $('examples').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-ex]');
    if (b) { history.replaceState(null, '', '#' + b.dataset.ex); show(EXAMPLES.find((x) => x.id === b.dataset.ex)); }
  });
  // "My own" starts an empty form for one of the two calculations.
  $('own').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-own]');
    if (!b) return;
    show({ mode: b.dataset.own });
    b.setAttribute('aria-pressed', 'true');
    $(MODES[mode].prefix + MODES[mode].fields[0]).focus();
  });
  let resizeTimer = null;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(render, 120); });

  // The address can name an example: #degree, #checkout. #hiring and #gate open the first of each kind.
  function fromHash() {
    const id = location.hash.slice(1);
    show(EXAMPLES.find((e) => e.id === id) || EXAMPLES.find((e) => e.mode === id) || EXAMPLES[0]);
  }
  window.addEventListener('hashchange', fromHash);
  fromHash();
})();
