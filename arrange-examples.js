// Worked examples for on-site, hybrid or work from home.
//
// Three different teams, and a different arrangement comes out ahead for each.
// That is deliberate: the calculator has no preferred answer, and the examples
// are there to show that the result follows from the team, not from the page.
// The figures are illustrative. They are not data about any real company.
// Percentages are typed as whole numbers, as they are in the form.
'use strict';

const ARRANGE_EXAMPLES = [
  { id: 'together', label: 'A team that learns side by side',
    note: 'A team of 40 that hires ten new people a year, where much of the work is learned by watching and asking. Desks are inexpensive. On these figures on-site costs the business least. A different team gives a different answer.',
    team: { people: '40', pay: '70,000', replaceCost: '35,000', workValue: '', seatCost: '6,000', hires: '10', commuteCost: '12', commuteHours: '1', homeCost: '3', timeValue: '' },
    onsite: { seats: '100', support: '0', leavers: '0', output: '0', payChange: '0', rampWeeks: '0', travel: '0', days: '5' },
    hybrid: { seats: '70', support: '500', leavers: '0', output: '-2', payChange: '0', rampWeeks: '3', travel: '0', days: '3' },
    home: { seats: '10', support: '1,500', leavers: '0', output: '-5', payChange: '0', rampWeeks: '6', travel: '1,000', days: '0' } },
  { id: 'both', label: 'A team that needs both',
    note: 'A team of 40 with costly desks, where some work goes better together and some goes better alone. On these figures hybrid costs the business least. A different team gives a different answer.',
    team: { people: '40', pay: '80,000', replaceCost: '40,000', workValue: '', seatCost: '9,000', hires: '6', commuteCost: '14', commuteHours: '1.2', homeCost: '3', timeValue: '' },
    onsite: { seats: '100', support: '0', leavers: '5', output: '0', payChange: '0', rampWeeks: '0', travel: '0', days: '5' },
    hybrid: { seats: '50', support: '600', leavers: '0', output: '0', payChange: '0', rampWeeks: '0', travel: '0', days: '3' },
    home: { seats: '10', support: '1,500', leavers: '0', output: '-4', payChange: '0', rampWeeks: '4', travel: '1,500', days: '0' } },
  { id: 'apart', label: 'A team that works well apart',
    note: 'An experienced team of 40 doing work that is mostly done alone, in a city where desks are expensive. On these figures work from home costs the business least. A different team gives a different answer.',
    team: { people: '40', pay: '80,000', replaceCost: '40,000', workValue: '', seatCost: '12,000', hires: '4', commuteCost: '14', commuteHours: '1.2', homeCost: '3', timeValue: '' },
    onsite: { seats: '100', support: '0', leavers: '6', output: '0', payChange: '0', rampWeeks: '0', travel: '0', days: '5' },
    hybrid: { seats: '60', support: '600', leavers: '0', output: '0', payChange: '0', rampWeeks: '1', travel: '0', days: '3' },
    home: { seats: '10', support: '1,500', leavers: '0', output: '-2', payChange: '0', rampWeeks: '2', travel: '1,500', days: '0' } },
];

const TEAM_FIELDS = ['people', 'pay', 'replaceCost', 'workValue', 'seatCost', 'hires', 'commuteCost', 'commuteHours', 'homeCost', 'timeValue'];
const ARR_FIELDS = ['seats', 'support', 'leavers', 'output', 'payChange', 'rampWeeks', 'travel', 'days'];
const PERCENT = ['seats', 'leavers', 'output', 'payChange'];        // typed as whole numbers, used as shares
const ARRANGEMENTS = [{ id: 'onsite', name: 'On-site' }, { id: 'hybrid', name: 'Hybrid' }, { id: 'home', name: 'Work from home' }];

// Typed figures to the numbers the engine takes.
const typed = (text) => { const v = parseFloat(String(text).replace(/[^0-9.\-]/g, '')); return Number.isFinite(v) ? v : 0; };
function inputsOf(example) {
  const team = {};
  for (const f of TEAM_FIELDS) team[f] = typed(example.team[f]);
  const list = ARRANGEMENTS.map((a) => {
    const x = { id: a.id, name: a.name };
    for (const f of ARR_FIELDS) x[f] = typed(example[a.id][f]) / (PERCENT.includes(f) ? 100 : 1);
    return x;
  });
  return { team, list };
}

const arrangeExamplesApi = { ARRANGE_EXAMPLES, TEAM_FIELDS, ARR_FIELDS, PERCENT, ARRANGEMENTS, inputsOf };
if (typeof module !== 'undefined' && module.exports) module.exports = arrangeExamplesApi;
if (typeof window !== 'undefined') window.ArrangeExamples = arrangeExamplesApi;
