// GIG WORK: what are you actually making?
//
// The app shows a payout. What the work cost shows up later and somewhere else:
// in the car, and at tax time. This file adds a log of shifts up and sets the
// payout beside what is left.
//
// A SHIFT
//
//   date     'YYYY-MM-DD'
//   what     the kind of work, in the person's own words ("deliveries", "rides")
//   hours    time given to it, waiting included
//   miles    miles driven for it, including the miles between jobs
//   jobs     deliveries, rides, tasks: whatever is being counted
//   pay      what the app paid, before tips
//   tips     tips
//   other    other costs of the shift: tolls, parking, supplies
//
// THE SUM
//
//   gross          = pay + tips
//   car cost       = miles x cost of a mile
//   kept before tax = gross - car cost - other costs
//
//   mileage deduction = miles x deduction rate
//   profit for tax    = gross - mileage deduction - other costs      (not below 0)
//   self-employment tax = profit for tax x 0.9235 x 0.153
//   income tax          = (profit for tax - half the self-employment tax) x your rate
//   taxes to set aside  = self-employment tax + income tax
//
//   you keep       = gross - car cost - other costs - taxes to set aside
//   stated hourly  = gross / hours            what the payouts look like
//   real hourly    = you keep / hours         what is left
//
// WHAT IS ASSUMED
//
//   - The cost of a mile and the deduction rate both start at 70 cents, the US
//     IRS standard mileage rate for business use in 2025. The rate is set each
//     year, so check the current one. It is meant to cover fuel, wear, insurance
//     and the car losing value. A cheap, paid-off car may really cost less.
//   - The tax lines follow US rules for self-employed people: 15.3% tax on
//     92.35% of profit, half of which comes off the profit before income tax.
//     The income tax rate is the person's own estimate. This is a figure to set
//     money aside by. It is not a tax return and it is not tax advice.
//   - Taxes are worked out on the shifts being looked at, as if they were the
//     whole year. Over a full year that is right; over one week it is a fair
//     share of the year's bill.
'use strict';

const DEFAULTS = { costPerMile: 0.70, deductionPerMile: 0.70, incomeTaxRate: 0.12, selfEmployed: true };
const SE_SHARE = 0.9235;      // share of profit the self-employment tax applies to
const SE_RATE = 0.153;        // 12.4% Social Security + 2.9% Medicare

const n = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : 0);

function settingsOf(given = {}) {
  return {
    costPerMile: Number.isFinite(Number(given.costPerMile)) ? Math.max(0, Number(given.costPerMile)) : DEFAULTS.costPerMile,
    deductionPerMile: Number.isFinite(Number(given.deductionPerMile)) ? Math.max(0, Number(given.deductionPerMile)) : DEFAULTS.deductionPerMile,
    incomeTaxRate: Number.isFinite(Number(given.incomeTaxRate)) ? Math.min(1, Math.max(0, Number(given.incomeTaxRate))) : DEFAULTS.incomeTaxRate,
    selfEmployed: given.selfEmployed === undefined ? DEFAULTS.selfEmployed : !!given.selfEmployed,
  };
}

// Everything about a set of shifts, added up.
function totals(shifts, given) {
  const s = settingsOf(given);
  const sum = (key) => shifts.reduce((a, x) => a + n(x[key]), 0);
  const hours = sum('hours'), miles = sum('miles'), jobs = sum('jobs');
  const pay = sum('pay'), tips = sum('tips'), other = sum('other');

  const gross = pay + tips;
  const carCost = miles * s.costPerMile;
  const keptBeforeTax = gross - carCost - other;

  const deduction = miles * s.deductionPerMile;
  const profitForTax = Math.max(0, gross - deduction - other);
  const selfEmploymentTax = s.selfEmployed ? profitForTax * SE_SHARE * SE_RATE : 0;
  const incomeTax = Math.max(0, profitForTax - selfEmploymentTax / 2) * s.incomeTaxRate;
  const taxes = selfEmploymentTax + incomeTax;

  const kept = keptBeforeTax - taxes;
  const per = (top, bottom) => (bottom > 0 ? top / bottom : null);
  return {
    count: shifts.length, hours, miles, jobs, pay, tips, other,
    gross, carCost, keptBeforeTax, deduction, profitForTax, selfEmploymentTax, incomeTax, taxes, kept,
    statedHourly: per(gross, hours), realHourly: per(kept, hours),
    grossPerMile: per(gross, miles), keptPerMile: per(kept, miles),
    grossPerJob: per(gross, jobs), keptPerJob: per(kept, jobs),
    keptPerDollar: per(kept, gross), tipShare: per(tips, gross),
    settings: s,
  };
}

