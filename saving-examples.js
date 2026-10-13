// The parts of a business that a cut can reach. The wage or fee is one line in
// the books; these are what the same thing was feeding.
const TOUCHES = [
  { id: 'capacity', label: 'Getting the work done', hint: 'capacity to make or deliver' },
  { id: 'knowhow', label: 'Know-how', hint: 'what people know that is not written down' },
  { id: 'next', label: 'What comes next', hint: 'research, development, improvement' },
  { id: 'selling', label: 'Selling', hint: 'finding and closing business' },
  { id: 'customers', label: 'Customer relationships', hint: 'trust, repeat business, referrals' },
  { id: 'suppliers', label: 'Supplier relationships', hint: 'terms, favours, who picks up the phone' },
  { id: 'skill', label: 'Skill of those who stay', hint: 'training, standards, morale' },
];

// Starting points. The figures are illustrative round numbers, not data about
// any real company. Each one is meant to be overwritten with the user's own.
'use strict';

// A blank start: only the three numbers and the checklist matter. Everything
// under "More detail" is set to "none", and all of the income is counted as kept.
const BLANK = { saving: 0, oneTime: 0, dependentValue: 0, cutShare: 0, spareShare: 0, margin: 100, delayMonths: 0, knockOn: 0, undoChance: 0, undoCost: 0, years: 3, touches: { capacity: 1 } };

