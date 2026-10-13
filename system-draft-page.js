// The systems page: a toy system to build and watch, and the pictures that go
// with the rest of the page. Every figure in the chart comes from system-toy.js.
// Nothing here is about money.
'use strict';
(function () {
  const $ = (id) => document.getElementById(id);
  const Toy = window.SystemToy;
  const COLOUR = { steady: '#3987e5', settles: '#199e70', cycles: '#c98500', away: '#d55181', levels: '#9085e9', down: '#e66767', fades: '#e66767', slower: '#d55181', nothing: '#94a3b8' };

  // ── Which of the three is it? ─────────────────────────────────────────────
  // The rule is Toy.sortThing. This part asks its two questions and says what
  // to watch for with each answer.
  const ROLE = {
    input: { colour: '#c98500', name: 'an input', box: 0,
      line: 'A thing or a value. It goes in and is used up or passed through, and next round needs more of it.',
      watch: 'Watch for: expecting more of it to produce more by itself. It only becomes a result if the system can use it.' },
    system: { colour: '#199e70', name: 'part of the system', box: 1,
      line: 'The verb: what is done. It stays, and it does the work. It usually shows up as a cost, because keeping it costs something.',
      watch: 'Watch for: counting it as a cost and cutting it. What is lost is everything that relied on it. Its cost is a separate thing, and that is an input.' },
    output: { colour: '#3987e5', name: 'an output', box: 2,
      line: 'The product, the value or the answer. It is what the work was for, and it can go back in as the next input or on to another system.',
      watch: 'Watch for: making it the thing that directs the work. A result that is steered by is no longer a measure of anything.' },
  };
  // [label, is it what you wanted, does it remain, a note]
  const THINGS = [
    ['Payroll', false, false, 'Money spent each period. It only adds or subtracts: cut a dollar, save a dollar. The people it pays are a different thing.'],
    ['The team', false, true, 'They produce. Lose one and what goes is what they made, and whatever relied on it. Their pay is the input; they are not.'],
    ['Training', false, false, 'The spending is an input. What it leaves behind, skill, becomes part of the system.'],
    ['A machine', false, true, 'Its fuel and its upkeep are inputs. The machine is what does the work.'],
    ['What you sell', true, false, 'The reason the work was done.'],
    ['Money from sales', true, false, 'A result, and it comes back in to pay for the next round.'],
    ['The share price', true, false, 'A result, though of the market, one step on from the company. Useful to read, and to raise money with.'],
  ];
  const sort = { wanted: false, remains: false, note: THINGS[0][3] };

  function sortPicture(role) {
    const box = (i, x, label) => '<rect x="' + x + '" y="20" width="120" height="56" rx="14" fill="' + (i === role.box ? role.colour : 'rgba(11,17,32,0.7)') + '" stroke="' + (i === role.box ? role.colour : '#475569') + '" stroke-width="2"/>'
      + '<text x="' + (x + 60) + '" y="55" text-anchor="middle" font-size="20" font-weight="800" fill="' + (i === role.box ? '#0b1120' : '#94a3b8') + '">' + label + '</text>';
    const arrow = (x) => '<path d="M' + x + ' 48h44" stroke="#64748b" stroke-width="3" marker-end="url(#sort-arrow)"/>';
    return '<svg viewBox="0 0 520 96" role="img" aria-label="In, system, out, with ' + role.name + ' marked">'
      + '<defs><marker id="sort-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="#64748b"/></marker></defs>'
      + box(0, 8, 'In') + arrow(134) + box(1, 200, 'System') + arrow(326) + box(2, 392, 'Out') + '</svg>';
  }

  function drawSort() {
    const role = ROLE[Toy.sortThing(sort)];
    const thing = $('thing').value.trim() || 'It';
    $('sort').style.setProperty('--c', role.colour);
    for (const b of document.querySelectorAll('#q-wanted button')) b.setAttribute('aria-pressed', String((b.dataset.v === 'yes') === sort.wanted));
    for (const b of document.querySelectorAll('#q-remains button')) b.setAttribute('aria-pressed', String((b.dataset.v === 'yes') === sort.remains));
    $('q-remains-wrap').style.opacity = sort.wanted ? 0.35 : 1;          // the second question only matters after a no
    $('sort-pic').innerHTML = sortPicture(role);
    $('sort-name').textContent = thing + ' is ' + role.name + '.';
    $('sort-line').textContent = role.line;
    $('sort-watch').textContent = role.watch;
    $('sort-note').textContent = sort.note;
  }
  $('things').innerHTML = THINGS.map(([label], i) => '<button type="button" data-i="' + i + '">' + label + '</button>').join('');
  $('things').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-i]');
    if (!b) return;
    const [label, wanted, remains, note] = THINGS[Number(b.dataset.i)];
    $('thing').value = label; sort.wanted = wanted; sort.remains = remains; sort.note = note;
    drawSort();
  });
  $('q-wanted').addEventListener('click', (e) => { const b = e.target.closest('button[data-v]'); if (b) { sort.wanted = b.dataset.v === 'yes'; sort.note = ''; drawSort(); } });
  $('q-remains').addEventListener('click', (e) => { const b = e.target.closest('button[data-v]'); if (b) { sort.remains = b.dataset.v === 'yes'; sort.note = ''; drawSort(); } });
  $('thing').addEventListener('input', () => { sort.note = ''; drawSort(); });
  drawSort();

  // ── Wire it right, wire it wrong ─────────────────────────────────────────
  // The visitor gives an input and an expected result, then chooses what does
  // the work. Right: the steady curve, a bowl with the result resting in it.
  // Wrong: the bowl is moved off the mark (input as engine) or turned over
  // (result as engine), with one side running away and the other falling back
  // to nothing. All figures come from Toy.wire.
  const wiring = { w: 'engine' };
  const WIRE = {
    engine: { colour: '#199e70', name: 'The steady curve' },
    input: { colour: '#c98500', name: 'The curve is in the wrong place' },
    result: { colour: '#e66767', name: 'The curve is turned over' },
  };
  const num = (v) => { const n = Number(String(v).replace(/[$,\s]/g, '')); return Number.isFinite(n) ? n : 0; };
  const show = (v) => (v >= 1e6 ? v.toExponential(1) : v >= 100 ? Math.round(v).toLocaleString('en-US') : v >= 10 ? v.toFixed(1) : v.toFixed(2)).replace(/\.0+$/, '');

  function wireFlow(colour) {
    const lit = { engine: 1, input: 0, result: 2 }[wiring.w];
    const box = (i, xx, label) => '<rect x="' + xx + '" y="14" width="78" height="40" rx="10" fill="' + (i === lit ? colour : 'rgba(11,17,32,0.7)') + '" stroke="' + (i === lit ? colour : '#475569') + '" stroke-width="2"/><text x="' + (xx + 39) + '" y="40" text-anchor="middle" font-size="15" font-weight="800" fill="' + (i === lit ? '#0b1120' : '#cbd5e1') + '">' + label + '</text>';
    const extra = { engine: '', input: 'M45 56V92H150V60', result: 'M285 56V92H180V60' }[wiring.w];
    return '<svg viewBox="0 0 330 110" aria-hidden="true"><defs><marker id="w-a" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="' + colour + '"/></marker>'
      + '<marker id="w-g" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="#64748b"/></marker></defs>'
      + box(0, 6, 'In') + box(1, 126, 'System') + box(2, 246, 'Out')
      + '<path d="M86 34h36" stroke="#64748b" stroke-width="2.5" marker-end="url(#w-g)"/><path d="M206 34h36" stroke="#64748b" stroke-width="2.5" marker-end="url(#w-g)"/>'
      + (extra ? '<path d="' + extra + '" fill="none" stroke="' + colour + '" stroke-width="3.5" marker-end="url(#w-a)"/>' : '')
      + '<text x="165" y="107" text-anchor="middle" font-size="12" fill="#94a3b8">' + { engine: 'a thing, a verb, a product', input: 'a thing put where the verb goes', result: 'the product put where the verb goes' }[wiring.w] + '</text></svg>';
  }

  // The landscape. `mark` is where the expected result sits, across the picture.
  function wireLand(w, colour) {
    const W = 600, H = 300, MARK = 300, FLOOR = 236;
    const curve = (fn) => { let d = ''; for (let px = 30; px <= W - 30; px += 6) d += (d ? 'L' : 'M') + px + ' ' + fn(px).toFixed(1); return d; };
    const label = (px, text, yy, anchor = 'middle') => '<text x="' + px + '" y="' + yy + '" text-anchor="' + anchor + '" font-size="14" fill="#cbd5e1">' + text + '</text>';
    const ball = (px, py) => '<circle cx="' + px + '" cy="' + (py - 12) + '" r="12" fill="#f8fafc" stroke="' + colour + '" stroke-width="4"/>';
    const expected = '<line x1="' + MARK + '" y1="34" x2="' + MARK + '" y2="' + (FLOOR + 22) + '" stroke="#94a3b8" stroke-dasharray="6 6"/>' + label(MARK, 'expected: ' + show(w.expected), 24);
    let body;
    if (wiring.w === 'engine') {
      const dip = (px) => 70 + (FLOOR - 70) * (1 - Math.pow((px - MARK) / 270, 2));     // lowest at the mark, rising either side
      body = '<path d="' + curve(dip) + '" fill="none" stroke="' + colour + '" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>' + ball(MARK, FLOOR);
    } else if (wiring.w === 'input') {
      const ratio = w.over[0] / w.expected;                                   // how far off, as a multiple
      const shift = Math.max(-220, Math.min(220, 110 * Math.log2(Math.max(ratio, 1e-6))));   // doubled = one notch right
      const at = MARK + shift;
      const dip = (px) => Math.max(40, 70 + (FLOOR - 70) * (1 - Math.pow((px - at) / 270, 2)));
      body = '<path d="' + curve(dip) + '" fill="none" stroke="' + colour + '" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>' + ball(at, FLOOR)
        + label(at, 'it rests at ' + show(w.over[0]), FLOOR + 44);
    } else {
      const hump = (px) => 96 + (FLOOR - 96) * Math.pow((px - MARK) / 270, 2);          // highest at the mark, falling either side
      body = '<path d="' + curve(hump) + '" fill="none" stroke="' + colour + '" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>' + ball(MARK, 96)
        + '<path d="M' + (MARK - 34) + ' 84Q' + (MARK - 150) + ' 60 ' + (MARK - 236) + ' 190" fill="none" stroke="' + colour + '" stroke-width="3" stroke-dasharray="7 6" marker-end="url(#w-la)"/>'
        + '<path d="M' + (MARK + 34) + ' 84Q' + (MARK + 150) + ' 60 ' + (MARK + 236) + ' 190" fill="none" stroke="' + colour + '" stroke-width="3" stroke-dasharray="7 6" marker-end="url(#w-la)"/>'
        + label(52, 'back to nothing', FLOOR + 44, 'start') + label(W - 52, 'runs away', FLOOR + 44, 'end');
    }
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="The curve this wiring makes">'
      + '<defs><marker id="w-la" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="' + colour + '"/></marker></defs>'
      + expected + body + '</svg>';
  }

  function drawWire() {
    const w = Toy.wire({ input: num($('w-input').value), expected: num($('w-expected').value), wiring: wiring.w });
    const style = WIRE[wiring.w];
    $('wire').style.setProperty('--c', style.colour);
    for (const b of document.querySelectorAll('#w-wiring button')) b.setAttribute('aria-pressed', String(b.dataset.w === wiring.w));
    $('w-flow').innerHTML = wireFlow(style.colour);
    if (!w) { $('w-land').innerHTML = ''; $('w-name').textContent = 'Type a number for each'; $('w-line').textContent = 'Both need to be more than nothing.'; $('w-nums').textContent = ''; return; }
    $('w-land').innerHTML = wireLand(w, style.colour);
    const list = (a) => a.slice(0, 5).map(show).join(', ');
    if (wiring.w === 'engine') {
      $('w-name').textContent = style.name;
      $('w-line').textContent = 'To turn ' + show(num($('w-input').value)) + ' into ' + show(w.expected) + ' the verb has to be "times ' + show(w.engine) + '". It gives ' + show(w.expected) + ' every round, and a result knocked off the mark is brought back.';
      $('w-nums').textContent = 'Knocked up: ' + list(w.over) + '. Knocked down: ' + list(w.under) + '.';
    } else if (wiring.w === 'input') {
      const agrees = Math.abs(w.over[0] - w.expected) < 1e-9 * w.expected;
      $('w-name').textContent = agrees ? 'Right, but only by accident' : style.name;
      $('w-line').textContent = agrees ? 'With the input doing the work it is ' + show(num($('w-input').value)) + ' times itself, which happens to be what you expected. Change the input and it no longer is.'
        : show(num($('w-input').value)) + ' is a value, not an action. Put where the verb goes, all it can do is work on itself: ' + show(w.over[0]) + ', not ' + show(w.expected) + '. It is steady, and steadily wrong, and the error grows with the size of the input.';
      $('w-nums').textContent = 'Every round: ' + show(w.over[0]) + '.';
    } else {
      $('w-name').textContent = style.name;
      $('w-line').textContent = 'The product is not an action either. Put where the verb goes, each round it works on itself. Nothing rests at ' + show(w.expected) + ' any more: a little over runs away, a little under falls back to nothing.';
      $('w-nums').textContent = 'A little over: ' + list(w.over) + '. A little under: ' + list(w.under) + '.';
    }
  }
  $('w-wiring').addEventListener('click', (e) => { const b = e.target.closest('button[data-w]'); if (b) { wiring.w = b.dataset.w; drawWire(); } });
  for (const id of ['w-input', 'w-expected']) $(id).addEventListener('input', drawWire);
  drawWire();

  // ── The toy ───────────────────────────────────────────────────────────────
  const set = { input: 5, strength: 1, loop: 'none', delay: false, limit: false, upkeep: true };

  function chart(out, aim, colour) {
    const W = 600, H = 240, PAD = 16;
    const top = Math.max(...out, aim, 1) * 1.08;
    const x = (i) => PAD + (W - 2 * PAD) * i / (out.length - 1);
    const y = (v) => H - PAD - (H - 2 * PAD) * v / top;
    const line = out.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join('');
    const area = line + 'L' + x(out.length - 1).toFixed(1) + ' ' + (H - PAD) + 'L' + PAD + ' ' + (H - PAD) + 'Z';
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="What comes out, step by step">'
      + '<line x1="' + PAD + '" y1="' + (H - PAD) + '" x2="' + (W - PAD) + '" y2="' + (H - PAD) + '" stroke="#334155"/>'
      + (set.loop === 'steadying' && aim > 0 ? '<line x1="' + PAD + '" y1="' + y(aim).toFixed(1) + '" x2="' + (W - PAD) + '" y2="' + y(aim).toFixed(1) + '" stroke="#94a3b8" stroke-dasharray="6 6"/>'
        + '<text x="' + (W - PAD) + '" y="' + (y(aim) - 7).toFixed(1) + '" text-anchor="end" font-size="13" fill="#94a3b8">where it belongs</text>' : '')
      + '<path d="' + area + '" fill="' + colour + '" opacity="0.16"/>'
      + '<path d="' + line + '" fill="none" stroke="' + colour + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'
      + '<text x="' + PAD + '" y="' + (H - 2) + '" font-size="12" fill="#94a3b8">start</text>'
      + '<text x="' + (W - PAD) + '" y="' + (H - 2) + '" text-anchor="end" font-size="12" fill="#94a3b8">' + out.length + ' steps later</text></svg>';
  }

  function draw() {
    const out = Toy.simulate(set), shape = Toy.shape(set), colour = COLOUR[shape.id];
    $('toy').style.setProperty('--c', colour);
    $('v-input').textContent = set.input;
    $('v-strength').textContent = 'x ' + set.strength.toFixed(1);
    for (const b of document.querySelectorAll('#loop button')) b.setAttribute('aria-pressed', String(b.dataset.loop === set.loop));
    for (const [id, on, usable] of [['delay', set.delay, set.loop === 'steadying'], ['limit', set.limit, set.loop === 'compounding'], ['upkeep', set.upkeep, true]]) {
      $(id).setAttribute('aria-pressed', String(on));
      $(id).disabled = !usable;
    }
    $('chart').innerHTML = chart(out, set.strength * set.input, colour);
    $('shape-name').textContent = shape.name;
    $('shape-line').textContent = shape.line;
    $('shape-nums').textContent = 'In: ' + set.input + ' each step. Out: ' + out[0].toFixed(1) + ' at the start, ' + out[out.length - 1].toFixed(1) + ' at the end.';
  }

  $('input').addEventListener('input', (e) => { set.input = Number(e.target.value); draw(); });
  $('strength').addEventListener('input', (e) => { set.strength = Number(e.target.value); draw(); });
  $('loop').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-loop]');
    if (!b) return;
    set.loop = b.dataset.loop;
    if (set.loop !== 'steadying') set.delay = false;       // a switch that no longer applies is turned off
    if (set.loop !== 'compounding') set.limit = false;
    draw();
  });
  for (const id of ['delay', 'limit', 'upkeep']) $(id).addEventListener('click', () => { set[id] = !set[id]; draw(); });
  draw();

  // ── The shape of a system: a landscape and a ball ────────────────────────
  const land = { split: -1, tilt: 0, start: 1.4 };
  const LAND_COLOUR = { even: '#199e70', lopsided: '#c98500', split: '#d55181', 'split-lopsided': '#d55181' };

  function landChart(rest) {
    const W = 600, H = 260, PAD = 22, LEFT = -2.2, RIGHT = 2.2;
    const hs = [];
    for (let x = LEFT; x <= RIGHT + 1e-9; x += 0.02) hs.push([x, Toy.height(x, land.split, land.tilt)]);
    const low = Math.min(...hs.map((p) => p[1])), high = Math.min(Math.max(...hs.map((p) => p[1])), low + 3);
    const px = (x) => PAD + (W - 2 * PAD) * (x - LEFT) / (RIGHT - LEFT);
    const py = (h) => H - PAD - 14 - (H - 2 * PAD - 14) * (Math.min(h, high) - low) / (high - low);
    const line = hs.map(([x, h], i) => (i ? 'L' : 'M') + px(x).toFixed(1) + ' ' + py(h).toFixed(1)).join('');
    const colour = LAND_COLOUR[Toy.landscape(land.split, land.tilt).id];
    const ball = (x, fill, ring) => '<circle cx="' + px(x).toFixed(1) + '" cy="' + (py(Toy.height(x, land.split, land.tilt)) - 11).toFixed(1) + '" r="10" fill="' + fill + '" stroke="' + ring + '" stroke-width="3"/>';
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="The landscape, with the ball where it comes to rest">'
      + '<path d="' + line + 'L' + px(RIGHT) + ' ' + H + 'L' + px(LEFT) + ' ' + H + 'Z" fill="' + colour + '" opacity="0.16"/>'
      + '<path d="' + line + '" fill="none" stroke="' + colour + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'
      + ball(land.start, 'none', '#94a3b8') + ball(rest, '#f8fafc', colour)
      + '<text x="' + px(land.start).toFixed(1) + '" y="16" text-anchor="middle" font-size="13" fill="#94a3b8">let go here</text></svg>';
  }

  function drawLand() {
    const rest = Toy.settle(land.start, land.split, land.tilt), name = Toy.landscape(land.split, land.tilt);
    const places = Toy.restingPlaces(land.split, land.tilt);
    $('land').style.setProperty('--c', LAND_COLOUR[name.id]);
    $('v-split').textContent = land.split <= -0.05 ? 'one middle' : land.split < 0.05 ? 'nearly flat in the middle' : 'two sides';
    $('v-tilt').textContent = Math.abs(land.tilt) < 0.02 ? 'level' : land.tilt > 0 ? 'leans left' : 'leans right';
    $('v-start').textContent = Math.abs(land.start) < 0.05 ? 'the middle' : (land.start < 0 ? 'left' : 'right');
    $('land-chart').innerHTML = landChart(rest);
    $('land-name').textContent = name.name;
    $('land-line').textContent = name.line;
    $('land-nums').textContent = (places.length === 1 ? 'One resting place.' : places.length + ' resting places.') + ' The ball came to rest ' + (Math.abs(rest) < 0.05 ? 'in the middle.' : rest < 0 ? 'on the left.' : 'on the right.');
  }
  for (const id of ['split', 'tilt', 'start']) $(id).addEventListener('input', (e) => { land[id] = Number(e.target.value); drawLand(); });
  $('presets').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-split]');
    if (!b) return;
    land.split = Number(b.dataset.split); land.tilt = Number(b.dataset.tilt);
    $('split').value = land.split; $('tilt').value = land.tilt;
    drawLand();
  });
  drawLand();

  // ── What can cross: five small diagrams ──────────────────────────────────
  // Each shows the three boxes and the one arrow that makes the difference.
  function diagram(kind, colour) {
    const box = (x, label, extra = '') => '<rect x="' + x + '" y="22" width="56" height="32" rx="8" fill="rgba(11,17,32,0.7)" stroke="#475569"' + extra + '/>'
      + '<text x="' + (x + 28) + '" y="43" text-anchor="middle" font-size="13" font-weight="700" fill="#e2e8f0">' + label + '</text>';
    const id = 'a-' + kind;
    const arrow = (d, c = '#64748b', w = 2) => '<path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="' + w + '" marker-end="url(#' + (c === colour ? id : 'a-grey') + ')"/>';
    const head = (name, c) => '<marker id="' + name + '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="' + c + '"/></marker>';
    const extra = {
      chain: arrow('M212 54V78H164', colour, 3) + '<rect x="96" y="64" width="68" height="28" rx="8" fill="none" stroke="' + colour + '" stroke-dasharray="5 4"/><text x="130" y="83" text-anchor="middle" font-size="12" fill="#e2e8f0">next one</text>',
      feedback: arrow('M212 54V92H36V58', colour, 3),
      change: arrow('M212 54V92H124V58', colour, 3),
      invest: arrow('M36 54V92H124V58', colour, 3),
      cut: '<path d="M118 16L132 60" stroke="' + colour + '" stroke-width="3" stroke-dasharray="5 4"/><text x="124" y="84" text-anchor="middle" font-size="12" fill="' + colour + '">counted as a cost</text>',
    }[kind];
    return '<svg viewBox="0 0 248 100" aria-hidden="true"><defs>' + head(id, colour) + head('a-grey', '#64748b') + '</defs>'
      + box(8, 'In') + box(96, 'System') + box(184, 'Out') + arrow('M64 38H92') + arrow('M152 38H180') + extra + '</svg>';
  }
  const CROSS = [
    ['chain', '#3987e5', 'Out becomes the next In', 'A chain', 'One system hands its output to the next. Whatever happens early is passed along, so effects multiply down the line.'],
    ['feedback', '#199e70', 'Out comes back to In', 'A loop', 'The system reacts to its own result. Pushing back against a change steadies it. Adding to a change compounds it.'],
    ['change', '#9085e9', 'Out changes the System', 'Learning, or wear', 'The result alters the thing that made it. Practice improves a skill. Use wears a machine. Slower than a loop, and it lasts longer.'],
    ['invest', '#c98500', 'In is put into the System', 'Building it up', 'Some of what comes in is not passed through but used to make the system itself bigger or better.'],
    ['cut', '#e66767', 'Part of the System is taken for an In', 'The mix-up', 'A working part is counted as something merely used up, and removed. The loss is everything that relied on it.'],
  ];
  $('cross').innerHTML = CROSS.map(([kind, colour, title, tag, line]) => '<div class="card" style="--c: ' + colour + '">' + diagram(kind, colour)
    + '<h3>' + title + '<small>' + tag + '</small></h3><p>' + line + '</p></div>').join('');
})();
