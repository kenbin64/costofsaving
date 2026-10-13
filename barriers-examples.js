// The worked examples for the cost of barriers, and the order of the fields they fill.
// Kept apart from the page so the build can read the same examples when it writes
// a page for each one. The figures are illustrative: not data about any real company.
'use strict';

// The fields of each calculation, in the order the form shows them, and which
// of them are typed as whole percentages.
const HIRING_FIELDS = ['rounds', 'candidates', 'passShare', 'days', 'interviewers', 'hoursEach', 'hourCost', 'seatPerWeek', 'lostPerWeek', 'lostCost', 'candidateHours', 'badChance', 'badCost', 'catchShare'];
const HIRING_PERCENT = ['passShare', 'lostPerWeek', 'badChance', 'catchShare'];
const GATE_FIELDS = ['steps', 'people', 'handleCost', 'value', 'dropShare', 'badShare', 'badCost', 'catchShare', 'personHours', 'personCost', 'feeIncome'];
const GATE_PERCENT = ['badShare', 'dropShare', 'catchShare'];

// ── Worked examples, grouped by who the barrier stands in front of ────────
// The figures are illustrative. They are not data about any real company.
// Each gate example lists its values in the order of GATE_FIELDS.
// A list may stop short: fields left off the end are 0.
const gateValues = (list) => Object.fromEntries(GATE_FIELDS.map((f, i) => [f, list[i] === undefined ? '0' : list[i]]));
const applicants = { people: 'applicants', good: 'applicants who could do the job', bad: 'applicants who could not' };
const GROUPS = [
  { title: 'Hiring: how many steps, and which ones', items: [
    { id: 'five', mode: 'hiring', label: 'How many interview rounds?',
      note: 'Five interview rounds a week apart for a role paying about $104,000. Eight candidates start and half go on each time. The question is which round stops adding more than it costs.',
      values: { rounds: '5', candidates: '8', passShare: '50', days: '7', interviewers: '3', hoursEach: '1.5', hourCost: '75', seatPerWeek: '2,000', lostPerWeek: '10', lostCost: '20,000', candidateHours: '3', badChance: '50', badCost: '60,000', catchShare: '40' } },
    { id: 'degree', label: 'Should the role require a degree?', words: applicants,
      note: 'A role that 400 people apply to each month, 30% of whom could not do the job. A degree requirement screens out 60% of those, and 45% of the people who could. A capable applicant costs about $350 to find again; one who could not do the job costs about $150 to screen out at interview instead.',
      values: gateValues(['1', '400', '0', '350', '45', '30', '150', '60', '0', '0']) },
    { id: 'experience', label: 'How many years of experience to ask for?', words: applicants,
      note: 'Five years of experience asked for, with 300 applicants a month. A quarter could not do the job. The requirement screens out half of those, and 35% of the people who could.',
      values: gateValues(['1', '300', '0', '350', '35', '25', '150', '50', '0', '0']) },
    { id: 'application', label: 'How long should the application be?', words: applicants,
      note: 'A five-page application that 600 people start each month. Each page takes about 12 minutes, and 12% of capable applicants stop at each page.',
      values: gateValues(['5', '600', '0', '350', '12', '20', '150', '10', '0.2', '0']) },
    { id: 'takehome', label: 'A take-home assignment', words: { people: 'candidates', good: 'candidates who could do the job', bad: 'candidates who could not' },
      note: 'A five-hour assignment set for 40 shortlisted candidates a month. A quarter of the capable ones decline it. It screens out 70% of the others, each of whom would otherwise take up an interview.',
      values: gateValues(['1', '40', '60', '1,500', '25', '40', '340', '70', '5', '0']) },
    { id: 'puzzle', label: 'A general aptitude test', words: { people: 'candidates', good: 'candidates who could do the job', bad: 'candidates who could not' },
      note: 'A 90-minute general test for 120 candidates a month. On these figures it screens out capable and less suitable candidates at a similar rate. Compare it with the work-sample test beside it: the same time and the same candidates, a different test.',
      values: gateValues(['1', '120', '15', '800', '30', '35', '340', '35', '1.5', '0']) },
    { id: 'worksample', label: 'A work-sample test', words: { people: 'candidates', good: 'candidates who could do the job', bad: 'candidates who could not' },
      note: 'The same 90 minutes and the same 120 candidates, spent on a task taken from the real work. It screens out most of those who could not do the job and few of those who could. On these figures it pays for itself.',
      values: gateValues(['1', '120', '15', '800', '10', '35', '340', '65', '1.5', '0']) },
    { id: 'licence', label: 'A licence or certificate check', words: { people: 'applicants', good: 'qualified applicants', bad: 'unqualified applicants' },
      note: 'A licence check for a role where an unqualified hire is costly. 200 applicants a month, one in ten without a valid licence. On these figures the check pays for itself many times over.',
      values: gateValues(['1', '200', '8', '350', '3', '10', '4,000', '95', '0.5', '0']) },
  ] },
  { title: 'Customers: sign-up, checkout and fees', items: [
    { id: 'signup', label: 'A sign-up form', words: { people: 'visitors', good: 'real customers', bad: 'fake and spam accounts' },
      note: 'A four-step sign-up. 2,000 people start it each month and 15% are fake or spam accounts.',
      values: gateValues(['4', '2,000', '0.05', '30', '5', '15', '60', '50', '0.03', '0']) },
    { id: 'account', label: 'An account required before buying', words: { people: 'shoppers', good: 'honest shoppers', bad: 'fraudulent orders' },
      note: 'Shoppers must create an account before they can buy. 3,000 reach the checkout each month, and one in five honest shoppers leaves instead.',
      values: gateValues(['1', '3,000', '0', '45', '20', '1', '250', '30', '0.05', '0']) },
    { id: 'checkout', label: 'Checks at a checkout', words: { people: 'orders', good: 'honest orders', bad: 'fraudulent orders' },
      note: 'Two checks before an order goes through. 5,000 orders a month, 2% of them fraudulent. On these figures both checks pay for themselves.',
      values: gateValues(['2', '5,000', '0.10', '45', '2', '2', '250', '60', '0.02', '0']) },
    { id: 'minimum', label: 'A minimum order', words: { people: 'orders', good: 'orders worth filling', bad: 'orders too small to cover their cost' },
      note: 'A minimum order size. A quarter of 2,000 monthly orders are too small to cover the cost of filling them. The minimum stops most of those and puts off some ordinary customers. On these figures it pays, narrowly.',
      values: gateValues(['1', '2,000', '0', '18', '8', '25', '6', '90', '0', '0']) },
    { id: 'membership', label: 'A membership fee', words: { people: 'shoppers', good: 'shoppers who would have bought', bad: 'shoppers who cost more than they bring' },
      note: 'A $5 a month membership before anyone can buy. 4,000 shoppers a month would otherwise buy, each worth about $25. Four in ten decline to join.',
      values: gateValues(['1', '4,000', '0', '25', '40', '0', '0', '0', '0.05', '0', '5']) },
    { id: 'convenience', label: 'A convenience fee at checkout', words: { people: 'orders', good: 'orders', bad: 'orders it was meant to stop' },
      note: 'A $3 fee added at the last step of 3,000 orders a month, each worth about $22. Nine in a hundred customers leave when they see it. On these figures it pays, with little room to spare.',
      values: gateValues(['1', '3,000', '0', '22', '9', '0', '0', '0', '0', '0', '3']) },
    { id: 'paywall', label: 'A paywall', words: { people: 'readers', good: 'readers', bad: 'readers it was meant to stop' },
      note: 'A paywall at $8 a month in front of 20,000 readers, each worth about 25 cents a month in advertising. Four in a hundred subscribe. On these figures it pays for itself.',
      values: gateValues(['1', '20,000', '0', '0.25', '96', '0', '0', '0', '0', '0', '8']) },
    { id: 'compliance', label: 'Compliance checks for new customers', words: { people: 'new customers', good: 'legitimate customers', bad: 'customers who should not be taken on' },
      note: 'Three identity and compliance steps for 800 new customers a month. Two in a hundred should not be taken on, and each of those would cost about $5,000. Each step takes a customer 20 minutes and loses 9% of the legitimate ones. Where the law requires a check, the question is how many steps it takes, not whether to have it.',
      values: gateValues(['3', '800', '6', '150', '9', '2', '5,000', '70', '0.33', '0']) },
    { id: 'deposit', label: 'A deposit or credit check', words: { people: 'new customers', good: 'customers who would have paid', bad: 'customers who would not have paid' },
      note: 'A deposit or credit check before service starts. 500 new customers a month, one in ten of whom would not pay. On these figures it pays for itself.',
      values: gateValues(['1', '500', '4', '120', '10', '10', '400', '70', '0.25', '0']) },
  ] },
  { title: 'Inside the business: approvals', items: [
    { id: 'approval', label: 'Sign-offs on a request', words: { people: 'requests', good: 'requests worth approving', bad: 'requests that were a poor use of money' },
      note: 'Four sign-offs before a purchase request is approved. 60 requests a month, one in ten a poor use of money. Each sign-off takes the person asking about half an hour.',
      values: gateValues(['4', '60', '45', '400', '6', '10', '2,500', '50', '0.5', '0']) },
  ] },
];

// Typed figures to numbers the engine takes: commas out, percentages to shares.
function inputsOf(example) {
  const gate = (example.mode || 'gate') === 'gate';
  const percent = gate ? GATE_PERCENT : HIRING_PERCENT;
  const out = {};
  for (const f of gate ? GATE_FIELDS : HIRING_FIELDS) {
    const v = parseFloat(String(example.values[f]).replace(/[^0-9.\-]/g, ''));
    out[f] = (Number.isFinite(v) ? v : 0) / (percent.includes(f) ? 100 : 1);
  }
  return out;
}

const barrierExamplesApi = { HIRING_FIELDS, HIRING_PERCENT, GATE_FIELDS, GATE_PERCENT, GROUPS, inputsOf };
if (typeof module !== 'undefined' && module.exports) module.exports = barrierExamplesApi;
if (typeof window !== 'undefined') window.BarrierExamples = barrierExamplesApi;
