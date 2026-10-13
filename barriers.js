// The cost of barriers: what each extra step costs, and what it catches.
//
// Two calculations, both built the same way. A process is a row of steps. Each
// step costs something, and each step stops some of what it is there to stop.
// The sums are done one step at a time, so every step can be judged on its own:
//
//     net of a step = what it catches - what it costs
//
//   hiring(...)  interview rounds for one job. A round costs the interviewers'
//                time, another stretch with the seat empty, and a chance that
//                the first-choice candidate takes another offer meanwhile.
//   gate(...)    any other barrier that many people pass through: a job
//                requirement, a sign-up form, a checkout, a chain of sign-offs.
//                A step costs handling, and the wanted people it turns away.
//                It gets back what it stops, and any fee it charges.
//                It also reports who is kept out, and what going through it
//                costs the people themselves.
//
// Two things in here multiply, which is why the steps cannot simply be added:
//
//     chance the first choice is still free after n rounds = (1 - loss per week) ^ weeks
//     share of good people left after n steps              = (1 - share giving up) ^ n
//
// The formulas are B1 to B3 on the formulas page. Nothing here draws anything.
'use strict';

const MAX_STEPS = 10;
const HIRING_PARTS = [
  { key: 'interview', name: "Interviewers' time" },
  { key: 'seat', name: 'The empty seat' },
  { key: 'lost', name: 'Risk of losing your first choice' },
];
const GATE_PARTS = [
  { key: 'handling', name: 'Handling' },
  { key: 'lost', name: 'Wanted people turned away' },
];

const number = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const atLeastZero = (v) => Math.max(0, number(v));
const share = (v) => Math.min(1, Math.max(0, number(v)));
const stepCount = (v, least) => Math.min(MAX_STEPS, Math.max(least, Math.round(number(v))));

// Which number of steps leaves the most. Ties go to the shorter process.
function bestStop(rounds, least) {
  let best = least, bestNet = least === 0 ? 0 : (rounds[least - 1] ? rounds[least - 1].cumNet : 0);
  for (const r of rounds) if (r.round > least && r.cumNet > bestNet + 1e-9) { best = r.round; bestNet = r.cumNet; }
  return { best, bestNet };
}
// The totals every answer carries, whichever calculation made it.
function summary(rounds, least) {
  const last = rounds[rounds.length - 1];
  const { best, bestNet } = bestStop(rounds, least);
  const beyond = rounds.filter((r) => r.round > best);
  return {
    rounds, best, bestNet,
    totalCost: last ? last.cumCost : 0, totalCaught: last ? last.cumCaught : 0, net: last ? last.cumNet : 0,
    extraCost: beyond.reduce((n, r) => n + r.cost, 0), extraCaught: beyond.reduce((n, r) => n + r.caught, 0),
    firstPastBest: beyond[0] || null,
  };
}

// ── Interview rounds for one job ───────────────────────────────────────────
function hiringOf(raw = {}) {
  return {
    rounds: stepCount(raw.rounds, 1),
    candidates: atLeastZero(raw.candidates),          // people interviewed in round 1
    passShare: share(raw.passShare),                  // share who go on to the next round
    days: atLeastZero(raw.days),                      // calendar days each round adds
    interviewers: atLeastZero(raw.interviewers),      // people in each interview
    hoursEach: atLeastZero(raw.hoursEach),            // hours each of them gives to one interview
    hourCost: atLeastZero(raw.hourCost),              // what an hour of their time is worth
    seatPerWeek: atLeastZero(raw.seatPerWeek),        // what the empty seat costs a week
    lostPerWeek: share(raw.lostPerWeek),              // chance the first choice takes another offer in a week
    lostCost: atLeastZero(raw.lostCost),              // what losing the first choice costs
    candidateHours: atLeastZero(raw.candidateHours),  // unpaid hours a candidate gives to one round
    badChance: share(raw.badChance),                  // chance a hire made with no interviews would not work out
    badCost: atLeastZero(raw.badCost),                // what a hire that does not work out costs
    catchShare: share(raw.catchShare),                // share of the remaining mistakes each round catches
  };
}
function hiring(raw) {
  const x = hiringOf(raw);
  const weeks = x.days / 7;
  const stayPerRound = Math.pow(1 - x.lostPerWeek, weeks);   // chance the first choice is still free after one more round
  const rounds = [];
  let free = 1, bad = x.badChance, cumCost = 0, cumCaught = 0, hoursAll = 0;
  for (let r = 1; r <= x.rounds; r++) {
    // The field narrows each round, but a round with nobody in it is not a round.
    const candidates = Math.max(Math.min(1, x.candidates), x.candidates * Math.pow(x.passShare, r - 1));
    const interview = candidates * x.interviewers * x.hoursEach * x.hourCost;
    const seat = weeks * x.seatPerWeek;
    const lostChance = free * (1 - stayPerRound);
    const lost = lostChance * x.lostCost;
    const badBefore = bad;
    const caught = badBefore * x.catchShare * x.badCost;
    const cost = interview + seat + lost;
    free *= stayPerRound; bad = badBefore * (1 - x.catchShare);
    cumCost += cost; cumCaught += caught; hoursAll += candidates * x.candidateHours;
    rounds.push({
      round: r, candidates, parts: { interview, seat, lost }, cost, caught, net: caught - cost,
      cumCost, cumCaught, cumNet: cumCaught - cumCost,
      stillFree: free, badLeft: bad, cumDays: r * x.days,
      // The share of remaining mistakes this round would have to catch to pay for itself. Above 1, it cannot.
      needCatch: badBefore * x.badCost > 0 ? cost / (badBefore * x.badCost) : null,
    });
  }
  const hoursOfTheHire = x.candidates >= 1 ? x.rounds * x.candidateHours : 0;
  return {
    kind: 'hiring', inputs: x, partNames: HIRING_PARTS, ...summary(rounds, 1),
    stillFree: free, badLeft: bad, days: x.rounds * x.days,
    candidateHoursAll: hoursAll, candidateHoursEach: x.rounds * x.candidateHours,
    candidateHoursNotHired: Math.max(0, hoursAll - hoursOfTheHire),
  };
}

