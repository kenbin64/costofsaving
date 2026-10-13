// Page behaviour for why.html. Every figure shown comes from multiple.js; this
// file only reads the sliders and draws the result.
'use strict';
(function () {
  const M = window.Multiple;
  const $ = (id) => document.getElementById(id);
  const pct = (v, digits = 0) => `${(v * 100).toFixed(digits)}%`;
  const money = (v) => (v < 0 ? '-$' : '$') + Math.abs(Math.round(v)).toLocaleString('en-US');

  // ── The one question ─────────────────────────────────────────────────────
  const answers = { othersNeedIt: true, itSpreads: false, goesBelowZero: false };
  const KIND_SAY = {
    subtraction: 'A subtraction. The loss is its own size, once.',
    chain: 'A multiple. The loss is passed down the line and grows at each step.',
    cascade: 'A cascade. The loss spreads outward and the number touched multiplies.',
    hole: 'The hole. Below zero, the climb back is steeper than the fall.',
  };
  function drawKind() {
    for (const b of document.querySelectorAll('.qs button')) b.setAttribute('aria-pressed', String(answers[b.dataset.q] === (b.dataset.v === '1')));
    const kind = M.classify(answers);
    $('kind-say').textContent = KIND_SAY[kind];
    for (const el of document.querySelectorAll('.kind')) el.dataset.on = String(el.dataset.kind === kind);
  }
  document.querySelector('.qs').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-q]');
    if (!b) return;
    answers[b.dataset.q] = b.dataset.v === '1';
    drawKind();
  });

  // ── Chain ────────────────────────────────────────────────────────────────
  function drawChain() {
    const cut = Number($('chain-cut').value) / 100, links = Number($('chain-links').value);
    $('chain-cut-out').textContent = pct(cut);
    $('chain-links-out').textContent = links === 1 ? '1 step' : `${links} steps`;
    const steps = M.chainSteps(cut, links);
    $('chain').innerHTML = steps.map((v, i) =>
      `<div class="link"><span class="lv">${v.toFixed(2)}</span><span class="lb"><i style="height:${v * 100}%"></i></span><span class="ll">${i === 0 ? 'start' : 'step ' + i}</span></div>`).join('');
    const lost = 1 - M.chainKept(cut, links);
    $('chain-sub').textContent = `-${pct(cut)}`;
    $('chain-mul').textContent = `-${pct(lost)}`;
    $('chain-say').innerHTML = links === 1
      ? `With one step the two agree. This is the only case where the cost line tells the whole story.`
      : cut === 0 ? 'Nothing cut, nothing lost.'
        : `A <span class="num">${pct(cut)}</span> cut, needed at ${links} steps, loses <span class="num">${pct(lost)}</span>. That is <span class="num">${(lost / cut).toFixed(1)} times</span> what the subtraction shows.`;
  }

  // ── Cascade ──────────────────────────────────────────────────────────────
  const MAX_DOTS = 60;
  function drawCascade() {
    const fan = Number($('cas-fan').value), depth = Number($('cas-depth').value);
    $('cas-fan-out').textContent = fan === 1 ? '1 other' : `${fan} others`;
    $('cas-depth-out').textContent = depth === 1 ? '1 layer' : `${depth} layers`;
    const levels = M.cascadeLevels(fan, depth);
    $('levels').innerHTML = levels.map((n, i) => {
      const shown = Math.min(n, MAX_DOTS);
      const dots = '<i></i>'.repeat(shown) + (n > MAX_DOTS ? `<span class="more">and ${(n - MAX_DOTS).toLocaleString('en-US')} more</span>` : '');
      return `<div class="level"><span class="ln">${i === 0 ? 'The thing' : 'Layer ' + i}</span><span class="dots">${dots}</span><span class="lc">${n.toLocaleString('en-US')}</span></div>`;
    }).join('');
    const total = M.cascadeTotal(fan, depth);
    $('cas-say').innerHTML = depth === 0 ? 'It stops where it started: one thing affected.'
      : fan === 1 ? `Each one affects only one more, so this is a chain: <span class="num">${total}</span> things in a line.`
        : `One change reaches <span class="num">${total.toLocaleString('en-US')}</span> things in ${depth} layer${depth === 1 ? '' : 's'}. One more layer would add <span class="num">${(levels[depth] * fan).toLocaleString('en-US')}</span>.`;
  }

  // ── The climb back ───────────────────────────────────────────────────────
  const TABLE_LOSSES = [0.1, 0.25, 0.5, 0.75, 0.9];
  $('climb-table').innerHTML = TABLE_LOSSES.map((L) => `<tr><td>${pct(L)}</td><td>${pct(1 - L)}</td><td>+${pct(M.recoveryNeeded(L))}</td></tr>`).join('');
  let climb = null;
  function drawClimb() {
    const loss = Number($('climb-loss').value) / 100;
    $('climb-loss-out').textContent = pct(loss);
    const need = M.recoveryNeeded(loss);
    $('climb-say').innerHTML = `Lose <span class="num">${pct(loss)}</span> and you need a gain of <span class="num">${pct(need)}</span> on what is left to get back to where you started.`;

    const box = $('climb-box'), svg = $('climb-chart');
    const W = Math.max(280, box.clientWidth), H = Math.round(Math.min(300, Math.max(210, W * 0.42)));
    const pad = { l: 54, r: 16, t: 12, b: 38 };
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    const XMAX = 0.9, YMAX = 9;                       // lose up to 90%, which needs 900%
    const X = (L) => pad.l + (L / XMAX) * iw;
    const Y = (g) => pad.t + (1 - Math.min(g, YMAX) / YMAX) * ih;
    let g = '';
    for (const v of [0, 2, 4, 6, 8]) {
      g += `<line x1="${pad.l}" x2="${pad.l + iw}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(${v === 0 ? '--axis' : '--grid'})" stroke-width="1"/>`;
      g += `<text x="${pad.l - 8}" y="${Y(v) + 4}" text-anchor="end" font-size="12" fill="var(--muted)">+${v * 100}%</text>`;
    }
    for (const L of [0, 0.25, 0.5, 0.75, 0.9]) g += `<text x="${X(L)}" y="${H - 20}" text-anchor="${L === 0 ? 'start' : L === 0.9 ? 'end' : 'middle'}" font-size="12" fill="var(--muted)">${pct(L)}</text>`;
    g += `<text x="${pad.l + iw / 2}" y="${H - 4}" text-anchor="middle" font-size="12" fill="var(--muted)">share lost</text>`;
    // The dashed line is what "lose 50%, gain 50%" would need to be true.
    g += `<line x1="${X(0)}" y1="${Y(0)}" x2="${X(XMAX)}" y2="${Y(XMAX)}" stroke="var(--axis)" stroke-width="1.5" stroke-dasharray="4 4"/>`;
    g += `<text x="${X(XMAX) - 4}" y="${Y(XMAX) - 8}" text-anchor="end" font-size="12" fill="var(--muted)">if the climb equalled the fall</text>`;
    let d = '';
    for (let i = 0; i <= 180; i++) { const L = XMAX * i / 180; d += `${i ? 'L' : 'M'}${X(L).toFixed(1)},${Y(M.recoveryNeeded(L)).toFixed(1)}`; }
    g += `<path d="${d}" fill="none" stroke="var(--o1)" stroke-width="2" stroke-linejoin="round"/>`;
    const shownLoss = Math.min(loss, XMAX);
    g += `<line id="climb-mark" x1="${X(shownLoss)}" x2="${X(shownLoss)}" y1="${pad.t}" y2="${pad.t + ih}" stroke="var(--axis)" stroke-width="1"/>`;
    g += `<circle id="climb-dot" cx="${X(shownLoss)}" cy="${Y(need)}" r="5" fill="var(--o1)" stroke="var(--surface)" stroke-width="2"/>`;
    g += `<rect id="climb-hit" x="${pad.l}" y="${pad.t}" width="${iw}" height="${ih}" fill="transparent"/>`;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W); svg.setAttribute('height', H);
    svg.innerHTML = g;
    climb = { X, Y, pad, iw, W, XMAX };

    const hit = svg.querySelector('#climb-hit'), tip = $('climb-tip');
    const show = (clientX) => {
      const rect = svg.getBoundingClientRect();
      const L = Math.max(0, Math.min(XMAX, ((clientX - rect.left) * (W / rect.width) - pad.l) / iw * XMAX));
      const scale = rect.width / W;
      svg.querySelector('#climb-mark').setAttribute('x1', X(L)); svg.querySelector('#climb-mark').setAttribute('x2', X(L));
      svg.querySelector('#climb-dot').setAttribute('cx', X(L)); svg.querySelector('#climb-dot').setAttribute('cy', Y(M.recoveryNeeded(L)));
      tip.innerHTML = `<span>Lose <b>${pct(L)}</b></span><span>Need <b>+${pct(M.recoveryNeeded(L))}</b></span>`;
      tip.hidden = false;
      const left = X(L) * scale;
      tip.style.left = `${left + 14 + tip.offsetWidth > rect.width ? Math.max(4, left - tip.offsetWidth - 14) : left + 14}px`;
      tip.style.top = `${pad.t + 4}px`;
    };
    hit.addEventListener('pointermove', (e) => show(e.clientX));
    hit.addEventListener('pointerdown', (e) => show(e.clientX));
    hit.addEventListener('pointerleave', () => { tip.hidden = true; drawClimb(); });
  }

  // ── Below zero ───────────────────────────────────────────────────────────
  function drawHole() {
    const debt = Number($('hole-debt').value), rate = Number($('hole-rate').value) / 100, pay = Number($('hole-pay').value);
    $('hole-debt-out').textContent = money(-debt);
    $('hole-rate-out').textContent = pct(rate);
    $('hole-pay-out').textContent = money(pay);
    $('hole-five').textContent = money(M.compound(-debt, rate, 5));
    const years = M.yearsToClimbOut(-debt, rate, pay);
    $('hole-years').textContent = years === Infinity ? 'never' : String(years);
    const growth = debt * rate;
    let say;
    if (years === Infinity) say = `The hole grows by <span class="num">${money(growth)}</span> a year and you put back <span class="num">${money(pay)}</span>. You are not climbing. You are falling more slowly.`;
    else if (rate === 0) say = `With nothing compounding this is a plain subtraction: <span class="num">${money(debt)}</span> at <span class="num">${money(pay)}</span> a year is ${years} years.`;
    else say = `It takes ${years} year${years === 1 ? '' : 's'} and <span class="num">${money(M.paidToClimbOut(-debt, rate, pay))}</span> in payments to repair a <span class="num">${money(debt)}</span> hole, because the first <span class="num">${money(growth)}</span> of the first year's payment only stops it getting deeper.`;
    $('hole-say').innerHTML = say;
  }

  // ── The spiral of squares ────────────────────────────────────────────────
  // Squares are added right, up, left, down around what is already there, so
  // each new one is as long as the side it sits against. That is all it takes
  // to get the Fibonacci sizes 1, 1, 2, 3, 5, 8...
  function drawSpiral() {
    const count = Number($('sp-count').value);
    $('sp-count-out').textContent = `${count}`;
    const sizes = M.fibonacci(count);
    const sq = [{ x: 0, y: 0, s: 1, side: 'down' }];
    let minX = 0, minY = 0, maxX = 1, maxY = 1;
    const order = ['right', 'up', 'left', 'down'];
    for (let i = 1; i < count; i++) {
      const side = order[(i - 1) % 4], s = sizes[i];
      let x, y;
      if (side === 'right') { x = maxX; y = minY; maxX += s; }
      else if (side === 'up') { x = minX; y = maxY; maxY += s; }
      else if (side === 'left') { x = minX - s; y = minY; minX -= s; }
      else { x = minX; y = minY - s; minY -= s; }
      sq.push({ x, y, s, side });
    }
    // Each square carries a quarter turn of the spiral: in at one corner, out at the opposite one.
    const corners = (q) => ({
      right: { from: [q.x, q.y], to: [q.x + q.s, q.y + q.s], c: [q.x, q.y + q.s] },
      up: { from: [q.x + q.s, q.y], to: [q.x, q.y + q.s], c: [q.x, q.y] },
      left: { from: [q.x + q.s, q.y + q.s], to: [q.x, q.y], c: [q.x + q.s, q.y] },
      down: { from: [q.x, q.y + q.s], to: [q.x + q.s, q.y], c: [q.x + q.s, q.y + q.s] },
    }[q.side]);
    const W = maxX - minX, H = maxY - minY, pad = Math.max(W, H) * 0.04;
    const X = (x) => x - minX + pad, Y = (y) => (maxY - y) + pad;      // flip so "up" is up on screen
    let g = '';
    sq.forEach((q, i) => {
      g += `<rect x="${X(q.x)}" y="${Y(q.y + q.s)}" width="${q.s}" height="${q.s}" fill="var(${i % 2 ? '--paper' : '--surface'})" stroke="var(--axis)" stroke-width="${Math.max(W, H) / 400}"/>`;
      if (q.s / Math.max(W, H) > 0.07) g += `<text x="${X(q.x + q.s / 2)}" y="${Y(q.y + q.s / 2)}" text-anchor="middle" dominant-baseline="central" font-size="${Math.max(W, H) * 0.035}" fill="var(--muted)" font-family="var(--mono)">${sizes[i]}</text>`;
    });
    let d = '';
    sq.forEach((q, i) => {
      const k = corners(q);
      const a0 = Math.atan2(k.from[1] - k.c[1], k.from[0] - k.c[0]);
      let a1 = Math.atan2(k.to[1] - k.c[1], k.to[0] - k.c[0]);
      if (a1 - a0 > Math.PI) a1 -= 2 * Math.PI; if (a0 - a1 > Math.PI) a1 += 2 * Math.PI;
      for (let t = 0; t <= 12; t++) {
        const a = a0 + (a1 - a0) * t / 12;
        d += `${i === 0 && t === 0 ? 'M' : 'L'}${X(k.c[0] + q.s * Math.cos(a)).toFixed(3)},${Y(k.c[1] + q.s * Math.sin(a)).toFixed(3)}`;
      }
    });
    g += `<path d="${d}" fill="none" stroke="var(--accent)" stroke-width="${Math.max(W, H) / 150}" stroke-linecap="round" stroke-linejoin="round"/>`;
    const svg = $('spiral');
    svg.setAttribute('viewBox', `0 0 ${W + 2 * pad} ${H + 2 * pad}`);
    svg.innerHTML = g;
  }

  // Bars for a run of steps, with an optional dashed line for the cost of a step.
  function stepBars(el, values, { costLine = null, pastFrom = Infinity } = {}) {
    const top = Math.max(...values, costLine || 0, 1);
    el.innerHTML = values.map((v, i) => `<span class="sb" data-past="${i >= pastFrom}"><i style="height:${Math.max(1.5, v / top * 100)}%"></i></span>`).join('')
      + (costLine !== null ? `<span class="costline" style="bottom:${costLine / top * 100}%"><span>cost of a step</span></span>` : '');
  }

  function drawRabbit() {
    const first = Number($('rh-first').value), ratio = Number($('rh-ratio').value) / 100, cost = Number($('rh-cost').value), steps = Number($('rh-steps').value);
    $('rh-first-out').textContent = money(first);
    $('rh-ratio-out').textContent = `${pct(ratio)} of last`;
    $('rh-cost-out').textContent = money(cost);
    $('rh-steps-out').textContent = `${steps}`;
    const r = M.rabbitHole(first, ratio, cost, steps);
    stepBars($('rh-bars'), r.gains, { costLine: cost, pastFrom: r.worthTaking });
    let say;
    if (r.worthTaking === 0) say = `Even the first step gains less than it costs. This one is not worth starting.`;
    else if (steps <= r.worthTaking) say = `Every step so far gains more than it costs. The last one worth taking is step <span class="num">${r.worthTaking}</span>. All the gains together can never pass <span class="num">${money(r.ceiling)}</span>.`;
    else say = `Stop after step <span class="num">${r.worthTaking}</span>. The ${steps - r.worthTaking} step${steps - r.worthTaking === 1 ? '' : 's'} after it cost more than they gained, and going on to step ${steps} threw away <span class="num">${money(r.wastedPastStop)}</span>. All the gains together can never pass <span class="num">${money(r.ceiling)}</span>.`;
    $('rh-say').innerHTML = say;
  }

  function drawRunaway() {
    const first = Number($('rw-first').value), ratio = Number($('rw-ratio').value) / 100, steps = Number($('rw-steps').value);
    $('rw-first-out').textContent = money(first);
    $('rw-ratio-out').textContent = `${ratio.toFixed(2)}x last`;
    $('rw-steps-out').textContent = `${steps}`;
    const r = M.runaway(first, ratio, steps);
    stepBars($('rw-bars'), r.costs);
    const next = r.lastStep * ratio;
    $('rw-say').innerHTML = `After ${steps} step${steps === 1 ? '' : 's'} you have spent <span class="num">${money(r.total)}</span>, and <span class="num">${pct(r.lastShare)}</span> of that was the last step alone. The next step will cost <span class="num">${money(next)}</span>.`;
  }

  // ── Start ────────────────────────────────────────────────────────────────
  for (const id of ['chain-cut', 'chain-links']) $(id).addEventListener('input', drawChain);
  for (const id of ['cas-fan', 'cas-depth']) $(id).addEventListener('input', drawCascade);
  $('climb-loss').addEventListener('input', drawClimb);
  for (const id of ['hole-debt', 'hole-rate', 'hole-pay']) $(id).addEventListener('input', drawHole);
  let resizeTimer = null;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(drawClimb, 120); });
  $('sp-count').addEventListener('input', drawSpiral);
  for (const id of ['rh-first', 'rh-ratio', 'rh-cost', 'rh-steps']) $(id).addEventListener('input', drawRabbit);
  for (const id of ['rw-first', 'rw-ratio', 'rw-steps']) $(id).addEventListener('input', drawRunaway);
  drawKind(); drawChain(); drawCascade(); drawClimb(); drawHole(); drawSpiral(); drawRabbit(); drawRunaway();
})();
