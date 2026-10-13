// The one piece of costofsaving.com that runs on a server: the feedback form.
// Everything else on the site is plain files, and the calculators never call this.
//
//   POST /api/feedback            a visitor sends a comment. It is emailed to the owner.
//                                 If they allowed it to be shown, it is kept as pending.
//   GET  /api/feedback/review     the owner opens the link from the email and sees the comment.
//   POST /api/feedback/review     the owner presses Publish, Take it off, or Delete.
//   GET  /api/testimonials        the comments the owner has published, for the site to show.
//   POST /api/hit                 a page asks to be counted. Two totals are kept: pages opened, and visits.
//   GET  /api/stats               those two totals, for the site to show.
//
// What is kept, and where (a small key-value store named FEEDBACK):
//   pending:<id>   a comment waiting for a decision. Deleted by itself after 60 days.
//   published      the list of comments the owner chose to publish.
//   count:<date>   how many emails were sent that day, so the form cannot be used to flood the inbox.
//   stats          the running totals of pages opened and visits, and the date counting began.
// Nothing about the visitor's device or network address is recorded.
//
// The rules live in feedback-core.mjs, which has its own tests.
import { EmailMessage } from 'cloudflare:email';
import { LIMITS, validate, publicView, sign, verify, newId, buildEmail, reviewPage } from './feedback-core.mjs';
import { emptyStats, bump, publicStats, looksAutomated } from './stats-core.mjs';

const SITE = 'https://costofsaving.com';
const FROM = 'feedback@costofsaving.com';
const ALLOWED_ORIGINS = [SITE, 'https://www.costofsaving.com'];

