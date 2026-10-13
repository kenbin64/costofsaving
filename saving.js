// THE COST OF SAVING MONEY: does a saving (or a gain) survive once everything
// it causes is counted?
//
// In accounting terms this is a DIFFERENTIAL ANALYSIS (also called incremental or
// relevant-cost analysis): compare the business with the change against the
// business without it, counting only what differs. It is a management tool. It
// is not a financial statement, and it does not say financial statements are
// wrong. An income statement records transactions; it does not record what a
// decision caused to NOT happen (opportunity cost), so that part has to be
// worked out separately. This file works it out.
//
// THE RESULT
//
//     net result = saving  -  total cost of the change
//     total cost = one-time cost + side costs + lost contribution + expected reversal cost
//     multiple   = total cost / saving          (below 1 the saving wins; above 1 the loss wins)
//
// THE FOUR COSTS
//
//   one-time cost      paid once to make the change (severance, switching fees).
//                      This one IS visible in the books, beside the decision.
//   side costs         real money spent because of the change, booked under other
//                      headings (overtime, rework, returns, replacing leavers).
//   lost contribution  the opportunity cost: contribution margin on income that
//                      relied on what was cut. Never booked anywhere.
//   expected reversal  the unintended consequence: chance of having to undo the
//                      change x cost of undoing it (an expected value).
//
// WHY THE LOST CONTRIBUTION MULTIPLIES
//
// A cost is subtracted. An input multiplies: each part of the business that
// relies on the thing can only pass on what it received.
//
//     working share cut  = share cut x (1 - share that was spare)
//     share of output kept = (1 - working share cut x strength_1)
//                          x (1 - working share cut x strength_2) x ...
//     share of output lost = 1 - share of output kept
//
// One part at full strength gives the plain proportional loss (a subtraction).
// More parts make the loss larger than proportional. This multiplied-parts form
// is the O-ring production function (Kremer, 1993, Quarterly Journal of
// Economics). It is a MODEL ASSUMPTION chosen by the user through the parts they
// mark, not an accounting rule, and it is an upper estimate when two marked
// parts are really the same income counted twice.
//
// CONVENTIONS
//
//   - Monthly steps. Flows are counted at the end of each month. The one-time
//     cost is paid at the start (month 0).
//   - The lost contribution starts after the delay and runs at a level rate.
//   - The expected reversal cost is spread evenly across the period.
//   - Discounting is optional. With a discount rate of 0 the figures are plain
//     sums in today's money. With a rate r, a flow at month m is multiplied by
//     (1 + r) ^ (-m / 12), giving present values.
//   - Margin means contribution margin: what is kept from each dollar of that
//     income after its OTHER variable costs. It must exclude the cost being
//     cut, or the saving would be counted twice.
//
// Everything is arithmetic on the user's own estimates. The answer is only as
// good as those estimates, which is why the tool also reports the one number
// the decision hangs on (spareNeeded below).
'use strict';

// All money is per year unless marked one-time. Shares run 0 to 1.
//
//   saving          expected saving (or gain) each year
//   oneTime         one-time cost of making the change
//   dependentValue  yearly income that relies on the thing being cut
//   cutShare        how much of that thing is being cut (0.2 = a fifth of it)
//   spareShare      how much of what is cut was truly doing nothing
//   bufferShare     how much of that spare part is a BUFFER: idle on an average day,
//                   needed on a busy one, because the work arrives unevenly. Only the
//                   rest of the spare part is free to cut. Left out, it is 0 and the
//                   whole spare part counts as free, as it did before this was added.
//                   Counting the buffer as fully working is an UPPER estimate: a
//                   buffer is missed only when the busy times come.
//   margin          contribution margin on that income, excluding the cost being cut
//   touches         strengths (0 to 1) of each part of the business that relies on it
//   reach           short form of `touches`: a count of parts at full strength.
//                   Used only when no `touches` list is given.
//   delayMonths     months before the lost contribution starts
//   knockOn         side costs each year
//   undoChance      chance the change has to be reversed within the period
//   undoCost        cost of reversing it
//   years           how far ahead to look
//   discountRate    yearly discount rate for present values (0 = plain sums)
function clean(input) {
  const num = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
  const share = (v) => Math.min(1, Math.max(0, num(v)));
  return {
    saving: Math.max(0, num(input.saving)),
    oneTime: Math.max(0, num(input.oneTime)),
    dependentValue: Math.max(0, num(input.dependentValue)),
    cutShare: share(input.cutShare),
    spareShare: share(input.spareShare),
    bufferShare: share(input.bufferShare),
    margin: share(input.margin),
    reach: Math.min(12, Math.max(1, num(input.reach, 1))),
    touches: Array.isArray(input.touches) ? input.touches.map(share).filter((w) => w > 0) : null,
    delayMonths: Math.max(0, num(input.delayMonths)),
    knockOn: Math.max(0, num(input.knockOn)),
    undoChance: share(input.undoChance),
    undoCost: Math.max(0, num(input.undoCost)),
    years: Math.max(0.25, num(input.years, 3)),
    discountRate: Math.min(1, Math.max(0, num(input.discountRate))),
  };
}