// ── Any barrier that many people pass through ──────────────────────────────
function gateOf(raw = {}) {
  return {
    steps: stepCount(raw.steps, 0),
    people: atLeastZero(raw.people),            // people who arrive each month
    badShare: share(raw.badShare),              // share you would want to keep out
    value: atLeastZero(raw.value),              // what each of the others is worth
    dropShare: share(raw.dropShare),            // share of them who give up at each step
    handleCost: atLeastZero(raw.handleCost),    // cost to handle one person at one step
    badCost: atLeastZero(raw.badCost),          // what each one who should have been kept out costs
    catchShare: share(raw.catchShare),          // share of those each step catches
    personHours: atLeastZero(raw.personHours),  // hours one step takes each person going through it
    personCost: atLeastZero(raw.personCost),    // what one step costs each person out of pocket
    feeIncome: atLeastZero(raw.feeIncome),      // what each person who gets through a step pays you for it
  };
}
function gate(raw) {
  const x = gateOf(raw);
  const goodStart = x.people * (1 - x.badShare), badStart = x.people * x.badShare;
  const rounds = [];
  let good = goodStart, bad = badStart, cumCost = 0, cumCaught = 0, personSteps = 0;
  for (let r = 1; r <= x.steps; r++) {
    personSteps += good + bad;                // everyone who reaches a step goes through it
    const handling = (good + bad) * x.handleCost;
    const lost = good * x.dropShare * x.value;
    // What the step gets back: the cost of those it stops, and any fee paid by those who get through it.
    const stopped = bad * x.catchShare * x.badCost;
    const payers = good * (1 - x.dropShare) + bad * (1 - x.catchShare);
    const income = payers * x.feeIncome;
    const caught = stopped + income;
    const cost = handling + lost;
    const badBefore = bad, goodBefore = good;
    good *= 1 - x.dropShare; bad *= 1 - x.catchShare;
    cumCost += cost; cumCaught += caught;
    rounds.push({
      round: r, parts: { handling, lost }, cost, caught, stopped, income, net: caught - cost,
      cumCost, cumCaught, cumNet: cumCaught - cumCost, goodLeft: good, badLeft: bad,
      // The share of the unwanted this step would have to stop to pay for itself. Each one stopped saves
      // their cost but also pays no fee, so it is worth (cost - fee). Above 1, the step cannot get there.
      needCatch: badBefore * (x.badCost - x.feeIncome) > 0 ? (cost - (goodBefore * (1 - x.dropShare) + badBefore) * x.feeIncome) / (badBefore * (x.badCost - x.feeIncome)) : null,
      // The largest share of wanted people this step could turn away and still pay for itself. Below 0, it cannot.
      // Each one turned away loses what they were worth and the fee they would have paid.
      maxDrop: goodBefore * (x.value + x.feeIncome) > 0 ? (stopped + (goodBefore + badBefore * (1 - x.catchShare)) * x.feeIncome - handling) / (goodBefore * (x.value + x.feeIncome)) : null,
      allItCouldCatch: badBefore * x.badCost,
    });
  }
  return {
    kind: 'gate', inputs: x, partNames: GATE_PARTS, ...summary(rounds, 0),
    goodStart, badStart, goodThrough: good, badThrough: bad,
    goodKeptShare: Math.pow(1 - x.dropShare, x.steps),
    // Who it keeps out: the people it was for, and the people who were wanted.
    keptOutGood: goodStart - good, keptOutBad: badStart - bad,
    keptOutGoodShare: x.people - good - bad > 0 ? (goodStart - good) / (x.people - good - bad) : null,
    // The other bottom line: what going through it costs the people themselves.
    // Those who end up outside spent their share of it and got nothing for it.
    peopleHours: personSteps * x.personHours, peopleCost: personSteps * x.personCost,
    peopleHoursForNothing: (personSteps - (good + bad) * x.steps) * x.personHours,
    peopleCostForNothing: (personSteps - (good + bad) * x.steps) * x.personCost,
  };
}

const barriersApi = { MAX_STEPS, hiringOf, hiring, gateOf, gate };
if (typeof module !== 'undefined' && module.exports) module.exports = barriersApi;
if (typeof window !== 'undefined') window.Barriers = barriersApi;