const EXAMPLES = [
  { id: 'own-saving', mode: 'saving', own: true, label: 'My own numbers', what: 'it', note: 'Type your three numbers and tap what relies on it.', values: { ...BLANK } },
  { id: 'own-gain', mode: 'gain', own: true, label: 'My own numbers', what: 'what it draws on', note: 'Type your three numbers and tap what it draws on.', values: { ...BLANK } },
  {
    id: 'layoff',
    label: 'Reduce headcount',
    what: 'the team',
    note: 'Ten people of fifty, about $70,000 each. Severance up front; the work they did stops over a few months.',
    values: { saving: 700000, oneTime: 150000, dependentValue: 8000000, cutShare: 20, spareShare: 15, margin: 50, delayMonths: 4, knockOn: 90000, undoChance: 40, undoCost: 200000, years: 3, touches: { capacity: 1, knowhow: 0.5 } },
  },
  {
    id: 'supplier',
    label: 'Switch to a cheaper supplier',
    what: 'sales that rely on the part',
    note: 'A cheaper part. Here "how much is cut" is the share of sales you expect to be hurt by defects and returns.',
    values: { saving: 60000, oneTime: 15000, dependentValue: 900000, cutShare: 6, spareShare: 0, margin: 40, delayMonths: 6, knockOn: 12000, undoChance: 25, undoCost: 30000, years: 3, touches: { capacity: 1, customers: 0.5 } },
  },
  {
    id: 'maintenance',
    label: 'Skip maintenance',
    what: 'the line\'s output',
    note: 'Nothing happens for months. Then downtime begins, and there is a real chance of one large repair.',
    values: { saving: 40000, oneTime: 0, dependentValue: 2000000, cutShare: 5, spareShare: 0, margin: 30, delayMonths: 9, knockOn: 5000, undoChance: 50, undoCost: 120000, years: 3, touches: { capacity: 1 } },
  },
  {
    id: 'marketing',
    label: 'Cut marketing',
    what: 'sales that marketing brings in',
    note: 'Half the budget. Sales already in the pipeline carry on for a while, which hides the effect.',
    values: { saving: 100000, oneTime: 0, dependentValue: 600000, cutShare: 50, spareShare: 40, margin: 45, delayMonths: 3, knockOn: 0, undoChance: 30, undoCost: 20000, years: 3, touches: { selling: 1 } },
  },
  {
    id: 'subscription',
    label: 'Cancel an unused subscription',
    what: 'work that used it',
    note: 'A tool almost nobody opens. Most of what is cut really was spare, so this one holds up.',
    values: { saving: 6000, oneTime: 0, dependentValue: 20000, cutShare: 100, spareShare: 90, margin: 50, delayMonths: 1, knockOn: 0, undoChance: 10, undoCost: 500, years: 3, touches: { capacity: 1 } },
  },
  {
    id: 'price',
    mode: 'gain',
    label: 'Raise prices',
    what: 'your existing customers',
    note: 'More per sale on paper. Here "how much it takes away" is the share of customers you expect to lose over it.',
    values: { saving: 200000, oneTime: 0, dependentValue: 3000000, cutShare: 8, spareShare: 10, margin: 40, delayMonths: 3, knockOn: 10000, undoChance: 20, undoCost: 50000, years: 3, touches: { customers: 1, selling: 0.5 } },
  },
  {
    id: 'bigcustomer',
    mode: 'gain',
    label: 'Take on a big new customer',
    what: 'the customers you already serve',
    note: 'New income, served by the same people. What it takes away is their time and attention for everyone else.',
    values: { saving: 300000, oneTime: 40000, dependentValue: 2000000, cutShare: 25, spareShare: 20, margin: 45, delayMonths: 2, knockOn: 30000, undoChance: 15, undoCost: 60000, years: 3, touches: { capacity: 1, customers: 0.5, skill: 0.5 } },
  },
  {
    id: 'secondproduct',
    mode: 'gain',
    label: 'Launch a second product',
    what: 'your main product',
    note: 'A new line of income that pulls the best people off the thing that pays the bills.',
    values: { saving: 250000, oneTime: 120000, dependentValue: 1800000, cutShare: 10, spareShare: 20, margin: 50, delayMonths: 6, knockOn: 20000, undoChance: 35, undoCost: 150000, years: 3, touches: { capacity: 0.5, next: 1, selling: 0.5 } },
  },
  {
    id: 'idletime',
    mode: 'gain',
    label: 'Sell idle machine time',
    what: 'your own production',
    note: 'The machine sits unused most evenings. Nearly all of what this takes was spare, so the gain holds up.',
    values: { saving: 80000, oneTime: 5000, dependentValue: 500000, cutShare: 5, spareShare: 80, margin: 40, delayMonths: 2, knockOn: 3000, undoChance: 10, undoCost: 5000, years: 3, touches: { capacity: 1 } },
  },
  {
    id: 'training',
    label: 'Cut training',
    what: 'work that needs skilled people',
    note: 'The budget line disappears at once. What the training would have brought in is never earned, so it never shows up as a loss anywhere.',
    values: { saving: 50000, oneTime: 0, dependentValue: 1200000, cutShare: 10, spareShare: 20, margin: 40, delayMonths: 9, knockOn: 8000, undoChance: 30, undoCost: 40000, years: 3, touches: { capacity: 0.5, knowhow: 1, skill: 1 } },
  },
  {
    id: 'freeze',
    label: 'Freeze hiring',
    group: 'People',
    what: 'the work waiting on those hires',
    note: 'Open roles stay empty. The pay is saved; the work those roles were for is not done, and the rest of the team covers what it can.',
    values: { saving: 240000, oneTime: 0, dependentValue: 3000000, cutShare: 8, spareShare: 20, margin: 45, delayMonths: 3, knockOn: 30000, undoChance: 30, undoCost: 40000, years: 2, touches: { capacity: 1, next: 0.5 } },
  },
  {
    id: 'juniors',
    label: 'Replace experienced staff with cheaper hires',
    group: 'People',
    what: 'the work the experienced people did',
    note: 'Lower pay for the same headcount. What leaves is what they knew, and the people they were training.',
    values: { saving: 180000, oneTime: 90000, dependentValue: 4000000, cutShare: 10, spareShare: 10, margin: 45, delayMonths: 4, knockOn: 40000, undoChance: 30, undoCost: 120000, years: 3, touches: { knowhow: 1, skill: 1, customers: 0.5 } },
  },
  {
    id: 'outsource',
    label: 'Outsource a team',
    group: 'People',
    what: 'the work the team did',
    note: 'A cheaper provider takes over. Hand-over costs come first; slower answers and lost know-how come later.',
    values: { saving: 400000, oneTime: 150000, dependentValue: 5000000, cutShare: 12, spareShare: 15, margin: 40, delayMonths: 6, knockOn: 60000, undoChance: 25, undoCost: 300000, years: 3, touches: { capacity: 0.5, knowhow: 1, customers: 0.5 } },
  },
  {
    id: 'raises',
    label: 'Skip pay rises this year',
    group: 'People',
    what: 'the work of the people most likely to leave',
    note: 'The budget line is saved at once. The cost is the good people who leave over it, and replacing them.',
    values: { saving: 150000, oneTime: 0, dependentValue: 6000000, cutShare: 5, spareShare: 0, margin: 45, delayMonths: 6, knockOn: 80000, undoChance: 20, undoCost: 100000, years: 2, touches: { knowhow: 1, skill: 0.5 } },
  },
  {
    id: 'materials',
    label: 'Use cheaper materials',
    group: 'Suppliers and materials',
    what: 'sales of the product',
    note: 'A lower cost per unit. Here "how much is cut" is the share of sales you expect to lose to complaints and returns.',
    values: { saving: 90000, oneTime: 10000, dependentValue: 2500000, cutShare: 4, spareShare: 0, margin: 35, delayMonths: 6, knockOn: 25000, undoChance: 30, undoCost: 40000, years: 3, touches: { customers: 1, selling: 0.5 } },
  },
  {
    id: 'equipment',
    label: 'Delay replacing equipment',
    group: 'Operations',
    what: 'the line\'s output',
    note: 'The purchase is put off. Breakdowns and slower running eat into output, with a chance of a failure that forces the purchase anyway.',
    values: { saving: 120000, oneTime: 0, dependentValue: 3000000, cutShare: 4, spareShare: 0, margin: 30, delayMonths: 8, knockOn: 15000, undoChance: 40, undoCost: 150000, years: 2, touches: { capacity: 1 } },
  },
  {
    id: 'quality',
    label: 'Cut quality checks',
    group: 'Operations',
    what: 'sales that rely on your reputation',
    note: 'Fewer inspections and faster shipping. The faults reach customers months later.',
    values: { saving: 70000, oneTime: 0, dependentValue: 2000000, cutShare: 5, spareShare: 10, margin: 40, delayMonths: 6, knockOn: 30000, undoChance: 35, undoCost: 60000, years: 3, touches: { customers: 1, selling: 0.5 } },
  },
  {
    id: 'support',
    label: 'Cut customer support',
    group: 'Operations',
    what: 'repeat business',
    note: 'Fewer people answering. Customers wait longer, and some do not come back.',
    values: { saving: 110000, oneTime: 20000, dependentValue: 1800000, cutShare: 8, spareShare: 15, margin: 50, delayMonths: 4, knockOn: 10000, undoChance: 30, undoCost: 50000, years: 3, touches: { customers: 1 } },
  },
  {
    id: 'stock',
    label: 'Hold less stock',
    group: 'Operations',
    what: 'sales that need the item on the shelf',
    note: 'Less money tied up in the warehouse. The cost is the sales lost when something is not there.',
    values: { saving: 60000, oneTime: 0, dependentValue: 4000000, cutShare: 2, spareShare: 30, margin: 35, delayMonths: 1, knockOn: 8000, undoChance: 20, undoCost: 10000, years: 2, touches: { selling: 1 } },
  },
  {
    id: 'salesteam',
    label: 'Cut the sales team',
    group: 'Sales and marketing',
    what: 'sales the team brings in',
    note: 'A third of the team. Deals in hand still close, which hides the drop for a while.',
    values: { saving: 300000, oneTime: 60000, dependentValue: 4500000, cutShare: 33, spareShare: 25, margin: 40, delayMonths: 4, knockOn: 0, undoChance: 35, undoCost: 120000, years: 3, touches: { selling: 1, customers: 0.5 } },
  },
  {
    id: 'location',
    label: 'Close a location',
    group: 'Sales and marketing',
    what: 'sales made at that location',
    note: 'Rent and staff are saved. Some customers move to your other sites; "how much was spare" is the share of sales you expect to keep.',
    values: { saving: 250000, oneTime: 80000, dependentValue: 900000, cutShare: 100, spareShare: 40, margin: 45, delayMonths: 0, knockOn: 0, undoChance: 10, undoCost: 200000, years: 3, touches: { selling: 1 } },
  },
  {
    id: 'rnd',
    label: 'Cut research and development',
    group: 'Overheads',
    what: 'income from products not yet launched',
    note: 'The saving is immediate. What is lost is next year\'s product, so nothing shows for a long time.',
    values: { saving: 200000, oneTime: 0, dependentValue: 2000000, cutShare: 30, spareShare: 20, margin: 50, delayMonths: 12, knockOn: 0, undoChance: 30, undoCost: 150000, years: 4, touches: { next: 1, knowhow: 0.5 } },
  },
  {
    id: 'security',
    label: 'Cut the IT and security budget',
    group: 'Overheads',
    what: 'everything that runs on your systems',
    note: 'Nothing happens until something does. Here the chance of having to undo it stands for an outage or a breach.',
    values: { saving: 80000, oneTime: 0, dependentValue: 5000000, cutShare: 1, spareShare: 0, margin: 40, delayMonths: 6, knockOn: 10000, undoChance: 25, undoCost: 400000, years: 3, touches: { capacity: 1 } },
  },
  {
    id: 'shift',
    mode: 'gain',
    label: 'Add a second shift',
    group: 'Capacity',
    what: 'the people and machines you already have',
    note: 'More output from the same plant. It draws on maintenance time and on supervisors.',
    values: { saving: 350000, oneTime: 50000, dependentValue: 2500000, cutShare: 10, spareShare: 40, margin: 40, delayMonths: 3, knockOn: 40000, undoChance: 20, undoCost: 60000, years: 3, touches: { capacity: 1, skill: 0.5 } },
  },
  {
    id: 'discount',
    mode: 'gain',
    label: 'Discount to win more sales',
    group: 'Pricing',
    what: 'the sales you already make at full price',
    note: 'More units sold. What it takes away is the margin on customers who would have paid full price.',
    values: { saving: 180000, oneTime: 0, dependentValue: 3000000, cutShare: 10, spareShare: 0, margin: 40, delayMonths: 0, knockOn: 0, undoChance: 20, undoCost: 30000, years: 2, touches: { selling: 1 } },
  },
  {
    id: 'newsite',
    mode: 'gain',
    label: 'Open a second location',
    group: 'Growth',
    what: 'your first location',
    note: 'New sales in a new place. It pulls managers and some customers away from the first.',
    values: { saving: 400000, oneTime: 250000, dependentValue: 1500000, cutShare: 12, spareShare: 20, margin: 45, delayMonths: 3, knockOn: 30000, undoChance: 25, undoCost: 200000, years: 3, touches: { capacity: 0.5, customers: 0.5, skill: 0.5 } },
  },
];

