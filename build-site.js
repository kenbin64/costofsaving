#!/usr/bin/env node
// Builds the folder that goes on the web: C:\projects\worth-it\site
//
// The working pages are written so they open straight from this folder. For the
// website this script copies them across and adds what a public site needs:
//
//   - the page names used on the domain (home.html is the front page):
//         home.html   ->  index.html      costofsaving.com/
//         index.html  ->  worth.html      costofsaving.com/worth
//         every other page keeps its name
//   - one top bar on every page, defined once below
//   - links without ".html", which is how the host serves the pages
//   - a title and description for each page, for search results and shared links
//   - sitemap.xml and robots.txt, so search engines can find every page
//
// Test files are left out. Run again after any change:   node build-site.js
'use strict';
const fs = require('fs');
const path = require('path');

require('./make-question-pages');     // cut.html, earn.html and wait.html are built from index.html, so refresh them first

const SRC = __dirname;
const OUT = path.join(__dirname, 'site');
const DOMAIN = 'https://costofsaving.com';

// Every page: where it comes from, its name on the site, which top-bar link is
// lit when it is open, and the title and description search engines show.
const PAGES = [
  { from: 'home-draft.html', to: 'index.html', lit: '', own: true, title: 'Cost of Saving: the hidden costs of saving and spending money',
    description: 'Find the hidden cost: the actual cost of a saving or a purchase, not the one presented or reported. Free calculators that go past face value to actual value.' },
  { from: 'index.html', to: 'worth.html', lit: 'worth', title: 'Is It Worth It? Calculator for purchases, fares, fees and loans',
    description: 'Is it worth it? Work out the real cost of a cheap flight, a concert, a warranty, a subscription or a loan, with the one figure the answer turns on.' },
  { from: 'worth-detailed.html', to: 'worth-detailed.html', lit: 'worth', title: 'Is It Worth It? Detailed version for several outcomes',
    description: 'The detailed version of Is It Worth It, for deals with several possible outcomes such as every prize tier of a lottery.' },
  { from: 'saving.html', to: 'saving.html', lit: 'saving', title: 'The Cost of Saving Money: full-cost calculator for business cuts',
    description: 'A win or lose calculator for business cuts. See whether a cheaper supplier, a deferred repair or a budget cut still saves money once every cost is counted.' },
  { from: 'cut.html', to: 'cut.html', lit: 'saving', title: 'What Does Saving Cost? DIY and everyday savings calculator',
    description: 'Everyday savings and what they really cost: doing it yourself, a cheaper used car, cooking at home, going out of your way for a lower price.' },
  { from: 'where.html', to: 'where.html', lit: '', title: 'On-site, Hybrid or Work From Home: cost comparison calculator',
    description: 'Compare on-site, hybrid and work from home for your own team: what each costs the business and each person. No preferred answer; three examples, three results.' },
  { from: 'barriers.html', to: 'barriers.html', lit: 'barriers', title: 'The Cost of Barriers: what each step costs and what it catches',
    description: 'Find the number of steps that does the job: interview rounds, screening tests, sign-up forms, fees and compliance checks. What each costs, and what it catches.' },
  { from: 'gig.html', to: 'gig.html', lit: 'gig', title: 'Gig Work Calculator: what you really make after miles and taxes',
    description: 'A free gig work log for delivery and rideshare drivers. Record pay, tips, miles and hours and see what you really make an hour after the car and the taxes.' },
  { from: 'earn.html', to: 'earn.html', lit: 'gig', title: 'Is This Job Worth It? Real hourly wage calculator',
    description: 'What a job really pays an hour after commuting, childcare, other costs and unpaid hours, set against your next best option.' },
  { from: 'wait.html', to: 'wait.html', lit: 'wait', title: 'The Cost of Waiting: what putting it off will cost',
    description: 'What putting off a car repair, a credit card balance, the dentist or a home repair is likely to cost you later, and the chance at which waiting stops paying.' },
  { from: 'feedback.html', to: 'feedback.html', lit: 'feedback', title: 'Feedback: tell me what is wrong, useful or missing',
    description: 'Send a comment about the Cost of Saving calculators. It goes to the author by email, and nothing is shown publicly without your permission and his approval.' },
  { from: 'assumptions.html', to: 'assumptions.html', lit: 'assumptions', title: 'Before You Decide: what is worth checking first',
    description: 'A checklist for business, work and buying decisions: the usual starting point, what is worth checking before acting on it, and a calculator for each.' },
  { from: 'paper.html', to: 'paper.html', lit: 'paper', title: 'Good on Paper: why a saving can cost more than it saves',
    description: 'Why a decision can look right on paper and still leave a business with less: what shows at once, what shows later, worked cases, and the questions to ask first.' },
  { from: 'why.html', to: 'why.html', lit: 'why', title: 'Why It Multiplies: when a cut is more than a subtraction',
    description: 'Why some cuts are a simple subtraction and others multiply: chains, cascades, the climb back, and costs that run away.' },
  { from: 'disclaimer.html', to: 'disclaimer.html', lit: '', title: 'Disclaimer: a tool for informed decisions, not a prediction',
    description: 'What the Cost of Saving calculators are and are not: arithmetic on your own estimates, not advice or a prediction. Nothing you type leaves your browser.' },
  { from: 'system-draft.html', to: 'systems.html', lit: 'systems', own: true, title: 'How Systems Work: what goes in, what works, what comes out',
    description: 'Sort any system into input, engine and output, see what keeps the result steady, and what happens when one is taken for another. Interactive.' },
  { from: 'formulas.html', to: 'formulas.html', lit: 'formulas', title: 'The Formulas: every calculation, published',
    description: 'Every formula, input and assumption behind the calculators, with a worked example that can be checked by hand, the tests, and the sources.' },
];
const SCRIPTS = ['app-install.js', 'feedback-page.js', 'home-page.js', 'paper-page.js', 'art.js', 'arrange.js', 'arrange-examples.js', 'arrange-page.js', 'barriers.js', 'barriers-chart.js', 'barriers-examples.js', 'barriers-page.js', 'gig.js', 'gig-page.js', 'worth.js', 'worth-scenarios.js', 'worth-answer.js', 'worth-page.js', 'saving.js', 'saving-examples.js', 'saving-page.js', 'multiple.js', 'why-page.js', 'formulas-page.js', 'system-toy.js', 'system-draft-page.js', 'kinds.js', 'home-draft-page.js'];

