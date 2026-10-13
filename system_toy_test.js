#!/usr/bin/env node
// Tests for the toy system. They try to break it: each shape is checked against
// what it is supposed to do, the ends of every setting are tried, and one case
// is worked by hand.
// Run: node system_toy_test.js
'use strict';
const { wire, checked, selfHeld, sortThing, simulate, shape, STEPS, CORRECTION, GROWTH, WEAR, CEILING, height, slope, restingPlaces, settle, landscape } = require('./system-toy');

let pass = 0, fail = 0;
function ok(cond, name, detail = '') {
  if (cond) { pass++; console.log(`  OK   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' - ' + detail : ''}`); }
}
const section = (label) => console.log('\n-- ' + label + ' --');
const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;
const last = (list) => list[list.length - 1];

section('1. No loop: same in, same out');
{
  const out = simulate({ input: 4, strength: 1.5 });
  ok(out.length === STEPS, `it runs ${STEPS} steps`);
  ok(out.every((v) => near(v, 6)), 'input 4 at strength 1.5 gives 6 at every step');
  ok(simulate({ input: 0, strength: 2 }).every((v) => v === 0), 'nothing in gives nothing out');
}

section('2. Steadying loop: a hand-worked case');
{
  // Aim is 5 x 1 = 5, starting from rest. Each step closes 0.3 of the gap:
  // 0 -> 1.5 -> 2.55 -> 3.285
  const out = simulate({ input: 5, strength: 1, loop: 'steadying' });
  ok(near(out[0], 1.5) && near(out[1], 2.55) && near(out[2], 3.285), 'first three steps are 1.5, 2.55, 3.285', out.slice(0, 3).join(', '));
  ok(Math.abs(last(out) - 5) < 0.001, 'it comes to rest at 5', String(last(out)));
  ok(out.every((v, i) => i === 0 || v >= out[i - 1] - 1e-12), 'it never overshoots: it only ever climbs');
  ok(CORRECTION === 0.3, 'the share closed each step is the 0.3 the page states');
}

section('3. Steadying loop with a delay: overshoots, then settles');
{
  const out = simulate({ input: 5, strength: 1, loop: 'steadying', delay: true });
  ok(Math.max(...out) > 5.5, 'it goes well past where it belongs', String(Math.max(...out)));
  let crossings = 0;
  for (let i = 1; i < out.length; i++) if ((out[i - 1] - 5) * (out[i] - 5) < 0) crossings++;
  ok(crossings >= 3, 'it crosses the resting point at least three times', String(crossings));
  ok(Math.abs(last(out) - 5) < 0.25, 'by the end it is close to rest', String(last(out)));
  ok(out.every((v) => v >= 0 && Number.isFinite(v)), 'it never goes below nothing or breaks');
}

section('4. Compounding loop');
{
  const out = simulate({ input: 5, strength: 1, loop: 'compounding' });
  ok(near(out[0], 5 * (1 + GROWTH)), 'the first step adds 9% to the starting 5', String(out[0]));
  ok(out.every((v, i) => i === 0 || v > out[i - 1]), 'every step is larger than the last');
  ok(out[20] - out[19] > out[1] - out[0], 'and each step adds more than the one before it did');
  const capped = simulate({ input: 5, strength: 1, loop: 'compounding', limit: true });
  ok(last(capped) < CEILING * 5 && last(capped) > 0.9 * CEILING * 5, `with a limit it ends just under the ceiling of ${CEILING * 5}`, String(last(capped)));
  ok(capped[59] - capped[58] < capped[10] - capped[9], 'with a limit the late steps add less than the early ones');
}

section('5. No upkeep: it runs down');
{
  const out = simulate({ input: 5, strength: 1, upkeep: false });
  ok(near(out[0], 5) && near(out[1], 5 * (1 - WEAR)), 'the first step is whole, the second has lost 3%');
  ok(out.every((v, i) => i === 0 || v < out[i - 1]), 'every step gives a little less');
  ok(last(out) > 0 && last(out) < 1, 'by the end little is left, but it never quite reaches nothing', String(last(out)));
  const fed = simulate({ input: 5, strength: 1, loop: 'compounding', upkeep: false });
  // It gains 9% a step and loses 3% of its strength a step, so it climbs at first. It keeps
  // climbing only while what is built up outruns what is worn away, and with a limit it cannot.
  const peak = Math.max(...fed);
  ok(fed[1] > fed[0], 'a compounding loop on a worn system still climbs at first');
  const worn = simulate({ input: 5, strength: 1, loop: 'compounding', limit: true, upkeep: false });
  ok(worn.indexOf(Math.max(...worn)) < STEPS - 1 && last(worn) < Math.max(...worn), 'with a limit as well, it peaks and then fades', `peak at step ${worn.indexOf(Math.max(...worn))}`);
  ok(Number.isFinite(peak), 'and its figures stay finite');
}

