#!/usr/bin/env node
// Tests for the feedback form's rules (feedback-core.mjs), and for the server
// (worker.js) run against stand-ins for the email sender and the store.
// Run: node feedback_test.mjs
import { LIMITS, validate, publicView, sign, verify, newId, buildEmail, emailBody, reviewPage } from './feedback-core.mjs';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

let pass = 0, fail = 0;
function ok(cond, name, detail = '') {
  if (cond) { pass++; console.log(`  OK   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' - ' + detail : ''}`); }
}
const section = (label) => console.log('\n-- ' + label + ' --');

section('What counts as a valid comment');
{
  const good = validate({ comment: '  Really useful, thank you.  ', name: ' Dana ', email: 'dana@example.com', mayPublish: true, anonymous: false, page: '/gig' });
  ok(good.ok && good.value.comment === 'Really useful, thank you.' && good.value.name === 'Dana' && good.value.mayPublish === true && good.value.anonymous === false, 'a full submission is accepted and tidied');
  ok(validate({ comment: 'Hi' }).ok === false, 'a comment of two letters is turned back');
  ok(validate({ comment: 'x'.repeat(LIMITS.comment + 1) }).ok === false, 'a comment over the length limit is turned back');
  ok(validate({ comment: 'Looks good to me', email: 'not an address' }).ok === false, 'a broken email address is turned back');
  ok(validate({ comment: 'Looks good to me', email: '' }).ok === true, 'no email at all is fine');
  ok(validate({ comment: 'Looks good to me', website: 'http://spam.example' }).error === 'spam', 'a filled-in hidden field marks an automatic form-filler');
  ok(validate(null).ok === false && validate('text').ok === false, 'something that is not a form is turned back');
  ok(validate({ comment: 'Looks good to me', mayPublish: 'true' }).value.mayPublish === false, 'permission to show it must be a real yes, not text that looks like one');
  ok(validate({ comment: 'Looks good to me', name: '', mayPublish: true }).value.anonymous === true, 'with no name given, it can only ever be shown without one');
}

section('What would be shown publicly');
{
  const v = validate({ comment: 'Saved me from a bad car loan.', name: 'Dana', email: 'dana@example.com', mayPublish: true, anonymous: true }).value;
  const pub = publicView(v, 'abc12345', '2026-10-06');
  ok(pub.name === '' && pub.text === 'Saved me from a bad car loan.', 'asked to be anonymous: the name is left out');
  ok(!JSON.stringify(pub).includes('dana@example.com'), 'the email address is never part of what is shown or kept');
  const named = publicView(validate({ comment: 'Saved me from a bad car loan.', name: 'Dana', mayPublish: true, anonymous: false }).value, 'abc12345', '2026-10-06');
  ok(named.name === 'Dana', 'not anonymous: the name is included');
}

section('The approve link cannot be forged');
{
  const secret = 'test-secret-for-these-checks-only', id = newId();
  const k = await sign(secret, id);
  ok(/^[a-z0-9]{8,40}$/.test(id) && /^[a-f0-9]{64}$/.test(k), 'an id and its signature have the expected form');
  ok(await verify(secret, id, k), 'the right signature is accepted');
  ok(!(await verify(secret, id, k.slice(0, -1) + (k.endsWith('0') ? '1' : '0'))), 'a signature one character off is refused');
  ok(!(await verify(secret, newId(), k)), 'a signature for a different comment is refused');
  ok(!(await verify('another-secret', id, k)), 'a signature made with a different secret is refused');
  ok(!(await verify(secret, id, '')) && !(await verify('', id, k)) && !(await verify(secret, '../etc', k)), 'an empty signature, a missing secret, or a strange id is refused');
  ok(new Set(Array.from({ length: 500 }, newId)).size === 500, '500 new ids are all different');
}

