#!/usr/bin/env node
// Tests for the arithmetic behind "Why it multiplies".
// Run: node multiple_test.js
'use strict';
const M = require('./multiple');

let pass = 0, fail = 0;
function ok(cond, name, detail = '') {
  if (cond) { pass++; console.log(`  OK   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' - ' + detail : ''}`); }
}
const section = (label) => console.log('\n-- ' + label + ' --');
const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;

section('1. Chain');
{
  ok(near(M.chainKept(0.1, 1), 0.9), 'one link: a 10% cut keeps 90%, the same as subtraction');
  ok(near(M.chainKept(0.1, 3), 0.729), 'three links: keeps 0.9 x 0.9 x 0.9 = 72.9%');
  ok(JSON.stringify(M.chainSteps(0.1, 3).map((v) => +v.toFixed(3))) === '[1,0.9,0.81,0.729]', 'each link passes on 90% of what it received');
  ok(M.chainKept(0.1, 7) < M.chainKept(0.1, 6), 'every extra link loses more');
  ok(M.chainKept(1, 4) === 0, 'cut all of it and nothing comes out the end');
  ok(M.chainKept(0, 9) === 1, 'cut nothing and everything does');
}

section('2. The climb back');
{
  ok(near(M.recoveryNeeded(0.1), 1 / 9), 'lose 10%, need 11.1% to get back');
  ok(near(M.recoveryNeeded(0.25), 1 / 3), 'lose 25%, need 33.3%');
  ok(near(M.recoveryNeeded(0.5), 1), 'lose 50%, need 100%');
  ok(near(M.recoveryNeeded(0.75), 3), 'lose 75%, need 300%');
  ok(near(M.recoveryNeeded(0.9), 9), 'lose 90%, need 900%');
  ok(M.recoveryNeeded(1) === Infinity, 'lose everything and no gain brings it back');
  // The definition, checked directly: fall by L, then rise by the needed gain, lands on 1.
  ok([0.05, 0.2, 0.4, 0.6, 0.8].every((L) => near((1 - L) * (1 + M.recoveryNeeded(L)), 1)), 'falling by L then rising by the needed gain returns exactly to the start');
  ok([0.1, 0.3, 0.5, 0.7].every((L) => M.recoveryNeeded(L) > L), 'the climb is always steeper than the fall');
}

section('3. Cascade');
{
  ok(JSON.stringify(M.cascadeLevels(3, 3)) === '[1,3,9,27]', 'each thing touches 3 more: 1, 3, 9, 27');
  ok(M.cascadeTotal(3, 3) === 40, 'forty things touched in three steps');
  ok(M.cascadeTotal(1, 5) === 6, 'if each thing touches only one more it is a chain: one per step');
  ok(M.cascadeTotal(2, 10) === 2047, 'doubling for ten steps touches 2,047');
  ok(M.cascadeTotal(4, 0) === 1, 'no spread: only the thing itself');
}

section('4. Below zero');
{
  ok(near(M.compound(100, 0.1, 1), 110), 'a positive balance grows: 100 becomes 110');
  ok(near(M.compound(-100, 0.1, 1), -110), 'a negative one grows the other way: -100 becomes -110');
  ok(M.compound(-100, 0.1, 10) < M.compound(-100, 0.1, 5), 'and keeps getting deeper');
  ok(M.yearsToClimbOut(-100, 0.1, 10) === Infinity, 'paying only the yearly growth never climbs out');
  ok(M.yearsToClimbOut(-100, 0.1, 9) === Infinity, 'paying less than it falls behind for ever');
  ok(M.yearsToClimbOut(-100, 0.1, 20) === 8, 'paying double the growth clears it in 8 years', String(M.yearsToClimbOut(-100, 0.1, 20)));
  ok(M.yearsToClimbOut(-100, 0, 20) === 5, 'with no growth it is plain subtraction: 5 years');
  ok(M.yearsToClimbOut(0, 0.1, 5) === 0, 'nothing owed, nothing to climb');
}

section('5. The one question');
{
  ok(M.classify({ othersNeedIt: false, itSpreads: false, goesBelowZero: false }) === 'subtraction', 'nothing else needs it: a subtraction');
  ok(M.classify({ othersNeedIt: true, itSpreads: false, goesBelowZero: false }) === 'chain', 'other things need it: a multiple');
  ok(M.classify({ othersNeedIt: true, itSpreads: true, goesBelowZero: false }) === 'cascade', 'and they pass it on: a cascade');
  ok(M.classify({ othersNeedIt: true, itSpreads: true, goesBelowZero: true }) === 'hole', 'the result goes negative: the hole, whatever else is true');
}

