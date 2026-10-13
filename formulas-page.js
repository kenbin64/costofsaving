// Worked example for formulas.html. Every figure is taken from the calculator's
// own engine (saving.js) at the moment the page loads, and each step shows the
// numbers that went into it, so a reader can redo it with a pocket calculator.
'use strict';
(function () {
  const { analyze } = window.HiddenCost;
  const { EXAMPLES, TOUCHES, toInputs } = window.HiddenCostExamples;
  const $ = (id) => document.getElementById(id);
  const money = (v) => (v < 0 ? '-' : '') + Math.abs(Math.round(v)).toLocaleString('en-US');
  const dec = (v, d = 4) => Number(v).toFixed(d).replace(/0+$/, '').replace(/\.$/, '');
  const pct = (v, d = 1) => `${(v * 100).toFixed(d)}%`;

  const example = EXAMPLES.find((e) => e.id === 'layoff');
  const r = analyze(toInputs(example.values));
  const x = r.inputs, w = r.working;
  const parts = TOUCHES.filter((t) => (example.values.touches[t.id] || 0) > 0)
    .map((t) => `${t.label.toLowerCase()} (${example.values.touches[t.id]})`);

  // The inputs, as entered.
  const rows = [
    ['S', 'Expected saving each year', money(x.saving)],
    ['C0', 'One-time cost', money(x.oneTime)],
    ['D', 'Yearly income that relies on the team', money(x.dependentValue)],
    ['c', 'How much is cut', dec(x.cutShare)],
    ['s', 'How much of the cut was spare', dec(x.spareShare)],
    ['g', 'Contribution margin', dec(x.margin)],
    ['w', 'What relies on it', parts.join(', ')],
    ['t0', 'Months before the loss shows up', dec(x.delayMonths)],
    ['k', 'Side costs each year', money(x.knockOn)],
    ['p', 'Chance of undoing it', dec(x.undoChance)],
    ['U', 'Cost of undoing it', money(x.undoCost)],
    ['T', 'Look ahead', `${r.months} months`],
    ['r', 'Discount rate', dec(x.discountRate)],
  ];
  $('ex-inputs').innerHTML = '<thead><tr><th>Symbol</th><th>Input</th><th class="num">Value</th></tr></thead><tbody>'
    + rows.map(([s, n, v]) => `<tr><td class="sym">${s}</td><td>${n}</td><td class="num">${v}</td></tr>`).join('') + '</tbody>';

  const keptFactors = w.strengths.map((s) => `(1 - ${dec(w.workingCut)} x ${dec(s)})`).join(' x ');
  const keptValues = w.strengths.map((s) => dec(1 - w.workingCut * s)).join(' x ');
  const steps = [
    ['F1', `a = ${dec(x.cutShare)} x (1 - ${dec(x.spareShare)})`, 'working share cut', dec(w.workingCut)],
    ['F2', `K = ${keptFactors} = ${keptValues}`, 'share of output kept', dec(w.keptShare, 6)],
    ['F3', `L = 1 - ${dec(w.keptShare, 6)}`, `share of output lost; as a plain subtraction it would be ${pct(r.subtractionView)}`, `${dec(r.lostShare, 6)} (${pct(r.lostShare)})`],
    ['F4', `O = ${money(x.dependentValue)} x ${dec(r.lostShare, 6)} x ${dec(x.margin)}`, 'lost contribution each year', money(w.lostPerYear)],
    ['F5', `Y = ${r.months} / 12`, "years' worth of the saving", dec(w.yearsOfSaving)],
    ['F6', `YL = (${r.months} - ${dec(x.delayMonths)}) / 12`, "years' worth of the loss", dec(w.yearsOfLoss)],
    ['F7', `G = ${money(x.saving)} x ${dec(w.yearsOfSaving)}`, 'the saving over the period', money(r.grossSaving)],
    ['F8', `C0`, 'one-time cost', money(r.kinds.direct)],
    ['F8', `k x Y = ${money(x.knockOn)} x ${dec(w.yearsOfSaving)}`, 'side costs', money(r.kinds.hidden)],
    // Shown as the exact fraction when there is no discounting, so a pocket calculator lands on the same figure.
    ['F8', x.discountRate === 0
      ? `O x YL = ${money(w.lostPerYear)} x ${dec(r.months - x.delayMonths)} / 12`
      : `O x YL = ${money(w.lostPerYear)} x ${dec(w.yearsOfLoss, 6)}`, 'lost contribution', money(r.kinds.opportunity)],
    ['F8', `p x U = ${dec(x.undoChance)} x ${money(x.undoCost)}`, 'expected reversal cost', money(r.kinds.unintended)],
    ['F9', `TC = ${money(r.kinds.direct)} + ${money(r.kinds.hidden)} + ${money(r.kinds.opportunity)} + ${money(r.kinds.unintended)}`, 'total cost of the change', money(r.totalCost)],
    ['F9', `N = ${money(r.grossSaving)} - ${money(r.totalCost)}`, 'net result', money(r.realAtEnd), 'total'],
    ['F9', `M = ${money(r.totalCost)} / ${money(r.grossSaving)}`, 'the multiple', dec(r.multiple, 3)],
    ['F10', `B = ${money(r.grossSaving)} - ${money(x.oneTime)}`, 'what the books show beside the decision', money(r.bookedAtEnd)],
    ['F12', `D x c / S = ${money(x.dependentValue)} x ${dec(x.cutShare)} / ${money(x.saving)}`, 'income supported per dollar saved', `$${r.supported.incomePerDollar.toFixed(2)}`],
    ['F12', `D x c x g / S = ${money(x.dependentValue)} x ${dec(x.cutShare)} x ${dec(x.margin)} / ${money(x.saving)}`, 'contribution supported per dollar saved', `$${r.supported.contributionPerDollar.toFixed(2)}`],
    ['F11', `s*`, `break-even spare share: at this value N = 0 (you estimated ${pct(x.spareShare, 0)})`, r.spareNeeded === null ? 'none' : pct(r.spareNeeded)],
  ];
  $('ex-steps').innerHTML = steps.map(([n, work, what, result, cls]) =>
    `<div class="step ${cls || ''}"><span class="n">${n}</span><span class="w">${work}<small>${what}</small></span><span class="r">${result}</span></div>`).join('');
})();