// ── Share of output lost ───────────────────────────────────────────────────
function touchList(x) {
  return x.touches !== null ? x.touches : new Array(Math.round(x.reach)).fill(1);
}
function lostShareAt(x, spareShare) {
  const workingCut = x.cutShare * (1 - spareShare);
  const list = touchList(x);
  if (list.length === 1 && list[0] === 1) return workingCut;   // one part, fully: exactly proportional
  let kept = 1;
  for (const strength of list) kept *= (1 - workingCut * strength);
  return 1 - kept;                                             // an empty list keeps everything
}
// The part of what is cut that can go with nothing lost: spare, and not a buffer.
function freeSpare(x) {
  return x.spareShare * (1 - x.bufferShare);
}
function lostShare(x) {
  return lostShareAt(x, freeSpare(x));
}
// Contribution lost each year once the delay has passed, before discounting.
function lostPerYear(x) {
  return x.dependentValue * lostShare(x) * x.margin;
}

// ── Time: how many years' worth of a level yearly flow has accrued ─────────
// With no discounting these are simply elapsed years, kept exact (no summing of
// twelfths). With discounting each month's twelfth is multiplied by its factor.
const discount = (x, month) => Math.pow(1 + x.discountRate, -month / 12);
// Share of month m that falls after the delay: 0 before, 1 after, part-way in between.
const activeShare = (x, m) => Math.min(1, Math.max(0, m - x.delayMonths));

// Years' worth of a flow that runs from month 1 to `month`.
function yearsAccrued(x, month) {
  if (x.discountRate === 0) return month / 12;
  let sum = 0;
  for (let m = 1; m <= month; m++) sum += discount(x, m) / 12;
  return sum;
}
// Years' worth of a flow that only starts after the delay.
function yearsAccruedAfterDelay(x, month) {
  if (x.discountRate === 0) return Math.max(0, month - x.delayMonths) / 12;
  let sum = 0;
  for (let m = 1; m <= month; m++) sum += activeShare(x, m) * discount(x, m) / 12;
  return sum;
}

// The running totals at a given month (present values if a discount rate is set).
//   booked  what the books show beside this decision: the saving less the one-time cost
//   real    the same, less lost contribution, side costs and expected reversal cost
function atMonth(x, month) {
  const totalMonths = Math.round(x.years * 12);
  const whole = yearsAccrued(x, month);
  const saved = x.saving * whole;
  const booked = saved - x.oneTime;
  const lost = lostPerYear(x) * yearsAccruedAfterDelay(x, month);
  const side = x.knockOn * whole;
  // Spread evenly: each month carries 1/totalMonths of the expected cost.
  const undo = x.undoChance * x.undoCost * (12 / totalMonths) * yearsAccrued(x, Math.min(month, totalMonths));
  return { month, saved, booked, lost, side, undo, real: booked - lost - side - undo };
}