section('6. Steps that shrink: the rabbit hole');
{
  // First step gains 40,000, each step 62% of the last, each step costs 8,000.
  const r = M.rabbitHole(40000, 0.62, 8000, 10);
  // Gains by hand: 40000, 24800, 15376, 9533.12, 5910.53 ... the 4th is the last above 8,000.
  ok(JSON.stringify(r.gains.slice(0, 5).map(Math.round)) === '[40000,24800,15376,9533,5911]', 'gains by hand: 40,000 then 24,800, 15,376, 9,533, 5,911');
  ok(r.worthTaking === 4, 'step 4 (9,533) is the last that gains more than the 8,000 it costs', String(r.worthTaking));
  ok(near(r.ceiling, 40000 / 0.38), 'all the gains together approach 40,000 / (1 - 0.62) = 105,263 and never pass it');
  const sum = (n) => r.gains.slice(0, n).reduce((a, b) => a + b, 0);
  ok(near(r.netIfStopped, sum(4) - 4 * 8000) && near(r.netAsTaken, sum(10) - 10 * 8000), 'net results are the gains taken less 8,000 a step');
  ok(near(r.wastedPastStop, 6 * 8000 - (sum(10) - sum(4))), 'going on to step 10 wastes six steps of cost less the little they gained');
  ok(r.wastedPastStop > 0 && r.netIfStopped > r.netAsTaken, 'stopping at the right step always beats going on');
  // Stopping one step early or one step late is never better than stopping at the reported step.
  const netAt = (n) => sum(n) - n * 8000;
  ok(netAt(4) > netAt(3) && netAt(4) > netAt(5), 'step 4 really is the best place to stop: better than 3 and better than 5');
  ok(sum(10) < r.ceiling && sum(10) > 0.99 * r.ceiling, 'after 10 steps the gains are within 1% of the ceiling, still below it');
  ok(M.rabbitHole(5000, 0.62, 8000, 5).worthTaking === 0, 'if the first step gains less than it costs, no step is worth taking');
  ok(M.rabbitHole(40000, 0.62, 0, 5).worthTaking === Infinity, 'if steps cost nothing, there is no reason to stop');
  // Checked against a plain loop over many cases.
  let agree = true;
  for (const [g, q, c] of [[40000, 0.62, 8000], [10000, 0.9, 2500], [90000, 0.5, 1000], [20000, 0.95, 19999], [8000, 0.3, 8000]]) {
    let n = 0; while (n < 500 && g * Math.pow(q, n) > c) n++;
    if (M.rabbitHole(g, q, c, 1).worthTaking !== n) agree = false;
  }
  ok(agree, 'the last worthwhile step matches a step-by-step count in five other cases');
}

section('7. Steps that grow: the runaway');
{
  const r = M.runaway(5000, 1.62, 8);
  const byHand = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => 5000 * Math.pow(1.62, i));
  ok(near(r.total, byHand.reduce((a, b) => a + b, 0), 1e-6), 'the total is the eight steps added up');
  ok(near(r.total, 5000 * (Math.pow(1.62, 8) - 1) / 0.62, 1e-6), 'and matches the closed form: first x (ratio^n - 1) / (ratio - 1)');
  ok(near(r.lastStep, 5000 * Math.pow(1.62, 7)), 'the last step is 5,000 x 1.62^7');
  ok(r.lastShare > 0.38 && r.lastShare < 0.40, 'the last step alone is about 39% of everything spent', String(r.lastShare));
  ok(r.costs.every((v, i) => i === 0 || v > r.costs[i - 1]), 'every step costs more than the one before');
  ok(near(M.runaway(1000, 2, 10).total, 1023000), 'doubling from 1,000 for ten steps spends 1,023,000');
}

section('8. The spiral of squares');
{
  ok(JSON.stringify(M.fibonacci(9)) === '[1,1,2,3,5,8,13,21,34]', 'the squares are 1, 1, 2, 3, 5, 8, 13, 21, 34');
  const f = M.fibonacci(20);
  ok(Math.abs(f[19] / f[18] - 1.6180339887) < 1e-6, 'each square is about 1.618 times the one before');
  ok(Math.abs(f[18] / f[19] - 0.6180339887) < 1e-6, 'and going inward each is about 0.618 of the last');
}

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
