// The chart for the cost of barriers: for each round, what it costs beside what
// it catches. Used by the barriers page and by the front page, so both draw the
// same picture from the same answer. No number is worked out here.
'use strict';
(function () {
  // Colours for the parts of a cost, in the order the answer lists them, and for what is caught.
  const PART_COLOURS = ['--o2', '--o4', '--o5'];
  const CAUGHT_COLOUR = '--o3';
  const short = (v) => {                     // $6,700 -> $6.7k, so a label fits above a narrow bar
    const a = Math.abs(v);
    if (a >= 1e6) return `$${+(a / 1e6).toFixed(1)}m`;
    if (a >= 1000) return `$${+(a / 1000).toFixed(1)}k`;
    return `$${Math.round(a)}`;
  };

  // result: an answer from barriers.js. unit: "Round" or "Step".
  function draw(svg, box, result, unit) {
    const rounds = result.rounds, n = rounds.length;
    const W = Math.max(280, box.clientWidth || 520), H = 300;
    const top = 34, base = H - 46, left = 8, right = 8;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W); svg.setAttribute('height', H);
    if (!n) { svg.innerHTML = ''; return; }
    const groupW = (W - left - right) / n;
    const barW = Math.min(46, groupW * 0.36), gap = Math.min(6, groupW * 0.05);
    const scale = Math.max(...rounds.map((r) => Math.max(r.cost, r.caught)), 1);
    const y = (v) => (v / scale) * (base - top);
    const narrow = groupW < 62;               // too tight for a figure over every bar
    let out = '';

    // A band behind every round past the best stopping point.
    if (result.best < n && n > 1) {      // with one step the verdict says it; a band would only crowd the bars
      const x0 = left + result.best * groupW;
      out += `<rect x="${x0}" y="${top - 26}" width="${W - right - x0}" height="${base - top + 26}" fill="var(--bad-wash)" rx="6"/>`
        + `<text x="${x0 + 8}" y="${top - 10}" font-size="12" font-weight="700" fill="var(--bad-text)">${groupW * (n - result.best) > 150 ? 'costs more than it catches' : 'costs more'}</text>`;
    }
    out += `<line x1="${left}" x2="${W - right}" y1="${base}" y2="${base}" stroke="var(--axis)" stroke-width="1.5"/>`;

    rounds.forEach((r, i) => {
      const mid = left + i * groupW + groupW / 2;
      const costX = mid - gap / 2 - barW, caughtX = mid + gap / 2;
      // The cost, stacked from its parts.
      let at = base;
      result.partNames.forEach((p, k) => {
        const h = y(r.parts[p.key]);
        if (h <= 0) return;
        at -= h;
        out += `<rect x="${costX}" y="${at}" width="${barW}" height="${h}" fill="var(${PART_COLOURS[k]})"/>`;
      });
      const caughtH = Math.max(1, y(r.caught));
      out += `<rect x="${caughtX}" y="${base - caughtH}" width="${barW}" height="${caughtH}" rx="2" fill="var(${CAUGHT_COLOUR})"/>`;
      if (!narrow) {
        out += `<text x="${costX + barW / 2}" y="${base - y(r.cost) - 6}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--ink)" font-family="var(--mono)">${short(r.cost)}</text>`
          + `<text x="${caughtX + barW / 2}" y="${base - caughtH - 6}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--good-text)" font-family="var(--mono)">${short(r.caught)}</text>`;
      }
      out += `<text x="${mid}" y="${base + 18}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${narrow ? unit[0] + r.round : unit + ' ' + r.round}</text>`
        + `<text x="${mid}" y="${base + 35}" text-anchor="middle" font-size="12" font-weight="700" fill="var(${r.net >= 0 ? '--good-text' : '--bad-text'})" font-family="var(--mono)">${r.net >= 0 ? '+' : '-'}${short(r.net)}</text>`;
    });
    svg.innerHTML = out;
  }

  // The key to the colours, as HTML.
  function legend(result) {
    const item = (colour, name) => `<span><i style="border-top-width: 10px; border-color: var(${colour})"></i>${name}</span>`;
    return result.partNames.map((p, k) => item(PART_COLOURS[k], `Costs: ${p.name.toLowerCase()}`)).join('') + item(CAUGHT_COLOUR, result.kind === 'gate' ? 'Gets back: what it stops, and any fee' : 'Catches: risk removed');
  }

  window.BarriersChart = { draw, legend, short };
})();
