// A TOY SYSTEM: something goes in, the system does something to it, something comes out.
//
// This is a teaching toy with made-up numbers. It shows the SHAPE each
// arrangement produces over time. It is not a forecast of anything.
//
//   input      how much goes in at each step                 (0 to 10)
//   strength   what the system turns one unit of input into  (0.5 to 2)
//   loop       'none'        the output goes nowhere: same in, same out
//              'steadying'   the system compares its output with where it should be
//                            and corrects part of the gap each step
//              'compounding' part of each step's output is added to the next step's
//   delay      the steadying loop acts on what it saw a few steps ago
//   limit      the compounding loop slows as it nears a ceiling
//   upkeep     false = the system is not maintained, so its strength wears away
//
// The five shapes it can make are the ones any looped system can make:
// steady, settles, overshoots and cycles, runs away (or levels off at a limit),
// and runs down.
'use strict';

const STEPS = 60;
const CORRECTION = 0.3;      // share of the gap a steadying loop closes each step
const LAG = 3;               // steps a delayed loop is behind
const GROWTH = 0.09;         // share of output a compounding loop adds each step
const WEAR = 0.03;           // share of its strength an unmaintained system loses each step
const CEILING = 6;           // the limit, as a multiple of the starting output

function simulate({ input = 5, strength = 1, loop = 'none', delay = false, limit = false, upkeep = true }) {
  const out = [];
  let power = strength;                                   // the system's strength now
  const start = strength * input;                         // what it gives with no loop at all
  let level = loop === 'steadying' ? 0 : start;           // a steadying loop starts from rest
  for (let t = 0; t < STEPS; t++) {
    const aim = power * input;                            // where the output belongs right now
    if (loop === 'none') level = aim;
    else if (loop === 'steadying') {
      const seen = delay ? (out[t - 1 - LAG] ?? 0) : level;   // what the loop is reacting to
      level = Math.max(0, level + CORRECTION * (aim - seen));
    } else if (loop === 'compounding') {
      const room = limit ? Math.max(0, 1 - level / (CEILING * Math.max(start, 1e-9))) : 1;
      level = level + GROWTH * level * room;
    }
    // What has built up is delivered by the system, so a worn system delivers less of it.
    out.push(loop === 'compounding' ? level * (power / Math.max(strength, 1e-9)) : level);
    if (!upkeep) power *= 1 - WEAR;
  }
  return out;
}

// Which of the shapes these settings make, in plain words.
function shape({ loop = 'none', delay = false, limit = false, upkeep = true, input = 5 }) {
  if (input <= 0) return { id: 'nothing', name: 'Nothing in, nothing out', line: 'A system with no input is not broken. It is waiting.' };
  if (!upkeep && loop !== 'compounding') return { id: 'down', name: 'It runs down', line: 'Nothing dramatic happens. The system simply does a little less each step, because nothing is keeping it up.' };
  if (loop === 'none') return { id: 'steady', name: 'Steady', line: 'The same goes in, so the same comes out. Change the input and the output follows at once.' };
  if (loop === 'steadying') return delay
    ? { id: 'cycles', name: 'It overshoots and cycles', line: 'The loop is reacting to old news, so it pushes too far, then pulls back too far, before it settles.' }
    : { id: 'settles', name: 'It settles', line: 'The loop closes part of the gap each step and comes to rest where it belongs.' };
  if (!upkeep) return limit
    ? { id: 'fades', name: 'It grows, then fades', line: 'The loop feeds itself up to its limit, while the system under it wears away. Once the growing stops, the wearing is all that is left.' }
    : { id: 'slower', name: 'It grows, but slower', line: 'The loop adds to it each step and the wear takes some away, so it grows at the difference between the two.' };
  return limit
    ? { id: 'levels', name: 'It levels off at a limit', line: 'It feeds itself until it nears a ceiling. Every real compounding loop meets one.' }
    : { id: 'away', name: 'It runs away', line: 'Each step is built on the last, so it grows faster the bigger it gets.' };
}

