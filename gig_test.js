#!/usr/bin/env node
// Tests for the gig work log: the sums, the periods, and the spreadsheet file.
// Run: node gig_test.js
'use strict';
const G = require('./gig');

let pass = 0, fail = 0;
function ok(cond, name, detail = '') {
  if (cond) { pass++; console.log(`  OK   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' - ' + detail : ''}`); }
}
const section = (label) => console.log('\n-- ' + label + ' --');
const near = (a, b, tol = 0.005) => Math.abs(a - b) <= tol;

section('One shift, worked by hand');
{
  // 5 hours, 60 miles, 10 jobs, pay 50, tips 40, other 4. Rates: 70 cents a mile, 12% income tax.
  // gross 90. car 42. kept before tax 90 - 42 - 4 = 44.
  // profit for tax 90 - 42 - 4 = 44. SE tax 44 x 0.9235 x 0.153 = 6.2170.
  // income tax (44 - 3.1085) x 0.12 = 4.9070. taxes 11.1240. kept 32.8760.
  const t = G.totals([{ date: '2026-10-05', what: 'deliveries', hours: 5, miles: 60, jobs: 10, pay: 50, tips: 40, other: 4 }]);
  ok(t.gross === 90 && near(t.carCost, 42) && near(t.keptBeforeTax, 44), 'gross 90, car cost 42, kept before tax 44');
  ok(near(t.selfEmploymentTax, 6.2170, 0.0005) && near(t.incomeTax, 4.9070, 0.0005), 'self-employment tax 6.217 and income tax 4.907');
  ok(near(t.taxes, 11.1240, 0.0005) && near(t.kept, 32.8760, 0.0005), 'taxes 11.124, kept 32.876');
  ok(near(t.statedHourly, 18) && near(t.realHourly, 6.5752, 0.0005), 'the payouts look like 18.00 an hour; what is left is 6.58');
  ok(near(t.grossPerMile, 1.5) && near(t.keptPerJob, 3.2876, 0.0005) && near(t.tipShare, 40 / 90), '1.50 gross a mile, 3.29 kept a job, tips are 44% of gross');
  ok(near(t.keptPerDollar, 32.876 / 90, 0.0005), 'about 37 cents kept of each dollar paid out');
}

section('The pieces add back up');
{
  const shifts = [
    { date: '2026-10-01', what: 'deliveries', hours: 4.5, miles: 62, jobs: 11, pay: 48, tips: 39, other: 0 },
    { date: '2026-10-02', what: 'rides', hours: 6, miles: 118, jobs: 14, pay: 132, tips: 21, other: 6.5 },
    { date: '2026-10-03', what: 'deliveries', hours: 3.5, miles: 44, jobs: 8, pay: 36, tips: 31, other: 0 },
  ];
  const t = G.totals(shifts);
  ok(near(t.gross - t.carCost - t.other - t.taxes, t.kept, 1e-9), 'gross less car, other costs and taxes is exactly what is kept');
  ok(t.hours === 14 && t.miles === 224 && t.jobs === 33 && t.count === 3, 'hours, miles, jobs and shifts are counted');
  const by = G.byWhat(shifts);
  ok(by.length === 2 && by[0].what === 'deliveries' && by[0].gross === 154 && by[1].what === 'rides' && by[1].gross === 153, 'kinds of work are listed biggest earner first: deliveries 154, rides 153');
  ok(near(by[0].gross + by[1].gross, t.gross, 1e-9) && near(by[0].carCost + by[1].carCost, t.carCost, 1e-9), 'the kinds of work add up to the whole for pay and car cost');
  ok(near(by[0].taxes + by[1].taxes, t.taxes, 1e-9), 'and for taxes, when every kind makes a profit');
}

section('Rates and limits');
{
  const shift = [{ date: '2026-10-05', hours: 5, miles: 60, jobs: 10, pay: 50, tips: 40, other: 4 }];
  const cheapCar = G.totals(shift, { costPerMile: 0.30 });
  ok(near(cheapCar.carCost, 18) && near(cheapCar.deduction, 42), 'a cheaper car lowers the real cost and leaves the deduction alone');
  ok(near(cheapCar.taxes, G.totals(shift).taxes, 1e-9), 'so the taxes do not change with the real cost of a mile');
  const employee = G.totals(shift, { selfEmployed: false });
  ok(employee.selfEmploymentTax === 0 && near(employee.incomeTax, 44 * 0.12), 'with self-employment tax off, only income tax is set aside');
  const loss = G.totals([{ date: '2026-10-05', hours: 3, miles: 100, jobs: 2, pay: 20, tips: 5, other: 0 }]);
  ok(loss.profitForTax === 0 && loss.taxes === 0 && near(loss.kept, -45), 'a shift that loses money owes no tax and keeps a negative amount');
  const empty = G.totals([]);
  ok(empty.gross === 0 && empty.statedHourly === null && empty.realHourly === null && empty.keptPerDollar === null, 'an empty log gives no hourly figure, not a division by zero');
  const messy = G.totals([{ date: '2026-10-05', hours: 'x', miles: -5, jobs: null, pay: '50', tips: undefined, other: NaN }]);
  ok(messy.gross === 50 && messy.miles === 0 && messy.hours === 0, 'bad or negative entries count as nothing');
  ok(G.settingsOf({ incomeTaxRate: 5 }).incomeTaxRate === 1 && G.settingsOf({ costPerMile: 0 }).costPerMile === 0, 'a tax rate is held to 100%, and a zero cost a mile is allowed');
}

