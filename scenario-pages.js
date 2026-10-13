// A page of its own for every worked example on the site.
//
// The calculators hold about a hundred scenarios, each reached by a "#" link
// inside a handful of pages. A search engine indexes pages, not "#" links, so
// none of those scenarios could be found on its own. This file describes one
// page for each: the question, the worked example, the answer the calculator
// gives for it, how that answer was reached, and a way into the calculator
// with the reader's own numbers.
//
// Nothing here is typed in by hand. Every figure comes from the same engine and
// the same example as the calculator the page links to, so the two cannot differ.
// build-site.js turns each description into a file under /decide/.
'use strict';
const { GROUPS: WORTH_GROUPS, KINDS } = require('./worth-scenarios');
const { answer } = require('./worth-answer');
const { EXAMPLES: CUT_EXAMPLES, GROUP_ORDER, toInputs } = require('./saving-examples');
const { analyze } = require('./saving');
const BX = require('./barriers-examples');
const Barriers = require('./barriers');

const money = (v) => `${v < 0 ? '-' : ''}$${Math.round(Math.abs(v)).toLocaleString('en-US')}`;
const pct = (v) => `${(+(v * 100).toFixed(1)).toLocaleString('en-US')}%`;
const count = (v) => (+v.toFixed(1)).toLocaleString('en-US');
// "Is the cheap flight really cheaper?" -> "is-the-cheap-flight-really-cheaper"
const slugOf = (text) => text.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const sentence = (text) => (/[.?!]$/.test(text) ? text : text + '.');

// Which calculator page each of the four everyday questions lives on.
const WORTH_PAGE = { spend: 'index.html', cut: 'cut.html', earn: 'earn.html', wait: 'wait.html' };

// ── Everyday decisions (Is it worth it?, saving, earning, waiting) ─────────
function everyday() {
  const pages = [];
  for (const g of WORTH_GROUPS) {
    for (const s of g.items) {
      if (/-own$/.test(s.id)) continue;                    // "my own" has no worked example
      const a = answer(s.kind, s.example, s.labels, s.item);
      if (a.incomplete) continue;
      const labels = s.labels || {};
      pages.push({
        slug: slugOf(s.label), id: s.id, group: g.title, calc: `${WORTH_PAGE[g.q || 'spend']}#${s.id}`, lit: { spend: 'worth', cut: 'saving', earn: 'gig', wait: 'wait' }[g.q || 'spend'],
        label: s.label, story: sentence(s.story),
        tone: a.tone, verdict: a.verdict, headline: a.headline,
        sides: [a.left, a.right].filter(Boolean).map((x) => ({ label: x.label, value: money(x.amount), note: x.sub || '' })),
        lines: a.lines,
        working: a.working,
        asks: KINDS[s.kind].fields.map((f) => labels[f.id] || f.label),
      });
    }
  }
  return pages;
}

// ── Business decisions (the cost of saving) ────────────────────────────────
const CUT_VERDICT = {
  // Worded as a finding about these figures, not a judgement of the decision.
  real: (noun, r) => [`The ${noun} holds`, 'good', `The ${noun} holds: ${money(r.realAtEnd)} ahead after every cost is counted.`],
  'mostly-eaten': (noun, r) => [`The ${noun} holds, narrowly`, 'mixed', `The ${noun} holds by ${money(r.realAtEnd)}, with ${pct(r.eaten)} of it taken up by costs.`],
  loss: (noun, r) => ['On these figures, the costs are larger', 'bad', `On these figures the costs come to ${money(-r.realAtEnd)} more than the ${noun}.`],
};
function business() {
  const pages = [];
  for (const e of CUT_EXAMPLES) {
    if (e.own) continue;
    const r = analyze(toInputs(e.values));
    const noun = e.mode === 'gain' ? 'gain' : 'saving';
    const [verdict, tone, line] = CUT_VERDICT[r.verdict](noun, r);
    const years = r.months / 12;
    const lines = [
      `On paper it is worth ${money(r.grossSaving)} over ${count(years)} years.`,
      `What it costs comes to ${money(r.totalCost)}: every $1 of ${noun} costs $${r.multiple.toFixed(2)}.`,
    ];
    if (r.turnsNegative) lines.push(`It looks good for the first ${r.looksGoodMonths} months and turns negative in month ${r.turnsNegative}.`);
    pages.push({
      slug: slugOf(e.label), id: e.id, group: e.group || 'Business decisions', calc: `saving.html#${e.id}`, lit: 'saving',
      label: e.label, story: sentence(e.note),
      tone, verdict, headline: line,
      sides: [{ label: `The ${noun}, on paper`, value: money(r.grossSaving), note: `over ${count(years)} years` }, { label: 'What it costs', value: money(r.totalCost), note: 'counted over the same years' }],
      lines,
      working: [
        ['One-time cost', money(r.hidden.oneTime)],
        ['Earnings lost because of it', money(r.hidden.lostEarnings)],
        ['Side costs', money(r.hidden.sideCosts)],
        ['Cost of having to undo it, by its chance', money(r.hidden.undo)],
        ['What it costs in all', money(r.totalCost)],
        [`Cost per $1 of ${noun}`, `${money(r.totalCost)} / ${money(r.grossSaving)} = $${r.multiple.toFixed(2)}`],
        ['Result at the end', money(r.realAtEnd)],
      ],
      asks: [`The expected ${noun} each year`, 'The one-time cost of making the change', 'What the thing being changed was earning', 'How much of it is affected, and how much of that was truly spare', 'Which parts of the business rely on it', 'The chance of having to undo it'],
    });
  }
  return pages;
}

