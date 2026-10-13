#!/usr/bin/env node
// A search-readiness table for the built site: one row for every page, one
// column for every thing a search engine looks for, and the state where they meet.
//
//   x = each page (and, below, each scenario inside the pages)
//   y = what a search engine needs from it
//   z = the state at that crossing: met, weak, or missing
//
// The gaps (every z that is not "ok") are the work list for the next pass.
// Run after a build:   node seo-audit.js
'use strict';
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, 'site');
const pages = fs.readdirSync(OUT).filter((f) => f.endsWith('.html') && f !== '404.html');
const sitemap = fs.readFileSync(path.join(OUT, 'sitemap.xml'), 'utf8');
const html = Object.fromEntries(pages.map((f) => [f, fs.readFileSync(path.join(OUT, f), 'utf8')]));
const nameOf = (f) => (f === 'index.html' ? '' : f.replace(/\.html$/, ''));

// What a crawler that runs no scripts can read: the text left when scripts, styles and tags are removed.
const staticText = (h) => h.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ').trim();
const linksIn = (target) => pages.filter((f) => f !== target && new RegExp(`href="(\\./)?${nameOf(target) || '\\./'}(#[\\w-]+)?"`).test(html[f])).length;

// ── y: what is looked for on each page, and how the state is judged ─────────
const CHECKS = [
  ['title', (h) => { const t = (/<title>([\s\S]*?)<\/title>/.exec(h) || [])[1] || ''; return [t.length, t.length >= 30 && t.length <= 65 ? 'ok' : t.length ? 'weak' : 'MISSING']; }],
  ['description', (h) => { const d = (/<meta name="description" content="([^"]*)"/.exec(h) || [])[1] || ''; return [d.length, d.length >= 70 && d.length <= 160 ? 'ok' : d.length ? 'weak' : 'MISSING']; }],
  ['one h1', (h) => { const n = (h.match(/<h1[\s>]/g) || []).length; return [n, n === 1 ? 'ok' : 'weak']; }],
  ['canonical', (h) => [/<link rel="canonical"/.test(h) ? 'yes' : 'no', /<link rel="canonical"/.test(h) ? 'ok' : 'MISSING']],
  ['structured data', (h) => { const n = (h.match(/application\/ld\+json/g) || []).length; return [n, n >= 2 ? 'ok' : n ? 'weak' : 'MISSING']; }],
  ['readable words', (h) => { const n = staticText(h).split(' ').length; return [n, n >= 300 ? 'ok' : 'weak']; }],
  ['links in', (h, f) => { const n = linksIn(f); return [n, n >= 3 ? 'ok' : n ? 'weak' : 'MISSING']; }],
  ['in sitemap', (h, f) => { const yes = sitemap.includes(`/${nameOf(f)}</loc>`); return [yes ? 'yes' : 'no', yes ? 'ok' : 'MISSING']; }],
];

const gaps = [];
console.log('\nPAGES (x) by WHAT A SEARCH ENGINE LOOKS FOR (y). Each cell is the state (z).\n');
console.log('page'.padEnd(16) + CHECKS.map(([n]) => n.padEnd(17)).join(''));
for (const f of pages) {
  let row = ('/' + nameOf(f)).padEnd(16);
  for (const [name, check] of CHECKS) {
    const [value, state] = check(html[f], f);
    row += `${String(value)} ${state === 'ok' ? '' : state}`.trim().padEnd(17);
    if (state !== 'ok') gaps.push(`/${nameOf(f)}: ${name} is ${state === 'MISSING' ? 'missing' : 'weak'} (${value})`);
  }
  console.log(row);
}

// ── The same table one level down: each scenario inside the pages ───────────
// A scenario's state depends on whether a search engine can reach it at all.
const { GROUPS } = require('./worth-scenarios');
const { EXAMPLES } = require('./saving-examples');
const barrierExamples = require('./barriers-examples').GROUPS.flatMap((g) => g.items);
const scenarios = [
  ...GROUPS.flatMap((g) => g.items.filter((s) => !/-own$/.test(s.id)).map((s) => ({ id: s.id, label: s.label }))),
  ...EXAMPLES.filter((e) => !e.own).map((e) => ({ id: e.id, label: e.label })),
  ...barrierExamples.map((e) => ({ id: e.id, label: e.label })),
];
const all = Object.values(html).join('\n');
const text = staticText(all);
const { slugOf } = require('./scenario-pages');      // each scenario's own page is /decide/<its name as an address>
let ownPage = 0, named = 0, linked = 0;
for (const s of scenarios) {
  if (fs.existsSync(path.join(OUT, 'decide', slugOf(s.label) + '.html'))) ownPage++;
  if (text.includes(s.label)) named++;
  if (new RegExp(`href="[\\w./-]*#${s.id}"`).test(all)) linked++;
}
console.log(`\nSCENARIOS (x) by HOW A SEARCH ENGINE CAN REACH THEM (y): ${scenarios.length} scenarios\n`);
console.log(`  has an address of its own      ${ownPage} of ${scenarios.length}`);
console.log(`  named in text a crawler reads  ${named} of ${scenarios.length}`);
console.log(`  linked to from a page          ${linked} of ${scenarios.length}`);
if (ownPage < scenarios.length) gaps.push(`${scenarios.length - ownPage} of ${scenarios.length} scenarios have no address of their own`);
if (named < scenarios.length) gaps.push(`${scenarios.length - named} scenarios are not named anywhere in text a crawler can read`);

console.log(`\nTHE GAPS: ${gaps.length}. These are the list for the next pass.\n`);
for (const g of gaps) console.log('  - ' + g);