// ── THE SHAPE OF A SYSTEM ───────────────────────────────────────────────────
// Picture the system as a landscape and its state as a ball. The ball rests in
// a hollow. Three shapes cover the cases, and one formula draws all of them:
//
//     height = x^4 / 4  -  split x x^2 / 2  +  tilt x x
//
//   even      split below 0, no tilt: one hollow in the middle. Push the ball
//             either way and it rolls back. Near the bottom this is a parabola.
//   lopsided  some tilt: the hollow is pulled to one side, and the ball gives
//             more easily one way than the other.
//   split     split above 0: the middle rises into a hump and there are two
//             hollows. The ball ends in whichever side it started on.
//
// A landscape with no curve at all has no hollow, so nothing rests anywhere.
function height(x, split, tilt) {
  return Math.pow(x, 4) / 4 - split * x * x / 2 + tilt * x;
}
function slope(x, split, tilt) {
  return x * x * x - split * x + tilt;
}
// Every hollow: where the slope changes from downhill to uphill. Found by
// walking across in small steps, then halving the gap to pin each one.
function restingPlaces(split, tilt) {
  const places = [];
  const STEP = 0.005;
  for (let x = -3; x < 3; x += STEP) {
    if (slope(x, split, tilt) < 0 && slope(x + STEP, split, tilt) >= 0) {
      let lo = x, hi = x + STEP;
      for (let i = 0; i < 50; i++) { const mid = (lo + hi) / 2; if (slope(mid, split, tilt) < 0) lo = mid; else hi = mid; }
      places.push({ x: (lo + hi) / 2, height: height((lo + hi) / 2, split, tilt) });
    }
  }
  return places;
}
// Where a ball let go at `start` comes to rest: it rolls downhill, and stops in
// the first hollow it reaches. (Solved from the hollows, not stepped: on ground
// that is nearly flat a stepped roll takes for ever to arrive, which is true to
// life but no use for drawing.)
function settle(start, split, tilt) {
  const s = slope(start, split, tilt);
  if (s === 0) return start;                               // already on level ground
  const places = restingPlaces(split, tilt);
  const ahead = s > 0
    ? places.filter((p) => p.x < start).sort((a, b) => b.x - a.x)     // uphill to the right, so it rolls left
    : places.filter((p) => p.x > start).sort((a, b) => a.x - b.x);
  return ahead.length ? ahead[0].x : start;
}
function landscape(split, tilt) {
  const places = restingPlaces(split, tilt), level = Math.abs(tilt) < 0.02;
  if (places.length >= 2) return level
    ? { id: 'split', name: 'Split', line: 'Two resting places, and a middle that no longer holds. Where it ends up depends on where it started.' }
    : { id: 'split-lopsided', name: 'Split, and lopsided', line: 'Two resting places, one deeper than the other. It is easier to end up in the deep one and harder to leave it.' };
  return level
    ? { id: 'even', name: 'Even', line: 'One resting place, in the middle. Push it either way and it comes back.' }
    : { id: 'lopsided', name: 'Lopsided', line: 'One resting place, pulled to one side. It gives more easily one way than the other.' };
}

// ── WHICH OF THE THREE IS IT? ───────────────────────────────────────────────
// Two questions sort anything in a system into input, system or output:
//
//   1. Is it what you were trying to end up with?           yes -> output
//   2. If not: is it still there after the work is done,
//      ready to do it again?                                yes -> system
//                                                           no  -> input
//
// The first question is asked first on purpose. A result that also lasts (a
// finished building) is still the output of the work that made it.
function sortThing({ wanted = false, remains = false }) {
  if (wanted) return 'output';
  return remains ? 'system' : 'input';
}

// ── HELD FROM OUTSIDE, OR HELD ONLY BY ITSELF ───────────────────────────────
// Start a little off where it should be (which is 1) and run a few rounds.
//
//   checked   something outside compares the result with 1 and closes half the
//             gap each round. Any small lean shrinks.
//   selfHeld  nothing outside. The result is what does the work, so each round
//             it works on itself (it is multiplied by itself). Any small lean grows.
//
// Exactly 1 stays at 1 either way. The difference is what happens beside it.
function checked(start, rounds) {
  const out = [start];
  for (let i = 0; i < rounds; i++) out.push(out[i] + 0.5 * (1 - out[i]));
  return out;
}
function selfHeld(start, rounds) {
  const out = [start];
  for (let i = 0; i < rounds; i++) out.push(out[i] * out[i]);
  return out;
}

// ── WIRE IT RIGHT, WIRE IT WRONG ────────────────────────────────────────────
// Given what goes in and what is expected out, there are three ways to wire it.
// Worked with 10 in and 20 expected:
//
//   'engine'  a separate engine does the work. It must be "times 2", and it
//             gives 20 every round. Knock the result off by a little and a
//             check brings it back: 21, 20.5, 20.25 ...
//   'input'   the input is made the engine, so it works on itself: 10 x 10 = 100.
//             An answer comes out, the wrong one, and the same wrong one each round.
//   'result'  the result is made the engine, so each round it works on itself.
//             Measured against the 20 expected: 21 is 1.05 of it, and 1.05 x 1.05
//             = 1.1025, so 22.05, then 24.31, and away. Starting at 19 instead it
//             goes 18.05, 16.29, and down to nothing.
//
// `over` and `under` are two runs that start 5% above and 5% below the expected
// result, so the picture shows what a small error does under each wiring.
const NUDGE = 0.05;
function wire({ input, expected, wiring, rounds = 6 }) {
  if (!(input > 0) || !(expected > 0)) return null;        // nothing in, or nothing expected: nothing to wire
  const engine = expected / input;
  let over, under;
  if (wiring === 'engine') {
    over = checked(1 + NUDGE, rounds); under = checked(1 - NUDGE, rounds);
  } else if (wiring === 'input') {
    const ratio = (input * input) / expected;              // what input-times-input gives, against what was expected
    over = new Array(rounds + 1).fill(ratio); under = over.slice();
  } else {
    over = selfHeld(1 + NUDGE, rounds); under = selfHeld(1 - NUDGE, rounds);
  }
  return { engine, over: over.map((r) => r * expected), under: under.map((r) => r * expected), expected };
}

const systemToyApi = { wire, NUDGE, checked, selfHeld, sortThing, simulate, shape, STEPS, CORRECTION, LAG, GROWTH, WEAR, CEILING, height, slope, restingPlaces, settle, landscape };
if (typeof module !== 'undefined' && module.exports) module.exports = systemToyApi;
if (typeof window !== 'undefined') window.SystemToy = systemToyApi;
