// The streamlined page: one decision read as  IN  ->  SYSTEM  ->  OUT.
//
//   IN      what is changed: the saving (or gain) and what it costs to make the change
//   SYSTEM  what that change passes through: the income that relies on it, how much
//           of it is touched, how much was spare, and how many parts rely on it
//   OUT     what the books show, and what is left once everything is counted
//
// Every sum is done by saving.js (the tested engine). This file only reads the
// form, calls it, and writes the answer. Two directions:
//
//   forward  set IN and SYSTEM, read OUT
//   reverse  hold OUT at break-even, read what IN and SYSTEM would have to be
'use strict';
(function () {
  const { analyze } = window.HiddenCost;
  const { EXAMPLES, toInputs } = window.HiddenCostExamples;
  const $ = (id) => document.getElementById(id);

  // The few figures this page asks for. Everything else keeps the example's value.
  const FIELDS = ['saving', 'oneTime', 'dependentValue', 'cutShare', 'spareShare', 'bufferShare', 'margin', 'years'];
  let values = {};        // the example's figures, with the visitor's changes on top
  let parts = 1;          // how many parts of the business rely on it, each fully
  let direction = 'forward';

  const money = (v) => {
    const a = Math.abs(v), sign = v < 0 ? '-' : '';
    if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(a >= 1e7 ? 1 : 2)}M`;
    if (a >= 1e4) return `${sign}$${Math.round(a / 1e3)}k`;
    return `${sign}$${Math.round(a).toLocaleString('en-US')}`;
  };
  const pct = (share) => `${(share * 100).toFixed(share < 0.1 ? 1 : 0)}%`;

  // An example comes with its own parts, some of them at half strength. Those are
  // kept until the visitor picks a number of parts, which then count at full strength.
  let ownParts = false;
  function inputs(partCount) {
    const bufferShare = (values.bufferShare || 0) / 100;
    if (!ownParts && partCount === parts) return { ...toInputs(values), bufferShare };
    return { ...toInputs({ ...values, touches: {} }), touches: undefined, reach: partCount, bufferShare };
  }

  function pickExample(id) {
    const ex = EXAMPLES.find((e) => e.id === id);
    values = { bufferShare: 0, ...ex.values };
    parts = Math.max(1, Object.values(ex.values.touches || {}).filter((w) => w > 0).length);
    ownParts = false;
    for (const f of FIELDS) $(f).value = values[f];
    $('note').textContent = ex.note;
    draw();
  }

  function readForm() {
    for (const f of FIELDS) values[f] = Number($(f).value) || 0;
  }

  function drawParts() {
    $('parts').innerHTML = [1, 2, 3, 4, 5].map((n) =>
      `<button type="button" data-n="${n}" aria-pressed="${n === parts}">${n}</button>`).join('');
  }

  function drawForward(r) {
    const verdict = { loss: ['It loses money', 'bad'], 'mostly-eaten': ['It wins, barely', 'mixed'], real: ['The saving is real', 'good'] }[r.verdict];
    $('out').innerHTML = `
      <div class="pair"><span>The books show</span><b>${money(r.bookedAtEnd)}</b></div>
      <div class="pair"><span>Lost on the way through</span><b>${money(-(r.hiddenTotal - r.hidden.oneTime))}</b></div>
      <div class="pair total ${verdict[1]}"><span>What is left</span><b>${money(r.realAtEnd)}</b></div>
      <p class="verdict ${verdict[1]}">${verdict[0]}</p>
      <p class="hint">Cutting ${pct(r.subtractionView)} of what was working removes ${pct(r.lostShare)} of the income that relied on it${parts > 1 ? `, because ${parts} parts each pass on only what they receive` : ''}.</p>`;
  }

  function drawReverse(r) {
    const rows = [];
    if (r.informed) {
      rows.push(['IN: the cut that costs nothing', pct(r.informed.idle), 'spare, and not kept for busy times']);
      rows.push(['IN: the largest cut that still pays', pct(r.informed.largestThatPays), `you planned ${pct(r.informed.plannedCut)}`]);
      rows.push(['IN: the size that leaves the most', pct(r.informed.bestCut), `leaves ${money(r.informed.bestNet)}`]);
    }
    rows.push(['SYSTEM: how much of it must have been free to cut',
      r.spareNeeded === null ? 'no amount' : pct(r.spareNeeded),
      r.spareNeeded === null ? 'the other costs alone exceed the saving' : `you said ${pct(r.inputs.spareShare * (1 - r.inputs.bufferShare))}`]);
    // The most parts that can rely on it before the answer turns to a loss.
    let most = 0;
    for (let n = 1; n <= 12; n++) { if (analyze(inputs(n)).realAtEnd >= 0) most = n; else break; }
    rows.push(['SYSTEM: the most parts that can rely on it', most === 0 ? 'none' : most === 12 ? '12 or more' : String(most), `you chose ${parts}`]);
    $('out').innerHTML = `<p class="hint">Holding what is left at exactly nothing, this is what the other two would have to be.</p>` +
      rows.map(([name, value, note]) => `<div class="pair"><span>${name}<i>${note}</i></span><b>${value}</b></div>`).join('');
  }

  function draw() {
    drawParts();
    const r = analyze(inputs(parts));
    for (const b of document.querySelectorAll('#direction button')) b.setAttribute('aria-pressed', String(b.dataset.dir === direction));
    $('out-title').textContent = direction === 'forward' ? 'Out' : 'Out, held at break-even';
    if (direction === 'forward') drawForward(r); else drawReverse(r);
    // The piggy bank: whole when the saving is real, cracked when most of it is eaten, broken on a loss.
    $('out-pig').src = 'art/' + { real: 'pig-whole', 'mostly-eaten': 'pig-cracked', loss: 'pig-broken' }[r.verdict] + '.png';
    // Every answer says which kind of loss it is. One part relying on it at full
    // strength is a plain subtraction; more than one, and the loss multiplies.
    const relying = r.working.strengths.length;
    const plain = relying === 1 && r.working.strengths[0] === 1;
    $('out-kind').innerHTML = plain
      ? window.Kinds.tag('steady', Math.round(r.subtractionView * 10), `One part relies on it, so the loss is its own size: ${pct(r.lostShare)} of that income.`)
      : window.Kinds.tag('domino', relying, `${relying} parts rely on it, so a cut of ${pct(r.subtractionView)} removes ${pct(r.lostShare)} of that income.`);
  }

  const offered = EXAMPLES.filter((e) => !e.own && e.mode !== 'gain');
  $('example').innerHTML = offered.map((e) => `<option value="${e.id}">${e.label}</option>`).join('');
  $('example').addEventListener('change', (e) => pickExample(e.target.value));
  for (const f of FIELDS) $(f).addEventListener('input', () => { readForm(); draw(); });
  $('parts').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { parts = Number(b.dataset.n); ownParts = true; draw(); } });
  $('direction').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { direction = b.dataset.dir; draw(); } });
  pickExample(offered[0].id);
})();
