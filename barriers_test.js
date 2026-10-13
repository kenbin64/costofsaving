#!/usr/bin/env node
// Tests for the cost of barriers: interview rounds, and any other row of steps.
// Run: node barriers_test.js
'use strict';
const B = require('./barriers');

let pass = 0, fail = 0;
function ok(cond, name, detail = '') {
  if (cond) { pass++; console.log(`  OK   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' - ' + detail : ''}`); }
}
const section = (label) => console.log('\n-- ' + label + ' --');
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;

// The example on the page. Eight candidates, half go on each round. Three
// interviewers give 1.5 hours each at 75 an hour: 337.50 for one interview.
// A round adds a week; the seat costs 2,000 a week. Each week there is a 10%
// chance the first choice takes another offer, which would cost 20,000.
// A hire made blind fails half the time and costs 60,000; a round catches 40%.
const example = { rounds: 5, candidates: 8, passShare: 0.5, days: 7, interviewers: 3, hoursEach: 1.5, hourCost: 75, seatPerWeek: 2000,
  lostPerWeek: 0.10, lostCost: 20000, candidateHours: 3, badChance: 0.5, badCost: 60000, catchShare: 0.4 };

section('Interview rounds, worked by hand');
{
  const h = B.hiring(example), [r1, r2, r3, r4, r5] = h.rounds;
  // Round 1: 8 x 337.50 = 2,700. Seat 2,000. Lost 0.10 x 20,000 = 2,000. Cost 6,700. Catches 0.5 x 0.4 x 60,000 = 12,000.
  ok(near(r1.parts.interview, 2700) && near(r1.parts.seat, 2000) && near(r1.parts.lost, 2000) && near(r1.cost, 6700) && near(r1.caught, 12000), 'round 1: costs 6,700 and catches 12,000');
  // Round 2: 4 x 337.50 = 1,350. Seat 2,000. Lost 0.9 x 0.1 x 20,000 = 1,800. Cost 5,150. Catches 0.3 x 0.4 x 60,000 = 7,200.
  ok(near(r2.cost, 5150) && near(r2.caught, 7200) && near(r2.net, 2050), 'round 2: costs 5,150 and catches 7,200');
  // Round 3: 675 + 2,000 + 0.81 x 2,000 = 4,295. Catches 0.18 x 0.4 x 60,000 = 4,320.
  ok(near(r3.cost, 4295) && near(r3.caught, 4320) && near(r3.net, 25), 'round 3: costs 4,295 and catches 4,320, about even');
  // Round 4: 337.50 + 2,000 + 0.729 x 2,000 = 3,795.50. Catches 0.108 x 0.4 x 60,000 = 2,592.
  ok(near(r4.cost, 3795.5) && near(r4.caught, 2592) && r4.net < 0, 'round 4: costs 3,795.50 and catches 2,592');
  // Round 5: one candidate still (not half of one). 337.50 + 2,000 + 0.6561 x 2,000 = 3,649.70. Catches 1,555.20.
  ok(near(r5.candidates, 1) && near(r5.cost, 3649.7) && near(r5.caught, 1555.2), 'round 5: still one candidate, costs 3,649.70 and catches 1,555.20');
  ok(h.best === 3 && near(h.bestNet, 5300 + 2050 + 25), 'the best stopping point is after round 3');
  ok(near(h.extraCost, 3795.5 + 3649.7) && near(h.extraCaught, 2592 + 1555.2) && h.firstPastBest.round === 4, 'rounds 4 and 5 cost 7,445.20 and catch 4,147.20');
  ok(near(h.totalCost, 6700 + 5150 + 4295 + 3795.5 + 3649.7) && near(h.net, h.totalCaught - h.totalCost), 'the totals are the rounds added up');
  ok(near(h.stillFree, Math.pow(0.9, 5)) && near(r3.stillFree, 0.729), 'first choice still free: 72.9% after three rounds, 59.0% after five');
  ok(near(h.badLeft, 0.5 * Math.pow(0.6, 5)) && near(r3.badLeft, 0.108), 'chance of a hire that does not work out: 10.8% after three rounds');
  // Candidates: (8 + 4 + 2 + 1 + 1) x 3 = 48 hours. The person hired gave 15 of them.
  ok(near(h.candidateHoursAll, 48) && near(h.candidateHoursEach, 15) && near(h.candidateHoursNotHired, 33), 'candidates give 48 unpaid hours, 33 from people not hired');
  ok(h.days === 35, 'five rounds a week apart take 35 days');
}

