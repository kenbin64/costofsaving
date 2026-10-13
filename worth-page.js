// Page behaviour for the "Is it worth it?" page.
//
// Pick a scenario, and the form asks for what that scenario needs, one question
// at a time, starting blank. "Example" fills every slot with one worked case.
// Type over any slot and the answer follows.
// The sums are in worth.js and the wording of the answer in worth-answer.js;
// this file only connects the form to them and draws the result.
'use strict';
(function () {
  const { KINDS, GROUPS } = window.WorthScenarios;
  const { answer } = window.WorthAnswer;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // Which question this page answers: 'spend', 'cut', 'earn' or 'wait'. The picker
  // element says which; with nothing said, it is the spending page.
  const QUESTION = $('scenario').dataset.q || 'spend';
  const SHOWN = GROUPS.filter((g) => (g.q || 'spend') === QUESTION);
  const ALL = SHOWN.flatMap((g) => g.items);
  const REMEMBER = 'worth-scenario-' + QUESTION;
  const TONE_ICON = { good: '✓', mixed: '!', bad: '✕' };
  const UNIT = { money: '$', chance: '', rate: '', number: '' };
  let current = null;       // the scenario picked
  let lastAnswer = null;
  // The question being asked, counted from 0. null means the whole form is showing.
  let step = 0;

  const money = (v) => {
    const a = Math.abs(v), sign = v < 0 ? '-' : '';
    return `${sign}$${a >= 100 || Number.isInteger(a) ? Math.round(a).toLocaleString('en-US') : a.toFixed(2)}`;
  };

  // ── The picker ───────────────────────────────────────────────────────────
  $('scenario').innerHTML = SHOWN.map((g) =>
    `<optgroup label="${esc(g.title)}">${g.items.map((s) => `<option value="${s.id}">${esc(s.label)}</option>`).join('')}</optgroup>`).join('');

  // ── The form: one slot per thing the sum needs ───────────────────────────
  function drawSlots() {
    const kind = KINDS[current.kind], labels = current.labels || {};
    // Scenarios about the person's own item start by asking what it is.
    const naming = current.ask ? `<div class="field slot">
        <label for="s-name">${esc(current.ask)}</label>
        <div class="inwrap"><input type="text" autocomplete="off" id="s-name" placeholder="e.g. ${esc(current.item || '')}"></div>
      </div>` : '';
    $('slots').innerHTML = naming + kind.fields.map((f) => {
      const label = labels[f.id] || f.label;
      // The example's own figure is shown faintly in each empty slot, as a guide to what goes there.
      const guide = current.example[f.id] !== undefined && current.example[f.id] !== '' ? `e.g. ${current.example[f.id]}` : '';
      const moneyCls = f.type === 'money' ? ' money' : '';
      return `<div class="field slot">
        <label for="s-${f.id}">${esc(label)}${f.optional ? ' <span class="opt">(optional)</span>' : ''}</label>
        <div class="inwrap${moneyCls}">${f.type === 'money' ? '<span class="unit pre">$</span>' : ''}<input type="text" inputmode="${f.type === 'number' || f.type === 'money' ? 'decimal' : 'text'}" autocomplete="off" id="s-${f.id}" data-id="${f.id}" placeholder="${esc(guide)}"></div>
        ${f.hint ? `<span class="hint">${esc(f.hint)}</span>` : ''}
      </div>`;
    }).join('');
  }

  function rawValues() {
    const raw = {};
    for (const input of document.querySelectorAll('#slots input[data-id]')) raw[input.dataset.id] = input.value;
    return raw;
  }
  const itemName = () => ($('s-name') ? $('s-name').value : '');

  // ── One question at a time ───────────────────────────────────────────────
  // The form starts blank and asks its questions in turn. Every slot is on the
  // page throughout; all but the current one are hidden, so reading the form
  // and working out the answer are the same whichever way it is filled in.
  const slotEls = () => [...document.querySelectorAll('#slots .slot')];
  function showStep({ focus = false } = {}) {
    const slots = slotEls(), all = step === null;
    slots.forEach((el, i) => { el.hidden = !all && i !== step; });
    document.querySelector('.main').classList.toggle('asking', !all);
    $('wiz').hidden = all;
    $('entry-hint').hidden = !all;
    if (all) return;
    const input = slots[step].querySelector('input');
    const optional = !!slots[step].querySelector('.opt');
    $('wiz-count').textContent = `Question ${step + 1} of ${slots.length}`;
    $('wiz-back').disabled = step === 0;
    $('wiz-next').textContent = step === slots.length - 1 ? 'Done' : optional && input.value.trim() === '' ? 'Skip' : 'Next';
    if (focus) input.focus();
  }
  function goStep(change) {
    const last = slotEls().length - 1;
    step = step + change > last ? null : Math.max(0, step + change);     // past the last question: show the whole form
    showStep({ focus: true });
  }

  function pick(id, { example = false } = {}) {
    current = ALL.find((s) => s.id === id) || ALL[0];
    $('scenario').value = current.id;
    drawSlots();
    $('story').hidden = true;
    step = 0;
    if (example) fillExample(); else { showStep(); render(); }
    try { history.replaceState(null, '', '#' + current.id); } catch (_) { /* a link to this scenario is a nicety */ }
    try { localStorage.setItem(REMEMBER, current.id); } catch (_) { /* remembering the choice is a nicety */ }
  }

  function fillExample() {
    for (const input of document.querySelectorAll('#slots input[data-id]')) input.value = current.example[input.dataset.id] || '';
    if ($('s-name')) $('s-name').value = current.item || '';
    step = null; showStep();          // an example is shown whole, so every figure can be seen at once
    $('story').textContent = `Example: ${current.story} These are illustrative figures. Type over any of them with your own.`;
    $('story').hidden = false;
    render();
  }

  function clearForm() {
    for (const input of document.querySelectorAll('#slots input')) input.value = '';
    $('story').hidden = true;
    step = 0; showStep({ focus: true });
    render();
  }

  // ── Two blocks on one baseline: what you pay, what you get ───────────────
  function drawBlocks(a) {
    const box = $('blocks-box'), svg = $('blocks');
    const W = Math.max(260, box.clientWidth || 420), H = 230;
    const top = 30, base = H - 46, colW = Math.min(150, (W - 60) / 2), gap = Math.min(70, W - 2 * colW - 20);
    const x1 = (W - 2 * colW - gap) / 2, x2 = x1 + colW + gap;
    const scale = Math.max(a.left.amount, a.right.amount, 0.01);
    const col = (x, part, fill) => {
      const h = Math.max(2, (Math.max(0, part.amount) / scale) * (base - top));
      return `<rect x="${x}" y="${base - h}" width="${colW}" height="${h}" rx="4" fill="var(${fill})"/>`
        + `<text x="${x + colW / 2}" y="${base - h - 8}" text-anchor="middle" font-size="17" font-weight="700" fill="var(--ink)" font-family="var(--mono)">${money(part.amount)}</text>`
        + `<text x="${x + colW / 2}" y="${base + 18}" text-anchor="middle" font-size="14" font-weight="700" fill="var(--ink)">${esc(part.label)}</text>`
        + `<text x="${x + colW / 2}" y="${base + 35}" text-anchor="middle" font-size="12" fill="var(--muted)">${esc(part.sub || '')}</text>`;
    };
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W); svg.setAttribute('height', H);
    svg.innerHTML = `<line x1="${x1 - 10}" x2="${x2 + colW + 10}" y1="${base}" y2="${base}" stroke="var(--axis)" stroke-width="1.5"/>`
      + col(x1, a.left, '--o1') + col(x2, a.right, '--o2');
  }

  // ── The answer ───────────────────────────────────────────────────────────
  function render() {
    const raw = rawValues();
    const anyTyped = Object.values(raw).some((v) => String(v).trim() !== '');
    const a = answer(current.kind, raw, current.labels, itemName());
    lastAnswer = a.incomplete ? null : a;
    for (const input of document.querySelectorAll('#slots input')) input.classList.remove('bad');

    if (a.incomplete) {
      $('status').className = 'status wait';
      $('status-text').textContent = anyTyped ? 'A few more numbers' : 'Waiting for your numbers';
      $('status-ico').textContent = '';
      $('verdict-art').hidden = true;
      $('verdict-line').textContent = '';
      $('blocks-box').hidden = true;
      $('lines').innerHTML = '';
      $('tip').hidden = true;
      $('waiting').hidden = false;
      $('waiting').textContent = anyTyped
        ? `Still needed: ${a.missing.join(', ')}.`
        : 'Answer the questions, or tap Example to see a worked case.';
      $('work').innerHTML = '<tbody><tr><td>Nothing to show yet.</td><td></td></tr></tbody>';
      return;
    }
    $('waiting').hidden = true;
    $('status').className = 'status ' + a.tone;
    $('status-ico').textContent = TONE_ICON[a.tone];
    $('status-text').textContent = a.verdict;
    // The piggy bank beside the verdict: whole, cracked or broken.
    $('verdict-art').src = `art/${{ good: 'pig-whole', mixed: 'pig-cracked', bad: 'pig-broken' }[a.tone]}.png`;
    $('verdict-art').hidden = false;
    $('verdict-line').textContent = a.headline;
    $('blocks-box').hidden = false;
    drawBlocks(a);
    // The tipping point gets its own labelled place; the other lines follow it.
    $('tip').hidden = !(a.tip >= 0);
    if (a.tip >= 0) $('tip-text').textContent = a.lines[a.tip];
    $('lines').innerHTML = a.lines.filter((l, i) => i !== a.tip).map((l) => `<li>${esc(l)}</li>`).join('');
    $('work').innerHTML = '<tbody>' + a.working.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('') + '</tbody>';
  }

  // ── Start ────────────────────────────────────────────────────────────────
  $('scenario').addEventListener('change', (e) => pick(e.target.value));
  $('btn-example').addEventListener('click', fillExample);
  $('btn-clear').addEventListener('click', clearForm);
  $('slots').addEventListener('input', () => { $('story').hidden = true; if (step !== null) showStep(); render(); });
  $('slots').addEventListener('keydown', (e) => { if (e.key === 'Enter' && step !== null) { e.preventDefault(); goStep(1); } });
  $('wiz-next').addEventListener('click', () => goStep(1));
  $('wiz-back').addEventListener('click', () => goStep(-1));
  $('wiz-all').addEventListener('click', () => { step = null; showStep(); });
  // A link such as #tv, clicked while already on the page, picks that decision.
  window.addEventListener('hashchange', () => {
    const id = location.hash.slice(1);
    if (ALL.some((s) => s.id === id) && (!current || current.id !== id)) { pick(id); $('scenario').scrollIntoView({ block: 'center' }); }
  });
  let resizeTimer = null;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (lastAnswer) drawBlocks(lastAnswer); }, 120); });

  // Open on the scenario named in the link, else the last one used, else the first, with its example showing.
  let start = (location.hash || '').replace('#', '');
  if (!ALL.some((s) => s.id === start)) { try { start = localStorage.getItem(REMEMBER) || ''; } catch (_) { start = ''; } }
  pick(ALL.some((s) => s.id === start) ? start : ALL[0].id);
})();
