#!/usr/bin/env node
// Tests for "what else it feeds": the wage is a cost, but the same thing also
// feeds capacity, know-how, selling and relationships, each to a degree, and
// the loss multiplies through every part it feeds.
// Run: node saving_touch_test.js
'use strict';
const { analyze, lostShare, clean } = require('./saving');
const { EXAMPLES, TOUCHES, toInputs } = require('./saving-examples');

let pass = 0, fail = 0;
function ok(cond, name, detail = '') {
  if (cond) { pass++; console.log(`  OK   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' - ' + detail : ''}`); }
}
const section = (label) => console.log('\n-- ' + label + ' --');
const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;
const share = (o) => lostShare(clean(o));

section('1. Strengths multiply');
{
  ok(near(share({ cutShare: 0.2, touches: [1] }), 0.2), 'one part, fully: lose the share cut, 20%');
  ok(near(share({ cutShare: 0.2, touches: [1, 0.5] }), 1 - 0.8 * 0.9), 'fully plus partly: keep 0.8 x 0.9 = 0.72, lose 28%');
  ok(near(share({ cutShare: 0.2, touches: [1, 0.5, 0.5, 0.5] }), 1 - 0.8 * 0.9 * 0.9 * 0.9), 'fully plus three partly: keep 0.8 x 0.9 x 0.9 x 0.9, lose 41.7%', String(share({ cutShare: 0.2, touches: [1, 0.5, 0.5, 0.5] })));
  ok(near(share({ cutShare: 0.1, touches: [1, 1, 1] }), share({ cutShare: 0.1, reach: 3 })), 'three parts fully is the same as the count form, reach 3');
  ok(share({ cutShare: 0.2, touches: [0, 0, 0] }) === 0, 'marking nothing as relying on it counts no loss');
  ok(near(share({ cutShare: 0.2, touches: [0.5] }), 0.1), 'a part that only partly relied on it loses half as much');
}

section('2. More parts fed, or fed more strongly, never lowers the loss');
{
  let prev = 0, rising = true;
  const list = [];
  for (let i = 0; i < 7; i++) { list.push(0.5); const v = share({ cutShare: 0.15, touches: list.slice() }); if (v <= prev) rising = false; prev = v; }
  ok(rising, 'adding parts one at a time, the loss rises every time');
  ok(share({ cutShare: 0.15, touches: [1, 1] }) > share({ cutShare: 0.15, touches: [1, 0.5] }), 'a stronger tie loses more than a weaker one');
  ok(share({ cutShare: 1, touches: [1, 0.5, 0.5] }) === 1, 'cut all of what the work fully needs and all the output goes');
  ok(prev < 1, 'and the loss stays below everything while anything is left');
}

section('3. The break-even figure with mixed strengths');
{
  const inputs = { saving: 700000, oneTime: 150000, dependentValue: 8000000, cutShare: 0.2, spareShare: 0.15, margin: 0.5, delayMonths: 4, knockOn: 90000, undoChance: 0.4, undoCost: 200000, years: 3, touches: [1, 0.5, 0.5, 0.5] };
  const r = analyze(inputs);
  ok(r.spareNeeded > 0 && r.spareNeeded < 1, `a spare share needed to break even is found (${(r.spareNeeded * 100).toFixed(1)}%)`);
  ok(Math.abs(analyze({ ...inputs, spareShare: r.spareNeeded }).realAtEnd) < 1, 'feeding it back in gives a net of zero (to within a dollar)', String(analyze({ ...inputs, spareShare: r.spareNeeded }).realAtEnd));
  ok(r.spareNeeded > analyze({ ...inputs, touches: [1] }).spareNeeded, 'the more it feeds, the more of the cut must have been spare for it to pay');
  ok(analyze({ ...inputs, touches: [] }).spareNeeded === 0 && analyze({ ...inputs, touches: [] }).hidden.lostEarnings === 0, 'if it feeds nothing, no spare is needed and no income is lost');
}

section('4. The examples carry what each cut feeds');
{
  ok(TOUCHES.length === 7 && new Set(TOUCHES.map((t) => t.id)).size === 7, 'seven named parts, each listed once');
  ok(EXAMPLES.every((e) => e.values.touches && Object.keys(e.values.touches).every((k) => TOUCHES.some((t) => t.id === k))), 'every example names real parts');
  const layoff = analyze(toInputs(EXAMPLES.find((e) => e.id === 'layoff').values));
  ok(layoff.lostShare > layoff.subtractionView, `layoff: ${(layoff.subtractionView * 100).toFixed(0)}% as a subtraction, ${(layoff.lostShare * 100).toFixed(0)}% multiplied through`);
  ok(layoff.verdict === 'loss' && layoff.bookedAtEnd > 0, 'the books show a gain; the real result is a loss');
  const training = analyze(toInputs(EXAMPLES.find((e) => e.id === 'training').values));
  console.log(`       Cut training: books ${Math.round(training.bookedAtEnd).toLocaleString()}, real ${Math.round(training.realAtEnd).toLocaleString()}, eaten ${(training.eaten * 100).toFixed(0)}%, ${training.verdict}`);
  ok(training.bookedAtEnd === 150000 && training.realAtEnd < training.bookedAtEnd, 'cut training: the books show the full budget saved; less than that is kept');
  ok(new Set(EXAMPLES.map((e) => analyze(toInputs(e.values)).verdict)).size === 3, 'the examples still show all three verdicts');
}

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