section('The tipping point for a round');
{
  const h = B.hiring(example), r4 = h.rounds[3];
  // Round 4 costs 3,795.50 and 10.8% x 60,000 = 6,480 of risk is left: it must catch 58.57% of it.
  ok(near(r4.needCatch, 3795.5 / 6480), 'round 4 would have to catch 58.6% of the remaining mistakes');
  // Put that share back in for round 4 alone and the round breaks even.
  ok(near(0.108 * r4.needCatch * 60000, r4.cost), 'at that share, what round 4 catches equals what it costs');
  ok(B.hiring({ ...example, badCost: 0 }).rounds[0].needCatch === null, 'with nothing to catch there is no tipping point, not a division by zero');
  ok(B.hiring({ ...example, badCost: 5000 }).rounds[0].needCatch > 1, 'a share above 100% means the round cannot pay for itself');
}

section('Waiting multiplies, it does not add');
{
  // 10% a week for five weeks is not 50% lost: 0.9^5 = 59.0% still free, so 41.0% lost.
  const h = B.hiring(example);
  ok(near(1 - h.stillFree, 0.40951) && 1 - h.stillFree < 0.5, 'five weeks at 10% a week loses 41.0% of the time, not 50%');
  // The same total wait in fewer, longer rounds leaves the same chance.
  const longer = B.hiring({ ...example, rounds: 1, days: 35 });
  ok(near(longer.stillFree, h.stillFree), 'the chance depends on the weeks waited, however they are divided into rounds');
  const sum = h.rounds.reduce((n, r) => n + r.parts.lost, 0);
  ok(near(sum, (1 - h.stillFree) * 20000), 'the per-round risk adds up to the whole chance of losing the first choice');
  ok(near(B.hiring({ ...example, lostPerWeek: 0 }).stillFree, 1) && B.hiring({ ...example, lostPerWeek: 0 }).rounds.every((r) => r.parts.lost === 0), 'with no competing offers nothing is lost by waiting');
}

section('Fair both ways');
{
  // When a mistake is very costly, every round pays and the page must say so.
  const costly = B.hiring({ ...example, badCost: 400000 });
  ok(costly.best === 5 && costly.extraCost === 0 && costly.firstPastBest === null, 'a very costly mistake justifies all five rounds');
  ok(B.hiring({ ...example, catchShare: 0 }).best === 1, 'rounds that catch nothing: one round, since a hire needs at least one');
  ok(B.hiring({ ...example, rounds: 0 }).rounds.length === 1 && B.hiring({ ...example, rounds: 99 }).rounds.length === B.MAX_STEPS, 'rounds are held between 1 and 10');
  const empty = B.hiring({});
  ok(empty.totalCost === 0 && empty.best === 1 && empty.candidateHoursAll === 0, 'an empty form costs nothing and does not divide by zero');
}

// 1,000 people a month, 5% unwanted. Each good one is worth 40; 10% give up at
// each step. Handling costs 0.50 a person a step. An unwanted one costs 300 and
// each step catches half of those left.
const form = { steps: 3, people: 1000, badShare: 0.05, value: 40, dropShare: 0.10, handleCost: 0.5, badCost: 300, catchShare: 0.5 };

