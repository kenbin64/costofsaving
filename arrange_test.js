#!/usr/bin/env node
// Tests for the on-site / hybrid / work from home comparison.
// Run: node arrange_test.js
'use strict';
const A = require('./arrange');

let pass = 0, fail = 0;
function ok(cond, name, detail = '') {
  if (cond) { pass++; console.log(`  OK   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' - ' + detail : ''}`); }
}
const section = (label) => console.log('\n-- ' + label + ' --');
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;

// 40 people at 80,000. A leaver costs 40,000 to replace. A desk costs 12,000 a year.
const team = { people: 40, pay: 80000, replaceCost: 40000, seatCost: 12000, commuteCost: 14, commuteHours: 1.2 };
const onsite = { id: 'onsite', seats: 1, support: 0, leavers: 0.08, output: 0, days: 5 };
const hybrid = { id: 'hybrid', seats: 0.6, support: 600, leavers: 0, output: 0, days: 3 };
const home = { id: 'home', seats: 0.1, support: 1500, leavers: 0, output: -0.02, days: 0 };

section('Each arrangement, worked by hand');
{
  // On-site: 40 desks x 12,000 = 480,000. Leavers 40 x 0.08 x 40,000 = 128,000. Total 608,000.
  const c = A.costOf(onsite, team);
  ok(near(c.office, 480000) && c.support === 0 && near(c.leavers, 128000) && c.output === 0 && near(c.total, 608000), 'on-site: office 480,000, leavers 128,000, total 608,000');
  ok(near(c.desks, 40) && near(c.peopleLeaving, 3.2), 'on-site: 40 desks, and 3.2 extra people leaving a year');
  // Hybrid: 24 desks x 12,000 = 288,000. Support 40 x 600 = 24,000. Total 312,000.
  const h = A.costOf(hybrid, team);
  ok(near(h.office, 288000) && near(h.support, 24000) && near(h.total, 312000), 'hybrid: office 288,000, support 24,000, total 312,000');
  // Home: 4 desks = 48,000. Support 60,000. Output 2% of 40 x 80,000 = 64,000. Total 172,000.
  const w = A.costOf(home, team);
  ok(near(w.office, 48000) && near(w.support, 60000) && near(w.output, 64000) && near(w.total, 172000), 'work from home: office 48,000, support 60,000, lost output 64,000, total 172,000');
  ok(near(c.office + c.support + c.leavers + c.output, c.total) && near(w.office + w.support + w.leavers + w.output, w.total), 'the four lines add up to the total');
}

section('What the staff carry');
{
  // 5 days x 48 weeks x 14 = 3,360 and 5 x 48 x 1.2 = 288 hours.
  const c = A.costOf(onsite, team), h = A.costOf(hybrid, team), w = A.costOf(home, team);
  ok(near(c.commuteCostEach, 3360) && near(c.commuteHoursEach, 288), 'on-site: 3,360 and 288 hours a year for each person');
  ok(near(h.commuteCostEach, 2016) && near(h.commuteHoursEach, 172.8) && w.commuteCostEach === 0, 'hybrid: 2,016 and 172.8 hours; work from home: nothing');
  ok(near(A.costOf(onsite, { ...team, commuteCost: 99 }).total, c.total), 'commuting is not part of the business total');
}

section("The employee's bottom line");
{
  // With 3 a day to work at home: on-site 3,360 + 0. Hybrid 2,016 + 2 x 48 x 3 = 2,304. Home 0 + 5 x 48 x 3 = 720.
  const t = { ...team, homeCost: 3 };
  const c = A.costOf(onsite, t), h = A.costOf(hybrid, t), w = A.costOf(home, t);
  ok(near(c.staffCostEach, 3360) && near(h.staffCostEach, 2304) && near(w.staffCostEach, 720), 'each person pays 3,360 on-site, 2,304 hybrid, 720 at home');
  ok(near(c.staffShareOfPay, 0.042) && near(w.staffShareOfPay, 0.009), 'that is 4.2% of pay on-site and 0.9% at home');
  ok(near(c.total, 608000) && near(w.total, 172000), 'what each person pays does not change the business total');
  const r = A.compare(t, [onsite, hybrid, home]);
  ok(r.rankedForStaff.map((x) => x.id).join() === 'home,hybrid,onsite', 'for the staff: work from home costs least, then hybrid, then on-site');
  ok(A.compare({ ...team, commuteCost: 0, commuteHours: 1, homeCost: 0 }, [onsite, hybrid, home]).rankedForStaff[0].id === 'home', 'when no money differs, fewer hours travelling ranks first');
  ok(A.costOf(onsite, { people: 5 }).staffShareOfPay === null, 'with no pay entered there is no share of pay, not a division by zero');
}