section('6. The name matches the shape');
{
  const names = (s) => shape(s).id;
  ok(names({}) === 'steady' && names({ loop: 'steadying' }) === 'settles' && names({ loop: 'steadying', delay: true }) === 'cycles', 'steady, settles, cycles');
  ok(names({ loop: 'compounding' }) === 'away' && names({ loop: 'compounding', limit: true }) === 'levels', 'runs away, levels off');
  ok(names({ upkeep: false }) === 'down' && names({ loop: 'compounding', upkeep: false }) === 'slower' && names({ loop: 'compounding', limit: true, upkeep: false }) === 'fades' && names({ input: 0 }) === 'nothing', 'runs down, grows slower, fades, nothing in');
  let broken = 0;
  for (const loop of ['none', 'steadying', 'compounding']) for (const delay of [false, true]) for (const limit of [false, true]) for (const upkeep of [false, true])
    for (const input of [0, 1, 10]) for (const strength of [0.5, 2]) {
      const out = simulate({ input, strength, loop, delay, limit, upkeep });
      if (!out.every((v) => Number.isFinite(v) && v >= 0) || !shape({ input, loop, delay, limit, upkeep }).name) broken++;
    }
  ok(broken === 0, 'all 144 combinations of settings give finite figures and a name', String(broken));
}

section('0. Which of the three is it');
{
  ok(sortThing({ wanted: false, remains: false }) === 'input', 'not what you wanted, and gone after the work: an input');
  ok(sortThing({ wanted: false, remains: true }) === 'system', 'not what you wanted, and still there to do it again: part of the system');
  ok(sortThing({ wanted: true, remains: false }) === 'output' && sortThing({ wanted: true, remains: true }) === 'output', 'what you wanted is the output, whether or not it lasts');
  ok(sortThing({}) === 'input', 'with nothing answered it does not guess at system or output');
}

section('8. Held from outside, or held only by itself');
{
  // Hand-worked: starting at 1.1, checked closes half the gap: 1.05, 1.025. Self-held: 1.21, 1.4641.
  ok(near(checked(1.1, 2)[1], 1.05) && near(checked(1.1, 2)[2], 1.025), 'checked from 1.1 goes 1.05, 1.025');
  ok(near(selfHeld(1.1, 2)[1], 1.21) && near(selfHeld(1.1, 2)[2], 1.4641), 'self-held from 1.1 goes 1.21, 1.4641');
  ok(checked(1, 8).every((v) => v === 1) && selfHeld(1, 8).every((v) => v === 1), 'exactly 1 stays at 1 either way');
  let shrinks = true, grows = true;
  for (const lean of [0.01, 0.03, 0.05, 0.1]) for (const sign of [1, -1]) {
    const c = checked(1 + sign * lean, 6), s = selfHeld(1 + sign * lean, 6);
    for (let i = 1; i < c.length; i++) { if (Math.abs(c[i] - 1) >= Math.abs(c[i - 1] - 1)) shrinks = false; if (Math.abs(s[i] - 1) <= Math.abs(s[i - 1] - 1)) grows = false; }
  }
  ok(shrinks, 'checked: every lean, either way, gets smaller each round');
  ok(grows, 'self-held: every lean, either way, gets larger each round');
  const up = selfHeld(1.05, 6), down = selfHeld(0.95, 6);
  ok(up[6] > 20 && down[6] < 0.05, 'self-held: 1.05 and 0.95 start a tenth apart and end at opposite extremes', `${up[6].toFixed(1)} and ${down[6].toFixed(3)}`);
  ok(Math.abs(checked(1.05, 6)[6] - checked(0.95, 6)[6]) < 0.002, 'checked: the same two end almost together');
}

