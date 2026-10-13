// WHY IT MULTIPLIES: the four ways a change can hit, as plain arithmetic.
//
//   1. subtraction   the thing stands alone. Remove it and nothing else changes.
//                    The loss is its own size, once.
//   2. chain         other things need it, one after another. Each link passes on
//                    a share of what it received, so the shares multiply.
//   3. cascade       one thing affects several, and each of those affects several
//                    more. The number of things touched grows as a power of how
//                    far it spreads.
//   4. the hole      the result goes below zero. From there the climb back is
//                    steeper than the fall, and anything that compounds (interest,
//                    fixed costs) now compounds against you.
//
// Each function below is one of those, and nothing more.
'use strict';

// 2. CHAIN. `cut` is the share removed (0 to 1); `links` is how many steps in a
// row each need the thing. What comes out the far end:
function chainKept(cut, links) {
  return Math.pow(1 - cut, links);
}
// What each link in turn passes on: [1, 0.9, 0.81, ...] has links + 1 entries.
function chainSteps(cut, links) {
  const out = [1];
  for (let i = 0; i < links; i++) out.push(out[i] * (1 - cut));
  return out;
}

// 4a. THE CLIMB BACK. Lose a share `loss` of something, and the gain needed to
// get back to where you were is measured on what is left, which is smaller:
//
//     needed gain = loss / (1 - loss)
//
// Lose 50%, need 100%. Lose 90%, need 900%. Lose everything and no gain, however
// large, brings it back: there is nothing left to grow.
function recoveryNeeded(loss) {
  if (loss >= 1) return Infinity;
  if (loss <= 0) return 0;
  return loss / (1 - loss);
}

// 3. CASCADE. One thing affects `fanout` others, each of those affects `fanout`
// more, for `depth` steps. Returns how many are touched at each step, starting
// with the one thing itself: [1, k, k^2, ...].
function cascadeLevels(fanout, depth) {
  const out = [1];
  for (let i = 0; i < depth; i++) out.push(out[i] * fanout);
  return out;
}
function cascadeTotal(fanout, depth) {
  return cascadeLevels(fanout, depth).reduce((a, b) => a + b, 0);
}

// 4b. BELOW ZERO. A balance growing (or owing) at `rate` a year for `years`.
// The same rate that builds a positive balance deepens a negative one: the
// multiplier is being applied to a negative number.
function compound(balance, rate, years) {
  return balance * Math.pow(1 + rate, years);
}
// Years of steady saving `perYear` needed to bring a debt back to zero while it
// grows at `rate`. Returns Infinity when the saving does not even cover the
// yearly growth of the debt, which is the point of no return.
function yearsToClimbOut(debt, rate, perYear) {
  let owed = Math.abs(debt);
  if (owed === 0) return 0;
  if (perYear <= owed * rate) return Infinity;
  let years = 0;
  while (owed > 0 && years < 1000) {
    owed = owed * (1 + rate) - perYear;
    years++;
  }
  return years;
}

// What is actually paid to climb out. The last payment is only what is still
// owed, so this is less than `perYear` x years. Infinity if it never clears.
// Convention (same as yearsToClimbOut): the year's growth is added first, then
// the payment is made at the end of the year.
function paidToClimbOut(debt, rate, perYear) {
  let owed = Math.abs(debt);
  if (owed === 0) return 0;
  if (perYear <= owed * rate) return Infinity;
  let paid = 0, years = 0;
  while (owed > 0 && years < 1000) {
    owed = owed * (1 + rate);
    const payment = Math.min(perYear, owed);
    owed -= payment; paid += payment; years++;
    if (owed < 1e-9) owed = 0;
  }
  return paid;
}

// 5. STEPS THAT SHRINK OR GROW BY A FIXED RATIO.
//
// Picture a spiral of squares. Going inward, each square is a fixed fraction of
// the last. Going outward, each is a fixed multiple of the last. Both are the
// same arithmetic with a different ratio:
//
//     step n = first x ratio ^ (n - 1)
//
// The Fibonacci spiral is one case of it, with a ratio of about 1.618 outward
// and 0.618 inward. Real costs and gains have whatever ratio they have; the
// spiral is the picture, not a law that money obeys.
function ratioSteps(first, ratio, count) {
  const out = [];
  for (let i = 0; i < count; i++) out.push(first * Math.pow(ratio, i));
  return out;
}

// THE RABBIT HOLE (ratio below 1). Each step gains less than the last, so the
// gains add up toward a ceiling they never reach:
//
//     ceiling = first / (1 - ratio)
//
// If every step costs the same, there is a last step worth taking: the last one
// whose gain is still more than its cost. Everything after it loses money.
function rabbitHole(firstGain, ratio, costPerStep, stepsTaken) {
  const ceiling = ratio < 1 ? firstGain / (1 - ratio) : Infinity;
  let worthTaking = 0;
  if (costPerStep <= 0) worthTaking = Infinity;
  else if (firstGain > costPerStep) {
    if (ratio >= 1) worthTaking = Infinity;
    else {
      // largest n with firstGain x ratio^(n-1) > cost
      worthTaking = Math.floor(Math.log(costPerStep / firstGain) / Math.log(ratio) + 1e-12) + 1;
      if (firstGain * Math.pow(ratio, worthTaking - 1) <= costPerStep) worthTaking--;
    }
  }
  const gains = ratioSteps(firstGain, ratio, stepsTaken);
  const net = (n) => gains.slice(0, n).reduce((a, b) => a + b, 0) - costPerStep * n;
  const stopAt = Math.min(stepsTaken, worthTaking);
  return {
    ceiling, worthTaking, gains,
    netIfStopped: net(stopAt),                 // result if you had stopped at the right step
    netAsTaken: net(stepsTaken),               // result of going all the way
    wastedPastStop: net(stopAt) - net(stepsTaken),
  };
}

// RUNAWAY (ratio above 1). Each step costs more than the last. The total after
// n steps:
//
//     total = first x (ratio^n - 1) / (ratio - 1)
//
// The last step alone is always a large share of everything spent so far, which
// is why it feels sudden.
function runaway(firstCost, ratio, steps) {
  const costs = ratioSteps(firstCost, ratio, steps);
  const total = costs.reduce((a, b) => a + b, 0);
  return { costs, total, lastStep: costs[steps - 1] || 0, lastShare: total > 0 ? (costs[steps - 1] || 0) / total : 0 };
}

// The squares of a Fibonacci spiral, for drawing. Returns their sizes: 1, 1, 2, 3, 5, 8...
function fibonacci(count) {
  const out = [];
  for (let i = 0; i < count; i++) out.push(i < 2 ? 1 : out[i - 1] + out[i - 2]);
  return out;
}

// THE ONE QUESTION. Which of the four is this? Answered from three yes/no facts.
//   othersNeedIt   if all of it went, would anything else stop or slow?
//   itSpreads      do the things it affects go on to affect other things?
//   goesBelowZero  could the result end up negative (a loss, a debt, a shortfall)?
function classify({ othersNeedIt, itSpreads, goesBelowZero }) {
  if (goesBelowZero) return 'hole';
  if (!othersNeedIt) return 'subtraction';
  return itSpreads ? 'cascade' : 'chain';
}

const multipleApi = { chainKept, chainSteps, recoveryNeeded, cascadeLevels, cascadeTotal, compound, yearsToClimbOut, paidToClimbOut, ratioSteps, rabbitHole, runaway, fibonacci, classify };
if (typeof module !== 'undefined' && module.exports) module.exports = multipleApi;
if (typeof window !== 'undefined') window.Multiple = multipleApi;
