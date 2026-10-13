#!/usr/bin/env node
// Tests for the site's own count of visits and pages opened.
// Run: node stats_test.mjs
import { COUNT_LIMITS, emptyStats, bump, publicStats, looksAutomated } from './stats-core.mjs';

let pass = 0, fail = 0;
function ok(cond, name, detail = '') {
  if (cond) { pass++; console.log(`  OK   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' - ' + detail : ''}`); }
}
const section = (label) => console.log('\n-- ' + label + ' --');

section('Counting');
{
  let s = emptyStats('2026-10-04');
  s = bump(s, { visit: true }, '2026-10-08');
  ok(s.views === 1 && s.visits === 1, 'the first page of a session is one page opened and one visit');
  s = bump(s, { visit: false }, '2026-10-08');
  s = bump(s, { visit: false }, '2026-10-08');
  ok(s.views === 3 && s.visits === 1, 'two more pages in the same session add two pages opened and no visit');
  ok(s.since === '2026-10-04', 'the date counting began does not change');
  const seeded = bump({ views: 196, visits: 127, since: '2026-10-04' }, { visit: true }, '2026-10-08');
  ok(seeded.views === 197 && seeded.visits === 128, 'counting carries on from totals that were already there');
}

section('What is shown, and what is kept');
{
  const s = bump(bump(emptyStats('2026-10-04'), { visit: true }, '2026-10-08'), { visit: false }, '2026-10-08');
  const shown = publicStats(s);
  ok(Object.keys(shown).sort().join(',') === 'since,views,visits', 'the site is given the two totals and the starting date, and nothing else');
  ok(Object.keys(s).sort().join(',') === 'day,since,today,views,visits', 'the record holds two totals, the starting date and the day\'s tally: nothing about any visitor');
  ok(publicStats({}).views === 0 && publicStats({}).visits === 0, 'with nothing counted yet it shows zero, not an error');
}

section('It cannot be run up');
{
  let s = emptyStats('2026-10-04');
  for (let i = 0; i < COUNT_LIMITS.perDay + 500; i++) s = bump(s, { visit: true }, '2026-10-08');
  ok(s.views === COUNT_LIMITS.perDay && s.visits === COUNT_LIMITS.perDay, 'one day cannot add more than the ceiling, however many requests arrive');
  s = bump(s, { visit: true }, '2026-10-09');
  ok(s.views === COUNT_LIMITS.perDay + 1 && s.today === 1, 'the ceiling starts again the next day');
  ok(looksAutomated('Mozilla/5.0 (compatible; Googlebot/2.1)') && looksAutomated('curl/8.0') && looksAutomated('HeadlessChrome') && looksAutomated('costofsaving-deploy-check'), 'programs that announce themselves are recognised');
  ok(!looksAutomated('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36') && !looksAutomated('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1'), 'ordinary browsers are not');
}

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