section('9. Wire it right, wire it wrong (10 in, 20 expected)');
{
  const right = wire({ input: 10, expected: 20, wiring: 'engine' });
  ok(near(right.engine, 2), 'the engine has to be "times 2"');
  ok(near(right.over[0], 21) && near(right.over[1], 20.5) && near(right.over[2], 20.25), 'a separate engine, knocked up to 21, comes back: 20.5, 20.25');
  ok(near(right.under[0], 19) && near(right.under[1], 19.5) && Math.abs(right.under[6] - 20) < 0.02, 'and from 19 it comes back too');

  const asInput = wire({ input: 10, expected: 20, wiring: 'input' });
  ok(asInput.over.every((v) => near(v, 100)) && asInput.under.every((v) => near(v, 100)), 'the input as engine gives 10 x 10 = 100, the same wrong answer every round');
  const lucky = wire({ input: 2, expected: 4, wiring: 'input' });
  ok(lucky.over.every((v) => near(v, 4)), 'it is right only by accident: 2 in and 4 expected happens to agree, since 2 x 2 = 4');
  ok(near(wire({ input: 3, expected: 6, wiring: 'input' }).over[0], 9), 'change the input to 3 with the same "times 2" in mind and it gives 9, not 6');

  const asResult = wire({ input: 10, expected: 20, wiring: 'result' });
  ok(near(asResult.over[1], 22.05) && near(asResult.over[2], 24.310125), 'the result as engine, from 21: 22.05, then 24.31');
  ok(near(asResult.under[1], 18.05) && asResult.under[6] < 1, 'and from 19: 18.05, then down to less than 1 within six rounds', String(asResult.under[6]));
  ok(asResult.over[6] > 400, 'while the one that started at 21 has passed 400', String(asResult.over[6]));

  ok(wire({ input: 0, expected: 20, wiring: 'engine' }) === null && wire({ input: 10, expected: 0, wiring: 'result' }) === null, 'nothing in, or nothing expected, gives nothing to wire');
  let broken = 0;
  for (const input of [0.5, 1, 7, 250]) for (const expected of [0.2, 1, 30, 9000]) for (const wiring of ['engine', 'input', 'result']) {
    const w = wire({ input, expected, wiring });
    if (!w || ![...w.over, ...w.under].every((v) => Number.isFinite(v) && v >= 0)) broken++;
  }
  ok(broken === 0, 'every figure stays finite across small and large inputs', String(broken));
}

section('7. The shape of a system');
{
  // Even: one hollow, in the middle. A ball let go on either side comes back to it.
  const even = restingPlaces(-1, 0);
  ok(even.length === 1 && Math.abs(even[0].x) < 1e-6, 'even: one resting place, at the middle');
  ok(Math.abs(settle(1.5, -1, 0)) < 1e-6 && Math.abs(settle(-1.5, -1, 0)) < 1e-6, 'even: from either side the ball returns to the middle');

  // Split, worked by hand: slope = x^3 - x is level at -1, 0 and +1. The middle is a hump.
  const split = restingPlaces(1, 0);
  ok(split.length === 2 && near(split[0].x, -1, 1e-6) && near(split[1].x, 1, 1e-6), 'split: two resting places, at -1 and +1', split.map((p) => p.x).join(', '));
  ok(height(0, 1, 0) > height(1, 1, 0) && near(height(1, 1, 0), -0.25), 'split: the middle stands above both, which sit at -0.25');
  ok(near(settle(0.05, 1, 0), 1, 1e-6) && near(settle(-0.05, 1, 0), -1, 1e-6), 'split: a hair to either side of the middle decides which one it ends in');
  ok(near(split[0].height, split[1].height, 1e-9), 'split: with no tilt the two are equally deep');

  // Lopsided: tilt moves the single hollow off the middle, to the downhill side.
  const lop = restingPlaces(-1, 0.4);
  ok(lop.length === 1 && lop[0].x < -0.05, 'lopsided: one resting place, pulled toward the low side', String(lop[0] && lop[0].x));

  // Split and lopsided: one side deeper. Enough tilt and the shallow one is gone.
  const both = restingPlaces(1, 0.2);
  ok(both.length === 2 && both[0].height < both[1].height, 'split and lopsided: the side the tilt favours is the deeper');
  // The second hollow vanishes when the tilt passes 2 / (3 x root 3) = 0.3849 (for split = 1).
  ok(restingPlaces(1, 0.38).length === 2 && restingPlaces(1, 0.39).length === 1, 'past a tilt of 0.385 the shallow side is no longer a resting place');

  ok(landscape(-1, 0).id === 'even' && landscape(-1, 0.4).id === 'lopsided' && landscape(1, 0).id === 'split' && landscape(1, 0.2).id === 'split-lopsided', 'each is named for what it is');
  let lost = 0;
  for (let s = -1; s <= 1.001; s += 0.1) for (let t = -0.6; t <= 0.601; t += 0.05) for (const start of [-2, -0.3, 0.3, 2]) {
    const at = settle(start, s, t);
    if (!Number.isFinite(at) || Math.abs(slope(at, s, t)) > 1e-6) lost++;
  }
  ok(lost === 0, 'on every setting the page allows, the ball comes to rest on level ground', String(lost));
}

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