// The same totals for each kind of work, biggest earner first.
function byWhat(shifts, given) {
  const groups = new Map();
  for (const x of shifts) {
    const key = String(x.what || '').trim() || 'Not named';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(x);
  }
  return [...groups.entries()].map(([what, list]) => ({ what, ...totals(list, given) })).sort((a, b) => b.gross - a.gross);
}

// THE LEVERS: what would change the real hourly figure, and by how much.
//
// Each lever is tried by working the whole sum again with one input moved by a
// tenth, so the tax lines are included and nothing is approximated. The reason
// the answers can be trusted is the shape of the sum:
//
//   - Pay, tips, miles and other costs each enter in a straight line. Move one
//     of them twice as far and the result moves exactly twice as far.
//   - Hours divide. Real hourly x hours is the fixed amount kept, so less time
//     for the same pay moves the result along a curve, not a line.
//
// Both facts are checked in gig_test.js.
function levers(shifts, given, step = 0.10) {
  const base = totals(shifts, given);
  if (!(base.hours > 0)) return [];
  const withChange = (key, factor) => totals(shifts.map((x) => ({ ...x, [key]: n(x[key]) * factor })), given).realHourly;
  const list = [
    { id: 'miles', label: 'fewer miles for the same pay', gain: withChange('miles', 1 - step) - base.realHourly, has: base.miles > 0 },
    { id: 'hours', label: 'less time for the same pay', gain: withChange('hours', 1 - step) - base.realHourly, has: true },
    { id: 'tips', label: 'more in tips', gain: withChange('tips', 1 + step) - base.realHourly, has: base.tips > 0 },
    { id: 'pay', label: 'more pay from the app', gain: withChange('pay', 1 + step) - base.realHourly, has: base.pay > 0 },
    { id: 'other', label: 'less on tolls, parking and supplies', gain: withChange('other', 1 - step) - base.realHourly, has: base.other > 0 },
  ];
  return list.filter((l) => l.has).map(({ has, ...l }) => l).sort((a, b) => b.gain - a.gain);
}

// THE LEAST A MILE HAS TO PAY. Solved, not searched: one more mile costs the
// car and earns a deduction; one more dollar of pay is taxed. Setting the
// change in what is kept to zero gives
//
//   tax on a further dollar of profit   t = se + (1 - se / 2) x income tax rate,   se = 0.9235 x 0.153
//   least pay for a further mile          = (cost of a mile - t x deduction rate) / (1 - t)
//
// When the work is not making a taxable profit, no tax is in play and the
// answer is simply the cost of a mile.
function taxOnNextDollar(given) {
  const s = settingsOf(given);
  const se = s.selfEmployed ? SE_SHARE * SE_RATE : 0;
  return se + (1 - se / 2) * s.incomeTaxRate;
}
function leastPayPerMile(given, inProfit = true) {
  const s = settingsOf(given);
  if (!inProfit) return s.costPerMile;
  const t = taxOnNextDollar(s);
  return t >= 1 ? Infinity : Math.max(0, (s.costPerMile - t * s.deductionPerMile) / (1 - t));
}

// Dates are compared as 'YYYY-MM-DD' text, which sorts the same as the calendar.
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// The shifts that fall in a period: 'week' (Monday to Sunday), 'month', 'year', or 'all'.
function inPeriod(shifts, period, today = new Date()) {
  if (period === 'all') return shifts.slice();
  let from;
  if (period === 'week') {
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7));
    from = iso(monday);
  } else if (period === 'month') from = iso(new Date(today.getFullYear(), today.getMonth(), 1));
  else from = iso(new Date(today.getFullYear(), 0, 1));
  const to = iso(today);
  return shifts.filter((x) => x.date >= from && x.date <= to);
}

// The log as a spreadsheet file: one row per shift, with the mileage figures a
// tax preparer asks for.
function toCsv(shifts, given) {
  const s = settingsOf(given);
  const cell = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const money = (v) => n(v).toFixed(2);
  const rows = [['Date', 'Work', 'Hours', 'Miles', 'Jobs', 'Pay', 'Tips', 'Other costs', 'Gross', 'Car cost', 'Mileage deduction']];
  for (const x of shifts.slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))) {
    rows.push([x.date, x.what || '', n(x.hours), n(x.miles), n(x.jobs), money(x.pay), money(x.tips), money(x.other),
      money(n(x.pay) + n(x.tips)), money(n(x.miles) * s.costPerMile), money(n(x.miles) * s.deductionPerMile)]);
  }
  return rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}

const gigApi = { levers, taxOnNextDollar, leastPayPerMile, DEFAULTS, SE_SHARE, SE_RATE, settingsOf, totals, byWhat, inPeriod, toCsv, iso };
if (typeof module !== 'undefined' && module.exports) module.exports = gigApi;
if (typeof window !== 'undefined') window.Gig = gigApi;