section('The email');
{
  const v = validate({ comment: 'Line one\nLine two with a "quote" and an accent: café', name: 'Dana', email: 'dana@example.com', mayPublish: true, anonymous: false, page: '/gig' }).value;
  const raw = buildEmail({ from: 'feedback@costofsaving.com', to: 'owner@example.com', value: v, links: { review: 'https://costofsaving.com/api/feedback/review?id=x&k=y' }, id: 'abc12345', now: new Date('2026-10-06T12:00:00Z') });
  const [head, body] = raw.split('\r\n\r\n');
  ok(head.includes('To: <owner@example.com>') && head.includes('Reply-To: <dana@example.com>') && head.includes('Subject: Feedback on costofsaving.com (may be shown)'), 'the headers name the owner, the reply address and the subject');
  const decoded = Buffer.from(body.replace(/\r\n/g, ''), 'base64').toString('utf8');
  ok(decoded.includes('Line one\nLine two with a "quote" and an accent: café') && decoded.includes('https://costofsaving.com/api/feedback/review?id=x&k=y'), 'the comment arrives intact, accents and all, with the review link');
  ok(decoded.includes('May be shown on the site: YES') && decoded.includes('with the name "Dana"'), 'it says plainly that it may be shown, and how');
  // Someone tries to smuggle an extra header in through the name or email.
  const attack = validate({ comment: 'Looks good to me', name: 'Eve\r\nBcc: victim@example.com', email: 'eve@example.com' }).value;
  const raw2 = buildEmail({ from: 'feedback@costofsaving.com', to: 'owner@example.com', value: attack, links: {}, id: 'abc12345' });
  ok(!/^Bcc:/mi.test(raw2.split('\r\n\r\n')[0]), 'a line break typed into the name cannot add a header to the email');
  ok(validate({ comment: 'Looks good to me', email: 'eve@example.com\r\nBcc: victim@example.com' }).ok === false, 'nor can one typed into the email address');
  const priv = emailBody(validate({ comment: 'Just for you, not for the site.', mayPublish: false }).value, {});
  ok(priv.includes('May be shown on the site: no') && priv.includes('has not been kept anywhere') && !priv.includes('review?'), 'a private comment says it was not kept, and carries no publish link');
}

section('The review page');
{
  const page = reviewPage({ id: 'abc12345', k: 'f'.repeat(64), state: 'pending', item: { text: '<script>alert(1)</script> nice', name: '', date: '2026-10-06' } });
  ok(!page.includes('<script>alert(1)</script>') && page.includes('&lt;script&gt;'), 'anything typed into a comment is shown as text, never run as code');
  ok(page.includes('value="publish"') && page.includes('method="post"') && page.includes('not public'), 'a pending comment offers Publish, as a button press and not a link');
  ok(reviewPage({ id: 'abc12345', k: 'f'.repeat(64), state: 'published', item: { text: 'nice', name: 'Dana', date: '2026-10-06' } }).includes('value="unpublish"'), 'a published comment offers to take it off again');
  ok(reviewPage({ id: 'abc12345', k: 'f'.repeat(64), state: 'gone', item: null }).includes('no longer here'), 'a comment that has gone says so');
}

