// The pictures: one drawing beside each of the five questions, and a little
// movement on the verdict. Everything here is decoration. No number is worked
// out in this file, and the pages read the same with it switched off.
//
// The drawings are written as SVG shapes, so they stay sharp at any size and
// need no image files. Movement is turned off for anyone whose device asks for
// reduced motion.
'use strict';
(function () {
  const GOLD = '#f5b82e', GOLD_EDGE = '#c98a0a', SHINE = '#ffe08a', TEAL = '#14b8a6', TEAL_EDGE = '#0f766e', PALE = '#cbd5e1', INK = '#0f172a';
  const coin = (x, y, r, cls = '') => `<g${cls ? ` class="${cls}"` : ''}><circle cx="${x}" cy="${y}" r="${r}" fill="${GOLD}" stroke="${GOLD_EDGE}" stroke-width="3"/><circle cx="${x}" cy="${y}" r="${r - 5}" fill="none" stroke="${SHINE}" stroke-width="2"/></g>`;
  const stack = (x, coins) => Array.from({ length: coins }, (_, i) => `<rect x="${x}" y="${98 - (i + 1) * 11}" width="26" height="10" rx="5" fill="${GOLD}" stroke="${GOLD_EDGE}" stroke-width="2.5"/>`).join('');

  // One drawing for each question, in the order of the tabs.
  const DRAWINGS = [
    // Spending: a price tag, with a coin leaving.
    `<path d="M16 64 L60 20 H96 a8 8 0 0 1 8 8 V64 L60 108 a7 7 0 0 1 -10 0 L16 74 a7 7 0 0 1 0 -10z" fill="${TEAL}" stroke="${TEAL_EDGE}" stroke-width="3"/>
     <circle cx="86" cy="38" r="6.5" fill="${INK}"/>
     <text x="56" y="80" font-size="38" font-weight="800" font-family="system-ui, sans-serif" fill="${INK}" text-anchor="middle" transform="rotate(-45 56 68)">$</text>
     ${coin(24, 24, 13, 'art-bob')}`,
    // Cutting: scissors coming down on a coin.
    `${coin(60, 72, 34)}
     <line x1="60" y1="40" x2="60" y2="104" stroke="${INK}" stroke-width="3" stroke-dasharray="6 5"/>
     <g class="art-snip" fill="none" stroke="${PALE}" stroke-width="5" stroke-linecap="round">
       <circle cx="44" cy="16" r="9"/><circle cx="76" cy="16" r="9"/>
       <line x1="50" y1="23" x2="68" y2="54"/><line x1="70" y1="23" x2="52" y2="54"/>
     </g>`,
    // Earning: stacks of coins climbing, and a line going up.
    `${stack(14, 2)}${stack(47, 4)}${stack(80, 6)}
     <line x1="8" y1="100" x2="112" y2="100" stroke="${PALE}" stroke-width="3" stroke-linecap="round"/>
     <g class="art-bob" fill="none" stroke="${TEAL}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 60 L44 40 L62 46 L98 12"/><path d="M82 12 H98 V28"/></g>`,
    // Putting it off: an hourglass running out.
    `<rect x="28" y="12" width="64" height="9" rx="4.5" fill="${PALE}"/><rect x="28" y="99" width="64" height="9" rx="4.5" fill="${PALE}"/>
     <path d="M36 21 H84 C84 46 66 54 66 60 C66 66 84 74 84 99 H36 C36 74 54 66 54 60 C54 54 36 46 36 21z" fill="rgba(148,163,184,0.16)" stroke="${PALE}" stroke-width="3" stroke-linejoin="round"/>
     <path d="M45 34 H75 C72 44 64 49 60 54 C56 49 48 44 45 34z" fill="${GOLD}"/>
     <path d="M42 97 C46 84 55 79 60 79 C65 79 74 84 78 97z" fill="${GOLD}" stroke="${GOLD_EDGE}" stroke-width="2"/>
     <line class="art-sand" x1="60" y1="54" x2="60" y2="80" stroke="${GOLD}" stroke-width="3" stroke-dasharray="4 4"/>`,
    // Adding steps: three hurdles, each taller than the last, and a coin still to get over them.
    `<line x1="6" y1="104" x2="114" y2="104" stroke="${PALE}" stroke-width="3" stroke-linecap="round"/>
     <g fill="none" stroke="${TEAL}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
       <path d="M40 104 V78 H60 V104"/><path d="M66 104 V60 H86 V104"/><path d="M92 104 V40 H112 V104"/>
     </g>
     ${coin(20, 84, 13, 'art-bob')}`,
  ];

  const style = document.createElement('style');
  style.textContent = `
  .hero-row { display: flex; align-items: center; gap: 18px; }
  .hero-art { width: 96px; height: 96px; flex: none; }
  @media (max-width: 520px) { .hero-row { gap: 12px; } .hero-art { width: 64px; height: 64px; } }
  @keyframes art-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
  @keyframes art-snip { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(5px); } }
  @keyframes art-sand { to { stroke-dashoffset: -16; } }
  @keyframes art-pop { 0% { transform: scale(0.6) rotate(-10deg); } 60% { transform: scale(1.14) rotate(3deg); } 100% { transform: scale(1) rotate(0); } }
  .art-bob { animation: art-bob 2.6s ease-in-out infinite; }
  .art-snip { animation: art-snip 1.8s ease-in-out infinite; }
  .art-sand { animation: art-sand 0.9s linear infinite; }
  .verdict-art.art-pop { animation: art-pop 0.45s ease-out; }
  @media (prefers-reduced-motion: reduce) { .art-bob, .art-snip, .art-sand, .verdict-art.art-pop { animation: none; } }`;
  document.head.appendChild(style);

  // Put the drawing beside the page's heading. Which one is decided by which of
  // the five question tabs is lit. Pages with no question tab lit get none.
  const tabs = [...document.querySelectorAll('.sitenav a.tab')];
  const which = tabs.findIndex((a) => a.getAttribute('aria-current') === 'page');
  const heading = document.querySelector('header h1');
  if (which >= 0 && DRAWINGS[which] && heading) {
    const row = document.createElement('div');
    row.className = 'hero-row';
    heading.parentNode.insertBefore(row, heading);
    row.innerHTML = `<svg class="hero-art" viewBox="0 0 120 120" aria-hidden="true">${DRAWINGS[which]}</svg>`;
    row.appendChild(heading);
  }

  // The front page asks for each drawing by number: <span data-art="0"></span>.
  for (const el of document.querySelectorAll('[data-art]')) {
    const drawing = DRAWINGS[Number(el.dataset.art)];
    if (drawing) el.innerHTML = `<svg viewBox="0 0 120 120" aria-hidden="true">${drawing}</svg>`;
  }

  // The piggy bank beside a verdict gives a small hop whenever the verdict changes.
  const pig = document.getElementById('verdict-art');
  if (pig && typeof MutationObserver !== 'undefined') {
    let shown = '';
    new MutationObserver(() => {
      const now = pig.hidden ? '' : pig.getAttribute('src') || '';
      if (now && now !== shown) { pig.classList.remove('art-pop'); void pig.offsetWidth; pig.classList.add('art-pop'); }
      shown = now;
    }).observe(pig, { attributes: true, attributeFilter: ['src', 'hidden'] });
  }
})();
