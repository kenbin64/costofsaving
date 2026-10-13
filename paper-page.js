// The worked cases on paper.html ("Good on paper").
//
// Every figure shown is worked out here, when the page loads, by the same
// engines the calculators use. Nothing is typed in by hand, so the cases cannot
// drift out of step with the calculators. The inputs are the calculators' own
// illustrative examples; they are not data about any real company.
'use strict';
(function () {
  const { analyze } = window.HiddenCost;
  const { EXAMPLES, TOUCHES, toInputs } = window.HiddenCostExamples;
  const A = window.Arrange, W = window.Worth;
  const $ = (id) => document.getElementById(id);
  const money = (v) => `$${Math.round(Math.abs(v)).toLocaleString('en-US')}`;
  const p1 = (v) => `${(+(v * 100).toFixed(1)).toLocaleString('en-US')}%`;
  const dollars = (v) => `$${v.toFixed(2)}`;
  const years = (n) => (n === 1 ? 'a year' : `${n} years`);
  const list = (words) => (words.length < 2 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`);

  const card = ({ title, onPaper, inPractice, ratio, href }) => `<div class="case">
      <h3>${title}</h3>
      <p class="on"><b>On paper</b> ${onPaper}</p>
      <p class="in"><b>In practice</b> ${inPractice}</p>
      <p class="ratio-chip">${ratio}</p>
      ${href ? `<a href="${href}">Open this in the calculator</a>` : ''}
    </div>`;

  // A business decision from the calculator, put into words.
  function business(id, why) {
    const ex = EXAMPLES.find((e) => e.id === id);
    const r = analyze(toInputs(ex.values));
    const fed = TOUCHES.filter((t) => (ex.values.touches[t.id] || 0) > 0).map((t) => t.label.toLowerCase());
    const extra = r.hidden.lostEarnings * (1 - r.subtractionView / r.lostShare);
    return card({
      title: ex.label,
      onPaper: `${money(ex.values.saving)} a year saved, which is ${money(r.grossSaving)} over ${years(ex.values.years)}.`,
      inPractice: `${why} It was feeding ${list(fed)}, and each passes its loss on to the next. A ${p1(r.subtractionView)} cut in what was working becomes a ${p1(r.lostShare)} loss of the income that relied on it, which costs ${money(extra)} more than the straight-line view.`,
      ratio: `Every $1 saved costs ${dollars(r.multiple)}`,
      href: `saving.html#${id}`,
    });
  }

  // Requiring a return to the office: on-site set against hybrid for one team.
  function office() {
    const team = { people: 40, pay: 80000, replaceCost: 40000, seatCost: 12000, commuteCost: 14, commuteHours: 1.2, homeCost: 3 };
    const on = A.costOf({ seats: 1, support: 0, leavers: 0.08, output: 0, days: 5 }, team);
    const hybrid = A.costOf({ seats: 0.6, support: 600, leavers: 0, output: 0, days: 3 }, team);
    return card({
      title: 'Require a return to the office',
      onPaper: 'Nothing to subtract. The office is already paid for, so it looks free.',
      inPractice: `If ${p1(0.08)} of a team of ${team.people} leave over it, replacing them costs ${money(on.leavers)} a year. With the desks that could have been given up, five days on-site costs ${money(on.total)} a year against ${money(hybrid.total)} for three. Each person also pays ${money(on.staffCostEach)} a year to commute, which they feel as a ${p1(on.staffShareOfPay)} pay cut and which appears in nobody's accounts.`,
      ratio: `${(on.total / hybrid.total).toFixed(1)} times the cost of hybrid`,
      href: 'where.html',
    });
  }

  // An everyday one: putting off a repair.
  function repair() {
    const input = { costNow: 400, months: 6, chanceWorse: 0.3, costWorse: 2200, earnRate: 0.04 };
    const r = W.evaluateWait(input);
    return card({
      title: 'Put off a car repair',
      onPaper: `${money(input.costNow)} stays in your pocket.`,
      inPractice: `There is a ${p1(input.chanceWorse)} chance the fault becomes a ${money(input.costWorse)} repair. On average, putting it off for ${input.months} months costs ${money(r.laterTotal)}.`,
      ratio: `Every $1 put off costs ${dollars(r.perDollar)}`,
      href: 'wait.html#car-repair',
    });
  }

  $('cases').innerHTML = [
    business('layoff', 'The same people were the capacity to do the work and part of the know-how behind it.'),
    business('juniors', 'Nothing about it looks like a cut: the headcount is the same.'),
    business('training', 'Nothing shows for about nine months.'),
    business('salesteam', 'Deals already in hand keep closing for a few months, which hides it.'),
    office(),
    repair(),
  ].join('');

  // The plain subtractions: what was removed was feeding little or nothing.
  $('plain-cases').innerHTML = ['subscription', 'idletime', 'stock'].map((id) => {
    const ex = EXAMPLES.find((e) => e.id === id);
    const r = analyze(toInputs(ex.values));
    return `<li><b>${ex.label}.</b> Every $1 ${ex.mode === 'gain' ? 'gained' : 'saved'} costs ${Math.round(r.multiple * 100)} cents. <a href="saving.html#${id}">See it</a></li>`;
  }).join('');
})();