// The group each of the original decisions is listed under in the picker, and
// the order the groups appear in.
const GROUP_OF = {
  layoff: 'People', training: 'People', supplier: 'Suppliers and materials', maintenance: 'Operations',
  marketing: 'Sales and marketing', subscription: 'Overheads',
  price: 'Pricing', bigcustomer: 'Growth', secondproduct: 'Growth', idletime: 'Capacity',
};
for (const e of EXAMPLES) if (!e.group && GROUP_OF[e.id]) e.group = GROUP_OF[e.id];
const GROUP_ORDER = ['People', 'Suppliers and materials', 'Operations', 'Sales and marketing', 'Overheads', 'Pricing', 'Growth', 'Capacity'];

// The form holds percentages as whole numbers; the formula wants shares 0 to 1.
function toInputs(values) {
  return {
    ...values,
    touches: values.touches ? TOUCHES.map((t) => values.touches[t.id] || 0) : undefined,
    cutShare: values.cutShare / 100, spareShare: values.spareShare / 100,
    margin: values.margin / 100, undoChance: values.undoChance / 100,
    discountRate: (values.discountRate || 0) / 100,
  };
}

const exampleApi = { EXAMPLES, TOUCHES, GROUP_ORDER, toInputs };
if (typeof module !== 'undefined' && module.exports) module.exports = exampleApi;
if (typeof window !== 'undefined') window.HiddenCostExamples = exampleApi;
