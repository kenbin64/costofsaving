#!/usr/bin/env node
// INDEPENDENT VERIFICATION.
//
// The other test files check the engine against hand-worked cases. This one
// checks it against a second implementation, written from the published
// formulas alone, in the most literal way possible: one month at a time, adding
// up cash flows the way a spreadsheet would. It shares no code with saving.js.
// If the two ever disagree, one of them is wrong, and this fails.
//
// It also checks the discounting against the textbook annuity formula, and the
// "climb out of a hole" figures against the textbook loan-term formula.
//
// Run: node verify_test.js
'use strict';
const { analyze } = require('./saving');
const M = require('./multiple');

let pass = 0, fail = 0;
function ok(cond, name, detail = '') {
  if (cond) { pass++; console.log(`  OK   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' - ' + detail : ''}`); }
}
const section = (label) => console.log('\n-- ' + label + ' --');
const close = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));

// ── The spreadsheet version ────────────────────────────────────────────────
// One row per month. Each row: that month's saving, lost contribution, side
// cost and expected reversal cost, each discounted to today.
function spreadsheet(i) {
  const T = Math.round(i.years * 12);
  const a = i.cutShare * (1 - i.spareShare);                       // working share cut
  let kept = 1;
  for (const w of i.touches) kept *= (1 - a * w);                  // share of output kept
  const lostShare = 1 - kept;
  const lostPerMonth = i.dependentValue * lostShare * i.margin / 12;
  let saved = 0, lost = 0, side = 0, undo = 0;
  for (let m = 1; m <= T; m++) {
    const df = Math.pow(1 + i.discountRate, -m / 12);              // discount factor for month m
    const active = Math.min(1, Math.max(0, m - i.delayMonths));    // share of the month after the delay
    saved += (i.saving / 12) * df;
    lost += lostPerMonth * active * df;
    side += (i.knockOn / 12) * df;
    undo += (i.undoChance * i.undoCost / T) * df;
  }
  const totalCost = i.oneTime + lost + side + undo;
  return { saved, lost, side, undo, totalCost, net: saved - totalCost, booked: saved - i.oneTime, multiple: totalCost / saved, lostShare };
}

// A small deterministic random number generator, so the cases are the same on every run.
let seed = 20261004;
const rand = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const pick = (lo, hi) => lo + rand() * (hi - lo);

section('1. The engine against the spreadsheet version, 500 random cases');
{
  let worst = 0, bad = 0;
  for (let n = 0; n < 500; n++) {
    const parts = Math.floor(pick(1, 6));
    const i = {
      saving: pick(1000, 2e6), oneTime: pick(0, 3e5), dependentValue: pick(0, 1e7),
      cutShare: pick(0, 1), spareShare: pick(0, 1), margin: pick(0, 1),
      touches: Array.from({ length: parts }, () => (rand() < 0.5 ? 1 : 0.5)),
      delayMonths: rand() < 0.5 ? Math.floor(pick(0, 18)) : pick(0, 18),      // whole and part months
      knockOn: pick(0, 2e5), undoChance: pick(0, 1), undoCost: pick(0, 5e5),
      years: Math.floor(pick(1, 8)), discountRate: rand() < 0.4 ? 0 : pick(0, 0.2),
    };
    const want = spreadsheet(i), got = analyze(i);
    const pairs = [[got.grossSaving, want.saved], [got.hidden.lostEarnings, want.lost], [got.hidden.sideCosts, want.side], [got.hidden.undo, want.undo],
      [got.totalCost, want.totalCost], [got.realAtEnd, want.net], [got.bookedAtEnd, want.booked], [got.multiple, want.multiple], [got.lostShare, want.lostShare]];
    for (const [g, w] of pairs) { const d = Math.abs(g - w) / Math.max(1, Math.abs(w)); if (d > worst) worst = d; if (!close(g, w)) bad++; }
  }
  ok(bad === 0, 'all nine figures agree in all 500 cases (saving, four costs, total, net, booked, multiple)', `${bad} disagreements`);
  console.log(`       largest relative difference: ${worst.toExponential(2)}`);
}

section('2. The monthly series against the spreadsheet version');
{
  const i = { saving: 700000, oneTime: 150000, dependentValue: 8000000, cutShare: 0.2, spareShare: 0.15, margin: 0.5, touches: [1, 0.5], delayMonths: 4, knockOn: 90000, undoChance: 0.4, undoCost: 200000, years: 3, discountRate: 0.08 };
  const got = analyze(i);
  let agree = true;
  for (const months of [1, 4, 5, 12, 24, 36]) {
    const want = spreadsheet({ ...i, years: months / 12, undoCost: i.undoCost * months / 36 });   // reversal cost accrues evenly
    if (!close(got.series[months].real, want.net, 1e-6)) agree = false;
  }
  ok(agree, 'the running total at months 1, 4, 5, 12, 24 and 36 matches a spreadsheet stopped at that month');
  ok(got.series[0].real === -150000, 'at month 0 only the one-time cost has been paid');
}