section('The server, end to end, against stand-ins');
{
  // worker.js imports the mail class from the host. Give it a stand-in so it can run here.
  const dir = mkdtempSync(join(tmpdir(), 'feedback-'));
  writeFileSync(join(dir, 'feedback-core.mjs'), readFileSync(new URL('./feedback-core.mjs', import.meta.url)));
  writeFileSync(join(dir, 'stats-core.mjs'), readFileSync(new URL('./stats-core.mjs', import.meta.url)));
  writeFileSync(join(dir, 'worker.mjs'), readFileSync(new URL('./worker.js', import.meta.url), 'utf8').replace("import { EmailMessage } from 'cloudflare:email';", 'class EmailMessage { constructor(from, to, raw) { this.from = from; this.to = to; this.raw = raw; } }'));
  const worker = (await import(pathToFileURL(join(dir, 'worker.mjs')).href)).default;
  const store = new Map(), sent = [];
  const env = {
    FEEDBACK_KEY: 'test-secret-for-these-checks-only', OWNER_EMAIL: 'owner@example.com',
    FEEDBACK: { get: async (k) => (store.has(k) ? store.get(k) : null), put: async (k, v) => { store.set(k, v); }, delete: async (k) => { store.delete(k); } },
    MAIL: { send: async (m) => { sent.push(m); } },
    ASSETS: { fetch: async () => new Response('a page of the site') },
  };
  const post = (body, origin = 'https://costofsaving.com') => worker.fetch(new Request('https://costofsaving.com/api/feedback', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) }), env);
  const shown = async () => (await (await worker.fetch(new Request('https://costofsaving.com/api/testimonials'), env)).json()).items;
  const act = (id, k, action) => worker.fetch(new Request('https://costofsaving.com/api/feedback/review', { method: 'POST', body: new URLSearchParams({ id, k, action }) }), env);
  const linkOf = (mail) => Buffer.from(mail.raw.split('\r\n\r\n')[1].replace(/\r\n/g, ''), 'base64').toString('utf8').match(/review\?id=([a-z0-9]+)&k=([a-f0-9]+)/);

  ok((await (await worker.fetch(new Request('https://costofsaving.com/gig'), env)).text()) === 'a page of the site', 'an ordinary page request is passed straight through to the site');
  ok((await post({ comment: 'Looks good to me' }, 'https://evil.example')).status === 403 && sent.length === 0, 'a post from another website is refused and nothing is sent');

  const r1 = await post({ comment: 'Private note for the owner.', mayPublish: false });
  ok(r1.status === 200 && sent.length === 1 && ![...store.keys()].some((k) => k.startsWith('pending:')), 'a private comment is emailed and not kept');

  const r2 = await post({ comment: 'This helped me decide on a car.', name: 'Dana', email: 'dana@example.com', mayPublish: true, anonymous: true });
  const pendingKeys = [...store.keys()].filter((k) => k.startsWith('pending:'));
  ok(r2.status === 200 && sent.length === 2 && pendingKeys.length === 1, 'a comment that may be shown is emailed and kept as pending');
  ok(!store.get(pendingKeys[0]).includes('dana@example.com') && !store.get(pendingKeys[0]).includes('Dana'), 'what is kept has no email address, and no name when they asked for none');
  ok((await shown()).length === 0, 'nothing is public yet');

  const [, id, k] = linkOf(sent[1]);
  const open = await worker.fetch(new Request(`https://costofsaving.com/api/feedback/review?id=${id}&k=${k}`), env);
  ok(open.status === 200 && (await open.text()).includes('This helped me decide on a car.') && (await shown()).length === 0, 'opening the link shows the comment and publishes nothing, so a mail scanner cannot publish it');
  ok((await worker.fetch(new Request(`https://costofsaving.com/api/feedback/review?id=${id}&k=${'0'.repeat(64)}`), env)).status === 404, 'a link with a wrong signature shows nothing');

  await act(id, k, 'publish');
  let list = await shown();
  ok(list.length === 1 && list[0].text === 'This helped me decide on a car.' && list[0].name === '' && !('id' in list[0]), 'pressing Publish makes it public, without a name and without its id');
  await act(id, k, 'unpublish');
  ok((await shown()).length === 0 && store.has('pending:' + id), 'taking it off removes it from the site and keeps it pending');
  await act(id, k, 'publish'); await act(id, k, 'delete');
  ok((await shown()).length === 0 && !store.has('pending:' + id), 'deleting removes it from the site and from the store');
  await act(id, '0'.repeat(64), 'publish');
  ok((await shown()).length === 0, 'a button press with a wrong signature does nothing');

  ok((await (await post({ comment: 'Looks good to me', website: 'http://spam.example' })).json()).ok === true && sent.length === 2, 'an automatic form-filler is told it worked, and nothing is sent');
  ok((await post({ comment: 'Hi' })).status === 400, 'a comment that is too short is turned back with a reason');

  store.set('count:' + new Date().toISOString().slice(0, 10), String(LIMITS.perDay));
  ok((await post({ comment: 'One more after the daily ceiling.' })).status === 429 && sent.length === 2, 'past the daily ceiling, nothing more is sent');
  store.delete('count:' + new Date().toISOString().slice(0, 10));

  env.MAIL = { send: async () => { throw new Error('mail is down'); } };
  const failed = await post({ comment: 'Sent while the mail is down.', mayPublish: true });
  ok(failed.status === 502 && ![...store.keys()].some((k) => k.startsWith('pending:')), 'if the email cannot be sent the visitor is told, and nothing is kept');

  for (let i = 0; i < LIMITS.shown + 5; i++) store.set('published', JSON.stringify([{ id: 'p' + i, text: 'comment ' + i, name: '', date: '2026-10-06' }, ...JSON.parse(store.get('published') || '[]')]));
  ok((await shown()).length === LIMITS.shown, `the site is given at most ${LIMITS.shown} comments, newest first`);
}

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