const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra } });
const html = (text, status = 200) => new Response(text, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
const today = () => new Date().toISOString().slice(0, 10);
const getPublished = async (env) => JSON.parse((await env.FEEDBACK.get('published')) || '[]');

async function receive(request, env) {
  // Only the site's own pages may post here.
  const origin = request.headers.get('origin') || '';
  if (!ALLOWED_ORIGINS.includes(origin) && !(env.ALLOW_LOCAL && origin.startsWith('http://localhost'))) return json({ ok: false, error: 'This form only works from costofsaving.com.' }, 403);
  let body;
  try { body = await request.json(); } catch (_) { return json({ ok: false, error: 'That did not arrive in one piece. Please try again.' }, 400); }
  const checked = validate(body);
  if (!checked.ok) {
    // An automatic form-filler is told it worked, so it does not try again another way.
    if (checked.error === 'spam') return json({ ok: true });
    return json({ ok: false, error: checked.error }, 400);
  }
  // A ceiling on emails per day protects the inbox if the form is abused.
  const countKey = 'count:' + today();
  const sentToday = Number((await env.FEEDBACK.get(countKey)) || 0);
  if (sentToday >= LIMITS.perDay) return json({ ok: false, error: 'The form has had a lot of use today. Please try again tomorrow.' }, 429);

  const value = checked.value, id = newId();
  const k = await sign(env.FEEDBACK_KEY, id);
  const links = { review: `${SITE}/api/feedback/review?id=${id}&k=${k}` };
  const raw = buildEmail({ from: FROM, to: env.OWNER_EMAIL, value, links, id });
  try { await env.MAIL.send(new EmailMessage(FROM, env.OWNER_EMAIL, raw)); }
  catch (e) { console.error('feedback email failed:', e && e.message); return json({ ok: false, error: 'Your comment could not be sent just now. Please try again later.' }, 502); }
  // Kept only after the email has gone, and only if they allowed it to be shown.
  if (value.mayPublish) await env.FEEDBACK.put('pending:' + id, JSON.stringify(publicView(value, id, today())), { expirationTtl: LIMITS.pendingDays * 86400 });
  await env.FEEDBACK.put(countKey, String(sentToday + 1), { expirationTtl: 3 * 86400 });
  return json({ ok: true });
}

// Find a comment by id, whether it is pending or published.
async function find(env, id) {
  const published = await getPublished(env);
  const live = published.find((p) => p.id === id);
  if (live) return { state: 'published', item: live, published };
  const pending = await env.FEEDBACK.get('pending:' + id);
  return pending ? { state: 'pending', item: JSON.parse(pending), published } : { state: 'gone', item: null, published };
}

async function review(request, env, url) {
  const isPost = request.method === 'POST';
  const form = isPost ? await request.formData() : url.searchParams;
  const id = String(form.get('id') || ''), k = String(form.get('k') || '');
  if (!(await verify(env.FEEDBACK_KEY, id, k))) return html('<!doctype html><meta charset="utf-8"><title>Not found</title><p>That link is not valid.</p>', 404);
  let found = await find(env, id), message = '';
  if (isPost && found.item) {
    const action = String(form.get('action') || '');
    if (action === 'publish' && found.state === 'pending') {
      await env.FEEDBACK.put('published', JSON.stringify([found.item, ...found.published]));
      await env.FEEDBACK.delete('pending:' + id);
      message = 'Published. It is now on the feedback page.';
    } else if (action === 'unpublish' && found.state === 'published') {
      await env.FEEDBACK.put('published', JSON.stringify(found.published.filter((p) => p.id !== id)));
      await env.FEEDBACK.put('pending:' + id, JSON.stringify(found.item), { expirationTtl: LIMITS.pendingDays * 86400 });
      message = 'Taken off the site. It is kept here in case you change your mind.';
    } else if (action === 'delete') {
      await env.FEEDBACK.put('published', JSON.stringify(found.published.filter((p) => p.id !== id)));
      await env.FEEDBACK.delete('pending:' + id);
      message = 'Deleted.';
    }
    found = await find(env, id);
  }
  return html(reviewPage({ id, k, state: found.state, item: found.item, message }));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // One address for every page: the secure one, without "www". Anything else is sent there
    // for good, so search engines and visitors see a single copy of the site.
    if (url.hostname === 'www.costofsaving.com' || (url.hostname === 'costofsaving.com' && url.protocol === 'http:')) {
      return Response.redirect(`${SITE}${url.pathname}${url.search}`, 301);
    }
    if (url.pathname === '/api/feedback' && request.method === 'POST') return receive(request, env);
    if (url.pathname === '/api/feedback/review' && (request.method === 'GET' || request.method === 'POST')) return review(request, env, url);
    if (url.pathname === '/api/testimonials' && request.method === 'GET') {
      // The public list never includes the id, which is half of the approve link.
      const list = (await getPublished(env)).slice(0, LIMITS.shown).map(({ text, name, date }) => ({ text, name, date }));
      return json({ items: list }, 200, { 'cache-control': 'public, max-age=120' });
    }
    // The site's own count of visits and pages opened: two numbers, nothing about any visitor.
    if (url.pathname === '/api/hit' && request.method === 'POST') {
      const origin = request.headers.get('origin') || '';
      if (!ALLOWED_ORIGINS.includes(origin) || looksAutomated(request.headers.get('user-agent'))) return json({ ok: true });
      let body = {};
      try { body = await request.json(); } catch (_) { /* counted as a page opened, not a visit */ }
      const stats = JSON.parse((await env.FEEDBACK.get('stats')) || 'null') || emptyStats(today());
      await env.FEEDBACK.put('stats', JSON.stringify(bump(stats, { visit: body.visit === true }, today())));
      return json({ ok: true });
    }
    if (url.pathname === '/api/stats' && request.method === 'GET') {
      return json(publicStats(JSON.parse((await env.FEEDBACK.get('stats')) || '{}')), 200, { 'cache-control': 'public, max-age=120' });
    }
    if (url.pathname.startsWith('/api/')) return json({ ok: false, error: 'Not found.' }, 404);
    return env.ASSETS.fetch(request);
  },
};
