// THE FIVE WAYS A COST OR A SAVING BEHAVES, each with its own small picture.
//
//   steady    adds or subtracts   its own size, once
//   fader     levels off          each step counts for less than the last
//   domino    multiplies (shown as "The chain")   other things rely on it, and pass on only what they received
//   snowball  compounds           the result feeds the next round
//   cliff     divides             the way back is measured from what is left
//
// Every picture is drawn from the sum itself (multiple.js), not stored. A page
// uses this two ways:
//
//   Kinds.card(id, n)    the full card for the list: picture, name, a light line
//   Kinds.tag(id, n)     a small label to put beside an answer, so every answer
//                        says which kind of gain or loss it is
//
// `n` runs from 0 to 10 and says how far along the picture the marker sits.
'use strict';
(function (root) {
  const M = root.Multiple || (typeof require !== 'undefined' ? require('./multiple.js') : null);
  const sum = (list) => list.reduce((a, b) => a + b, 0);
  const pct = (share) => Math.round(share * 100) + '%';

  // For each kind: `at(n)` is the height drawn at n, and `say(n)` the words for it.
  const KINDS = {
    steady: { icon: '🚶', name: 'The steady one', plain: 'adds or subtracts', colour: '#3987e5',
      line: 'What you see is what you get. Ten steps is ten times one step, up or down.',
      at: (n) => 10 * n,
      say: (n) => n + ' steps of $10 comes to $' + (10 * n) },
    fader: { icon: '🎈', name: 'The fader', plain: 'levels off', colour: '#199e70',
      line: 'A strong start, then it runs out of puff. A gain slows down, and a loss fades.',
      // The same total as adding the steps one by one, written in its closed form so the
      // curve is smooth between whole steps:  first x (1 - ratio^n) / (1 - ratio).
      at: (n) => 10 * (1 - Math.pow(0.8, n)) / (1 - 0.8),
      say: (n) => n + ' steps comes to $' + Math.round(sum(M.ratioSteps(10, 0.8, n))) + ', and it can never pass $50' },
    domino: { icon: '🔗', name: 'The chain', plain: 'multiplies', colour: '#c98500',
      line: 'Every link passes on only what it got. Take a little at one end and less arrives at the other.',
      at: (n) => 1 - M.chainKept(0.1, n),
      say: (n) => 'Cut 10% where ' + n + (n === 1 ? ' thing relies' : ' things rely') + ' on it: ' + pct(1 - M.chainKept(0.1, n)) + ' is lost' },
    snowball: { icon: '⛄', name: 'The snowball', plain: 'compounds', colour: '#d55181',
      line: 'It feeds itself. It works the same way on savings as it does on debt.',
      at: (n) => M.compound(1, 0.1, n) - 1,
      say: (n) => '10% a round for ' + n + (n === 1 ? ' round' : ' rounds') + ': ' + M.compound(1, 0.1, n).toFixed(2) + ' times what you started with' },
    cliff: { icon: '🧗', name: 'The cliff', plain: 'divides', colour: '#e66767',
      line: 'Down is quick and back up is slow. The deeper the drop, the taller the wall.',
      at: (n) => Math.min(M.recoveryNeeded(n / 10), 12),
      say: (n) => (n === 10 ? 'Lose all of it: no gain brings it back' : 'Lose ' + (n * 10) + '%: you need +' + Math.round(M.recoveryNeeded(n / 10) * 100) + '% to get back') },
  };
  const ORDER = ['steady', 'fader', 'domino', 'snowball', 'cliff'];

  // The picture: the kind's own curve from 0 to 10, with a marker at n.
  function picture(id, n, width = 132, height = 72) {
    const kind = KINDS[id], pad = Math.round(height / 9);
    const at = Math.min(10, Math.max(0, n));
    const top = Math.max(kind.at(10), 1e-9);
    const x = (i) => pad + (width - 2 * pad) * i / 10;
    const y = (i) => height - pad - (height - 2 * pad) * Math.min(kind.at(i), top) / top;
    let path = '';
    for (let i = 0; i <= 10; i += 0.25) path += (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(i).toFixed(1);
    const r = Math.max(3, height / 12);
    return '<svg viewBox="0 0 ' + width + ' ' + height + '" width="' + width + '" height="' + height + '" aria-hidden="true">'
      + '<line x1="' + pad + '" y1="' + (height - pad) + '" x2="' + (width - pad) + '" y2="' + (height - pad) + '" stroke="#334155"/>'
      + '<path d="' + path + '" fill="none" stroke="' + kind.colour + '" stroke-width="' + (height / 24).toFixed(1) + '" stroke-linecap="round" stroke-linejoin="round"/>'
      + '<circle cx="' + x(at).toFixed(1) + '" cy="' + y(at).toFixed(1) + '" r="' + r.toFixed(1) + '" fill="#f8fafc" stroke="' + kind.colour + '" stroke-width="' + (height / 24).toFixed(1) + '"/></svg>';
  }

  // The full card, for the list of all five.
  function card(id, n) {
    const k = KINDS[id];
    return '<div class="kind" style="--c: ' + k.colour + '">' + picture(id, n)
      + '<div><h3><span aria-hidden="true">' + k.icon + '</span> ' + k.name + '<small>' + k.plain + '</small></h3>'
      + '<p>' + k.line + '</p><p class="now">' + k.say(n) + '</p></div></div>';
  }

  // The small label that goes beside an answer. `why` is one short sentence,
  // written by the page, saying why this answer is that kind.
  function tag(id, n, why) {
    const k = KINDS[id];
    return '<div class="kind-tag" style="--c: ' + k.colour + '">' + picture(id, n)
      + '<div><b><span aria-hidden="true">' + k.icon + '</span> ' + k.name + '</b> <span class="kind-plain">' + k.plain + '</span>'
      + (why ? '<span class="kind-why">' + why + '</span>' : '') + '</div></div>';
  }

  const api = { KINDS, ORDER, picture, card, tag };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.Kinds = api;
})(typeof window !== 'undefined' ? window : globalThis);