// ── Barriers ───────────────────────────────────────────────────────────────
function barriers() {
  const pages = [];
  for (const g of BX.GROUPS) {
    for (const e of g.items) {
      const hiring = e.mode === 'hiring';
      const r = (hiring ? Barriers.hiring : Barriers.gate)(BX.inputsOf(e));
      const unit = hiring ? 'round' : 'step', n = r.rounds.length, past = r.firstPastBest;
      const w = e.words || { people: 'people', good: 'people you wanted', bad: 'people it was meant to stop' };
      const per = hiring ? '' : ' a month';
      const lines = [];
      let verdict, headline;
      if (!past) { verdict = n === 1 ? 'It pays for itself' : `Every ${unit} pays for itself`; headline = `It costs ${money(r.totalCost)}${per} and gets back ${money(r.totalCaught)}.`; }
      else if (n === 1) { verdict = 'It costs more than it gets back'; headline = `It costs ${money(r.totalCost)}${per} and gets back ${money(r.totalCaught)}: ${money(r.totalCost - r.totalCaught)}${per} worse off.`; }
      else { verdict = r.best === 0 ? `No ${unit} pays for itself` : `The ${unit}s after ${unit} ${r.best} cost more than they get back`; headline = r.best === 0 ? `With no steps at all you would be ${money(r.extraCost - r.extraCaught)}${per} better off.` : `Stopping after ${unit} ${r.best} would leave you ${money(r.extraCost - r.extraCaught)}${per} better off.`; }
      if (hiring) {
        lines.push(`After ${n} rounds there is a ${pct(r.stillFree)} chance the first-choice candidate is still available.`);
        lines.push(`The process takes ${count(r.days)} days, and the seat is empty for all of them.`);
        lines.push(`Candidates put ${count(r.candidateHoursAll)} hours into the process, ${count(r.candidateHoursNotHired)} of them from people who are not hired. That is the candidate experience.`);
      } else {
        const out = r.keptOutGood + r.keptOutBad;
        if (out > 0.05) lines.push(r.badStart === 0 ? `It turns away ${count(out)} of ${count(r.goodStart)} ${w.good} each month.`
          : `Of the ${count(out)} ${w.people} it screens out each month, ${count(r.keptOutGood)} are ${w.good}: ${pct(r.keptOutGoodShare)} of everyone screened out.`);
        if (r.badStart > 0) lines.push(`Still getting through: ${count(r.badThrough)} of the ${count(r.badStart)} ${w.bad}.`);
        if (r.peopleHours > 0) lines.push(`It costs the people going through it ${count(r.peopleHours)} hours a month, ${count(r.peopleHoursForNothing)} of them from people who do not get through.`);
      }
      pages.push({
        slug: slugOf(e.label), id: e.id, group: g.title, calc: `barriers.html#${e.id}`, lit: 'barriers',
        label: e.label, story: sentence(e.note),
        tone: past ? 'bad' : 'good', verdict, headline,
        sides: [{ label: 'It costs', value: money(r.totalCost), note: hiring ? `over ${n} rounds` : 'a month' }, { label: hiring ? 'It takes off the risk' : 'It gets back', value: money(r.totalCaught), note: hiring ? 'of a hire that does not work out' : 'what it stops, and any fee' }],
        lines,
        working: r.rounds.map((s) => [`${unit.charAt(0).toUpperCase() + unit.slice(1)} ${s.round}`, `costs ${money(s.cost)}, gets back ${money(s.caught)}: ${s.net >= 0 ? '+' : ''}${money(s.net)}`]),
        asks: hiring ? ['How many rounds, and how many candidates', 'What an interviewer\'s hour and the empty seat cost', 'The chance your first choice takes another offer each week', 'What a hire that does not work out costs, and how much of that risk a round catches']
          : ['How many steps, and how many people arrive', 'What each wanted person is worth, and the share each step turns away', 'The share it is meant to stop, what each costs, and the share each step stops', 'What a step costs the people going through it', 'Any fee paid by those who get through'],
      });
    }
  }
  return pages;
}

