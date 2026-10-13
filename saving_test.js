#!/usr/bin/env node
// Tests for the hidden cost formula. They try to break it: boundary cases,
// hand-worked sums, and the break-even figure checked by feeding it back in.
// Run: node saving_test.js
'use strict';
const { analyze, lostPerYear, clean } = require('./saving');
const { EXAMPLES, toInputs } = require('./saving-examples');

let pass = 0, fail = 0;
function ok(cond, name, detail = '') {
  if (cond) { pass++; console.log(`  OK   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' - ' + detail : ''}`); }
}
const section = (label) => console.log('\n-- ' + label + ' --');
const near = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

const base = { saving: 100000, oneTime: 0, dependentValue: 1000000, cutShare: 0.2, spareShare: 0, margin: 0.5, delayMonths: 0, knockOn: 0, undoChance: 0, undoCost: 0, years: 1 };

section('1. A hand-worked case');
{
  // Lost each year: 1,000,000 x 0.2 x (1 - 0) x 0.5 = 100,000. Saving 100,000. Net zero.
  const r = analyze(base);
  ok(lostPerYear(clean(base)) === 100000, 'lost earnings per year = dependence x cut x working share x margin = 100,000');
  ok(near(r.realAtEnd, 0), 'a 100,000 saving that loses 100,000 of earnings nets to zero', String(r.realAtEnd));
  ok(r.bookedAtEnd === 100000, 'while the books show the full 100,000');
  ok(near(r.eaten, 1), 'all of the saving is eaten');
}

section('2. Each factor at zero gives no loss');
{
  ok(analyze({ ...base, dependentValue: 0 }).realAtEnd === 100000, 'nothing depends on it: the saving is all real');
  ok(analyze({ ...base, cutShare: 0 }).realAtEnd === 100000, 'nothing is cut: no loss');
  ok(analyze({ ...base, spareShare: 1 }).realAtEnd === 100000, 'everything cut was spare: no loss');
  ok(analyze({ ...base, margin: 0 }).realAtEnd === 100000, 'those earnings kept nothing anyway: no loss');
  ok(analyze({ ...base, spareShare: 1 }).verdict === 'real', 'and the verdict is "real"');
}

section('3. The books and reality part company after the delay');
{
  const r = analyze({ ...base, delayMonths: 6, years: 2 });
  ok(r.series[6].real === r.series[6].booked, 'up to the delay, real and booked are the same line');
  ok(r.series[7].real < r.series[7].booked, 'after it, real falls below booked');
  ok(r.looksGoodMonths === 6, 'the tool reports how long it looks fine: 6 months');
  // Lost: 100,000 per year for 18 months = 150,000. Saved 200,000. Net 50,000.
  ok(near(r.realAtEnd, 50000), 'two years, six months of grace: 200,000 saved, 150,000 lost, 50,000 kept', String(r.realAtEnd));
}

section('4. One-time, side and undo costs');
{
  const r = analyze({ ...base, spareShare: 1, oneTime: 30000, knockOn: 20000, undoChance: 0.5, undoCost: 40000 });
  // 100,000 - 30,000 - 20,000 - 0.5 x 40,000 = 30,000
  ok(near(r.realAtEnd, 30000), '100,000 less 30,000 one-time, 20,000 side costs and a 50% chance of a 40,000 reversal = 30,000', String(r.realAtEnd));
  ok(near(r.hiddenTotal, 70000) && near(r.eaten, 0.7), 'hidden costs total 70,000, which is 70% of the saving');
  ok(r.verdict === 'mostly-eaten', 'verdict: real, but mostly eaten');
  ok(r.bookedAtEnd === 70000, 'the books show the saving less only the one-time cost');
}

section('5. The break-even figure is exact');
{
  const inputs = { saving: 700000, oneTime: 150000, dependentValue: 8000000, cutShare: 0.2, spareShare: 0.15, margin: 0.5, delayMonths: 4, knockOn: 90000, undoChance: 0.4, undoCost: 200000, years: 3 };
  const r = analyze(inputs);
  ok(r.spareNeeded > 0 && r.spareNeeded < 1, `it reports a spare share needed to break even (${(r.spareNeeded * 100).toFixed(1)}%)`);
  const atThreshold = analyze({ ...inputs, spareShare: r.spareNeeded });
  ok(near(atThreshold.realAtEnd, 0, 0.5), 'feeding that figure back in gives a net of zero', String(atThreshold.realAtEnd));
  ok(analyze({ ...inputs, spareShare: r.spareNeeded + 0.05 }).realAtEnd > 0, 'a little more spare than that: the saving is real');
  ok(analyze({ ...inputs, spareShare: r.spareNeeded - 0.05 }).realAtEnd < 0, 'a little less: it is a loss');
  ok(analyze({ ...base, saving: 500000 }).spareNeeded === 0, 'a saving larger than anything it could lose needs no spare at all');
  ok(analyze({ ...base, oneTime: 900000 }).spareNeeded === null, 'a cut whose fixed costs alone exceed the saving cannot break even');
}

section('6. Verdicts');
{
  ok(analyze({ ...base, spareShare: 0.9 }).verdict === 'real', 'little eaten: real');
  ok(analyze({ ...base, spareShare: 0.3 }).verdict === 'mostly-eaten', 'more than half eaten: mostly eaten');
  ok(analyze({ ...base, spareShare: 0, knockOn: 10000 }).verdict === 'loss', 'more than all of it eaten: a loss');
  const r = analyze({ ...base, delayMonths: 6, years: 3, knockOn: 30000 });
  ok(r.turnsNegative !== null && r.series[r.turnsNegative].real < 0 && r.series[r.turnsNegative - 1].real >= 0,
    'when a saving starts positive and ends negative, the month it turns is reported', String(r.turnsNegative));
}

section('7. Odd input does not break it');
{
  const r = analyze({ saving: 'abc', cutShare: 5, spareShare: -2, margin: 9, years: 0, dependentValue: null });
  ok(Number.isFinite(r.realAtEnd) && r.series.length >= 4, 'text, out-of-range shares and a zero period are cleaned, not crashed on');
  ok(r.inputs.cutShare === 1 && r.inputs.spareShare === 0 && r.inputs.margin === 1, 'shares are held between 0 and 1');
  ok(analyze({}).verdict === 'real' && analyze({}).realAtEnd === 0, 'empty input gives zero, with nothing eaten');
}

section('8. The examples');
{
  const verdicts = Object.fromEntries(EXAMPLES.map((e) => [e.id, analyze(toInputs(e.values))]));
  for (const e of EXAMPLES) {
    const r = verdicts[e.id];
    console.log(`       ${e.label.padEnd(30)} books ${Math.round(r.bookedAtEnd).toLocaleString().padStart(10)}   real ${Math.round(r.realAtEnd).toLocaleString().padStart(10)}   eaten ${(r.eaten * 100).toFixed(0).padStart(3)}%   ${r.verdict}`);
  }
  ok(verdicts.layoff.verdict === 'loss' && verdicts.layoff.bookedAtEnd > 0, 'the layoff example books a gain and is really a loss');
  ok(verdicts.subscription.verdict === 'real', 'the unused subscription holds up: the tool can say yes');
  ok(new Set(Object.values(verdicts).map((r) => r.verdict)).size === 3, 'between them the examples show all three verdicts');
}

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