section('3. Identities that must hold for any input');
{
  let all = true;
  for (let n = 0; n < 200; n++) {
    const i = { saving: pick(1000, 1e6), oneTime: pick(0, 1e5), dependentValue: pick(0, 5e6), cutShare: pick(0, 1), spareShare: pick(0, 1), margin: pick(0, 1),
      touches: [1, 0.5, 0.5].slice(0, 1 + Math.floor(pick(0, 3))), delayMonths: pick(0, 12), knockOn: pick(0, 1e5), undoChance: pick(0, 1), undoCost: pick(0, 2e5), years: 3, discountRate: pick(0, 0.15) };
    const r = analyze(i), k = r.kinds;
    if (!close(k.direct + k.hidden + k.opportunity + k.unintended, r.totalCost)) all = false;      // the four kinds are the total
    if (!close(r.grossSaving - r.totalCost, r.realAtEnd)) all = false;                             // net = saving - total cost
    if (!close(r.grossSaving * (1 - r.multiple), r.realAtEnd)) all = false;                        // net = saving x (1 - multiple)
    if (!close(r.bookedAtEnd - r.realAtEnd, k.hidden + k.opportunity + k.unintended)) all = false; // the gap is what is not beside the decision
    if (r.lostShare < r.subtractionView * Math.max(...r.working.strengths) - 1e-12) all = false;   // multiplying never loses less than the strongest single part
    if (r.lostShare < 0 || r.lostShare > 1) all = false;                                           // a share stays a share
  }
  ok(all, 'in 200 random cases: the four kinds sum to the total; net = saving - total = saving x (1 - multiple); the gap between books and reality is exactly the unbooked costs; the share lost stays between 0 and 1');
}

section('4. Discounting against the textbook annuity formula');
{
  // Present value of 1 a year, paid monthly in arrears for T months, at yearly rate r:
  //   (1/12) x q x (1 - q^T) / (1 - q),   q = (1 + r) ^ (-1/12)
  const r = 0.08, T = 36, q = Math.pow(1 + r, -1 / 12);
  const annuity = (1 / 12) * q * (1 - Math.pow(q, T)) / (1 - q);
  const got = analyze({ saving: 120000, years: 3, discountRate: r });
  ok(close(got.grossSaving, 120000 * annuity), `120,000 a year for 3 years at 8% has a present value of ${Math.round(120000 * annuity).toLocaleString()}`, String(got.grossSaving));
  ok(close(got.working.yearsOfSaving, annuity), `which is ${annuity.toFixed(4)} years' worth, not 3`);
  ok(analyze({ saving: 120000, years: 3, discountRate: 0 }).grossSaving === 360000, 'with no discount rate it is exactly 360,000');
  const d0 = analyze({ saving: 1e5, dependentValue: 1e6, cutShare: 0.1, margin: 0.5, touches: [1], years: 5, discountRate: 0 });
  const d1 = analyze({ saving: 1e5, dependentValue: 1e6, cutShare: 0.1, margin: 0.5, touches: [1], years: 5, discountRate: 0.1 });
  ok(Math.abs(d1.realAtEnd) < Math.abs(d0.realAtEnd) || d0.realAtEnd === 0, 'discounting shrinks both sides; it does not flip a result on its own when flows are level');
  ok(close(d0.multiple, d1.multiple), 'and with level flows and no delay the multiple is unchanged by the discount rate');
}

section('5. The break-even spare share, checked by substitution');
{
  let all = true, found = 0;
  for (let n = 0; n < 300; n++) {
    const i = { saving: pick(1e4, 1e6), oneTime: pick(0, 5e4), dependentValue: pick(5e5, 8e6), cutShare: pick(0.05, 0.6), spareShare: 0, margin: pick(0.2, 0.8),
      touches: [1, 0.5, 1].slice(0, 1 + Math.floor(pick(0, 3))), delayMonths: Math.floor(pick(0, 9)), knockOn: pick(0, 5e4), undoChance: pick(0, 0.5), undoCost: pick(0, 1e5), years: 3, discountRate: pick(0, 0.12) };
    const r = analyze(i);
    if (r.spareNeeded === null || r.spareNeeded === 0 || r.spareNeeded >= 1) continue;
    found++;
    const at = analyze({ ...i, spareShare: r.spareNeeded });
    if (Math.abs(at.realAtEnd) > 1e-4 * i.saving) all = false;
  }
  ok(found > 50 && all, `in ${found} cases with a break-even point, putting that spare share back in gives a net of zero`);
}

