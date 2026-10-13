// The feedback form: everything that can be checked without a server.
//
// A visitor writes a comment. It is emailed to the site's owner. If the visitor
// ticked "you may show this on the site", it is also kept as PENDING so the
// owner can approve it later; nothing is shown publicly until he does. A comment
// sent without that tick is emailed and not kept at all.
//
// This file holds the rules: what a valid submission is, how the email is put
// together, and how the approve link is signed. worker.js connects them to the
// web. Keeping the rules here means they can be tested with plain Node.
//
//     node feedback_test.mjs

export const LIMITS = { comment: 2000, commentMin: 5, name: 80, email: 120, page: 120, perDay: 60, shown: 12, pendingDays: 60 };

// Take out anything that could start a new header line in an email.
const oneLine = (text) => String(text == null ? '' : text).replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

// Check a submission. Returns { ok: true, value } with tidied fields, or { ok: false, error }.
// `website` is a field people never see. Only an automatic form-filler fills it in.
export function validate(body) {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Nothing was sent.' };
  if (oneLine(body.website) !== '') return { ok: false, error: 'spam' };
  const comment = String(body.comment == null ? '' : body.comment).replace(/\r\n/g, '\n').trim();
  if (comment.length < LIMITS.commentMin) return { ok: false, error: 'Please write a little more.' };
  if (comment.length > LIMITS.comment) return { ok: false, error: `Please keep it under ${LIMITS.comment} characters.` };
  const name = oneLine(body.name);
  if (name.length > LIMITS.name) return { ok: false, error: 'That name is too long.' };
  const email = oneLine(body.email);
  if (email.length > LIMITS.email || (email !== '' && !/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(email))) return { ok: false, error: 'That email address does not look right. Leave it empty if you do not want a reply.' };
  const mayPublish = body.mayPublish === true;
  // "Without my name" only means something if it may be shown at all.
  const anonymous = body.anonymous === true || name === '';
  return { ok: true, value: { comment, name, email, mayPublish, anonymous, page: oneLine(body.page).slice(0, LIMITS.page) } };
}

// What would be shown publicly if this comment were approved.
export function publicView(value, id, date) {
  return { id, text: value.comment, name: value.anonymous ? '' : value.name, date };
}

// ── Signing the approve link ───────────────────────────────────────────────
// The link in the email carries an id and a signature made with a secret only
// the server holds, so nobody can approve or remove a comment by guessing a link.
const hex = (buffer) => [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
async function hmac(secret, text) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text)));
}
export const sign = (secret, id) => hmac(secret, 'feedback:' + id);
export async function verify(secret, id, signature) {
  if (!secret || !/^[a-f0-9]{64}$/.test(String(signature)) || !/^[a-z0-9]{8,40}$/.test(String(id))) return false;
  const expected = await sign(secret, id);
  let diff = 0;                                   // compare every character, so timing gives nothing away
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}
export function newId() {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return [...bytes].map((b) => b.toString(36).padStart(2, '0')).join('').slice(0, 20);
}

// ── The email ──────────────────────────────────────────────────────────────
// Written out by hand as a plain-text message. The body is base64 so any
// characters a visitor types arrive intact and cannot break the headers.
const base64 = (text) => {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/(.{76})/g, '$1\r\n');
};
export function emailBody(value, links) {
  const lines = [
    'New feedback from costofsaving.com',
    '',
    value.comment,
    '',
    '----',
    `Name: ${value.name || '(not given)'}`,
    `Email: ${value.email || '(not given)'}`,
    `Sent from page: ${value.page || '(unknown)'}`,
    `May be shown on the site: ${value.mayPublish ? 'YES' : 'no'}`,
  ];
  if (value.mayPublish) {
    lines.push(`If shown: ${value.anonymous ? 'WITHOUT a name' : `with the name "${value.name}"`}`, '',
      'To publish it, or to decline it, open this page and choose:', links.review, '',
      'Nothing is public until you choose Publish there. If you do nothing, it is deleted after ' + LIMITS.pendingDays + ' days.');
  } else lines.push('', 'They did not allow it to be shown, so it has not been kept anywhere. This email is the only copy.');
  return lines.join('\n');
}
export function buildEmail({ from, to, value, links, id, now = new Date() }) {
  const subject = `Feedback on costofsaving.com${value.mayPublish ? ' (may be shown)' : ''}`;
  const headers = [
    `From: Cost of Saving feedback <${from}>`,
    `To: <${to}>`,
    `Subject: ${subject}`,
    `Date: ${now.toUTCString().replace('GMT', '+0000')}`,
    `Message-ID: <${id}@costofsaving.com>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
  ];
  if (value.email) headers.splice(2, 0, `Reply-To: <${value.email}>`);
  return headers.join('\r\n') + '\r\n\r\n' + base64(emailBody(value, links)) + '\r\n';
}

// ── The page the owner sees when he opens the link in the email ────────────
// Opening the link changes nothing. Mail programs open links by themselves to
// scan them, so publishing only happens when a button on this page is pressed.
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export function reviewPage({ id, k, state, item, message = '' }) {
  const button = (action, label, cls) => `<form method="post" action="/api/feedback/review"><input type="hidden" name="id" value="${esc(id)}"><input type="hidden" name="k" value="${esc(k)}"><input type="hidden" name="action" value="${action}"><button class="${cls}">${label}</button></form>`;
  const body = !item ? '<p>This comment is no longer here. It was declined, removed, or it expired.</p>'
    : `<blockquote>${esc(item.text).replace(/\n/g, '<br>')}</blockquote>
       <p class="who">${item.name ? esc(item.name) : 'Shown without a name'} &middot; ${esc(item.date)}</p>
       <p class="state">Right now this comment is <b>${state === 'published' ? 'PUBLIC on the site' : 'not public'}</b>.</p>
       <div class="row">${state === 'published' ? button('unpublish', 'Take it off the site', 'quiet') : button('publish', 'Publish it', 'go')}${button('delete', 'Delete it for good', 'quiet')}</div>`;
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review a comment</title>
<style>
  body { margin: 0; min-height: 100vh; background: #0f172a; color: #f8fafc; font: 18px/1.55 system-ui, sans-serif; padding: 28px 16px; box-sizing: border-box; }
  main { max-width: 40rem; margin: 0 auto; display: grid; gap: 16px; }
  h1 { margin: 0; font-size: 1.7rem; }
  blockquote { margin: 0; background: #1e293b; border-left: 5px solid #14b8a6; border-radius: 8px; padding: 16px 18px; }
  .who, .state { margin: 0; color: #cbd5e1; } .state b { color: #f8fafc; }
  .note { margin: 0; background: #1e293b; border: 1px solid #14b8a6; border-radius: 8px; padding: 10px 14px; }
  .row { display: flex; flex-wrap: wrap; gap: 10px; } form { margin: 0; }
  button { font: 700 16px system-ui, sans-serif; border-radius: 999px; padding: 11px 22px; cursor: pointer; min-height: 48px; }
  .go { background: #14b8a6; color: #0f172a; border: 2px solid #14b8a6; } .quiet { background: none; color: #f8fafc; border: 2px solid #475569; }
  a { color: #2dd4bf; }
</style>
<main><h1>Review a comment</h1>${message ? `<p class="note">${esc(message)}</p>` : ''}${body}<p><a href="/feedback">See the feedback page</a></p></main></html>`;
}
