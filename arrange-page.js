// Page behaviour for where.html: on-site, hybrid or work from home.
// The sums are in arrange.js and the worked examples in arrange-examples.js.
// This file reads the form and shows two bottom lines side by side: what each
// arrangement costs the business, and what it costs each person who works there.
//
// The page takes no side. It opens with no example chosen, and the three
// examples it offers each come out in favour of a different arrangement.
'use strict';
(function () {
  const A = window.Arrange, X = window.ArrangeExamples;
  const $ = (id) => document.getElementById(id);
  const { ARRANGEMENTS, TEAM_FIELDS, ARR_FIELDS, PERCENT, ARRANGE_EXAMPLES } = X;
  const COLOURS = { onsite: '--o1', hybrid: '--o2', home: '--o3' };

  // ── Numbers ──────────────────────────────────────────────────────────────
  const parse = (text) => { const v = parseFloat(String(text).replace(/[^0-9.\-]/g, '')); return Number.isFinite(v) ? v : 0; };
  const money = (v) => `${v < 0 ? '-' : ''}$${Math.round(Math.abs(v)).toLocaleString('en-US')}`;
  const pct = (v) => `${(+(Math.abs(v) * 100).toFixed(1)).toLocaleString('en-US')}%`;
  const count = (v) => (+v.toFixed(1)).toLocaleString('en-US');
  const changeWords = (v, less, more) => (Math.abs(v) < 0.00005 ? 'no change' : v < 0 ? `${pct(v)} ${less}` : `${pct(v)} ${more}`);
  const outputWords = (v) => changeWords(v, 'less', 'more');
  const lower = (name) => (name === 'Hybrid' ? 'hybrid' : name.toLowerCase());

  // ── Form ─────────────────────────────────────────────────────────────────
  function readForm() {
    const team = {};
    for (const f of TEAM_FIELDS) team[f] = parse($('t-' + f).value);
    const list = ARRANGEMENTS.map((a) => {
      const x = { id: a.id, name: a.name };
      for (const f of ARR_FIELDS) x[f] = parse($(`a-${a.id}-${f}`).value) / (PERCENT.includes(f) ? 100 : 1);
      return x;
    });
    return { team, list };
  }
  function fill(example) {
    for (const f of TEAM_FIELDS) $('t-' + f).value = example ? example.team[f] : '';
    for (const a of ARRANGEMENTS) for (const f of ARR_FIELDS) $(`a-${a.id}-${f}`).value = example ? example[a.id][f] : '';
    $('example-note').textContent = example ? `Example: ${example.note} The figures are illustrative, and the changes in output, leavers and pay are guesses. Type over any of them with your own.` : '';
    $('example-note').hidden = !example;
    for (const b of document.querySelectorAll('#examples button')) b.setAttribute('aria-pressed', String(Boolean(example) && b.dataset.ex === example.id));
    render();
  }

  // ── Three bars on one baseline ───────────────────────────────────────────
  function drawBars(svgId, boxId, items) {
    const box = $(boxId), svg = $(svgId);
    const W = Math.max(260, box.clientWidth || 420), H = 220;
    const top = 28, base = H - 44, n = items.length;
    const colW = Math.min(120, (W - 40) / n - 14), gap = (W - n * colW) / (n + 1);
    const scale = Math.max(...items.map((i) => i.amount), 1);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W); svg.setAttribute('height', H);
    svg.innerHTML = `<line x1="${gap / 2}" x2="${W - gap / 2}" y1="${base}" y2="${base}" stroke="var(--axis)" stroke-width="1.5"/>`
      + items.map((item, i) => {
        const x = gap + i * (colW + gap), h = Math.max(2, (Math.max(0, item.amount) / scale) * (base - top));
        return `<rect x="${x}" y="${base - h}" width="${colW}" height="${h}" rx="4" fill="var(${item.colour})"/>`
          + `<text x="${x + colW / 2}" y="${base - h - 8}" text-anchor="middle" font-size="15" font-weight="700" fill="var(--ink)" font-family="var(--mono)">${item.value}</text>`
          + `<text x="${x + colW / 2}" y="${base + 18}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${item.name}</text>`
          + `<text x="${x + colW / 2}" y="${base + 34}" text-anchor="middle" font-size="12" fill="var(--muted)">${item.sub || ''}</text>`;
      }).join('');
  }

  // ── The answer ───────────────────────────────────────────────────────────
  function render() {
    const { team, list } = readForm();
    const r = A.compare(team, list);
    const waiting = !(r.team.people > 0);
    $('answers').hidden = waiting; $('deep').hidden = waiting; $('waiting').hidden = !waiting;
    if (waiting) return;

    // The business.
    const tied = r.next && Math.abs(r.ahead) < 1;
    $('biz-status').textContent = tied ? 'On these figures, two arrangements cost the same' : `On these figures, ${lower(r.best.name)} costs the business least`;
    $('biz-line').textContent = tied ? `${r.best.name} and ${lower(r.next.name)} both cost ${money(r.best.total)} a year.`
      : `${money(r.best.total)} a year, which is ${money(r.ahead)} less than ${lower(r.next.name)}.`;
    drawBars('biz-bars', 'biz-box', r.costs.map((c) => ({ name: c.name, amount: c.total, value: money(c.total), colour: COLOURS[c.id], sub: `${count(c.desks)} desks` })));
    const hinges = [];
    if (!tied && r.outputToLoseLead !== null && r.outputToLoseLead > -1) hinges.push(`${r.best.name} stays ahead as long as its output is no worse than <b>${outputWords(r.outputToLoseLead)}</b>. You put <b>${outputWords(r.best.inputs.output)}</b>.`);
    if (!tied && r.leaversToLoseLead !== null && r.leaversToLoseLead > r.best.inputs.leavers && r.leaversToLoseLead <= 1) hinges.push(`It also stays ahead as long as the change in people leaving is under <b>${pct(r.leaversToLoseLead)}</b> a year. You put <b>${changeWords(r.best.inputs.leavers, 'fewer', 'more')}</b>.`);
    $('biz-hinge').innerHTML = hinges.join(' ');
    $('biz-hinge').hidden = hinges.length === 0;

    // Each employee.
    const s = r.rankedForStaff, sBest = s[0], sWorst = s[s.length - 1];
    const noStaffCost = s.every((c) => c.staffCostEach === 0 && c.commuteHoursEach === 0);
    $('staff-card-body').hidden = noStaffCost; $('staff-waiting').hidden = !noStaffCost;
    if (!noStaffCost) {
      $('staff-status').textContent = `On these figures, ${lower(sBest.name)} costs each person least`;
      $('staff-line').textContent = `${money(sBest.staffCostEach)} a year and ${count(sBest.commuteHoursEach)} hours travelling, against ${money(sWorst.staffCostEach)} and ${count(sWorst.commuteHoursEach)} hours ${sWorst.name === 'Hybrid' ? 'for hybrid' : lower(sWorst.name)}.`;
      drawBars('staff-bars', 'staff-box', r.costs.map((c) => ({ name: c.name, amount: c.staffCostEach, value: money(c.staffCostEach), colour: COLOURS[c.id], sub: `${count(c.commuteHoursEach)} hours` })));
      $('staff-lines').innerHTML = r.costs.map((c) => `<li><b>${c.name}:</b> ${money(c.staffCostEach)} a year${c.staffShareOfPay !== null && c.staffCostEach > 0 ? `, ${pct(c.staffShareOfPay)} of pay` : ''}${c.commuteHoursEach > 0 ? `, and ${count(c.commuteHoursEach / 8)} working days spent travelling` : ''}${c.staffTimeValueEach > 0 ? ` (worth ${money(c.staffTimeValueEach)} at the value put on an hour)` : ''}.</li>`).join('');
    }

    // The two bottom lines together.
    let both = '';
    if (!noStaffCost && !tied) {
      if (r.best.id === sBest.id) both = `On these figures <b>${lower(r.best.name)}</b> costs least for the business and for the people who work there.`;
      else {
        const forBusiness = r.costs.find((c) => c.id === sBest.id).total - r.best.total;
        const forEach = r.best.staffCostEach - sBest.staffCostEach;
        both = `On these figures the two bottom lines point different ways. <b>${r.best.name}</b> costs the business <b>${money(forBusiness)}</b> a year less than ${lower(sBest.name)}, and costs each person <b>${money(forEach)}</b> more: <b>${money(forEach * r.team.people)}</b> a year across the team.`;
      }
    }
    $('both').innerHTML = both; $('both').hidden = !both;

    // The working: every line, for all three.
    const cell = (v) => `<td>${v}</td>`;
    const row = (name, pick) => `<tr><td>${name}</td>${r.costs.map((c) => cell(pick(c))).join('')}</tr>`;
    $('work').innerHTML = `<thead><tr><th></th>${r.costs.map((c) => `<th>${c.name}</th>`).join('')}</tr></thead><tbody>`
      + row('Office', (c) => `${count(c.desks)} x ${money(r.team.seatCost)} = ${money(c.office)}`)
      + row('Support', (c) => `${count(r.team.people)} x ${money(c.inputs.support)} = ${money(c.support)}`)
      + row('People leaving', (c) => `${count(c.peopleLeaving)} x ${money(r.team.replaceCost)} = ${money(c.leavers)}`)
      + row('Output', (c) => `${outputWords(c.inputs.output)} of ${money(r.team.people * r.team.workValue)} = ${money(c.output)}`)
      + row('Pay difference', (c) => `${changeWords(c.inputs.payChange, 'less', 'more')} of ${money(r.team.people * r.team.pay)} = ${money(c.payDifference)}`)
      + row('Getting up to speed', (c) => `${count(r.team.hires)} x ${count(c.inputs.rampWeeks)} weeks x ${money(r.team.workValue / 52)} = ${money(c.ramp)}`)
      + row('Team travel', (c) => `${count(r.team.people)} x ${money(c.inputs.travel)} = ${money(c.travel)}`)
      + row('Business total', (c) => `<b>${money(c.total)}</b>`)
      + row('Each person: commuting', (c) => `${count(c.inputs.days)} days x ${A.WEEKS_WORKED} weeks x ${money(r.team.commuteCost)} = ${money(c.commuteCostEach)}`)
      + row('Each person: at home', (c) => `${count(Math.max(0, 5 - c.inputs.days))} days x ${A.WEEKS_WORKED} weeks x ${money(r.team.homeCost)} = ${money(c.homeCostEach)}`)
      + row('Each person total', (c) => `<b>${money(c.staffCostEach)}</b>`)
      + row('Each person: hours travelling', (c) => count(c.commuteHoursEach))
      + '</tbody>';
  }

  // ── Before the sums: can the work be done remotely? ──────────────────────
  // Four questions that come before any figure. The answers change nothing in
  // the sums. Each one gives a note on what to check when entering figures, and
  // the notes are written to cut both ways: they point at what applies to the
  // team, not at an arrangement.
  const NOTES = {
    'q-can': {
      all: 'All of the work can be done away from the site, so all three arrangements are open. The sums below show what each would cost.',
      some: 'Some of the work can be done away from the site. Work out the figures for those roles only, or treat hybrid as the arrangement that fits the split. The roles that cannot move are not part of the comparison.',
      none: 'None of the work can be done away from the site, so there is nothing to compare: on-site is the only arrangement for this team. The page is still useful for other teams whose work can move.',
    },
    'q-face': {
      mostly: 'The work is mostly face to face with customers or clients, so it is tied to where they are. That may be the office, their premises, or neither. Count the place the customer is as part of the job.',
      some: 'Some of the work is face to face with customers or clients. That part is tied to where they are; the rest can be weighed with the sums below.',
      rarely: 'The work is rarely face to face with customers or clients, so where it is done is a matter of the team and the task.',
    },
    'q-who': {
      here: 'People would be working with colleagues in the same office. What is gained by being together applies in full, so it is reasonable to enter it in the on-site figures.',
      mix: 'People would be working with a mix of colleagues, some in the office and some elsewhere. Part of what is gained by being together applies. Enter figures for the part that does.',
      away: 'Most of the people they work with are elsewhere: other sites, remote or offshore. Meetings will still be online from any desk. Check how much of what is gained by being together applies before entering it.',
    },
    'q-how': {
      face: 'A day in the office would be spent mostly face to face. That is the difference the on-site figures are measuring, so enter what you expect it to change.',
      mix: 'A day in the office would be partly face to face and partly on the same online tools. Enter the change you expect from the face to face part.',
      same: 'A day in the office would be spent mostly on the same online tools as a day at home. The work itself would change little, so the figures that differ are mainly desks, travel and how people feel about it.',
    },
  };
  const chosen = {};
  function notes() { $('first-notes').innerHTML = Object.keys(NOTES).filter((q) => chosen[q]).map((q) => `<li>${NOTES[q][chosen[q]]}</li>`).join(''); }
  $('first').addEventListener('click', (e) => {
    const b = e.target.closest('.seg button[data-v]');
    if (!b) return;
    const group = b.parentNode.id, again = chosen[group] === b.dataset.v;     // a second tap clears the answer
    chosen[group] = again ? null : b.dataset.v;
    for (const other of b.parentNode.querySelectorAll('button')) other.setAttribute('aria-pressed', String(!again && other === b));
    notes();
  });

  // ── Start ────────────────────────────────────────────────────────────────
  $('examples').innerHTML = ARRANGE_EXAMPLES.map((e) => `<button type="button" class="ex" data-ex="${e.id}" aria-pressed="false">${e.label}</button>`).join('');
  document.querySelector('.wrap').addEventListener('input', (e) => {
    if (e.target.tagName !== 'INPUT') return;
    $('example-note').hidden = true;
    for (const b of document.querySelectorAll('#examples button')) b.setAttribute('aria-pressed', 'false');
    render();
  });
  $('examples').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-ex]');
    if (b) { history.replaceState(null, '', '#' + b.dataset.ex); fill(ARRANGE_EXAMPLES.find((x) => x.id === b.dataset.ex)); }
  });
  $('btn-clear').addEventListener('click', () => { history.replaceState(null, '', location.pathname); fill(null); $('t-people').focus(); });
  let resizeTimer = null;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(render, 120); });
  // No example is chosen for the reader. The address can name one: #together, #both, #apart.
  const fromHash = () => fill(ARRANGE_EXAMPLES.find((x) => x.id === location.hash.slice(1)) || null);
  window.addEventListener('hashchange', fromHash);
  fromHash();
})();