section('Ranking and the tipping points');
{
  const r = A.compare(team, [onsite, hybrid, home]);
  ok(r.ranked.map((x) => x.id).join() === 'home,hybrid,onsite' && r.best.id === 'home' && r.next.id === 'hybrid', 'cheapest first: work from home, hybrid, on-site');
  ok(near(r.ahead, 140000), 'the cheapest is 140,000 a year ahead of the next');
  // Home without its output line costs 108,000. Hybrid is 312,000. Gap 204,000 over 3,200,000 of work = 6.375%.
  ok(near(r.outputToLoseLead, -0.06375), 'work from home keeps its lead until output is down 6.375%');
  // Home without leavers is 172,000. Gap to hybrid 140,000 over 40 x 40,000 = 8.75%.
  ok(near(r.leaversToLoseLead, 0.0875), 'or until it loses an extra 8.75% of people a year');
  // Put each tipping point back in: the two totals must then be equal.
  const atOutput = A.costOf({ ...home, output: r.outputToLoseLead }, team).total;
  const atLeavers = A.costOf({ ...home, leavers: r.leaversToLoseLead }, team).total;
  ok(near(atOutput, 312000) && near(atLeavers, 312000), 'put back in, each tipping point makes the two arrangements cost the same');
}

section('Straight lines');
{
  // Each cost is a straight line in its own input: twice the move, twice the change.
  const total = (change) => A.costOf({ ...hybrid, ...change }, team).total;
  const base = total({});
  ok(near(total({ leavers: 0.10 }) - base, 2 * (total({ leavers: 0.05 }) - base)), 'leavers: twice as many costs exactly twice as much');
  ok(near(total({ output: -0.04 }) - base, 2 * (total({ output: -0.02 }) - base)), 'output: twice the loss costs exactly twice as much');
  ok(near(total({ seats: 1 }) - total({ seats: 0.6 }), 16 * 12000), 'desks: 16 more desks cost 16 x 12,000');
  ok(near(total({ output: 0.03 }), base - 40 * 80000 * 0.03), 'a gain in output lowers the total');
}

section('Inputs and limits');
{
  ok(A.teamOf({ pay: 80000 }).workValue === 80000 && A.teamOf({ pay: 80000, workValue: 150000 }).workValue === 150000, 'with no figure given, a year of work is valued at the pay; a given figure is used');
  ok(near(A.costOf(home, { ...team, workValue: 160000 }).output, 128000), 'valuing the work at twice the pay doubles the cost of lost output');
  ok(A.arrangementOf({ seats: 3, leavers: 2, days: 9, output: -5 }).seats === 1 && A.arrangementOf({ leavers: 2 }).leavers === 1 && A.arrangementOf({ days: 9 }).days === 7 && A.arrangementOf({ output: -5 }).output === -1, 'shares are held to 100% and days to 7');
  const empty = A.compare({}, [onsite, hybrid, home]);
  ok(empty.best.total === 0 && empty.outputToLoseLead === null && empty.leaversToLoseLead === null, 'an empty team costs nothing and has no tipping points, not a division by zero');
  ok(A.compare(team, [hybrid]).next === null && A.compare(team, [hybrid]).ahead === 0, 'one arrangement on its own has nothing to be compared with');
}

section('Pay, getting up to speed, team travel, and the value of time');
{
  const t2 = { ...team, hires: 10, timeValue: 25 };
  // 40 people at 80,000 with 3% more pay: 96,000. Ten hires each 4 weeks slower at 80,000 / 52 a week: 61,538.46. Travel 40 x 1,500 = 60,000.
  const c = A.costOf({ id: 'x', seats: 0, days: 0, payChange: 0.03, rampWeeks: 4, travel: 1500 }, t2);
  ok(near(c.payDifference, 96000) && near(c.ramp, 10 * 4 * 80000 / 52) && near(c.travel, 60000), 'pay difference 96,000, getting up to speed 61,538, team travel 60,000');
  ok(near(c.total, c.office + c.support + c.leavers + c.output + c.payDifference + c.ramp + c.travel), 'the seven lines add up to the total');
  ok(near(A.costOf({ payChange: -0.03 }, t2).payDifference, -96000) && near(A.costOf({ leavers: -0.05 }, t2).leavers, -80000), 'lower pay and fewer leavers both count as savings');
  // Five days in, 48 weeks, 1.2 hours a day: 288 hours. At 25 an hour that is 7,200 of the person's own time.
  ok(near(A.costOf(onsite, t2).staffTimeValueEach, 7200) && A.costOf(onsite, team).staffTimeValueEach === 0, 'travel time is priced only when the person has put a value on an hour');
  ok(A.costOf({ rampWeeks: 4 }, team).ramp === 0, 'with no hires, getting up to speed costs nothing');
  ok(A.arrangementOf({ leavers: -5 }).leavers === -1 && A.arrangementOf({ payChange: -5 }).payChange === -1, 'shares are held to 100% in both directions');
}

section('The examples take no side');
{
  const X = require('./arrange-examples');
  const winners = X.ARRANGE_EXAMPLES.map((e) => { const { team: tm, list } = X.inputsOf(e); return A.compare(tm, list).best.id; });
  ok(winners.join(',') === 'onsite,hybrid,home', 'across the three worked examples, each arrangement comes out ahead once', winners.join(','));
  ok(X.ARRANGE_EXAMPLES.every((e) => /A different team gives a different answer\.$/.test(e.note)), 'every example says a different team gives a different answer');
}

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