function analyze(input) {
  const x = clean(input);
  const months = Math.round(x.years * 12);
  const series = [];
  for (let m = 0; m <= months; m++) series.push(atMonth(x, m));
  const end = series[months];

  const grossSaving = end.saved;
  const hidden = { oneTime: x.oneTime, lostEarnings: end.lost, sideCosts: end.side, undo: end.undo };
  const hiddenTotal = hidden.oneTime + hidden.lostEarnings + hidden.sideCosts + hidden.undo;
  const eaten = grossSaving > 0 ? hiddenTotal / grossSaving : (hiddenTotal > 0 ? Infinity : 0);

  // The month the real total peaks, and the month it falls below zero for good.
  let peak = series[0];
  for (const p of series) if (p.real > peak.real) peak = p;
  let turnsNegative = null;
  for (let m = 1; m <= months; m++) {
    if (series[m].real < 0 && series.slice(m).every((p) => p.real < 0) && series.slice(0, m).some((p) => p.real >= 0 && p.month > 0)) { turnsNegative = m; break; }
  }
  const looksGoodMonths = Math.min(months, x.delayMonths);

  // THE NUMBER THE DECISION HANGS ON. Solve net result = 0 for spareShare: how
  // much of what is being cut must have been doing nothing for it to break even.
  //   lost = atStake x lostShare(spare)   must equal   room
  const atStake = x.dependentValue * x.margin * yearsAccruedAfterDelay(x, months);   // lost if output went to zero
  const worstLoss = atStake * lostShareAt(x, 0);                                     // lost if nothing cut was spare
  const room = grossSaving - x.oneTime - end.side - end.undo;                        // what is left to absorb it
  let spareNeeded;
  if (room < 0) spareNeeded = null;                                // cannot break even at all
  else if (worstLoss <= room) spareNeeded = 0;                     // survives even with nothing spare
  else if (x.touches === null) {
    // Every part at full strength: closed form, exact.
    const workingCutAllowed = 1 - Math.pow(1 - room / atStake, 1 / Math.round(x.reach));
    spareNeeded = Math.min(1, Math.max(0, 1 - workingCutAllowed / x.cutShare));
  } else {
    // Mixed strengths have no tidy closed form, so this falls back to halving
    // the range. The loss only ever falls as the spare share rises, so the
    // crossing is unique; 60 halvings pin it far below any figure shown.
    let lo = 0, hi = 1;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      if (atStake * lostShareAt(x, mid) > room) lo = mid; else hi = mid;
    }
    spareNeeded = hi;
  }

  // AN INFORMED CUT. Not every cut is a bad one. If part of the resource is idle,
  // removing that part saves money and loses nothing. The question is where to
  // stop. This asks: what if the cut were a different SIZE?
  //
  // Assumptions, all disclosed on the formulas page:
  //   - The saving, the one-time cost, the side costs and the reversal cost all
  //     scale in proportion to the size of the cut.
  //   - The idle part of the whole resource is  idle = cutShare x spareShare,
  //     and a sensible cut removes the idle part FIRST. So a cut of size q
  //     removes  max(0, q - idle)  of what was working.
  //   - The lost contribution then follows the same multiplied-parts formula.
  //
  //     net(q) = (q / cutShare) x room  -  atStake x lostShareOf(max(0, q - idle))
  const idle = x.cutShare * freeSpare(x);
  const lostShareOfWorkingCut = (workingCut) => {
    let kept = 1;
    for (const strength of touchList(x)) kept *= (1 - workingCut * strength);
    return 1 - kept;
  };
  const netAtCut = (q) => (x.cutShare > 0 ? (q / x.cutShare) * room : 0) - atStake * lostShareOfWorkingCut(Math.max(0, q - idle));
  let informed = null;
  if (x.cutShare > 0 && grossSaving > 0) {
    // Searched, not solved: with several parts the curve has no tidy closed form.
    // Only sizes from nothing up to the planned cut are tried. Beyond the plan
    // the proportional-scaling assumption cannot be trusted, so it is not used.
    const STEPS = 1000;
    let best = { cut: 0, net: 0 }, largestThatPays = 0;
    for (let i = 0; i <= STEPS; i++) {
      const q = x.cutShare * i / STEPS, n = netAtCut(q);
      if (n > best.net + 1e-9) best = { cut: q, net: n };
      if (n >= 0) largestThatPays = q;
    }
    const perPoint = room / x.cutShare / 100;                                   // net saving per 1 point of cut, before lost income
    const strengthSum = touchList(x).reduce((a, b) => a + b, 0);
    const lossPerPointPastIdle = atStake * strengthSum / 100;                   // lost contribution per 1 point, just past the idle part
    informed = {
      idle,                                           // share of the whole that is idle
      spareOnlyNet: netAtCut(idle),                   // what cutting only the idle part is worth
      savingPerPoint: perPoint,
      lossPerPointPastIdle,
      deeperPays: perPoint > lossPerPointPastIdle,    // does each further point save more than it loses?
      bestCut: best.cut, bestNet: best.net,
      largestThatPays,                                // the biggest cut that still does not lose money
      plannedCut: x.cutShare, plannedNet: netAtCut(x.cutShare),
    };
  }

  // Verdict bands. The 0.5 line between "wins" and "wins, barely" is a
  // presentation choice, not a standard.
  let verdict;
  if (end.real < 0) verdict = 'loss';
  else if (eaten >= 0.5) verdict = 'mostly-eaten';
  else verdict = 'real';

  return {
    inputs: x, months, series,
    grossSaving, bookedAtEnd: end.booked, realAtEnd: end.real,
    hidden, hiddenTotal, totalCost: hiddenTotal, eaten, multiple: eaten,
    // The total cost, sorted into its four kinds.
    kinds: { direct: hidden.oneTime, hidden: hidden.sideCosts, opportunity: hidden.lostEarnings, unintended: hidden.undo },
    peak, turnsNegative, looksGoodMonths,
    spareNeeded, verdict, informed,
    lostShare: lostShare(x), subtractionView: x.cutShare * (1 - freeSpare(x)),
    // WHAT EACH DOLLAR SAVED WAS SUPPORTING. The wage (or fee) is the cost of the
    // thing. What it produced is larger, which is why it was worth paying for.
    //   income tied to what is cut, per dollar saved       = D x c / S
    //   contribution from that income, per dollar saved    = D x c x g / S
    // Above 1, removing it loses more than it saves unless enough of it was spare.
    // This is the first and plainest multiple; the parts it feeds come on top.
    supported: x.saving > 0
      ? { incomePerDollar: x.dependentValue * x.cutShare / x.saving, contributionPerDollar: x.dependentValue * x.cutShare * x.margin / x.saving }
      : null,
    // Intermediate figures, exposed so every step can be checked by hand.
    working: {
      workingCut: x.cutShare * (1 - freeSpare(x)),
      strengths: touchList(x),
      keptShare: 1 - lostShare(x),
      lostPerYear: lostPerYear(x),
      yearsOfSaving: yearsAccrued(x, months),
      yearsOfLoss: yearsAccruedAfterDelay(x, months),
      atStake, room,
    },
  };
}

const api = { analyze, atMonth, lostPerYear, lostShare, clean };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
if (typeof window !== 'undefined') window.HiddenCost = api;
