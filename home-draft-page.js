// The draft front page: five decisions, each with a small calculator that takes
// the visitor's own numbers, and the list of the five ways a cost behaves.
//
// No sum is done in this file. Each tab calls the same engine as the full
// calculator it links to (worth.js, saving.js, multiple.js), with fewer boxes.
// Where a tab leaves a box out, the value used is written beside it below.
//
// Every answer carries the plain sentence and the kind of gain or loss it is,
// with its picture (kinds.js). The piggy bank is whole, cracked or broken only
// where the full calculator itself gives a verdict; otherwise it stays as it
// is, because this page adds no judgement of its own.
'use strict';
(function () {
  const $ = (id) => document.getElementById(id);
  const dollars = (v) => (v < 0 ? '-$' : '$') + Math.round(Math.abs(v)).toLocaleString('en-US');
  const cents = (v) => (v < 0 ? '-$' : '$') + Math.abs(v).toFixed(2);
  const pct = (share) => Math.round(share * 100) + '%';
  const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);

  // Each tab: the boxes (id, label, example value) and `work`, which takes the
  // typed numbers and returns { line, sub, kind: [id, n, why], tone }.
  // `tone` picks the piggy bank: good = whole, mixed = cracked, bad = broken.
  const TABS = [
    { id: 'buy', colour: '#3987e5', label: 'Buying something', more: ['index.html', 'Full calculator: flights, hotels, repairs, loans'],
      hint: 'A fare with its bag fees, a hotel with its resort fee, a printer with its ink, a phone with its plan.',
      boxes: [['base', 'The price you were shown', 79], ['extras', 'The extras you would need, added up', 160], ['full', 'The price of the one that includes them', 229]],
      work(v) {
        if (v.base <= 0) return { line: 'Type the price you were shown.' };
        const r = window.Worth.evaluateAddons({ people: 1, base: v.base, add1: v.extras, full: v.full });
        const really = 'It says ' + dollars(v.base) + '. It costs ' + dollars(r.total) + '.';
        const kind = ['steady', v.extras > 0 ? 5 : 0, 'The extras add their own price and nothing more: ' + dollars(v.extras) + ' on top.'];
        if (v.full <= 0) return { line: really, sub: 'Add the price of the other one to compare them.', kind };
        return {
          line: really + (r.net > 0 ? ' Still ' + dollars(r.net) + ' cheaper.' : r.net < 0 ? ' That is ' + dollars(-r.net) + ' more than the other one.' : ' The same as the other one.'),
          sub: 'It stays cheaper as long as the extras come to less than ' + dollars(Math.max(0, r.roomForAddons)) + '.',
          kind, tone: r.tone,
        };
      } },

    { id: 'work', colour: '#199e70', label: 'Taking work', more: ['gig.html', 'Full calculator: gig log, jobs, side work'],
      hint: 'A delivery shift, a second job, a side gig. For one week.',
      boxes: [['pay', 'What it pays you for the week', 220], ['costs', 'What it costs you to do it: fuel, fees, supplies', 45], ['hours', 'Hours you are paid for', 12], ['unpaid', 'Hours you are not paid for: waiting, travel', 3]],
      work(v) {
        if (v.pay <= 0 || v.hours <= 0) return { line: 'Type the pay and the hours.' };
        // The other option's rate is not asked for here, so only the two hourly figures are used.
        const r = window.Worth.evaluateJob({ takeHome: v.pay, costs: v.costs, hours: v.hours, extraHours: v.unpaid, altHourly: 1 });
        const share = r.realHourly / r.statedHourly;
        return {
          line: 'It says ' + cents(r.statedHourly) + ' an hour. You make ' + cents(r.realHourly) + '.',
          sub: 'You keep ' + dollars(r.kept) + ' for ' + r.hoursGiven + ' hours of your time.',
          kind: ['steady', Math.round((1 - Math.max(0, share)) * 10), 'The costs come off the pay once, and the unpaid hours spread what is left more thinly.'],
        };
      } },

    { id: 'wait', colour: '#c98500', label: 'Putting something off', more: ['wait.html', 'Full calculator: repairs, card balances, the dentist'],
      hint: 'A repair, a bill, a check-up. Leave the last box at 0 unless what you owe grows each month, as a card balance does.',
      boxes: [['now', 'What it costs to deal with now', 400], ['months', 'Months you would wait', 6], ['chance', 'Chance it turns into something bigger (%)', 30], ['worse', 'What the bigger problem would cost', 2200], ['growth', 'It grows each month by (%)', 0]],
      work(v) {
        if (v.now <= 0) return { line: 'Type what it costs to deal with now.' };
        const r = window.Worth.evaluateWait({ costNow: v.now, months: v.months, growth: v.growth / 100, chanceWorse: Math.min(1, v.chance / 100), costWorse: v.worse });
        const grows = v.growth > 0 && v.months > 0;
        return {
          line: 'Now it costs ' + dollars(v.now) + '. Waiting costs ' + dollars(r.laterTotal) + ', on average.',
          sub: r.waitingCosts > 0 ? 'Putting it off costs you ' + dollars(r.waitingCosts) + ' more, counting the chance it gets worse.' : 'On these numbers waiting costs you nothing extra.',
          kind: grows ? ['snowball', Math.min(10, v.months), 'It grows on what it has already grown to: ' + pct(v.growth / 100) + ' a month for ' + plural(v.months, 'month', 'months') + '.']
            : ['steady', Math.round(Math.min(1, v.chance / 100) * 10), 'A chance of a bigger bill, counted once. Nothing here is growing month by month.'],
          tone: r.tone,
        };
      } },

    { id: 'cut', colour: '#d55181', label: 'Cutting a cost', more: ['flow.html', 'Full calculator: in, system, out'],
      hint: 'A budget line, a supplier, a team. Figures for one year.',
      boxes: [['saving', 'What the cut saves in a year', 50000], ['income', 'Income a year that relies on what is cut', 1200000], ['share', 'How much of it is cut (%)', 10], ['margin', 'Kept from each dollar of that income (%)', 40], ['parts', 'Parts of the business that rely on it (1 to 5)', 3]],
      work(v) {
        if (v.saving <= 0) return { line: 'Type what the cut saves.' };
        const parts = Math.min(5, Math.max(1, Math.round(v.parts) || 1));
        // One year, nothing spare, no delay and no other costs: the full calculator asks about each.
        const r = window.HiddenCost.analyze({ saving: v.saving, dependentValue: v.income, cutShare: v.share / 100, margin: v.margin / 100, reach: parts, years: 1 });
        return {
          line: 'The books show ' + dollars(r.bookedAtEnd) + ' saved. What is left is ' + dollars(r.realAtEnd) + '.',
          sub: 'A cut of ' + pct(r.subtractionView) + ' removes ' + pct(r.lostShare) + ' of the income that relied on it.',
          kind: parts > 1 ? ['domino', parts, plural(parts, 'part relies', 'parts rely') + ' on it, and each passes on only what it received.']
            : ['steady', Math.round(r.subtractionView * 10), 'One part relies on it, so the loss is its own size.'],
          tone: { real: 'good', 'mostly-eaten': 'mixed', loss: 'bad' }[r.verdict],
        };
      } },

    { id: 'step', colour: '#9085e9', label: 'Adding a step', more: ['barriers.html', 'Full calculator: interview rounds, forms, fees, checks'],
      hint: 'An interview round, a form, a sign-off, a fee. How many of the people you want make it through?',
      boxes: [['start', 'People you want who start', 400], ['drop', 'Share who give up at each step (%)', 15], ['steps', 'Number of steps', 4]],
      work(v) {
        if (v.start <= 0) return { line: 'Type how many people start.' };
        const steps = Math.min(10, Math.max(0, Math.round(v.steps)));
        const kept = window.Multiple.chainKept(Math.min(1, v.drop / 100), steps);
        return {
          line: 'Of ' + Math.round(v.start).toLocaleString('en-US') + ' who start, ' + Math.round(v.start * kept).toLocaleString('en-US') + ' finish.',
          sub: pct(1 - kept) + ' are lost along the way, though each step only loses ' + pct(v.drop / 100) + '.',
          kind: ['domino', steps, 'Each step works on who the last one left, so ' + plural(steps, 'step multiplies', 'steps multiply') + '.'],
        };
      } },
  ];

  let tab = TABS[0];
  const typed = {};          // what the visitor typed, kept for each tab while they look at another

  function numbers() {
    const v = {};
    for (const [id] of tab.boxes) {
      const n = window.Worth.parseMoney($('box-' + id).value);
      v[id] = Number.isFinite(n) ? n : 0;
    }
    return v;
  }

  function answer() {
    typed[tab.id] = Object.fromEntries(tab.boxes.map(([id]) => [id, $('box-' + id).value]));
    const a = tab.work(numbers());
    $('ans-line').textContent = a.line;
    $('ans-sub').textContent = a.sub || '';
    $('ans-kind').innerHTML = a.kind ? window.Kinds.tag(a.kind[0], a.kind[1], a.kind[2]) : '';
    $('ans-pig').src = 'art/' + ({ good: 'pig-whole', mixed: 'pig-cracked', bad: 'pig-broken' }[a.tone] || 'pig-save') + '.png';
  }

  function show(id) {
    tab = TABS.find((t) => t.id === id);
    $('tabs').innerHTML = TABS.map((t) => '<button type="button" data-tab="' + t.id + '" style="--c: ' + t.colour + '" aria-pressed="' + (t === tab) + '">' + t.label + '</button>').join('');
    $('tool').style.setProperty('--c', tab.colour);          // the panel takes the colour of the decision chosen
    const kept = typed[tab.id] || {};
    $('boxes').innerHTML = tab.boxes.map(([box, label, example]) =>
      '<label><span>' + label + '</span><input id="box-' + box + '" inputmode="decimal" value="' + (box in kept ? kept[box] : example) + '"></label>').join('');
    $('tab-hint').textContent = tab.hint;
    $('tab-more').href = tab.more[0];
    $('tab-more').textContent = tab.more[1];
    answer();
  }

  $('tabs').addEventListener('click', (e) => { const b = e.target.closest('button[data-tab]'); if (b) show(b.dataset.tab); });
  $('boxes').addEventListener('input', answer);
  show('buy');

  // ── The five ways a cost behaves. One slider pushes every picture at once. ──
  function kinds() {
    const n = Number($('push').value);
    $('push-v').textContent = n === 0 ? 'not at all' : n === 10 ? 'all the way' : n + ' of 10';
    $('kinds').innerHTML = window.Kinds.ORDER.map((id) => window.Kinds.card(id, n)).join('');
  }
  $('push').addEventListener('input', kinds);
  kinds();
})();