section('6. The climb out of a hole, against the textbook loan-term formula');
{
  // Payments needed to clear a debt D at rate r paying P at each year end:
  //   n = -ln(1 - r x D / P) / ln(1 + r), rounded up.
  let all = true;
  for (const [D, r, P] of [[100000, 0.10, 15000], [100000, 0.10, 20000], [250000, 0.07, 30000], [50000, 0.25, 20000], [100000, 0.05, 6000]]) {
    const n = Math.ceil(-Math.log(1 - r * D / P) / Math.log(1 + r) - 1e-12);
    if (M.yearsToClimbOut(-D, r, P) !== n) all = false;
    // What is paid must equal the debt plus all the growth it earned along the way.
    let owed = D, growth = 0;
    for (let y = 0; y < n; y++) { const g = owed * r; growth += g; owed = Math.max(0, owed + g - P); }
    if (!close(M.paidToClimbOut(-D, r, P), D + growth)) all = false;
  }
  ok(all, 'years to clear match the formula in five cases, and total paid equals the debt plus the growth on it');
  ok(M.yearsToClimbOut(-100000, 0.10, 15000) === 12, '100,000 at 10% paying 15,000 a year: 12 years');
  // Closed form for the balance after 11 payments: D x 1.1^11 - P x (1.1^11 - 1) / 0.1, then one more year's growth.
  const after11 = 100000 * Math.pow(1.1, 11) - 15000 * (Math.pow(1.1, 11) - 1) / 0.1;
  const lastPayment = after11 * 1.1;
  ok(close(M.paidToClimbOut(-100000, 0.10, 15000), 11 * 15000 + lastPayment) && Math.round(11 * 15000 + lastPayment) === 173079,
    'and 173,079 paid in all: eleven payments of 15,000 and a last one of 8,079, from the closed-form balance', String(M.paidToClimbOut(-100000, 0.10, 15000)));
}

section('7. What each dollar saved was supporting');
{
  const r = analyze({ saving: 700000, dependentValue: 8000000, cutShare: 0.2, margin: 0.5, touches: [1], years: 1 });
  ok(close(r.supported.incomePerDollar, 8000000 * 0.2 / 700000), '8,000,000 x 0.2 / 700,000 = 2.29 of income per dollar saved');
  ok(close(r.supported.contributionPerDollar, 8000000 * 0.2 * 0.5 / 700000), 'of which 1.14 was kept');
  // With one part, nothing spare, no delay and no other costs, the multiple IS that figure.
  ok(close(r.multiple, r.supported.contributionPerDollar), 'with one part, nothing spare and no other costs, the multiple equals the contribution per dollar saved');
  ok(analyze({ saving: 0, dependentValue: 1e6, cutShare: 0.1 }).supported === null, 'with no saving entered there is nothing to divide by, so no figure is given');
}

section('8. Sizing a cut');
{
  const i = { saving: 700000, oneTime: 150000, dependentValue: 8000000, cutShare: 0.2, spareShare: 0.15, margin: 0.5, touches: [1, 0.5], delayMonths: 4, knockOn: 90000, undoChance: 0.4, undoCost: 200000, years: 3 };
  const r = analyze(i), f = r.informed;
  ok(close(f.plannedNet, r.realAtEnd), 'at the planned size the sizing formula gives the same net result as the main calculation');
  ok(close(f.idle, 0.2 * 0.15), 'the idle part of the whole is cut share x spare share: 3%');
  // Cutting only the idle part: 3/20 of the saving and of the other costs, and no lost income.
  const room = 700000 * 3 - 150000 - 90000 * 3 - 0.4 * 200000;
  ok(close(f.spareOnlyNet, (0.03 / 0.2) * room), 'cutting only the idle 3% keeps 3/20 of the saving less 3/20 of the other costs: 240,000', String(f.spareOnlyNet));
  ok(close(f.savingPerPoint, room / 0.2 / 100) && close(f.lossPerPointPastIdle, 8000000 * 0.5 * (32 / 12) * 1.5 / 100), 'each point saves 80,000 and, past the idle part, loses 160,000');
  ok(f.deeperPays === false && close(f.bestCut, f.idle, 1e-3), 'so the best size is the idle part and no more');
  ok(f.largestThatPays > f.idle && f.largestThatPays < f.plannedCut, 'a somewhat larger cut still breaks even, but the planned one does not');
  ok(f.bestCut <= f.plannedCut + 1e-12 && f.largestThatPays <= f.plannedCut + 1e-12, 'sizes beyond the plan are never suggested');

  // When everything cut is idle, the plan itself is the best size.
  const allIdle = analyze({ ...i, spareShare: 1 }).informed;
  ok(close(allIdle.bestCut, 0.2) && close(allIdle.bestNet, room), 'if all of the cut is idle, the planned cut is the best size and nothing is lost');
  // When nothing is idle and each point loses more than it saves, the best size is no cut.
  const noneIdle = analyze({ ...i, spareShare: 0 }).informed;
  ok(noneIdle.bestCut === 0 && noneIdle.bestNet === 0, 'if nothing is idle and each point loses more than it saves, the best size is no cut at all');
  // When income relying on it is small, cutting pays at every size.
  const cheap = analyze({ ...i, dependentValue: 200000 }).informed;
  ok(cheap.deeperPays === true && close(cheap.bestCut, 0.2), 'if little income relies on it, the full planned cut is the best size');
}

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