// ── Links ──────────────────────────────────────────────────────────────────
// The working pages link to each other by file name. On the site, pages are
// served without ".html", and two have different names.
const siteName = (file) => (file === 'home' ? './' : file === 'index' ? 'worth' : file);
function relink(html) {
  return html.replace(/href="([a-z-]+)\.html(#[\w-]+)?"/g, (all, file, hash) => `href="${siteName(file)}${hash || ''}"`);
}
// The same for the few links a script writes into a page.
function relinkScript(code) {
  return code.replace(/(['"`])([a-z-]+)\.html(#|\1)/g, (all, quote, file, after) => `${quote}${siteName(file)}${after}`);
}

// ── The top bar ────────────────────────────────────────────────────────────
// One bar for every page: the name of the site, the five questions, and the
// three pages that explain the thinking. The first five keep the class "tab",
// which art.js uses to pick the drawing for a page.
const NAV = [
  ['worth', 'Is it worth it?', 'Spending', true],
  ['saving', 'The cost of saving', 'Cutting', true],
  ['gig', 'What am I making?', 'Earning', true],
  ['wait', 'The cost of waiting', 'Putting it off', true],
  ['barriers', 'The cost of barriers', 'Adding steps', true],
  ['assumptions', 'Before you decide', 'What is worth checking first', false],
  ['paper', 'Good on paper', 'Why a saving can cost more than it saves', false],
  ['why', 'Why it multiplies', 'When a cut is more than a subtraction', false],
  ['systems', 'Systems', 'What goes in, what does the work, what comes out', false],
  ['formulas', 'Formulas', 'Every calculation, published', false],
];
const TOPBAR_STYLE = `
  /* ── The top bar, the same on every page ── */
  .topbar { position: sticky; top: 0; z-index: 20; margin: -28px -16px 24px; padding: 0 16px; background: rgba(15, 23, 42, 0.93); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); border-bottom: 1px solid var(--line); }
  .topbar-in { max-width: 1180px; margin: 0 auto; display: flex; align-items: center; gap: 18px; min-height: 60px; }
  .brandlink { display: flex; align-items: center; gap: 10px; flex: none; font: 800 17px var(--display); color: var(--ink); text-decoration: none; }
  .brandlink img { display: block; width: 40px; height: 40px; border-radius: 50%; }
  .topbar .sitenav { display: flex !important; flex-wrap: nowrap; gap: 2px; min-width: 0; overflow-x: auto; scrollbar-width: none; }
  .topbar .sitenav::-webkit-scrollbar { display: none; }
  .topbar .sitenav a, .topbar .sitenav a.tab { flex: none; display: inline-flex; flex-direction: row; font: 700 14px var(--body); line-height: 1.2; padding: 9px 7px; border: 0; border-radius: 8px; background: none; color: var(--ink-2); white-space: nowrap; text-decoration: none; }
  .topbar .sitenav a:hover { background: var(--surface); color: var(--ink); }
  .topbar .sitenav a[aria-current="page"] { background: var(--accent); color: var(--on-accent); }
  .topbar .sitenav .gap { flex: none; width: 1px; margin: 8px 6px; background: var(--line); }
  /* The plain lists written into the page for readers and crawlers alike. */
  .wrap.crawl { margin-top: 26px; }
  .all-groups { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 18px 26px; }
  .all-groups h3 { margin: 0 0 8px; font: 800 13px var(--body); letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
  .all-groups ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 10px; }
  .all-groups li a { display: block; font-weight: 700; color: var(--accent-2); text-decoration: none; }
  .all-groups li a:hover { text-decoration: underline; }
  .all-groups li span { display: block; font-size: 14px; color: var(--muted); }
  .all-groups li a.eg { display: inline; font-size: 13px; white-space: nowrap; }
  .faq { margin: 0; display: grid; gap: 6px; max-width: 76ch; }
  .faq dt { font-weight: 700; font-size: 17px; color: var(--ink); margin-top: 10px; }
  .faq dd { margin: 0; color: var(--ink-2); }
  /* Where to go next: related things elsewhere on the site. */
  .next { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }
  .next a { display: grid; gap: 4px; height: 100%; box-sizing: border-box; padding: 14px 16px; background: var(--paper); border: 1px solid var(--line); border-radius: 10px; text-decoration: none; }
  .next a:hover { border-color: var(--accent); }
  .next b { color: var(--accent-2); font-size: 16px; }
  .next span { color: var(--ink-2); font-size: 14px; }
  /* On touch screens every control is at least 48px tall, so a finger does not miss it. */
  @media (pointer: coarse) {
    input[type="text"], input[type="date"], select, .seg button, .btn, .wiz .btn, .del, .ex, .go { min-height: 48px; box-sizing: border-box; }
    .topbar .sitenav a, .topbar .sitenav a.tab { padding-top: 15px; padding-bottom: 15px; }
  }
  /* Below this width the links take a row of their own, under the name. */
  @media (max-width: 1360px) {
    .topbar-in { flex-direction: column; align-items: stretch; gap: 2px; padding: 8px 0 6px; }
    .brandlink img { width: 32px; height: 32px; }
  }
`;
function topbar(page) {
  const link = ([href, text, title, tab]) => `<a${tab ? ' class="tab"' : ''} href="${href}" title="${title}"${href === page.lit ? ' aria-current="page"' : ''}>${text}</a>`;
  return `<div class="topbar"><div class="topbar-in">
  <a class="brandlink" href="./"${page.to === 'index.html' ? ' aria-current="page"' : ''}><img src="logo-144.png" width="40" height="40" alt=""><span>Cost of Saving</span></a>
  <nav class="sitenav" aria-label="Site">
    ${NAV.filter((n) => n[3]).map(link).join('\n    ')}
    <span class="gap" aria-hidden="true"></span>
    ${NAV.filter((n) => !n[3]).map(link).join('\n    ')}
  </nav>
</div></div>

`;
}
// Take out the page's own row of links and put the shared bar above the page.
function chrome(page, html) {
  const without = html.replace(/[ \t]*<nav class="sitenav"[\s\S]*?<\/nav>\n?/, '');
  const at = without.indexOf('<div class="wrap');
  if (at < 0) throw new Error(`${page.from}: could not find where the page starts`);
  const lastStyle = without.lastIndexOf('</style>', at);
  if (lastStyle < 0) throw new Error(`${page.from}: no style block`);
  return without.slice(0, lastStyle) + TOPBAR_STYLE + without.slice(lastStyle, at) + topbar(page) + without.slice(at);
}

// ── Text a crawler can read without running any script ─────────────────────
// The pickers and the front-page answers are drawn by script. Many crawlers,
// including most AI ones, do not run scripts, so they would see none of it.
// The same content is therefore also written into the page as plain HTML here,
// from the same data the scripts use, so the two cannot disagree.
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const { GROUPS } = require('./worth-scenarios');
const { answer } = require('./worth-answer');
const { EXAMPLES, GROUP_ORDER, toInputs } = require('./saving-examples');
const { analyze } = require('./saving');
// Every worked example has a page of its own under /decide/. This looks one up by the calculator link it belongs to.
const SCENARIOS = require('./scenario-pages').scenarioPages();
const SLUG_OF = Object.fromEntries(SCENARIOS.map((s) => [s.calc, s.slug]));
const QUESTION_OF = { 'worth.html': 'spend', 'cut.html': 'cut', 'earn.html': 'earn', 'wait.html': 'wait' };

// Questions people ask about the site. Shown on the front page and also given
// to search engines in the form they read. The two are built from this one list.
const FAQ = [
  ['What is Cost of Saving?', 'A set of free calculators for finding the hidden cost: the actual cost, not the one presented or reported. They show both halves of a money decision: the saving or price you see at once, and the costs that show up later. They cover spending, cutting, earning, putting things off, and the cost of adding steps.'],
  ['Is it free? Do I need an account?', 'It is free. There is no account and no sign-up. It works in any browser, and you can also install it as an app on your phone or computer, where it works without a connection.'],
  ['Who made it, and why?', 'Kenneth W. Bingham, as a personal portfolio and skills demonstration. It is not a commercial product: there are no ads and nothing to buy.'],
  ['Where do my numbers go?', 'Nowhere. Every sum is done in your own browser, and nothing you type into a calculator is sent to any server. The feedback form is the one exception: it sends what you write to the author, and only when you press Send.'],
  ['How do I know the sums are right?', 'Every formula, input and assumption is published on the formulas page, with a worked example you can follow on a pocket calculator. The code is covered by hundreds of automated checks, and the main calculator is checked against a second, independent version of itself.'],
  ['Does it say every cut is a bad idea?', 'No. Many cuts hold up, and the calculators say so. Cancelling a subscription almost nobody uses, or selling idle machine time, costs very little for each dollar saved. The aim is to tell the two kinds apart before deciding.'],
  ['What is a tipping point?', 'The one number that would have to change for the answer to flip. Each answer shows it, so you can see how wrong your estimate could be before the decision changes.'],
  ['Is this financial advice?', 'No. It is arithmetic on your own estimates, shown with its assumptions. The examples use illustrative figures, not data about any real person or company.'],
];

function decisionList(title, groups, file) {
  return `<div class="wrap crawl"><section class="card">
    <h2>${title}</h2>
    <div class="all-groups">${groups.map((g) => `
      <div><h3>${esc(g.title)}</h3><ul>${g.items.map((i) => `<li><a href="#${i.id}">${esc(i.label)}</a><span>${esc(i.text)}${SLUG_OF[`${file}#${i.id}`] ? ` <a class="eg" href="/decide/${SLUG_OF[`${file}#${i.id}`]}">Worked example</a>` : ''}</span></li>`).join('')}</ul></div>`).join('')}
    </div>
  </section></div>

`;
}
function crawlable(page, html) {
  let extra = '';
  const q = QUESTION_OF[page.to];
  if (q) {
    const groups = GROUPS.filter((g) => (g.q || 'spend') === q).map((g) => ({ title: g.title, items: g.items.filter((s) => !/-own$/.test(s.id)).map((s) => ({ id: s.id, label: s.label, text: s.story })) }));
    extra = decisionList('Every decision on this page', groups, page.from);
  }
  if (page.to === 'saving.html') {
    const real = EXAMPLES.filter((e) => !e.own);
    extra = decisionList('Every business decision in the calculator', GROUP_ORDER.filter((g) => real.some((e) => e.group === g)).map((g) => ({ title: g, items: real.filter((e) => e.group === g).map((e) => ({ id: e.id, label: e.label, text: e.note })) })), page.from);
  }
  if (page.to === 'barriers.html') {
    extra = decisionList('Every barrier on this page', require('./barriers-examples').GROUPS.map((g) => ({ title: g.title, items: g.items.map((e) => ({ id: e.id, label: e.label, text: e.note })) })), page.from);
  }
  let out = html;
  if (page.to === 'index.html') {
    // The six worked answers, computed here by the same engines the page uses.
    const all = GROUPS.flatMap((g) => g.items);
    const fromPicker = (id, file) => { const s = all.find((x) => x.id === id); return { ask: s.label, says: answer(s.kind, s.example, s.labels, s.item).headline, href: `${file}#${id}` }; };
    const lay = analyze(toInputs(EXAMPLES.find((e) => e.id === 'layoff').values));
    const cards = [fromPicker('flight', 'index.html'), fromPicker('job', 'earn.html'), fromPicker('fix-or-new', 'index.html'), fromPicker('car-repair', 'wait.html'), fromPicker('borrow-or-cash', 'index.html'),
      { ask: 'Reducing headcount: what is the full cost?', says: `It saves ${Math.round(lay.grossSaving).toLocaleString('en-US')} on paper. Every $1 saved costs ${lay.multiple.toFixed(2)}.`, href: 'saving.html#layoff' }];
    const pairCard = (c) => { const cut = c.says.indexOf('. '); return `<a class="pair-card" href="${c.href}"><span class="ask">${esc(c.ask)}</span><span class="face"><span class="k">Face value</span>${esc(c.says.slice(0, cut + 1))}</span><span class="actual"><span class="k">Actual value</span>${esc(c.says.slice(cut + 2))}</span><span class="more">See the working</span></a>`; };
    const emptyPairs = '<div class="pairs" id="pairs"></div>';
    if (!out.includes(emptyPairs)) throw new Error('home.html: could not find the face-value cards to fill in');
    out = out.replace(emptyPairs, `<div class="pairs" id="pairs">${[cards[0], cards[1], cards[5]].map(pairCard).join('')}</div>`);
    const empty = '<div class="answers" id="answers"></div>';
    if (!out.includes(empty)) throw new Error('home.html: could not find the answers to fill in');
    out = out.replace(empty, `<div class="answers" id="answers">${cards.map((c) => `<a class="answer" href="${c.href}"><span class="ask">${esc(c.ask)}</span><span class="says">${esc(c.says)}</span><span class="more">Try it with your numbers</span></a>`).join('')}</div>`);
    extra = `<div class="wrap crawl"><section class="card">
    <h2>Common questions</h2>
    <dl class="faq">${FAQ.map(([q2, a]) => `<dt>${esc(q2)}</dt><dd>${esc(a)}</dd>`).join('')}</dl>
  </section></div>

`;
  }
  if (!extra) return out;
  const at = out.indexOf('<footer class="privacy">');
  if (at < 0) throw new Error(`${page.from}: no footer to place the list before`);
  return out.slice(0, at) + extra + out.slice(at);
}

// ── Counting visits (off unless a token is supplied) ───────────────────────
// Cloudflare Web Analytics counts a visit only when a real browser runs its
// small script, so scripts and scanners are left out. It uses no cookies. It is
// switched on by saving the site's token in analytics-token.txt beside this
// file. When it is on, the privacy wording on every page is changed to say so.
const tokenFile = path.join(SRC, 'analytics-token.txt');
const ANALYTICS_TOKEN = fs.existsSync(tokenFile) ? fs.readFileSync(tokenFile, 'utf8').trim() : '';
if (ANALYTICS_TOKEN && !/^[a-f0-9]{20,64}$/i.test(ANALYTICS_TOKEN)) throw new Error('analytics-token.txt does not look like a Cloudflare Web Analytics token');
// Cloudflare can also add the same counter to the pages by itself, with no token here (its
// "automatic setup"). When it does, visit-counting-auto.txt beside this file says so, and the
// wording is changed in the same way without adding a second copy of the script.
const COUNTED_BY_HOST = fs.existsSync(path.join(SRC, 'visit-counting-auto.txt'));
// The site's own count: each page, once shown in a browser, asks to be counted. It sends one
// thing, whether this is the first page of the visit, and nothing about the visitor. It is not
// sent at all when the browser asks not to be tracked, or is being driven by a program.
const COUNT_SCRIPT = `
<script>
(function () {
  try {
    if (navigator.webdriver || navigator.doNotTrack === '1' || navigator.globalPrivacyControl) return;
    var first = false;
    try { first = !sessionStorage.getItem('cos-visit'); sessionStorage.setItem('cos-visit', '1'); } catch (e) { /* counted as a page, not a visit */ }
    fetch('/api/hit', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ visit: first }), keepalive: true }).catch(function () {});
  } catch (e) { /* the page works the same without it */ }
})();
</script>
`;
function analytics(html) {
  if (!ANALYTICS_TOKEN && !COUNTED_BY_HOST) return html;
  const says = [
    ['and there are no accounts, cookies or tracking.', 'and there are no accounts and no cookies. Visits are counted, without cookies, by Cloudflare Web Analytics and by the site itself; what you type is never part of that.'],
    ['<li><b>No accounts, no cookies, no tracking.</b> If that ever changes, this section will say so first.</li>', '<li><b>No accounts and no cookies.</b> Page visits are counted by Cloudflare Web Analytics. It uses no cookies and does not follow people from site to site. It records that a page was opened, never what was typed into it. The site also keeps a running total of its own: two numbers, visits and pages opened, with nothing about who opened them or from where. Neither count is taken when your browser asks not to be tracked.</li>'],
  ];
  let out = html;
  for (const [from, to] of says) out = out.split(from).join(to);
  if (/no accounts, cookies or tracking|no cookies, no tracking/.test(out)) throw new Error('visit counting is on, but a page still says there is no tracking');
  out = out.trimEnd() + COUNT_SCRIPT;
  if (!ANALYTICS_TOKEN) return out;
  return out.trimEnd() + `\n<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${ANALYTICS_TOKEN}"}'></script>\n`;
}

// ── What search engines and shared links read ──────────────────────────────
const urlOf = (page) => `${DOMAIN}/${page.to === 'index.html' ? '' : page.to.replace(/\.html$/, '')}`;
function head(page, html) {
  const url = urlOf(page);
  const meta = [
    `<meta name="description" content="${page.description}">`,
    `<link rel="canonical" href="${url}">`,
    `<meta property="og:site_name" content="Cost of Saving">`,
    `<meta property="og:title" content="${page.title}">`,
    `<meta property="og:description" content="${page.description}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:url" content="${url}">`,
    // The logo, in the sizes browsers and phones ask for, and the card shown when a link is shared.
    `<link rel="icon" type="image/png" sizes="48x48" href="/icon-48.png">`,
    `<link rel="icon" type="image/png" sizes="32x32" href="/icon-32.png">`,
    `<link rel="apple-touch-icon" href="/icon-180.png">`,
    `<meta property="og:image" content="${DOMAIN}/og.png">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="theme-color" content="#0f172a">`,
    // Installable as an app: the app's description, and the script that offers installing and works offline.
    `<link rel="manifest" href="/manifest.webmanifest">`,
    `<script defer src="/app-install.js"></script>`,
  ];
  // The front page also describes the site as a whole, in the form search engines read.
  if (page.to === 'index.html') {
    meta.push(`<script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Cost of Saving', url: DOMAIN + '/',
      description: page.description, applicationCategory: 'FinanceApplication', operatingSystem: 'Any',
      isAccessibleForFree: true,
      author: { '@type': 'Person', name: 'Kenneth W. Bingham' },
    })}</script>`);
  }
  // Every page says what it is and where it sits in the site, in the form search engines read.
  const ld = (data) => `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', ...data })}</script>`;
  const shortName = page.title.split(':')[0];
  meta.push(ld({ '@type': 'WebPage', name: page.title, description: page.description, url, inLanguage: 'en',
    isPartOf: { '@type': 'WebSite', name: 'Cost of Saving', url: DOMAIN + '/' }, author: { '@type': 'Person', name: 'Kenneth W. Bingham' } }));
  if (page.to !== 'index.html') meta.push(ld({ '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Cost of Saving', item: DOMAIN + '/' },
    { '@type': 'ListItem', position: 2, name: shortName, item: url }] }));
  if (page.to === 'index.html') meta.push(ld({ '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }));
  if (!/<title>[\s\S]*?<\/title>/.test(html)) throw new Error(`${page.from}: no title`);
  let out = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${page.title}</title>\n${meta.join('\n')}`);
  // The working pages are fragments. On a web host each needs its own document start.
  if (!/^\s*<!doctype/i.test(out)) out = `<!doctype html>\n<html lang="en">\n<meta charset="utf-8">\n${out}`;
  // Every page says plainly what the site is (Ken, 2026-10-25): his portfolio, free, not a product.
  out = out.trimEnd() + PORTFOLIO_LABEL;
  return out;
}
const PORTFOLIO_LABEL = `
<p class="pf-label" style="max-width:60rem;margin:28px auto 36px;padding:0 max(16px,env(safe-area-inset-left,0px));font:14px/1.5 system-ui,sans-serif;color:#64748b;text-align:center">Personal portfolio / skills demonstration: not a commercial product. Made by Kenneth W. Bingham to show employers his work. Free to use, with no ads and nothing to buy.</p>
`;

// ── Where to go next ───────────────────────────────────────────────────────
// Each page ends with links to related things elsewhere on the site: the same
// question seen from the other side, the next decision it leads to, or the
// reasoning behind it. A link is [address, what it is, why go there]. Every
// address is checked when the site is built, so a link cannot point at a page
// or a scenario that does not exist.
const NEXT = {
  'index.html': [
    ['cut.html', 'What does saving cost?', 'The other half of spending: doing it yourself, buying cheaper, going without.'],
    ['wait.html', 'The cost of waiting', 'Not buying yet is a decision too. See what putting it off costs.'],
    ['barriers.html#convenience', 'A convenience fee, from the seller\'s side', 'You see the fee. See what it costs the business that charges it.'],
    ['barriers.html#membership', 'A membership fee', 'What it brings in, and how many customers it turns away.'],
    ['earn.html#job', 'Is this job worth it?', 'What you spend comes out of what you really earn an hour.'],
    ['worth-detailed.html', 'Several possible outcomes?', 'The detailed version handles a deal with many outcomes, such as every prize tier.'],
  ],
  'worth-detailed.html': [
    ['index.html', 'Is it worth it?', 'The simpler version, one question at a time.'],
    ['index.html#flight', 'Is the cheap flight really cheaper?', 'The advertised price with its add-ons put back.'],
    ['wait.html', 'The cost of waiting', 'When the choice is now or later.'],
    ['formulas.html', 'The formulas', 'How an expected value is worked out, with an example.'],
  ],
  'saving.html': [
    ['where.html', 'On-site, hybrid or work from home?', 'One cut seen from two bottom lines: the business\'s and each person\'s.'],
    ['barriers.html#five', 'How many interview rounds?', 'What each round costs and catches, when a seat needs filling.'],
    ['paper.html', 'Good on paper', 'Why a saving can look right in the accounts and still cost more.'],
    ['why.html', 'Why it multiplies', 'When a cut is a plain subtraction, and when it is not.'],
    ['cut.html', 'Everyday savings', 'The same question at household size.'],
    ['earn.html#job', 'The employee\'s side', 'What a job really pays once its costs are counted.'],
  ],
  'cut.html': [
    ['saving.html', 'A business cut instead?', 'Layoffs, suppliers, marketing and more, with the hidden costs counted.'],
    ['index.html#fix-or-new', 'Fix it or buy new?', 'Sometimes the saving is the repair, sometimes the replacement.'],
    ['index.html#new-or-used', 'Buy new or used?', 'The cheaper price against the shorter life.'],
    ['wait.html#car-repair', 'Put off a car repair', 'Saving by waiting, and what it risks.'],
    ['gig.html', 'Gig work log', 'What your time is really worth an hour, for the do-it-yourself sums.'],
    ['index.html#flight', 'Is the cheap flight really cheaper?', 'A low price that grows at the checkout.'],
  ],
  'where.html': [
    ['saving.html#layoff', 'Reduce headcount: the full cost', 'What replacing people costs, counted the same way.'],
    ['barriers.html#five', 'How many interview rounds?', 'Sizing the hiring process when a seat needs filling.'],
    ['earn.html#job', 'Is this job worth it?', 'The same commute, from the employee\'s side.'],
    ['paper.html', 'Good on paper', 'Why the saving shows at once and the cost shows later.'],
    ['why.html', 'Why it multiplies', 'What happens when several things rely on the same people.'],
  ],
  'gig.html': [
    ['earn.html#job', 'Is this job worth it?', 'Compare what the gig really pays with a job.'],
    ['earn.html#job-side', 'A second job or side gig', 'Whether the extra hours are worth what is left.'],
    ['index.html#new-or-used', 'Buy new or used?', 'The car is the biggest cost of driving for a living.'],
    ['wait.html#car-repair', 'Put off a car repair', 'What waiting risks when the car is the income.'],
    ['formulas.html', 'The formulas', 'How the tax and mileage sums are done.'],
    ['worth-detailed.html', 'Several possible outcomes?', 'The detailed calculator, for a deal that can end more than two ways.'],
  ],
  'earn.html': [
    ['gig.html', 'Gig work log', 'Record pay, tips, miles and hours and see the real hourly rate.'],
    ['where.html', 'On-site, hybrid or work from home?', 'What each arrangement costs you in money and hours.'],
    ['barriers.html#worksample', 'A work-sample test', 'How a screening test is weighed, from the employer\'s side.'],
    ['barriers.html#takehome', 'A take-home assignment', 'The time it asks for, and what it tells the employer.'],
    ['barriers.html#five', 'How many interview rounds?', 'How a hiring process is sized, and why time to hire matters.'],
    ['cut.html', 'What does saving cost?', 'Stretching what you earn.'],
  ],
  'wait.html': [
    ['index.html#fix-or-new', 'Fix it or buy new?', 'If you stop waiting, which way to go.'],
    ['index.html#borrow-or-cash', 'Borrow or pay cash?', 'Paying now, when now means borrowing.'],
    ['barriers.html#five', 'Time to hire', 'Why the weeks a process takes are part of its cost.'],
    ['saving.html#maintenance', 'Put off maintenance, for a business', 'The same question with a plant instead of a car.'],
    ['why.html', 'Why it multiplies', 'Why some costs grow while they wait.'],
  ],
  'barriers.html': [
    ['index.html#flight', 'Fees from the customer\'s side', 'Is the cheap flight really cheaper once the add-ons are back in?'],
    ['index.html#hotel-fees', 'A hotel room with a resort fee', 'What the advertised rate really comes to.'],
    ['earn.html#job', 'Is this job worth it?', 'What getting and keeping a job costs the person doing it.'],
    ['saving.html#supplier', 'Switch to a cheaper supplier', 'The same full-cost sum for a purchasing decision.'],
    ['where.html', 'On-site, hybrid or work from home?', 'A requirement that some people will not meet.'],
    ['why.html', 'Why it multiplies', 'Why losing a few at every step adds up to more than it looks.'],
  ],
  'assumptions.html': [
    ['paper.html', 'Good on paper', 'Why the first figure gets counted and the second does not.'],
    ['why.html', 'Why it multiplies', 'When the gap is small, and when it is not.'],
    ['saving.html', 'The cost of saving', 'Put a business cut through the calculator.'],
    ['index.html', 'Is it worth it?', 'Put a purchase through it.'],
    ['barriers.html', 'The cost of barriers', 'What a step costs, and who it keeps out.'],
    ['disclaimer.html', 'Disclaimer', 'What these sums can and cannot tell you.'],
  ],
  'paper.html': [
    ['assumptions.html', 'Before you decide', 'A checklist of what is worth checking first.'],
    ['saving.html', 'The cost of saving', 'Put your own cut through the calculator.'],
    ['where.html', 'On-site, hybrid or work from home?', 'A decision with two bottom lines.'],
    ['barriers.html', 'The cost of barriers', 'Steps added to prevent a mistake have a cost of their own.'],
    ['why.html', 'Why it multiplies', 'The arithmetic behind the cases.'],
    ['cut.html', 'Everyday savings', 'The same idea at home.'],
    ['formulas.html', 'The formulas', 'Every calculation, with a worked example.'],
  ],
  'why.html': [
    ['assumptions.html', 'Before you decide', 'A checklist, with a calculator for each line.'],
    ['saving.html', 'The cost of saving', 'Try it on a real decision.'],
    ['paper.html', 'Good on paper', 'Worked cases, and the questions to ask first.'],
    ['barriers.html', 'Barriers multiply too', 'A small loss at every step is not a small loss.'],
    ['wait.html', 'The cost of waiting', 'Costs that grow while nothing is done.'],
    ['formulas.html', 'The formulas', 'The same formulas, written out.'],
    ['worth-detailed.html', 'Several possible outcomes?', 'Expected value worked through, tier by tier.'],
  ],
  'formulas.html': [
    ['saving.html', 'The cost of saving', 'Formulas F1 to F13 at work.'],
    ['index.html', 'Is it worth it?', 'The everyday formulas at work.'],
    ['gig.html', 'Gig work log', 'The tax and mileage sums at work.'],
    ['barriers.html', 'The cost of barriers', 'Formulas B1 to B3 at work.'],
    ['cut.html', 'What does saving cost?', 'Everyday savings.'],
    ['earn.html', 'Is this job worth it?', 'The real hourly wage.'],
    ['disclaimer.html', 'Disclaimer', 'What these sums can and cannot tell you.'],
  ],
  'feedback.html': [
    ['formulas.html', 'The formulas', 'Check a sum before reporting it.'],
    ['disclaimer.html', 'Disclaimer', 'What the site is and is not.'],
    ['index.html', 'Is it worth it?', 'Back to the calculators.'],
  ],
  'disclaimer.html': [
    ['formulas.html#privacy', 'Where your numbers go', 'The full account of what is and is not kept.'],
    ['formulas.html', 'The formulas', 'Every calculation, published.'],
    ['paper.html', 'Good on paper', 'Why the same decision can turn out differently.'],
    ['feedback.html', 'Send feedback', 'Report a mistake or something missing.'],
  ],
};
// Every place a link above can point: the pages, and the scenarios and sections inside them.
const ANCHORS = new Set([
  ...GROUPS.flatMap((g) => g.items.map((s) => s.id)), ...EXAMPLES.map((e) => e.id),
  ...require('./barriers-examples').GROUPS.flatMap((g) => g.items.map((e) => e.id)),
  'privacy', 'barriers', ...require('./arrange-examples').ARRANGE_EXAMPLES.map((e) => e.id),
]);
// ── What we assume: the page, and its teaser on the front page ────────────
const { ASSUMPTIONS } = require('./assumptions-data');
function checkLink(from, href) {
  const [file, anchor] = href.split('#');
  if (!PAGES.some((p) => p.from === file)) throw new Error(`${from}: a link points at ${file}, which is not a page`);
  if (anchor && !ANCHORS.has(anchor)) throw new Error(`${from}: a link points at #${anchor}, which does not exist`);
}
function assumptions(page, html) {
  if (page.from === 'assumptions.html') {
    for (const g of ASSUMPTIONS) for (const a of g.items) checkLink('assumptions-data.js', a.href);
    const jump = ASSUMPTIONS.map((g) => `<a href="#${g.id}">${esc(g.who)} (${g.items.length})</a>`).join('');
    const groups = ASSUMPTIONS.map((g) => `<section class="card" id="${g.id}" style="scroll-margin-top: 110px">
    <h2>${esc(g.who)}</h2>
    <p class="hint">${esc(g.lead)}</p>
    <div class="assume-list">${g.items.map((a) => `
      <div class="assume"><p class="says"><span class="k">The usual starting point</span>${esc(a.says)}</p><p class="then"><span class="k">Worth checking</span>${esc(a.then)}<br><a href="${a.href}">Check it: ${esc(a.link)}</a></p></div>`).join('')}
    </div>
  </section>`).join('\n');
    const spots = [['<div class="jump" id="assume-jump"></div>', `<div class="jump" id="assume-jump">${jump}</div>`], ['<div id="assumptions" style="display: grid; gap: 26px"></div>', `<div id="assumptions" style="display: grid; gap: 26px">${groups}</div>`]];
    let out = html;
    for (const [empty, filled] of spots) { if (!out.includes(empty)) throw new Error('assumptions.html: a place to fill was not found'); out = out.replace(empty, () => filled); }
    return out;
  }
  if (page.from === 'home.html') {
    // Three from each group on the front page, each leading to the full list.
    const empty = '<div class="assume-teaser" id="assume-teaser"></div>';
    if (!html.includes(empty)) throw new Error('home.html: no place for the assumptions');
    const cols = ASSUMPTIONS.map((g) => `<div><h3>${esc(g.who)}</h3><ul>${g.items.slice(0, 3).map((a) => `<li><a href="${a.href}"><b>&ldquo;${esc(a.says)}&rdquo;</b><span>${esc(a.link)}</span></a></li>`).join('')}</ul><a class="all" href="assumptions.html#${g.id}">All ${g.items.length} for ${esc(g.who.toLowerCase())}</a></div>`).join('');
    return html.replace(empty, () => `<div class="assume-teaser" id="assume-teaser">${cols}</div>`);
  }
  return html;
}

function whereNext(page, html) {
  const links = NEXT[page.from];
  if (!links) return html;
  for (const [href] of links) {
    const [file, anchor] = href.split('#');
    if (!PAGES.some((p) => p.from === file)) throw new Error(`${page.from}: "where to go next" points at ${file}, which is not a page`);
    if (anchor && !ANCHORS.has(anchor)) throw new Error(`${page.from}: "where to go next" points at #${anchor}, which does not exist`);
    if (file === page.from && !anchor) throw new Error(`${page.from}: "where to go next" points at itself`);
  }
  const block = `<div class="wrap crawl"><section class="card">
    <h2>Where to go next</h2>
    <ul class="next">${links.map(([href, name, why]) => `<li><a href="${href}"><b>${esc(name)}</b><span>${esc(why)}</span></a></li>`).join('')}</ul>
  </section></div>

`;
  const at = html.indexOf('<footer class="privacy">');
  if (at < 0) throw new Error(`${page.from}: no footer to place the links before`);
  return html.slice(0, at) + block + html.slice(at);
}

// ── Pictures beside headings ───────────────────────────────────────────────
// The small graphics cut from the sprite sheet (the art folder). Each page lists
// the headings that carry one. A heading named here that is not on its page stops
// the build, so the list cannot fall out of step with the pages.
const HEADING_ART = {
  'home.html': [['Face value, and actual value', 'targets'], ['The one question: does anything depend on it?', 'oring'], ['What is worth checking before you decide?', 'check'],
    ['The same thing happens to a business', 'bars'], ['Five questions. Pick yours.', 'steps'], ['Answers you can check', 'check-gold'], ['Why you can trust the sums', 'pie']],
  'assumptions.html': [['Read this first', 'flag'], ['Running a business', 'bars'], ['Working, or looking for work', 'line-up'], ['Buying something', 'pig-coin'],
    ['Three ways a cost hides', 'alert'], ['The pattern underneath', 'rings']],
  'barriers.html': [['Every step, every part', 'in-out'], ['What interview rounds are for', 'steps'], ['What this cannot tell you', 'warn']],
  'where.html': [['Before the sums: can the work be done remotely?', 'check'], ['The team', 'pie'], ['What each arrangement is weighed for', 'balanced'], ['What this cannot tell you', 'warn']],
  'disclaimer.html': [['The short version', 'flag'], ['A tool, not a prediction', 'curve'], ['Not advice', 'warn'], ['No responsibility accepted', 'alert'],
    ['What happens to what you type', 'check'], ['Independence', 'ring']],
  'gig.html': [], 'feedback.html': [],
};
// Headings the build itself writes onto many pages.
const SHARED_ART = [['Where to go next', 'up'], ['Every decision on this page', 'pie'], ['Every business decision in the calculator', 'pie'], ['Every barrier on this page', 'pie'], ['Common questions', 'check']];
const ART_FILES = new Set(fs.readdirSync(path.join(SRC, 'art')).map((n) => n.replace(/\.png$/, '')));
function headingArt(html, list, where, mustFind) {
  let out = html;
  for (const [text, art] of list) {
    if (!ART_FILES.has(art)) throw new Error(`${where}: there is no picture named ${art}`);
    const heading = new RegExp(`<h2([^>]*)>(${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})</h2>`);
    if (!heading.test(out)) { if (mustFind) throw new Error(`${where}: no heading "${text}" to put a picture beside`); continue; }
    out = out.replace(heading, (all, attrs, inner) => {
      const withClass = /class="/.test(attrs) ? attrs.replace('class="', 'class="with-art ') : `${attrs} class="with-art"`;
      return `<h2${withClass}><img src="art/${art}.png" alt="">${inner}</h2>`;
    });
  }
  return out;
}
const pictures = (page, html) => headingArt(headingArt(html, HEADING_ART[page.from] || [], page.from, true), SHARED_ART, page.from, false);

// Every page ends with a link to the disclaimer, added here so no page can be without it.
function disclaimerLink(page, html) {
  const end = '</p></footer>';
  const at = html.indexOf(end, html.indexOf('<footer class="privacy">'));
  if (html.indexOf('<footer class="privacy">') < 0 || at < 0) throw new Error(`${page.from}: no footer to put the disclaimer link in`);
  return html.slice(0, at) + ' <a href="examples.html">All worked examples</a>. <a href="disclaimer.html">Disclaimer</a>.' + html.slice(at);
}

// ── Pages that carry their own look ────────────────────────────────────────
// The front page and the Systems page were redesigned on 2026-10-11 with a
// full-width layout and a short top bar of their own (Decide, Systems, Formulas,
// Feedback). They are marked  own: true  in PAGES and are not given the shared
// top bar, heading pictures or "where to go next" block that the other pages
// get. They still get the title, description, link names and visit counting.
//
// They are written under working names, so those are swapped for the names the
// rest of the site uses. flow.html is a draft that is not on the site yet, so a
// link to it goes to the calculator it will replace.
const OWN_LINKS = [['home-draft.html', 'home.html'], ['system-draft.html', 'systems.html'], ['flow.html', 'saving.html']];
const ownLinks = (text) => OWN_LINKS.reduce((out, [from, to]) => out.split(from).join(to), text);
function ownPage(page, html) {
  let out = ownLinks(html);
  if (page.to !== 'index.html') return out;
  // The front page draws its calculators by script, so a reader without scripts
  // (most crawlers) would find no way in. This adds, folded away at the foot, a
  // plain link to every calculator and the common questions the page is
  // described by to search engines, so what they are told matches what is there.
  const at = out.indexOf('  <footer class="foot hint">');
  if (at < 0) throw new Error(`${page.from}: no footer to place the questions before`);
  const more = `  <details class="more">
    <summary>Common questions, and every calculator</summary>
    <div class="more-in">
      <p class="all">${NAV.filter((n) => n[3]).map(([href, text]) => `<a href="${href}">${esc(text)}</a>`).join('')}<a href="where">On-site, hybrid or home?</a><a href="examples">All worked examples</a><a href="assumptions">Before you decide</a></p>
      <dl class="faq">${FAQ.map(([q, a]) => `<dt>${esc(q)}</dt><dd>${esc(a)}</dd>`).join('')}</dl>
    </div>
  </details>

`;
  return out.slice(0, at) + more + out.slice(at);
}

// ── Build ──────────────────────────────────────────────────────────────────
const PAGES_EXTRA = [];      // pages written by the build itself, for the sitemap
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const page of PAGES) {
  const html = fs.readFileSync(path.join(SRC, page.from), 'utf8');
  if (page.own) { fs.writeFileSync(path.join(OUT, page.to), analytics(head(page, relink(ownPage(page, html))))); continue; }
  fs.writeFileSync(path.join(OUT, page.to), analytics(head(page, chrome(page, relink(pictures(page, whereNext(page, crawlable(page, assumptions(page, disclaimerLink(page, html))))))))));
}
// ── A page for every worked example, and an index of them ──────────────────
// These are plain pages with no script: the answer is worked out here, by the
// same engines the calculators use, and written into the page. They share the
// look of the rest of the site by borrowing its head and styles.
{
  const where = fs.readFileSync(path.join(SRC, 'where.html'), 'utf8');
  const cut = where.indexOf('  /* ── On-site, hybrid, work from home ── */');
  if (cut < 0) throw new Error('where.html: could not find the end of the shared styles');
  const sharedHead = where.slice(0, cut);
  const EXTRA_STYLE = `
  /* ── Worked example pages ── */
  .sides { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
  .side { background: var(--paper); border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px; display: grid; gap: 2px; }
  .side .k { font-size: 14px; color: var(--ink-2); }
  .side .v { font: 700 28px/1.2 var(--mono); color: var(--ink); }
  .side .n { font-size: 13px; color: var(--muted); }
  .cta { display: inline-block; justify-self: start; font: 700 17px var(--body); color: var(--on-accent); background: var(--accent); border-radius: 999px; padding: 13px 24px; text-decoration: none; }
  .cta:hover { background: var(--accent-2); }
  .asks { margin: 0; padding-left: 20px; display: grid; gap: 6px; color: var(--ink-2); }
  table.work td:first-child { font-family: var(--body); text-align: left; white-space: normal; }
  .crumbs { font-size: 14px; color: var(--muted); }
  .crumbs a { color: var(--accent-2); text-decoration: none; }
  .eg-groups { display: grid; grid-template-columns: repeat(auto-fit, minmax(270px, 1fr)); gap: 20px 26px; }
  .eg-groups h3 { margin: 0 0 8px; font: 800 13px var(--body); letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
  .eg-groups ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
  .eg-groups a { color: var(--accent-2); font-weight: 700; text-decoration: none; }
  .eg-groups span { display: block; font-size: 14px; color: var(--ink-2); }
`;
  const FOOT = '<footer class="privacy"><p><b>Your numbers stay on this device.</b> Every sum is done in your browser. Nothing you type into a calculator is sent to, stored on, or sold by any server, and there are no accounts, cookies or tracking. <a href="formulas.html#privacy">The details</a>. <a href="feedback.html">Send feedback</a>. <a href="examples.html">All worked examples</a>. <a href="disclaimer.html">Disclaimer</a>.</p></footer>\n';
  // Links in these pages are written from the top of the site, because the pages sit one folder down.
  const fromRoot = (html) => html.replace(/(href|src)="\.\/"/g, '$1="/"').replace(/(href|src)="(?!https?:|\/|#|mailto:|data:)([^"]*)"/g, '$1="/$2"');
  const shell = (page, body) => analytics(head(page, fromRoot(relink(
    sharedHead.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(page.title)}</title>`) + TOPBAR_STYLE + EXTRA_STYLE + '</style>\n\n' + topbar(page) + body + FOOT))));
  const clip = (text, max) => (text.length <= max ? text : text.slice(0, text.lastIndexOf(' ', max - 1)).replace(/[,;:.]$/, '') + '.');
  // What a search result shows under the title: the answer first, then as many whole
  // sentences of the example as fit in the 158 characters a result has room for.
  const describe = (s) => {
    let text = s.headline.replace(/"/g, '');
    for (const part of s.story.replace(/"/g, '').match(/[^.?!]+[.?!]+/g) || []) {
      if ((text + ' ' + part.trim()).length > 158) break;
      text += ' ' + part.trim();
    }
    return text.length <= 158 ? text : clip(text, 158);
  };
  const TONE = { good: 'good', bad: 'bad', mixed: 'mixed' };
  const CALC_NAME = { worth: 'Is it worth it?', saving: 'The cost of saving', gig: 'What am I making?', wait: 'The cost of waiting', barriers: 'The cost of barriers' };

  fs.mkdirSync(path.join(OUT, 'decide'), { recursive: true });
  for (const s of SCENARIOS) {
    const withGroup = `${s.label} | ${s.group} | Cost of Saving`;
    const page = { to: `decide/${s.slug}.html`, lit: s.lit, title: withGroup.length <= 65 ? withGroup : `${s.label} | Cost of Saving`,
      description: describe(s) };
    const body = `<div class="wrap">
  <header>
    <p class="crumbs"><a href="examples.html">Worked examples</a> / ${esc(s.group)}</p>
    <h1>${esc(s.label)}</h1>
    <p class="lede">${esc(s.story)}</p>
  </header>

  <section class="card">
    <div class="verdict-top"><span class="status ${TONE[s.tone] || 'mixed'}">${esc(s.verdict)}</span><img class="verdict-art" src="art/${s.calcName ? 'balanced' : { good: 'pig-whole', mixed: 'pig-cracked', bad: 'pig-broken' }[s.tone] || 'pig-cracked'}.png" alt=""></div>
    <p class="verdict-line">${esc(s.headline)}</p>
    <div class="sides">${s.sides.map((x) => `<div class="side"><span class="k">${esc(x.label)}</span><span class="v">${esc(x.value)}</span><span class="n">${esc(x.note)}</span></div>`).join('')}</div>
    <ul class="lines">${s.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
    <a class="cta" href="${s.calc}">Put in your own numbers</a>
    <p class="hint">This is a worked example with illustrative figures, not data about any real person or company. Change any of them in the calculator and the answer changes with them.</p>
  </section>

  <section class="card">
    <h2 class="with-art"><img src="art/bars.png" alt="">How this answer was worked out</h2>
    <div class="tablewrap"><table class="work"><tbody>${s.working.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</tbody></table></div>
    <p class="hint">Every formula is written out on the <a href="formulas.html" style="color: var(--accent-2)">formulas page</a>.</p>
  </section>

  <section class="card">
    <h2 class=\"with-art\"><img src=\"art/check.png\" alt=\"\">What the calculator asks you</h2>
    <ul class="asks">${s.asks.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>
    <a class="cta" href="${s.calc}">Open the calculator</a>
  </section>

  <section class="card">
    <h2 class=\"with-art\"><img src=\"art/up.png\" alt=\"\">Related</h2>
    <ul class="next">${s.related.map((r) => `<li><a href="/decide/${r.slug}"><b>${esc(r.label)}</b><span>Worked example</span></a></li>`).join('')}
      <li><a href="${s.calc.split('#')[0]}"><b>${esc(s.calcName || CALC_NAME[s.lit])}</b><span>The calculator this example comes from</span></a></li>
      <li><a href="assumptions.html"><b>Before you decide</b><span>A checklist of what is worth checking first</span></a></li></ul>
  </section>
</div>

`;
    fs.writeFileSync(path.join(OUT, page.to), shell(page, body));
  }

  // The index: every worked example, grouped by the calculator it belongs to.
  const index = { to: 'examples.html', lit: '', title: 'Worked Examples: every decision, with its answer',
    description: `${SCENARIOS.length} worked examples of money decisions for businesses, employees and customers, each with its answer, its working and a calculator for your own numbers.` };
  const sections = Object.keys(CALC_NAME).map((lit) => {
    const mine = SCENARIOS.filter((s) => s.lit === lit);
    const groups = [...new Set(mine.map((s) => s.group))];
    return `<section class="card">
    <h2 class="with-art"><img src="art/${{ worth: 'pig-coin', saving: 'bars', gig: 'line-up', wait: 'curve', barriers: 'in-out' }[lit]}.png" alt="">${esc(CALC_NAME[lit])}</h2>
    <div class="eg-groups">${groups.map((g) => `<div><h3>${esc(g)}</h3><ul>${mine.filter((s) => s.group === g).map((s) => `<li><a href="/decide/${s.slug}">${esc(s.label)}</a><span>${esc(s.headline)}</span></li>`).join('')}</ul></div>`).join('')}</div>
  </section>`;
  }).join('\n\n  ');
  fs.writeFileSync(path.join(OUT, index.to), shell(index, `<div class="wrap">
  <header>
    <span class="eyebrow">Face value, and actual value</span>
    <h1>Worked examples</h1>
    <p class="lede">${SCENARIOS.length} decisions, each with the answer the calculator gives for it, how that answer was reached, and a way to put in your own numbers. The figures are illustrative.</p>
  </header>

  ${sections}
</div>

`));
  PAGES_EXTRA.push(index, ...SCENARIOS.map((s) => ({ to: `decide/${s.slug}.html` })));
}

for (const file of SCRIPTS) fs.writeFileSync(path.join(OUT, file), relinkScript(ownLinks(fs.readFileSync(path.join(SRC, file), 'utf8'))));

for (const file of ['logo.png', 'logo-144.png', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'icon-512-maskable.png', 'icon-48.png', 'icon-32.png', 'og.png']) {
  fs.copyFileSync(path.join(SRC, 'assets', file), path.join(OUT, file));
}

// The artwork cut from the sprite sheet.
fs.cpSync(path.join(SRC, 'art'), path.join(OUT, 'art'), { recursive: true });

// A list of every page for search engines, and a note telling them where it is.
const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
  + [...PAGES, ...PAGES_EXTRA].map((p) => `  <url><loc>${urlOf(p)}</loc><lastmod>${today}</lastmod></url>`).join('\n') + '\n</urlset>\n');
// Everyone is welcome, search engines and AI assistants alike. The feedback
// form's addresses are left out: there is nothing there for a crawler.
const WELCOME = ['Googlebot', 'Bingbot', 'DuckDuckBot', 'Applebot', 'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'CCBot'];
fs.writeFileSync(path.join(OUT, 'robots.txt'), `# costofsaving.com: free calculators. Search engines and AI assistants are welcome to read and cite it.\n\nUser-agent: *\nAllow: /\nDisallow: /api/\n\n`
  + WELCOME.map((bot) => `User-agent: ${bot}\nAllow: /\nDisallow: /api/\n`).join('\n') + `\nSitemap: ${DOMAIN}/sitemap.xml\n`);

// A plain-text guide to the site for AI assistants (the llms.txt convention).
fs.writeFileSync(path.join(OUT, 'llms.txt'), `# Cost of Saving

> Free calculators for finding the hidden cost: the actual cost, not the one presented or reported. They show both halves of a money decision: the saving or price seen at once, and the costs that show up later. No account. Every sum runs in the visitor's browser.

Author: Kenneth W. Bingham. Site: ${DOMAIN}/

## What it is for

A saving is one line with a known amount. Its costs arrive later, under other headings, as estimates. The calculators put both side by side and show the tipping point: the one number that would have to change for the answer to flip. They also say when a saving is real.

## Pages

${PAGES.map((p) => `- [${p.title.split(':')[0]}](${urlOf(p)}): ${p.description}`).join('\n')}

## The main formulas

- Net result of a cut = saving - (one-time cost + side costs + lost contribution + expected reversal cost).
- Cost per $1 saved = total cost / saving. Below 1 the saving wins; above 1 the loss wins.
- When several parts of a business rely on what is cut, the share of output kept is the product (1 - a*w1) x (1 - a*w2) x ..., where a is the working share cut and each w is how strongly a part relies on it. With one part this is a plain proportional loss; with more, the loss is larger than proportional.
- Gig work: kept = pay + tips - miles x cost per mile - other costs - taxes set aside; real hourly = kept / hours.
- A barrier (an interview round, a form step, a sign-off): net of a step = what it catches - what it costs. What is left to catch shrinks each step; the chance a waiting candidate is still free is (1 - weekly loss) ^ weeks.
- Putting something off: expected later cost = (1 - chance) x cost later + chance x cost if it gets worse.
- Every formula, with inputs, assumptions and a worked example: ${DOMAIN}/formulas

## Facts worth getting right when citing it

- The example figures on the site are illustrative. They are not data about any real person or company.
- The results are arithmetic on the visitor's own estimates. It is not financial, tax or legal advice.
- The site does not say cuts are bad. Many of its worked examples come out in favour of the cut.
- The site is a tool for informed decisions, not a prediction: the same decision can turn out differently. Its disclaimer is at ${DOMAIN}/disclaimer
- Nothing typed into a calculator is sent to a server. The feedback form sends what is written in it, and only when Send is pressed.

## Contact

Feedback and corrections: ${DOMAIN}/feedback
`);

// IndexNow: a key file that proves this site asked for its pages to be re-read.
// notify-search.js uses it after a deploy to tell Bing and others what changed.
const keyFile = path.join(SRC, 'indexnow-key.txt');
if (fs.existsSync(keyFile)) { const key = fs.readFileSync(keyFile, 'utf8').trim(); fs.writeFileSync(path.join(OUT, key + '.txt'), key); }

// A plain "not found" page that points back to the front page.
fs.writeFileSync(path.join(OUT, '404.html'), `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>Page not found</title>
<meta name="robots" content="noindex">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root { --page: #0f172a; --ink: #f8fafc; --ink-2: #94a3b8; --accent: #14b8a6; --on-accent: #0f172a; color-scheme: dark; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: var(--page); color: var(--ink); font: 18px/1.5 system-ui, sans-serif; padding: 24px; box-sizing: border-box; }
  main { max-width: 32rem; display: grid; gap: 14px; }
  h1 { margin: 0; font-size: 2rem; line-height: 1.1; }
  p { margin: 0; color: var(--ink-2); }
  a { justify-self: start; background: var(--accent); color: var(--on-accent); text-decoration: none; font-weight: 700; padding: 11px 20px; border-radius: 999px; }
</style>
<main>
  <h1>That page is not here.</h1>
  <p>It may have moved. Everything starts from the front page.</p>
  <a href="/">Go to the front page</a>
</main>
`);

// An old address keeps working if anyone has it.
fs.writeFileSync(path.join(OUT, '_redirects'), '/workers.html  /  301\n/workers  /  301\n');

// ── The app: what installs, and what works with no connection ───────────────
// manifest.webmanifest describes the app to the phone or computer (its name, icon and colors). sw.js keeps
// a copy of every calculator page, its scripts and pictures on the device, so the app opens and works
// offline; worked examples are kept as they are opened. Its cache name changes whenever any file changes,
// so an installed app picks up a new version the next time it is opened online.
{
  fs.writeFileSync(path.join(OUT, 'manifest.webmanifest'), JSON.stringify({
    id: '/', name: 'Cost of Saving', short_name: 'Cost of Saving',
    description: 'Free calculators for the hidden cost of saving and spending money, worked out on your device. Personal portfolio / skills demonstration: not a commercial product.',
    start_url: '/', scope: '/', display: 'standalone', orientation: 'any',
    background_color: '#0f172a', theme_color: '#0f172a', lang: 'en-US', dir: 'ltr',
    categories: ['finance', 'productivity', 'utilities'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }, null, 2));
  const crypto = require('crypto');
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  const all = walk(OUT).map((f) => path.relative(OUT, f).split(path.sep).join('/'));
  // Kept on the device from the start: the pages and everything they load, not the worked-example pages.
  const keep = all.filter((f) => !f.startsWith('decide/') && !/^(_redirects|robots\.txt|sitemap\.xml|llms\.txt|404\.html|[0-9a-f]{32}\.txt)$/.test(f));
  const urls = keep.map((f) => '/' + (f === 'index.html' ? '' : f.replace(/\.html$/, '')));
  const version = crypto.createHash('sha256').update(keep.map((f) => f + fs.readFileSync(path.join(OUT, f)).length + crypto.createHash('md5').update(fs.readFileSync(path.join(OUT, f))).digest('hex')).join('|')).digest('hex').slice(0, 12);
  fs.writeFileSync(path.join(OUT, 'sw.js'), `// Cost of Saving offline copy. Built by build-site.js; version ${version}.
const CACHE = 'cos-${version}';
const KEEP = ${JSON.stringify(urls)};
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(KEEP)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('cos-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;   // feedback and counts go to the network
  if (req.mode === 'navigate') {
    // Pages: the newest from the network when online, the kept copy when not.
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('/'))));
    return;
  }
  // Scripts and pictures: the kept copy at once, refreshed in the background.
  e.respondWith(caches.match(req).then((hit) => {
    const fresh = fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; }).catch(() => hit);
    return hit || fresh;
  }));
});
`);
  console.log(`app: manifest.webmanifest, sw.js (version ${version}, ${urls.length} files kept offline)`);
}

const files = fs.readdirSync(OUT).filter((name) => name !== 'decide').sort();
const bytes = files.reduce((n, f) => n + fs.statSync(path.join(OUT, f)).size, 0);
console.log(`built ${files.length} files, ${(bytes / 1024).toFixed(0)} KB, in ${OUT}${ANALYTICS_TOKEN || COUNTED_BY_HOST ? '  (visit counting ON)' : '  (visit counting off)'}`);
console.log(files.join('  '));
console.log(`plus ${SCENARIOS.length} worked example pages in ${path.join(OUT, 'decide')}`);
