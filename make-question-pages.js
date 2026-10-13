#!/usr/bin/env node
// Writes the three picker pages that share their look and behaviour with
// index.html ("Is it worth it?"):
//
//     cut.html    everyday savings        (question: what does saving cost?)
//     earn.html   jobs                    (question: what am I really making?)
//     wait.html   things being put off    (question: what does waiting cost?)
//
// Each is index.html with a different heading and a `data-q` mark on the
// picker, which tells worth-page.js which group of decisions to list. Building
// them from index.html keeps all four identical, with one place to change.
// Run again after changing index.html:
//
//     node make-question-pages.js
//
// build-site.js runs this first, so the published copies are always current.
'use strict';
const fs = require('fs');
const path = require('path');

const INDEX_LEDE = '<p class="lede">Pick what you are deciding and answer the questions with your own numbers. Tap Example to see a worked case first.</p>';
const link = ([href, text]) => `<a href="${href}" style="color: var(--accent-2); font-weight: 700; font-size: 15px">${text}</a>`;

const PAGES = [
  { file: 'cut.html', q: 'cut', lit: 'saving.html', title: 'Everyday Savings: What Do They Cost?', h1: 'What does saving cost?',
    lede: 'A saving shows on the price tag. What it costs you in extras, time and risk does not. Pick a saving and answer the questions.',
    links: [['saving.html', 'For a business: the win or lose calculator'], ['where.html', 'On-site, hybrid or work from home']] },
  { file: 'earn.html', q: 'earn', lit: 'gig.html', title: 'Is This Job Worth It?', h1: 'What am I really making?',
    lede: 'A job pays a wage and costs something to hold. Pick the work and answer the questions.',
    links: [['gig.html', 'Gig work: log every shift'], ['saving.html#gain', 'For a business: weigh a gain']] },
  { file: 'wait.html', q: 'wait', lit: 'wait.html', title: 'The Cost of Waiting', h1: 'What does waiting cost?',
    lede: 'Putting something off costs nothing today. The question is what it costs later. Pick what you are putting off and answer the questions.',
    links: [] },
];

function makeQuestionPages() {
  const index = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  for (const page of PAGES) {
    const changes = [
      ['<title>Is It Worth It?</title>', `<title>${page.title}</title>`],
      // Light this page's own tab in place of "Is it worth it?".
      ['<a class="tab" href="index.html" aria-current="page">', '<a class="tab" href="index.html">'],
      [`<a class="tab" href="${page.lit}">`, `<a class="tab" href="${page.lit}" aria-current="page">`],
      ['<h1>Is it worth it?</h1>', `<h1>${page.h1}</h1>`],
      [INDEX_LEDE, `<p class="lede">${page.lede}</p>${page.links.length ? `\n    <p style="display: flex; flex-wrap: wrap; gap: 6px 22px">${page.links.map(link).join('')}</p>` : ''}`],
      // This mark is what tells worth-page.js which decisions to list.
      ['<select id="scenario"></select>', `<select id="scenario" data-q="${page.q}"></select>`],
      [/<p class="hint">The examples use round, illustrative numbers\.[\s\S]*?<\/p>/, '<p class="hint">The examples use round, illustrative numbers. Every formula is on the <a href="formulas.html">formulas page</a>.</p>'],
    ];
    let html = index;
    for (const [from, to] of changes) {
      const found = typeof from === 'string' ? html.includes(from) : from.test(html);
      if (!found) throw new Error(`make-question-pages (${page.file}): index.html no longer contains: ${String(from).slice(0, 70)}`);
      html = html.replace(from, to);
    }
    fs.writeFileSync(path.join(__dirname, page.file), html);
  }
}

makeQuestionPages();
if (require.main === module) console.log('wrote', PAGES.map((p) => p.file).join(', '));
module.exports = { makeQuestionPages, PAGES };
