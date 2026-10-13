// WHERE THE WORK HAPPENS: on-site, hybrid, or work from home.
//
// A choice about a whole team, compared the same way as any other change on
// this site: count what differs between the options and nothing else. Pay is
// the same under all three, so pay itself is left out.
//
// THE TEAM
//
//   people        how many people the decision covers
//   pay           average yearly pay per person
//   replaceCost   cost to replace one person who leaves (hiring, training, the slow first months)
//   workValue     what a year of one person's work is worth to the business.
//                 Left empty it is taken as their pay: the least it can be
//                 worth, since that is what is paid for it.
//   seatCost      yearly cost of one desk: rent, power, cleaning, services
//   commuteCost   what a day's commute costs one person
//   commuteHours  hours a day's commute takes one person
//   homeCost      what a day working at home costs one person: heating, power, internet
//   hires         new people the team takes on in a year
//   timeValue     what an hour of a person's own time is worth to them (optional)
//
// AN ARRANGEMENT
//
//   seats         share of people who need a desk (1 = everyone, 0.6 = shared desks)
//   support       yearly cost per person of working away from the office: equipment, allowance
//   leavers       change in the share of people leaving each year because of it:
//                 0.05 is 5% more leaving, -0.03 is 3% fewer
//   output        change in output, as a share: -0.02 is 2% less, 0.03 is 3% more
//   days          days a week people travel in
//   payChange     change in pay needed to hire and keep people under it, as a share:
//                 0.03 is 3% more, -0.03 is 3% less
//   rampWeeks     extra weeks a new person takes to get up to speed under it
//   travel        yearly cost per person of bringing the team together in one place
//
// THE SUM, per year
//
//   office cost        = people x seats x seat cost
//   support cost       = people x support
//   cost of leavers    = people x leavers x replace cost
//   cost of lost output = people x work value x (-output)      (a gain in output is a negative cost)
//   pay difference     = people x pay x pay change
//   getting up to speed = hires x extra weeks x work value / 52
//   team travel        = people x travel
//   total              = the seven added together
//
// Every one of these can favour any arrangement. Which way each points depends on
// the team, and the figures are the user's own. The page takes no side.
//
// THE EMPLOYEE'S BOTTOM LINE. Commuting and the cost of working at home are
// paid by the people, not the business, so they are not in the business total.
// They are shown beside it as each person's own bottom line, because that is
// what people weigh when they decide whether to stay. A five-day week is assumed.
//
//   commute cost per person   = days in x weeks worked x commute cost
//   commute hours per person  = days in x weeks worked x commute hours
//   home cost per person      = (5 - days in) x weeks worked x home cost
//   cost to each person       = commute cost + home cost
//   as a share of pay         = cost to each person / pay
//
// THE TIPPING POINTS. Each cost is a straight line in its own input, so the
// value at which two arrangements cost the same is solved with one division:
//
//   output change at which A costs the same as B
//       = -(B total - A total without its output line) / (people x work value)
//   leavers at which A costs the same as B
//       = (B total - A total without its leavers line) / (people x replace cost)
//
// WHAT IS NOT KNOWN. How an arrangement changes output, and how many people it
// drives away, differ from one team to the next and are argued over. The
// calculator does not supply those figures. They are the user's estimates, and
// the tipping points say how wrong an estimate can be before the answer changes.
'use strict';

const WEEKS_WORKED = 48;      // weeks a year people travel in, allowing for leave and holidays

const num = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
const atLeastZero = (v) => Math.max(0, num(v));

function teamOf(given = {}) {
  const pay = atLeastZero(given.pay);
  return {
    people: atLeastZero(given.people),
    pay,
    replaceCost: atLeastZero(given.replaceCost),
    workValue: num(given.workValue) > 0 ? num(given.workValue) : pay,
    seatCost: atLeastZero(given.seatCost),
    commuteCost: atLeastZero(given.commuteCost),
    commuteHours: atLeastZero(given.commuteHours),
    homeCost: atLeastZero(given.homeCost),
    hires: atLeastZero(given.hires),
    timeValue: atLeastZero(given.timeValue),
  };
}
function arrangementOf(given = {}) {
  return {
    id: given.id, name: given.name,
    seats: Math.min(1, atLeastZero(given.seats)),
    support: atLeastZero(given.support),
    leavers: Math.max(-1, Math.min(1, num(given.leavers))),   // may be negative: fewer people leaving
    output: Math.max(-1, num(given.output)),          // may be negative: a loss of output
    days: Math.min(7, atLeastZero(given.days)),
    payChange: Math.max(-1, num(given.payChange)),    // may be negative: lower pay needed
    rampWeeks: atLeastZero(given.rampWeeks),
    travel: atLeastZero(given.travel),
  };
}

