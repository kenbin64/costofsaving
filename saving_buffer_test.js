#!/usr/bin/env node
// Tests for the buffer share: the part of the spare capacity that is idle on an
// average day and needed on a busy one. They try to break it: the old answers
// must not move, the two ends are checked against known cases, and one sum is
// worked by hand.
// Run: node saving_buffer_test.js
'use strict';
const { analyze } = require('./saving');
const { EXAMPLES, toInputs } = require('./saving-examples');

let pass = 0, fail = 0;
function ok(cond, name, detail = '') {
  if (cond) { pass++; console.log(`  OK   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' - ' + detail : ''}`); }
}
const section = (label) => console.log('\n-- ' + label + ' --');
const near = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

const base = { saving: 100000, oneTime: 0, dependentValue: 1000000, cutShare: 0.2, spareShare: 0.5, margin: 0.5, delayMonths: 0, knockOn: 0, undoChance: 0, undoCost: 0, years: 1 };

section('1. Left out, nothing changes');
{
  for (const ex of EXAMPLES) {
    const a = analyze(toInputs(ex.values)), b = analyze({ ...toInputs(ex.values), bufferShare: 0 });
    if (a.realAtEnd !== b.realAtEnd) { ok(false, `${ex.id} moved`); }
  }
  ok(true, `all ${EXAMPLES.length} examples give the same answer with no buffer share and with a buffer share of 0`);
}

section('2. A hand-worked case');
{
  // A fifth is cut; half of it was spare; 40% of that spare part is a buffer.
  // Free to cut: 0.5 x (1 - 0.4) = 0.3 of the cut. Working cut: 0.2 x 0.7 = 0.14.
  // Lost: 1,000,000 x 0.14 x 0.5 = 70,000. Saving 100,000. Left: 30,000.
  const r = analyze({ ...base, bufferShare: 0.4 });
  ok(near(r.working.workingCut, 0.14, 1e-12), 'working cut is 0.14', String(r.working.workingCut));
  ok(near(r.realAtEnd, 30000), 'what is left is 30,000', String(r.realAtEnd));
  // With no buffer the same cut loses 50,000 and leaves 50,000.
  ok(near(analyze(base).realAtEnd, 50000), 'with no buffer it leaves 50,000');
}

section('3. The two ends');
{
  const allBuffer = analyze({ ...base, bufferShare: 1 }), noSpare = analyze({ ...base, spareShare: 0 });
  ok(near(allBuffer.realAtEnd, noSpare.realAtEnd, 1e-9), 'spare that is all buffer is the same as no spare at all');
  const half = analyze({ ...base, bufferShare: 0.5 }), same = analyze({ ...base, spareShare: 0.25 });
  ok(near(half.realAtEnd, same.realAtEnd, 1e-9), 'half of it a buffer is the same as half as much spare');
  ok(analyze({ ...base, bufferShare: 7 }).inputs.bufferShare === 1 && analyze({ ...base, bufferShare: -3 }).inputs.bufferShare === 0, 'a share outside 0 to 1 is held to that range');
}

section('4. It only ever costs');
{
  let last = Infinity, falling = true;
  for (let b = 0; b <= 1.0001; b += 0.05) { const v = analyze({ ...base, bufferShare: b, reach: 3 }).realAtEnd; if (v > last + 1e-9) falling = false; last = v; }
  ok(falling, 'more buffer never leaves more, with three parts relying on it');
  const r = analyze({ ...base, bufferShare: 0.4 });
  ok(near(r.informed.idle, 0.2 * 0.5 * 0.6, 1e-12), 'the cut that costs nothing shrinks to the free part: 6% of the whole', String(r.informed.idle));
  ok(near(r.informed.spareOnlyNet, 30000), 'cutting only the free part leaves 30,000 and loses no income', String(r.informed.spareOnlyNet));
}

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
