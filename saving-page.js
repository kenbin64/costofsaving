// Page behaviour for saving.html: read the form, run the formula (saving.js),
// and draw the answer. No numbers are worked out here; this file only shows them.
'use strict';
(function () {
  const { analyze } = window.HiddenCost;
  const { EXAMPLES, TOUCHES, GROUP_ORDER, toInputs } = window.HiddenCostExamples;
  const $ = (id) => document.getElementById(id);
  const FIELDS = ['saving', 'years', 'oneTime', 'discountRate', 'dependentValue', 'cutShare', 'spareShare', 'margin', 'delayMonths', 'knockOn', 'undoChance', 'undoCost'];
  const LEVELS = [[0, 'No'], [0.5, 'Partly'], [1, 'Fully']];
  // A small drawing for each part of the business a cut can reach.
  const PART_ICONS = {
    capacity: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8" stroke-dasharray="3.2 3.08" stroke-width="3.4"/>',
    knowhow: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5"/>',
    next: '<path d="M5 19L19 5M10 5h9v9"/>',
    selling: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.3"/>',
    customers: '<circle cx="8" cy="8" r="3"/><path d="M2 20c0-4 3-6 6-6s6 2 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.6c3 .1 6 1.6 6 5.4"/>',
    suppliers: '<rect x="2" y="7" width="11" height="9"/><path d="M13 10h4l4 4v2h-8z"/><circle cx="6.5" cy="18" r="2"/><circle cx="17.5" cy="18" r="2"/>',
    skill: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M8.5 13l2.5 2.5 4.5-5"/>',
  };
  const partIcon = (id) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PART_ICONS[id] || ''}</svg>`;
  let touches = {};            // { capacity: 1, knowhow: 0.5, ... } as chosen on the page
  let mode = 'saving';         // 'saving' (a cut) or 'gain' (a price rise, a new customer, a new product)

  // The arithmetic is the same either way. Only the words differ.
  const WORDS = {
    saving: {
      title: 'The cost of saving money', noun: 'saving', change: 'cut',
      lede: 'A saving shows up at once. What it costs you shows up later, somewhere else. Three numbers will tell you which one wins.',
      group1: 'The saving', amount: 'Expected saving each year', onetime: 'One-time cost of making the cut',
      group2: 'What the cut thing was earning', cut: 'How much of it you are cutting', spare: 'How much of the cut was truly spare',
      feeds: 'The books show one line. Each part you tap multiplies the loss.',
      taking: 'what you are cutting', removes: 'The cut removes',
    },
    gain: {
      title: 'The cost of making money', noun: 'gain', change: 'change',
      lede: 'A gain shows up at once. What it takes from the rest of the business shows up later, somewhere else. Three numbers will tell you which one wins.',
      group1: 'The gain', amount: 'Expected gain each year', onetime: 'One-time cost of making the change',
      group2: 'What it draws on', cut: 'How much of it this takes away', spare: 'How much of that was truly spare',
      feeds: 'The books show the new income. Each part it draws on multiplies the loss.',
      taking: 'what this takes away', removes: 'The change takes',
    },
  };
  const modeOf = (ex) => ex.mode || 'saving';

  function setMode(next, pickFirst = true) {
    mode = next;
    const w = WORDS[mode];
    for (const b of document.querySelectorAll('#mode button')) b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
    $('w-title').textContent = w.title;       // the page's title in the browser tab is left as it is, for search results
    $('w-lede').textContent = w.lede;
    $('w-group1').textContent = w.group1; $('w-amount').textContent = w.amount; $('w-onetime').textContent = w.onetime;
    $('w-group2').textContent = w.group2; $('w-cut').textContent = w.cut; $('w-spare').textContent = w.spare;
    $('w-feeds').textContent = w.feeds;
    $('w-where').textContent = `Where the ${w.noun} goes`;
    // The picker: every worked decision for this side, listed under its group.
    const list = EXAMPLES.filter((e) => modeOf(e) === mode && !e.own);
    $('examples').innerHTML = GROUP_ORDER.filter((g) => list.some((e) => e.group === g)).map((g) =>
      `<optgroup label="${g}">${list.filter((e) => e.group === g).map((e) => `<option value="${e.id}">${e.label}</option>`).join('')}</optgroup>`).join('');
    if (pickFirst) pickExample(list[0].id);     // open on a worked example, not a blank form
  }

  // ── Number formatting ────────────────────────────────────────────────────
  const money = (v) => (v < 0 ? '-$' : '$') + Math.abs(Math.round(v)).toLocaleString('en-US');
  const shortMoney = (v) => {
    const a = Math.abs(v), sign = v < 0 ? '-' : '';
    if (a >= 1e6) return `${sign}$${+(a / 1e6).toFixed(a >= 1e7 ? 0 : 1)}M`;
    if (a >= 1e3) return `${sign}$${+(a / 1e3).toFixed(a >= 1e4 ? 0 : 1)}k`;
    return `${sign}$${Math.round(a)}`;
  };
  const pct = (v) => `${Math.round(v * 100)}%`;
  const parse = (text) => { const n = parseFloat(String(text).replace(/[^0-9.\-]/g, '')); return Number.isFinite(n) ? n : 0; };
  const monthsText = (m) => (m === 1 ? '1 month' : `${m} months`);
  const whenText = (m) => (m < 12 ? `month ${m}` : `year ${Math.floor((m - 1) / 12) + 1}, month ${((m - 1) % 12) + 1}`);

  // ── Form ─────────────────────────────────────────────────────────────────
  function readForm() {
    const v = {};
    for (const f of FIELDS) v[f] = parse($(f).value);
    v.touches = touches;
    return toInputs(v);
  }
  function fillForm(values) {
    for (const f of FIELDS) $(f).value = ['saving', 'oneTime', 'dependentValue', 'knockOn', 'undoCost'].includes(f) ? (values[f] ? Number(values[f]).toLocaleString('en-US') : '') : (values[f] === undefined ? 0 : values[f]);
  }
  function pickExample(id) {
    const ex = EXAMPLES.find((e) => e.id === id);
    if (!ex.own) $('examples').value = id;
    $('example-note').textContent = ex.own ? ex.note : ex.note + ' The figures are illustrative; replace them with yours. This example also sets the items under More detail.';
    $('what-1').textContent = ex.what;
    fillForm(ex.values);
    touches = { ...(ex.values.touches || {}) };
    drawTouches();
    render();
  }

  // The "what else it feeds" list: one row per part, each No / Partly / Fully.
  function drawTouches() {
    // The short form: one chip per part. Tapped means it relies on what is cut.
    $('parts').innerHTML = TOUCHES.map((t) => {
      const now = touches[t.id] || 0;
      return `<button type="button" class="ex" data-part="${t.id}" aria-pressed="${now > 0}" title="${t.hint}">${partIcon(t.id)}${t.label}${now === 0.5 ? ' <span class="lvl">(partly)</span>' : ''}</button>`;
    }).join('');
    $('touches').innerHTML = TOUCHES.map((t) => {
      const now = touches[t.id] || 0;
      const buttons = LEVELS.map(([w, name]) => `<button type="button" data-id="${t.id}" data-w="${w}" aria-pressed="${now === w}">${name}</button>`).join('');
      return `<div class="touch"><span class="tn">${t.label}<span class="th">${t.hint}</span></span><span class="seg" role="group" aria-label="${t.label}">${buttons}</span></div>`;
    }).join('');
  }

  // ── The two blocks ───────────────────────────────────────────────────────
  // A total is a product: how much is cut, times what each point of it is worth.
  // Drawn as a block, the base is the first, the height the second, and the area
  // the total. Both blocks stand on the same base (the same cut), so the taller
  // one is the bigger amount, and you can see the two numbers that made it.
  let lastResult = null;
  function drawBlocks(r) {
    const box = $('blocks-box'), svg = $('blocks'), w = WORDS[mode];
    const W = Math.max(260, box.clientWidth || 420), H = 230;
    const top = 30, base = H - 46, colW = Math.min(150, (W - 60) / 2), gap = Math.min(70, W - 2 * colW - 20);
    const x1 = (W - 2 * colW - gap) / 2, x2 = x1 + colW + gap;
    const scale = Math.max(r.grossSaving, r.totalCost, 1);
    const hOf = (v) => Math.max(2, (v / scale) * (base - top));
    const points = r.inputs.cutShare * 100;
    const perPoint = (v) => (points > 0 ? `${points.toFixed(points % 1 ? 1 : 0)} pts x ${shortMoney(v / points)}` : '');
    const col = (x, v, fill, name, sub) => {
      const h = hOf(v);
      return `<rect x="${x}" y="${base - h}" width="${colW}" height="${h}" rx="4" fill="var(${fill})"/>`
        + `<text x="${x + colW / 2}" y="${base - h - 8}" text-anchor="middle" font-size="17" font-weight="700" fill="var(--ink)" font-family="var(--mono)">${money(v)}</text>`
        + `<text x="${x + colW / 2}" y="${base + 18}" text-anchor="middle" font-size="14" font-weight="700" fill="var(--ink)">${name}</text>`
        + `<text x="${x + colW / 2}" y="${base + 35}" text-anchor="middle" font-size="12" fill="var(--muted)">${sub}</text>`;
    };
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W); svg.setAttribute('height', H);
    svg.innerHTML = `<line x1="${x1 - 10}" x2="${x2 + colW + 10}" y1="${base}" y2="${base}" stroke="var(--axis)" stroke-width="1.5"/>`
      + col(x1, r.grossSaving, '--o1', `The ${w.noun}`, perPoint(r.grossSaving))
      + col(x2, r.totalCost, '--o2', 'What it costs you', perPoint(r.totalCost));
  }

  // ── The answer ───────────────────────────────────────────────────────────
  const VERDICT = {
    real: { icon: '✓', label: () => `The ${WORDS[mode].noun} wins`, line: (r) => `The ${WORDS[mode].noun} wins by ${money(r.realAtEnd)}.` },
    'mostly-eaten': { icon: '!', label: () => `The ${WORDS[mode].noun} wins, barely`, line: (r) => `The ${WORDS[mode].noun} wins by ${money(r.realAtEnd)}, but ${pct(r.eaten)} of it is gone.` },
    loss: { icon: '✕', label: () => 'The loss wins', line: (r) => `The loss wins by ${money(-r.realAtEnd)}.` },
  };

  function renderVerdict(r) {
    const v = VERDICT[r.verdict];
    $('status').className = 'status ' + r.verdict;
    $('status-ico').textContent = v.icon;
    $('status-text').textContent = v.label();
    const w = WORDS[mode];
    $('verdict-line').textContent = v.line(r);
    // The piggy bank beside the verdict: whole, cracked or broken.
    $('verdict-art').src = `art/${{ real: 'pig-whole', 'mostly-eaten': 'pig-cracked', loss: 'pig-broken' }[r.verdict]}.png`;
    $('verdict-art').hidden = r.grossSaving === 0;
    if (r.grossSaving === 0) {                       // nothing entered yet: ask, do not pronounce
      $('status').className = 'status';
      $('status-ico').textContent = '';
      $('status-text').textContent = 'Waiting for your numbers';
      $('verdict-line').textContent = `Enter the ${WORDS[mode].noun} to see what you keep.`;
    }
    // THE MULTIPLIER ALERT. With one part relying on what is cut, the loss is in
    // proportion to the cut: a plain subtraction. With two or more, each part
    // passes its loss on to the next, so the loss is a product and comes out
    // larger than the parts added up. Say so, with the difference in money.
    const partsFed = TOUCHES.filter((t) => (touches[t.id] || 0) > 0).length;
    const multiplies = r.grossSaving > 0 && r.hidden.lostEarnings > 0 && r.lostShare > r.subtractionView + 0.0005;
    $('mult-alert').hidden = !multiplies;
    if (multiplies) {
      const p1 = (v) => `${(v * 100).toFixed(1)}%`;
      const extra = r.hidden.lostEarnings * (1 - r.subtractionView / r.lostShare);   // what multiplying adds to the lost income
      $('mult-alert').innerHTML = `<img class="sign-art" src="art/chain.png" alt=""><span><b>This loss multiplies.</b> ${partsFed} parts rely on ${w.taking}, and each passes its loss on to the next. Counted as a subtraction it is <span class="n">${p1(r.subtractionView)}</span> of the income that relies on it. Multiplied through it is <span class="n">${p1(r.lostShare)}</span>, which costs <span class="n">${money(extra)}</span> more.</span>`;
    }
    lastResult = r;
    drawBlocks(r);
    // The ratio: cost divided by saving, said as money.
    $('multiple-line').innerHTML = r.grossSaving > 0
      ? `For every <b>$1</b> ${mode === 'gain' ? 'gained' : 'saved'}, it costs you <b>$${r.multiple.toFixed(2)}</b>.`
      : '';
    // One thing to do about it, when a smaller version would have won.
    const f = r.informed;
    let todo = '';
    if (f && r.grossSaving > 0 && f.bestNet > f.plannedNet + 1 && f.bestNet > 0 && f.bestCut < f.plannedCut) {
      todo = mode === 'gain'
        ? `Taking only <b>${(f.bestCut * 100).toFixed(1)}%</b>, the part that is spare, would gain <b>${money(f.bestNet)}</b>.`
        : `Cutting only <b>${(f.bestCut * 100).toFixed(1)}%</b>, the part that is idle, would gain <b>${money(f.bestNet)}</b>.`;
    }
    $('do-line').innerHTML = todo;

    const x = r.inputs;
    let hinge;
    if (r.spareNeeded === null) hinge = `Even if all of ${w.taking} was spare, the one-time and side costs alone are more than the ${w.noun}.`;
    else if (r.spareNeeded === 0) hinge = `This breaks even however little of ${w.taking} was spare. The ${w.noun} is larger than what the ${w.change} could lose.`;
    else hinge = `This only breaks even if at least <b>${pct(r.spareNeeded)}</b> of ${w.taking} was doing nothing. You estimated <b>${pct(x.spareShare)}</b>.`;
    $('hinge').innerHTML = hinge;

    const facts = [];
    const yearsText = x.years === 1 ? '1 year' : `${+x.years.toFixed(2)} years`;
    facts.push(`Over ${yearsText} the books show ${money(r.bookedAtEnd)} beside this decision (the ${w.noun} less the one-time cost). The other ${money(r.bookedAtEnd - r.realAtEnd)} of cost is booked elsewhere or not booked at all.${x.discountRate > 0 ? ` Figures are present values at ${pct(x.discountRate)} a year.` : ''}`);
    if (r.supported && r.supported.incomePerDollar > 0) {
      const dollars = (v) => `$${v.toFixed(2)}`;
      facts.push(`Each $1 of this ${w.noun} was supporting ${dollars(r.supported.incomePerDollar)} of income, of which ${dollars(r.supported.contributionPerDollar)} was kept after other costs. ${r.supported.contributionPerDollar > 1 ? 'That is more than the dollar saved, so unless enough of it was spare, removing it costs more than it saves.' : 'That is less than the dollar saved, so on its own this would pay; the rest depends on what else it feeds.'}`);
    }
    const fed = TOUCHES.filter((t) => (touches[t.id] || 0) > 0);
    if (fed.length === 0) facts.push('You marked nothing as relying on it, so no income is counted as lost.');
    else if (r.lostShare > r.subtractionView + 0.0005) facts.push(`${w.removes} ${pct(r.subtractionView)} of what was working, and it feeds ${fed.length} parts of the business (${fed.map((t) => t.label.toLowerCase()).join(', ')}). As a subtraction that looks like ${pct(r.subtractionView)}; multiplied through, ${pct(r.lostShare)} of the income that relied on it is lost.`);
    if (r.looksGoodMonths > 0 && r.hidden.lostEarnings > 0) facts.push(`For the first ${monthsText(r.looksGoodMonths)} the lost income has not started, so the ${w.change} looks better than it is.`);
    if (r.turnsNegative !== null) facts.push(`It is ahead until ${whenText(r.turnsNegative)}, then it is behind for good. Its best point is ${money(r.peak.real)} at ${whenText(Math.max(1, r.peak.month))}.`);
    $('facts').innerHTML = facts.map((f) => `<li>${f}</li>`).join('');
  }

  // "A cut that pays": the same decision at other sizes.
  function renderInformed(r) {
    const card = $('informed-card'), f = r.informed, w = WORDS[mode];
    if (!f || r.grossSaving === 0) { card.hidden = true; return; }
    card.hidden = false;
    $('informed-title').textContent = mode === 'gain' ? 'How much of it pays' : 'A cut that pays';
    $('informed-lede').textContent = mode === 'gain'
      ? 'Not every gain is a trap. If there is spare capacity, using it costs nothing. The question is how far to go.'
      : 'Not every cut is a bad one. If part of it is idle, removing that part saves money and loses nothing. The question is where to stop.';
    const p1 = (v) => `${(v * 100).toFixed(1)}%`;
    const rows = [
      ['What you planned', p1(f.plannedCut), f.plannedNet, ''],
      [mode === 'gain' ? 'Using only what is spare' : 'Cutting only what is idle', p1(f.idle), f.spareOnlyNet, f.idle === 0 ? 'you said none of it was spare' : 'no income lost'],
      ['The size with the best result', p1(f.bestCut), f.bestNet, 'among sizes up to what you planned'],
      ['The largest that still does not lose', p1(f.largestThatPays), null, 'among sizes up to what you planned'],
    ];
    const bestNet = Math.max(f.plannedNet, f.spareOnlyNet, f.bestNet);
    $('informed-rows').innerHTML = rows.map(([name, size, net, note]) =>
      `<div class="irow" data-best="${net !== null && Math.abs(net - bestNet) < 0.5 && bestNet > 0}"><span class="in">${name}${note ? `<small>${note}</small>` : ''}</span><span class="ic">${size}</span><span class="iv">${net === null ? '' : money(net)}</span></div>`).join('');
    let say;
    if (f.deeperPays) say = `Each further 1 point saves <b>${money(f.savingPerPoint)}</b> and loses <b>${money(f.lossPerPointPastIdle)}</b> of income, so on these numbers going deeper still pays. That usually means the income relying on it is small next to what it costs.`;
    else if (f.idle === 0) say = `Nothing here was marked as spare, so every point costs more than it saves: each 1 point saves <b>${money(f.savingPerPoint)}</b> and loses <b>${money(f.lossPerPointPastIdle)}</b> of income. If some of it is idle, enter that under More detail to see the size that pays.`;
    else say = `Up to <b>${p1(f.idle)}</b> is idle, and removing it is pure ${w.noun}. Past that point each further 1 point saves <b>${money(f.savingPerPoint)}</b> and loses <b>${money(f.lossPerPointPastIdle)}</b> of income. That is where to stop.`;
    $('informed-say').innerHTML = say;
  }

  function renderRows(r) {
    const scale = Math.max(r.grossSaving, r.hiddenTotal, 1);
    const items = [
      ['One-time cost <span class="sub">shown in the books beside the decision</span>', r.kinds.direct],
      ['Hidden costs <span class="sub">side costs booked under other headings</span>', r.kinds.hidden],
      ['Opportunity cost <span class="sub">lost contribution; never booked</span>', r.kinds.opportunity],
      ['Unintended consequences <span class="sub">chance of undoing it x its cost</span>', r.kinds.unintended],
    ];
    const row = (name, amount, cls = '') => `<div class="row ${cls}"><span class="name">${name}</span><span class="track"><span class="bar" style="width:${Math.max(0, Math.min(100, Math.abs(amount) / scale * 100))}%"></span></span><span class="amt">${money(amount)}</span></div>`;
    $('rows').innerHTML =
      `<div class="row total"><span class="name">${mode === 'gain' ? 'Gain' : 'Saving'} over the period</span><span class="track"><span class="bar" style="width:${r.grossSaving / scale * 100}%;background:var(--o1)"></span></span><span class="amt">${money(r.grossSaving)}</span></div>`
      + items.map(([n, a]) => row(n, -a)).join('')
      + `<div class="row total keep"><span class="name">What you keep</span><span class="track">${r.realAtEnd > 0 ? `<span class="bar" style="width:${r.realAtEnd / scale * 100}%"></span>` : ''}</span><span class="amt">${money(r.realAtEnd)}</span></div>`;
  }

  // ── Chart: two lines over time, booked and real ──────────────────────────
  let last = null;
  function niceStep(span, target) {
    const raw = span / target, pow = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / pow;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
  }
  function renderChart(r) {
    const box = $('chartbox'), svg = $('chart');
    const W = Math.max(300, box.clientWidth), H = Math.round(Math.min(360, Math.max(240, W * 0.42)));
    const pad = { l: 58, r: W < 520 ? 16 : 150, t: 14, b: 34 };
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    const ys = r.series.flatMap((p) => [p.booked, p.real]).concat([0]);
    let lo = Math.min(...ys), hi = Math.max(...ys);
    if (hi === lo) hi = lo + 1;
    const step = niceStep(hi - lo, 5);
    lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step;
    const X = (m) => pad.l + (m / r.months) * iw;
    const Y = (v) => pad.t + (1 - (v - lo) / (hi - lo)) * ih;
    const path = (key) => r.series.map((p, i) => `${i ? 'L' : 'M'}${X(p.month).toFixed(1)},${Y(p[key]).toFixed(1)}`).join('');

    let g = '';
    for (let v = lo; v <= hi + step / 2; v += step) {
      const zero = Math.abs(v) < step / 1000;
      g += `<line x1="${pad.l}" x2="${pad.l + iw}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(${zero ? '--axis' : '--grid'})" stroke-width="${zero ? 1.5 : 1}"/>`;
      g += `<text x="${pad.l - 8}" y="${Y(v) + 4}" text-anchor="end" font-size="12" fill="var(--muted)">${shortMoney(zero ? 0 : v)}</text>`;
    }
    const yearTicks = r.months <= 12 ? 3 : 12;
    for (let m = 0; m <= r.months; m += yearTicks) {
      const label = m === 0 ? 'Now' : (yearTicks === 12 ? `Year ${m / 12}` : `Month ${m}`);
      g += `<text x="${X(m)}" y="${H - 10}" text-anchor="${m === 0 ? 'start' : m >= r.months ? 'end' : 'middle'}" font-size="12" fill="var(--muted)">${label}</text>`;
    }
    g += `<path d="${path('booked')}" fill="none" stroke="var(--o1)" stroke-width="2" stroke-linejoin="round"/>`;
    g += `<path d="${path('real')}" fill="none" stroke="var(--o2)" stroke-width="2" stroke-linejoin="round"/>`;
    const end = r.series[r.months];
    g += `<circle cx="${X(end.month)}" cy="${Y(end.booked)}" r="4" fill="var(--o1)" stroke="var(--surface)" stroke-width="2"/>`;
    g += `<circle cx="${X(end.month)}" cy="${Y(end.real)}" r="4" fill="var(--o2)" stroke="var(--surface)" stroke-width="2"/>`;
    if (pad.r > 100) {            // room for end labels; on a phone the legend and tiles carry them
      let yb = Y(end.booked) + 4, yr = Y(end.real) + 4;
      if (Math.abs(yb - yr) < 30) { const mid = (yb + yr) / 2; if (yb <= yr) { yb = mid - 15; yr = mid + 15; } else { yb = mid + 15; yr = mid - 15; } }
      g += `<text x="${X(end.month) + 10}" y="${yb}" font-size="13" fill="var(--ink)"><tspan font-weight="700">${shortMoney(end.booked)}</tspan><tspan x="${X(end.month) + 10}" dy="14" fill="var(--ink-2)" font-size="12">books</tspan></text>`;
      g += `<text x="${X(end.month) + 10}" y="${yr}" font-size="13" fill="var(--ink)"><tspan font-weight="700">${shortMoney(end.real)}</tspan><tspan x="${X(end.month) + 10}" dy="14" fill="var(--ink-2)" font-size="12">kept</tspan></text>`;
    }
    g += `<line id="cross" x1="0" x2="0" y1="${pad.t}" y2="${pad.t + ih}" stroke="var(--axis)" stroke-width="1" visibility="hidden"/>`;
    g += `<circle id="dot-b" r="5" fill="var(--o1)" stroke="var(--surface)" stroke-width="2" visibility="hidden"/><circle id="dot-r" r="5" fill="var(--o2)" stroke="var(--surface)" stroke-width="2" visibility="hidden"/>`;
    g += `<rect id="hit" x="${pad.l}" y="${pad.t}" width="${iw}" height="${ih}" fill="transparent"/>`;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', W); svg.setAttribute('height', H);
    svg.innerHTML = g;
    last = { r, X, Y, pad, iw, W };

    const hit = svg.querySelector('#hit'), tip = $('tooltip');
    const move = (clientX) => {
      const rect = svg.getBoundingClientRect();
      const px = (clientX - rect.left) * (W / rect.width);
      const m = Math.max(0, Math.min(r.months, Math.round((px - pad.l) / iw * r.months)));
      const p = r.series[m];
      const cx = X(m);
      svg.querySelector('#cross').setAttribute('x1', cx); svg.querySelector('#cross').setAttribute('x2', cx);
      svg.querySelector('#cross').setAttribute('visibility', 'visible');
      const db = svg.querySelector('#dot-b'), dr = svg.querySelector('#dot-r');
      db.setAttribute('cx', cx); db.setAttribute('cy', Y(p.booked)); db.setAttribute('visibility', 'visible');
      dr.setAttribute('cx', cx); dr.setAttribute('cy', Y(p.real)); dr.setAttribute('visibility', 'visible');
      tip.innerHTML = `<span class="t">${m === 0 ? 'Now' : whenText(m)}</span>`
        + `<span class="r"><span><i style="background:var(--o1)"></i>Books show</span><b>${money(p.booked)}</b></span>`
        + `<span class="r"><span><i style="background:var(--o2)"></i>You keep</span><b>${money(p.real)}</b></span>`
        + `<span class="r"><span>Gap</span><b>${money(p.booked - p.real)}</b></span>`;
      tip.hidden = false;
      const scale = rect.width / W, left = cx * scale;
      tip.style.left = `${Math.min(Math.max(4, left + 14), rect.width - tip.offsetWidth - 4)}px`;
      if (left + 14 + tip.offsetWidth > rect.width) tip.style.left = `${Math.max(4, left - tip.offsetWidth - 14)}px`;
      tip.style.top = `${pad.t + 6}px`;
    };
    const leave = () => { tip.hidden = true; for (const id of ['#cross', '#dot-b', '#dot-r']) svg.querySelector(id).setAttribute('visibility', 'hidden'); };
    hit.addEventListener('pointermove', (e) => move(e.clientX));
    hit.addEventListener('pointerdown', (e) => move(e.clientX));
    hit.addEventListener('pointerleave', leave);
  }

  function renderTable(r) {
    const stepM = r.months <= 12 ? 1 : r.months <= 36 ? 3 : 6;
    let rows = '';
    for (let m = 0; m <= r.months; m += stepM) {
      const p = r.series[m];
      rows += `<tr><td>${m === 0 ? 'Now' : whenText(m)}</td><td>${money(p.booked)}</td><td>${money(p.real)}</td><td>${money(p.booked - p.real)}</td></tr>`;
    }
    $('table').innerHTML = `<thead><tr><th>When</th><th>Books show</th><th>You keep</th><th>Gap</th></tr></thead><tbody>${rows}</tbody>`;
  }

  function render() {
    const r = analyze(readForm());
    renderVerdict(r); renderInformed(r); renderRows(r); renderChart(r); renderTable(r);
  }

  // ── Start ────────────────────────────────────────────────────────────────
  $('mode').addEventListener('click', (e) => { const b = e.target.closest('button[data-mode]'); if (b && b.dataset.mode !== mode) setMode(b.dataset.mode); });
  $('examples').addEventListener('change', (e) => pickExample(e.target.value));
  $('btn-own').addEventListener('click', () => { pickExample(mode === 'gain' ? 'own-gain' : 'own-saving'); $('saving').focus(); });
  for (const f of FIELDS) $(f).addEventListener('input', render);
  $('parts').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-part]');
    if (!b) return;
    touches[b.dataset.part] = (touches[b.dataset.part] || 0) > 0 ? 0 : 1;   // tap on, tap off
    drawTouches();
    render();
  });
  $('touches').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-id]');
    if (!b) return;
    touches[b.dataset.id] = Number(b.dataset.w);
    drawTouches();
    render();
  });
  let resizeTimer = null;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (last) renderChart(last.r); if (lastResult) drawBlocks(lastResult); }, 120); });
  $('deep').addEventListener('toggle', () => { if ($('deep').open && last) renderChart(last.r); });
  // The same for a link clicked while already on the page.
  window.addEventListener('hashchange', () => {
    const ex = EXAMPLES.find((e) => e.id === location.hash.slice(1) && !e.own);
    if (!ex) return;
    if (modeOf(ex) !== mode) setMode(modeOf(ex), false);
    pickExample(ex.id); $('examples').scrollIntoView({ block: 'center' });
  });
  // A link may name the side (#gain) or one of the worked decisions (#layoff).
  const asked = EXAMPLES.find((e) => e.id === location.hash.slice(1) && !e.own);
  if (asked) { setMode(modeOf(asked), false); pickExample(asked.id); }
  else setMode(location.hash === '#gain' ? 'gain' : 'saving');
})();
