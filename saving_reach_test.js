#!/usr/bin/env node
// Tests for the multiplier principle: an input that several steps of the work
// need is not subtracted from output, it divides it.
// Run: node saving_reach_test.js
'use strict';
const { analyze, lostShare, clean } = require('./saving');

let pass = 0, fail = 0;
function ok(cond, name, detail = '') {
  if (cond) { pass++; console.log(`  OK   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' - ' + detail : ''}`); }
}
const section = (label) => console.log('\n-- ' + label + ' --');
const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;
const share = (o) => lostShare(clean(o));

section('1. One step: the loss is the share cut, as before');
{
  ok(near(share({ cutShare: 0.1, spareShare: 0, reach: 1 }), 0.1), 'cut 10% of something one step needs: lose 10%');
  ok(near(share({ cutShare: 0.1, spareShare: 0 }), 0.1), 'leaving the steps out means one step');
}

section('2. Several steps: the loss multiplies');
{
  ok(near(share({ cutShare: 0.1, spareShare: 0, reach: 3 }), 1 - 0.9 * 0.9 * 0.9), 'three steps each need it: keep 0.9 x 0.9 x 0.9, lose 27.1%', String(share({ cutShare: 0.1, spareShare: 0, reach: 3 })));
  const losses = [1, 2, 3, 4, 5, 6].map((n) => share({ cutShare: 0.1, spareShare: 0, reach: n }));
  ok(losses.every((v, i) => i === 0 || v > losses[i - 1]), 'every extra step that needs it makes the loss bigger');
  const kept = losses.map((v) => 1 - v);
  ok(kept.every((v, i) => i === 0 || near(v / kept[i - 1], 0.9)), 'what is kept shrinks by the same factor at each step: a power of the number of steps');
  ok(losses.every((v) => v > 0 && v < 1), 'and it never loses more than everything');
  ok(share({ cutShare: 0.1, spareShare: 0, reach: 3 }) > 0.1 * 2.5, 'at three steps a 10% cut costs more than two and a half times what the subtraction suggests');
}

section('3. The limits still hold');
{
  ok(share({ cutShare: 0.5, spareShare: 1, reach: 5 }) === 0, 'if everything cut was spare, nothing is lost however many steps');
  ok(share({ cutShare: 0, spareShare: 0, reach: 5 }) === 0, 'if nothing is cut, nothing is lost');
  ok(share({ cutShare: 1, spareShare: 0, reach: 1 }) === 1, 'cut all of something the work needs and all of the output goes: no labour, no production');
  ok(share({ cutShare: 1, spareShare: 0, reach: 4 }) === 1, 'the same with several steps');
}

section('4. The whole answer changes with reach');
{
  const base = { saving: 100000, oneTime: 0, dependentValue: 1000000, cutShare: 0.1, spareShare: 0, margin: 0.5, delayMonths: 0, knockOn: 0, undoChance: 0, undoCost: 0, years: 1 };
  const one = analyze({ ...base, reach: 1 }), three = analyze({ ...base, reach: 3 });
  // One step: lose 1,000,000 x 0.10 x 0.5 = 50,000, keep 50,000.
  ok(Math.abs(one.realAtEnd - 50000) < 0.01, 'one step: 100,000 saved, 50,000 lost, 50,000 kept', String(one.realAtEnd));
  // Three steps: lose 1,000,000 x 0.271 x 0.5 = 135,500, a loss of 35,500.
  ok(Math.abs(three.realAtEnd - (100000 - 135500)) < 0.01, 'three steps: the same cut loses 135,500 and the saving becomes a 35,500 loss', String(three.realAtEnd));
  ok(one.verdict !== 'loss' && three.verdict === 'loss', 'the verdict flips from a saving to a loss');
  ok(Math.abs(three.subtractionView - 0.1) < 1e-9 && Math.abs(three.lostShare - 0.271) < 1e-9, 'it reports both views: 10% as a subtraction, 27.1% as a multiplier');
}

section('5. The break-even figure is still exact with several steps');
{
  const inputs = { saving: 700000, oneTime: 150000, dependentValue: 8000000, cutShare: 0.2, spareShare: 0.15, margin: 0.5, reach: 3, delayMonths: 4, knockOn: 90000, undoChance: 0.4, undoCost: 200000, years: 3 };
  const r = analyze(inputs);
  ok(r.spareNeeded > 0 && r.spareNeeded < 1, `a spare share needed to break even is reported (${(r.spareNeeded * 100).toFixed(1)}%)`);
  ok(Math.abs(analyze({ ...inputs, spareShare: r.spareNeeded }).realAtEnd) < 0.5, 'feeding it back in gives a net of zero', String(analyze({ ...inputs, spareShare: r.spareNeeded }).realAtEnd));
  ok(r.spareNeeded > analyze({ ...inputs, reach: 1 }).spareNeeded, 'more steps touched means more of the cut must have been spare for it to pay');
}

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