section('The levers: straight lines and one curve');
{
  const shifts = [
    { date: '2026-10-01', hours: 4.5, miles: 62, jobs: 11, pay: 48, tips: 39, other: 0 },
    { date: '2026-10-02', hours: 6, miles: 118, jobs: 14, pay: 132, tips: 21, other: 6.5 },
  ];
  const base = G.totals(shifts);
  const gain = (id, step) => G.levers(shifts, undefined, step).find((l) => l.id === id).gain;
  // Straight lines: twice the move gives exactly twice the change.
  ok(near(gain('miles', 0.2), 2 * gain('miles', 0.1), 1e-9), 'miles are a straight line: 20% fewer gains exactly twice what 10% fewer gains');
  ok(near(gain('tips', 0.2), 2 * gain('tips', 0.1), 1e-9) && near(gain('pay', 0.2), 2 * gain('pay', 0.1), 1e-9), 'so are tips and pay');
  // Hours are a curve: real hourly x hours stays fixed, so 10% less time multiplies the rate by 1 / 0.9.
  ok(near(base.realHourly + gain('hours', 0.1), base.realHourly / 0.9, 1e-9), 'hours are a curve: 10% less time multiplies the rate by 1 / 0.9');
  ok(!near(gain('hours', 0.2), 2 * gain('hours', 0.1), 1e-6), 'and twice the move is not twice the change');
  // The slope along miles is made of the other inputs: cost and deduction per mile, tax, and hours.
  const t = G.taxOnNextDollar();
  ok(near(gain('miles', 0.1), 0.1 * base.miles * (0.70 - t * 0.70) / base.hours, 1e-9), 'the gain from fewer miles equals miles saved x (cost - tax x deduction) / hours');
  const gains = G.levers(shifts).map((l) => l.gain);
  ok(gains.every((g, i) => i === 0 || gains[i - 1] >= g) && gains.length === 5, 'all five levers are listed, biggest gain first');
  ok(G.levers([{ date: '2026-10-01', hours: 3, miles: 0, pay: 40, tips: 0, other: 0 }]).map((l) => l.id).sort().join() === 'hours,pay', 'a lever with nothing to move is left out');
  ok(G.levers([]).length === 0, 'an empty log has no levers');
}

section('The least a mile has to pay (solved, then checked by putting it back)');
{
  const shifts = [{ date: '2026-10-01', hours: 5, miles: 60, jobs: 10, pay: 50, tips: 40, other: 4 }];
  const check = (settings, name) => {
    const least = G.leastPayPerMile(settings);
    const before = G.totals(shifts, settings).kept;
    // One more trip of 10 miles paid at exactly that rate, taking no extra time.
    const after = G.totals([...shifts, { date: '2026-10-01', hours: 0, miles: 10, pay: least * 10 }], settings).kept;
    ok(near(after, before, 1e-9), name, `least ${least.toFixed(4)}, kept ${before.toFixed(4)} then ${after.toFixed(4)}`);
  };
  check(undefined, 'at the standard rates a further mile paid at the least rate leaves what is kept unchanged');
  check({ costPerMile: 0.30, incomeTaxRate: 0.22 }, 'the same with a cheaper car and a higher tax rate');
  check({ selfEmployed: false, costPerMile: 0.45 }, 'and with self-employment tax switched off');
  ok(near(G.leastPayPerMile(), 0.70, 1e-9), 'when the cost and the deduction are both 70 cents, the least is exactly 70 cents');
  ok(near(G.leastPayPerMile({ costPerMile: 0.30 }, false), 0.30), 'with no taxable profit the least is simply the cost of a mile');
  ok(G.leastPayPerMile({ costPerMile: 0.10 }) === 0, 'a car cheaper than the tax saving has a least of zero, not a negative rate');
}

section('Periods');
{
  const today = new Date(2026, 9, 7);                 // Wednesday 7 October 2026
  const shifts = ['2026-10-07', '2026-10-05', '2026-10-04', '2026-09-30', '2026-01-02', '2025-12-31', '2026-10-09'].map((date) => ({ date, pay: 1 }));
  const dates = (p) => G.inPeriod(shifts, p, today).map((x) => x.date).join(' ');
  ok(dates('week') === '2026-10-07 2026-10-05', 'this week runs from Monday and leaves out last Sunday and days still to come');
  ok(dates('month') === '2026-10-07 2026-10-05 2026-10-04', 'this month starts on the 1st');
  ok(dates('year') === '2026-10-07 2026-10-05 2026-10-04 2026-09-30 2026-01-02', 'this year leaves out last December');
  ok(G.inPeriod(shifts, 'all', today).length === 7, 'all keeps every shift');
  ok(G.inPeriod(shifts, 'week', new Date(2026, 9, 5)).map((x) => x.date).join() === '2026-10-05', 'on a Monday the week is that one day');
}

section('The spreadsheet file');
{
  const csv = G.toCsv([
    { date: '2026-10-05', what: 'rides, airport', hours: 6, miles: 118, jobs: 14, pay: 132, tips: 21, other: 6.5 },
    { date: '2026-10-01', what: 'deliveries', hours: 4.5, miles: 62, jobs: 11, pay: 48, tips: 39, other: 0 },
  ]);
  const lines = csv.trim().split('\r\n');
  ok(lines.length === 3 && lines[0].startsWith('Date,Work,Hours,Miles'), 'a header row and one row per shift');
  ok(lines[1].startsWith('2026-10-01,deliveries,4.5,62,11,48.00,39.00,0.00,87.00,43.40,43.40'), 'rows are in date order with gross, car cost and mileage deduction worked out');
  ok(lines[2].includes('"rides, airport"'), 'a name with a comma in it is quoted so the columns stay in line');
}

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