// The yearly cost of one arrangement for this team.
function costOf(arrangement, teamGiven) {
  const t = teamOf(teamGiven), a = arrangementOf(arrangement);
  const office = t.people * a.seats * t.seatCost;
  const support = t.people * a.support;
  const leavers = t.people * a.leavers * t.replaceCost;
  const output = t.people * t.workValue * -a.output;
  const payDifference = t.people * t.pay * a.payChange;
  const ramp = t.hires * a.rampWeeks * t.workValue / 52;
  const travel = t.people * a.travel;
  const commuteHoursEach = a.days * WEEKS_WORKED * t.commuteHours;
  return {
    id: a.id, name: a.name, inputs: a,
    office, support, leavers, output, payDifference, ramp, travel,
    total: office + support + leavers + output + payDifference + ramp + travel,
    // What the hours spent travelling are worth to the person, when they have put a value on their time.
    staffTimeValueEach: commuteHoursEach * t.timeValue,
    desks: t.people * a.seats,
    peopleLeaving: t.people * a.leavers,
    commuteCostEach: a.days * WEEKS_WORKED * t.commuteCost,
    commuteHoursEach: a.days * WEEKS_WORKED * t.commuteHours,
    homeCostEach: Math.max(0, 5 - a.days) * WEEKS_WORKED * t.homeCost,
    staffCostEach: a.days * WEEKS_WORKED * t.commuteCost + Math.max(0, 5 - a.days) * WEEKS_WORKED * t.homeCost,
    staffShareOfPay: t.pay > 0 ? (a.days * WEEKS_WORKED * t.commuteCost + Math.max(0, 5 - a.days) * WEEKS_WORKED * t.homeCost) / t.pay : null,
  };
}

// The output change at which `a` costs exactly what `b` costs. null when no
// work value is set, since output then has no price.
function outputToMatch(a, b, teamGiven) {
  const t = teamOf(teamGiven), ca = costOf(a, t), cb = costOf(b, t);
  const scale = t.people * t.workValue;
  return scale > 0 ? -(cb.total - (ca.total - ca.output)) / scale : null;
}
// The extra leavers at which `a` costs exactly what `b` costs.
function leaversToMatch(a, b, teamGiven) {
  const t = teamOf(teamGiven), ca = costOf(a, t), cb = costOf(b, t);
  const scale = t.people * t.replaceCost;
  return scale > 0 ? (cb.total - (ca.total - ca.leavers)) / scale : null;
}

// All the arrangements, cheapest first, with the tipping points between the
// cheapest and the next.
function compare(teamGiven, arrangements) {
  const t = teamOf(teamGiven);
  const costs = arrangements.map((a) => costOf(a, t));
  const ranked = costs.slice().sort((x, y) => x.total - y.total);
  const best = ranked[0], next = ranked[1] || null;
  return {
    team: t, costs, ranked, best, next,
    // The same arrangements by what they cost each person, cheapest first.
    rankedForStaff: costs.slice().sort((x, y) => x.staffCostEach - y.staffCostEach || x.commuteHoursEach - y.commuteHoursEach),
    ahead: next ? next.total - best.total : 0,
    // How far the cheapest one's own estimates can slip before it stops being cheapest.
    outputToLoseLead: next ? outputToMatch(best.inputs, next.inputs, t) : null,
    leaversToLoseLead: next ? leaversToMatch(best.inputs, next.inputs, t) : null,
  };
}

const arrangeApi = { WEEKS_WORKED, teamOf, arrangementOf, costOf, outputToMatch, leaversToMatch, compare };
if (typeof module !== 'undefined' && module.exports) module.exports = arrangeApi;
if (typeof window !== 'undefined') window.Arrange = arrangeApi;