// ── On-site, hybrid or work from home ──────────────────────────────────────
// Three teams, each coming out a different way. The pages state the result as
// a finding about that team's figures, in a neutral colour, and say so.
function whereWork() {
  const AX = require('./arrange-examples'), Arrange = require('./arrange');
  const lower = (name) => (name === 'Hybrid' ? 'hybrid' : name.toLowerCase());
  return AX.ARRANGE_EXAMPLES.map((e) => {
    const { team, list } = AX.inputsOf(e);
    const r = Arrange.compare(team, list), staffBest = r.rankedForStaff[0];
    const parts = (c) => [['office', c.office], ['support', c.support], ['people leaving', c.leavers], ['output', c.output], ['pay', c.payDifference], ['getting up to speed', c.ramp], ['team travel', c.travel]]
      .filter(([, v]) => Math.abs(v) >= 1).map(([k, v]) => `${k} ${money(v)}`).join(', ');
    return {
      slug: slugOf(`On-site, hybrid or home: ${e.label}`), id: e.id, group: 'Where the work happens', calc: `where.html#${e.id}`, lit: 'saving', calcName: 'On-site, hybrid or work from home?',
      label: `On-site, hybrid or home: ${e.label.charAt(0).toLowerCase() + e.label.slice(1)}`, story: sentence(e.note),
      tone: 'mixed', verdict: `On these figures, ${lower(r.best.name)} costs the business least`,
      headline: `${r.best.name} comes to ${money(r.best.total)} a year, ${money(r.ahead)} less than ${lower(r.next.name)}.`,
      sides: r.costs.map((c) => ({ label: c.name, value: money(c.total), note: `a year for the business; ${money(c.staffCostEach)} for each person` })),
      lines: [
        `For each person, ${lower(staffBest.name)} costs least: ${money(staffBest.staffCostEach)} a year and ${count(staffBest.commuteHoursEach)} hours travelling.`,
        r.best.id === staffBest.id ? 'On these figures the business and the people who work there come out the same way.' : 'On these figures the two bottom lines point different ways, which is part of what has to be weighed.',
        'This is one team. The same sums give a different answer for a different team, and the page recommends no arrangement.',
      ],
      working: r.costs.map((c) => [c.name, `${parts(c) || 'nothing that differs'}: ${money(c.total)}`]),
      asks: ['Whether the work can be done away from the site at all', 'How many people, their pay, and what a desk costs', 'For each arrangement: desks needed, support, and days travelling in', 'Your own estimate of any change in output, in people leaving, and in pay', 'Extra weeks for a new person to get up to speed, and the cost of bringing the team together', 'What a day of commuting and a day at home cost each person'],
    };
  });
}

// Every page, with the others in its group listed as related. Slugs must be unique.
function scenarioPages() {
  const pages = [...everyday(), ...business(), ...whereWork(), ...barriers()];
  const seen = new Map();
  for (const p of pages) {
    if (seen.has(p.slug)) throw new Error(`two scenarios would share the address /decide/${p.slug}: ${seen.get(p.slug)} and ${p.calc}`);
    seen.set(p.slug, p.calc);
  }
  for (const p of pages) p.related = pages.filter((q) => q !== p && q.group === p.group && q.lit === p.lit).slice(0, 6).map((q) => ({ slug: q.slug, label: q.label }));
  return pages;
}

module.exports = { scenarioPages, slugOf };