section('Any other barrier, worked by hand');
{
  const g = B.gate(form), [s1, s2, s3] = g.rounds;
  // Step 1: handling 1,000 x 0.50 = 500. Give up 950 x 0.10 x 40 = 3,800. Cost 4,300. Catches 50 x 0.5 x 300 = 7,500.
  ok(near(s1.parts.handling, 500) && near(s1.parts.lost, 3800) && near(s1.cost, 4300) && near(s1.caught, 7500), 'step 1: costs 4,300 and catches 7,500');
  // Step 2: (855 + 25) x 0.50 = 440. Give up 855 x 0.10 x 40 = 3,420. Cost 3,860. Catches 25 x 0.5 x 300 = 3,750.
  ok(near(s2.cost, 3860) && near(s2.caught, 3750) && s2.net < 0, 'step 2: costs 3,860 and catches 3,750');
  // Step 3: (769.5 + 12.5) x 0.50 = 391. Give up 769.5 x 4 = 3,078. Cost 3,469. Catches 1,875.
  ok(near(s3.cost, 3469) && near(s3.caught, 1875), 'step 3: costs 3,469 and catches 1,875');
  ok(g.best === 1 && near(g.bestNet, 3200), 'the best stopping point is after step 1');
  ok(near(g.goodKeptShare, 0.729) && near(g.goodThrough, 950 * 0.729) && near(g.badThrough, 6.25), 'three steps keep 72.9% of the good people, not 70%');
  ok(B.gate({ ...form, badCost: 0 }).best === 0, 'a barrier with nothing to catch is best left out');
  ok(B.gate({ ...form, dropShare: 0, handleCost: 0 }).best === 3, 'steps that cost nothing and catch something all pay');
  ok(B.gate({}).rounds.length === 0 && B.gate({}).net === 0, 'an empty form has no steps and no cost');
}

section('Who it keeps out, and what it costs them');
{
  const g = B.gate({ ...form, personHours: 0.25, personCost: 2 });
  // Wanted people kept out: 950 - 692.55 = 257.45. The ones it was for: 50 - 6.25 = 43.75. So 85.5% of those kept out were wanted.
  ok(near(g.keptOutGood, 257.45) && near(g.keptOutBad, 43.75) && near(g.keptOutGoodShare, 257.45 / 301.2), 'of 301.2 people kept out, 257.45 were wanted: 85.5%');
  // People reaching each step: 1,000, then 880, then 782 = 2,662 goes at a step. At a quarter of an hour each: 665.5 hours.
  ok(near(g.peopleHours, 665.5) && near(g.peopleCost, 5324), 'the people spend 665.5 hours and 5,324 getting through it');
  // The 698.8 who get through did all three steps: 2,096.4 goes. The other 565.6 goes were by people who ended up outside.
  ok(near(g.peopleHoursForNothing, 565.6 * 0.25) && near(g.peopleCostForNothing, 565.6 * 2), '141.4 of those hours were spent by people who ended up outside');
  // Step 1 catches 7,500 and handling is 500, so it can afford to lose 7,000 of the 950 x 40 = 38,000 on offer: 18.4%.
  const s1 = B.gate(form).rounds[0];
  ok(near(s1.maxDrop, 7000 / 38000) && near(B.gate({ ...form, steps: 1, dropShare: s1.maxDrop }).net, 0), 'step 1 could turn away 18.4% of the people wanted and still break even');
  ok(B.gate({ ...form, badCost: 0 }).rounds[0].maxDrop < 0 && B.gate({ ...form, value: 0 }).rounds[0].maxDrop === null && near(s1.allItCouldCatch, 15000), 'a step that catches less than its handling cannot pay at any loss; one with nothing to lose has no such limit');
  ok(B.gate({ ...form, steps: 0 }).keptOutGoodShare === null && B.gate(form).peopleHours === 0, 'no steps keep nobody out, and a step that takes no time costs the people no time');
  ok(near(B.gate({ ...form, dropShare: 0 }).keptOutGoodShare, 0) && near(B.gate({ ...form, catchShare: 0 }).keptOutGoodShare, 1), 'a barrier that loses nobody wanted keeps out only what it was for, and the reverse');
}

