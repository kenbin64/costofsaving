// The feedback page: send a comment, and show the comments the owner has published.
//
// This is the only page on the site that sends anything a visitor types, and
// only when they press Send. Published comments are shown as plain text.
'use strict';
(function () {
  const $ = (id) => document.getElementById(id);
  const started = Date.now();

  // ── Published comments ───────────────────────────────────────────────────
  function showPublished(items) {
    $('published-card').hidden = items.length === 0;
    const list = $('published');
    list.textContent = '';
    for (const item of items) {
      const box = document.createElement('figure'); box.className = 'quote';
      const text = document.createElement('blockquote'); text.textContent = item.text;      // text only: nothing typed by a visitor is treated as code
      const who = document.createElement('figcaption'); who.textContent = item.name || 'A visitor';
      box.append(text, who); list.append(box);
    }
  }
  fetch('/api/testimonials').then((r) => (r.ok ? r.json() : { items: [] })).then((d) => showPublished(d.items || [])).catch(() => showPublished([]));

  // ── The form ─────────────────────────────────────────────────────────────
  const left = () => { const n = 2000 - $('f-comment').value.length; $('f-count').textContent = n < 200 ? `${n} characters left` : ''; };
  $('f-comment').addEventListener('input', left);
  // "Without my name" only matters if it may be shown at all.
  const sync = () => { $('anon-row').hidden = !$('f-publish').checked; };
  $('f-publish').addEventListener('change', sync); sync();

  $('feedback-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const note = $('f-note'), button = $('f-send');
    const comment = $('f-comment').value.trim();
    if (comment.length < 5) { note.className = 'note bad'; note.textContent = 'Please write a little more.'; $('f-comment').focus(); return; }
    button.disabled = true; note.className = 'note'; note.textContent = 'Sending...';
    try {
      const r = await fetch('/api/feedback', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ comment, name: $('f-name').value, email: $('f-email').value, mayPublish: $('f-publish').checked, anonymous: $('f-anon').checked,
          website: $('f-website').value, page: document.referrer ? new URL(document.referrer).pathname : '', seconds: Math.round((Date.now() - started) / 1000) }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) {
        $('feedback-form').hidden = true;
        $('thanks').hidden = false;
        $('thanks-detail').textContent = $('f-publish').checked
          ? 'You allowed it to be shown. It will only appear here if it is chosen, and only a few are.'
          : 'You did not allow it to be shown, so it will stay private.';
      } else { note.className = 'note bad'; note.textContent = d.error || 'That did not go through. Please try again in a moment.'; button.disabled = false; }
    } catch (_) { note.className = 'note bad'; note.textContent = 'That did not go through. Check your connection and try again.'; button.disabled = false; }
  });
})();