section('A fee is a barrier that also brings money in');
{
  // 3,000 orders, each worth 22. A 3.00 fee is added and 9% of customers leave. Nothing is being stopped.
  const fee = { steps: 1, people: 3000, badShare: 0, value: 22, dropShare: 0.09, handleCost: 0, badCost: 0, catchShare: 0, feeIncome: 3 };
  const g = B.gate(fee), s = g.rounds[0];
  // Brings in 2,730 x 3 = 8,190. Loses 270 x 22 = 5,940. Net +2,250.
  ok(near(s.income, 8190) && near(s.stopped, 0) && near(s.caught, 8190) && near(s.cost, 5940) && near(s.net, 2250), 'a 3.00 fee brings in 8,190 and loses 5,940 of orders');
  // It breaks even when 3,000 x 3 = 9,000 is spread over 3,000 x (22 + 3): 12%.
  ok(near(s.maxDrop, 0.12) && near(B.gate({ ...fee, dropShare: s.maxDrop }).net, 0), 'the fee pays as long as fewer than 12% leave, and breaks even at exactly 12%');
  ok(B.gate({ ...fee, dropShare: 0.15 }).best === 0, 'if 15% leave, the fee costs more than it brings in');
  // With a fee, stopping someone also loses their fee. Put the tipping share back in and the step breaks even.
  const mixed = { steps: 1, people: 1000, badShare: 0.1, value: 50, dropShare: 0.2, handleCost: 1, badCost: 200, catchShare: 0.3, feeIncome: 5 };
  const need = B.gate(mixed).rounds[0].needCatch;
  ok(need > 0 && need < 1 && near(B.gate({ ...mixed, catchShare: need }).net, 0, 1e-6), 'with a fee, the share that must be stopped still breaks even when put back in');
  const drop = B.gate(mixed).rounds[0].maxDrop;
  ok(near(B.gate({ ...mixed, dropShare: drop }).net, 0, 1e-6), 'and so does the share that can be turned away');
  ok(near(B.gate(form).rounds[0].income, 0) && near(B.gate(form).rounds[0].caught, B.gate(form).rounds[0].stopped), 'with no fee, what a step gets back is only what it stops');
}

section('Every answer adds up');
{
  let bad = 0, seed = 7;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  for (let i = 0; i < 300; i++) {
    const h = B.hiring({ rounds: 1 + Math.floor(rnd() * 10), candidates: 1 + rnd() * 20, passShare: rnd(), days: rnd() * 21, interviewers: rnd() * 5, hoursEach: rnd() * 3, hourCost: rnd() * 150,
      seatPerWeek: rnd() * 5000, lostPerWeek: rnd() * 0.3, lostCost: rnd() * 50000, candidateHours: rnd() * 6, badChance: rnd(), badCost: rnd() * 200000, catchShare: rnd() });
    const cost = h.rounds.reduce((n, r) => n + r.cost, 0), caught = h.rounds.reduce((n, r) => n + r.caught, 0);
    const bestIsBest = h.rounds.every((r) => r.cumNet <= h.bestNet + 1e-6);
    const partsAdd = h.rounds.every((r) => near(r.cost, r.parts.interview + r.parts.seat + r.parts.lost, 1e-6));
    // What is caught over all rounds is the fall in the chance of a mistake, times its cost.
    const caughtIsFall = near(caught, (h.inputs.badChance - h.badLeft) * h.inputs.badCost, 1e-5);
    if (!near(cost, h.totalCost, 1e-5) || !bestIsBest || !partsAdd || !caughtIsFall || h.stillFree < 0 || h.stillFree > 1) bad++;
  }
  ok(bad === 0, '300 random hiring cases: parts add up, no stopping point beats the best, what is caught equals the fall in risk', `${bad} failed`);
  let badGate = 0;
  for (let i = 0; i < 300; i++) {
    const g = B.gate({ steps: Math.floor(rnd() * 11), people: rnd() * 5000, badShare: rnd() * 0.3, value: rnd() * 200, dropShare: rnd() * 0.4, handleCost: rnd() * 5, badCost: rnd() * 1000, catchShare: rnd() });
    const peopleAdd = near(g.goodThrough, g.goodStart * g.goodKeptShare, 1e-6);
    const bestIsBest = g.bestNet >= -1e-9 && g.rounds.every((r) => r.cumNet <= g.bestNet + 1e-6);
    if (!peopleAdd || !bestIsBest) badGate++;
  }
  ok(badGate === 0, '300 random barriers: people are conserved, and no stopping point beats the best', `${badGate} failed`);
}

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
