#!/usr/bin/env node
// Tells search engines that the site's pages have changed, so they re-read them
// sooner. It uses IndexNow, a shared notice that Bing, Yandex and others accept.
// Google does not take part; Google is told through Search Console instead.
//
// Run after a deploy:    node notify-search.js
//
// It sends only the list of page addresses in sitemap.xml and the site's
// IndexNow key. The key is not a secret: it is also a public file on the site,
// which is how the search engine confirms the notice came from the site itself.
'use strict';
const fs = require('fs');
const path = require('path');

const HOST = 'costofsaving.com';
const key = fs.readFileSync(path.join(__dirname, 'indexnow-key.txt'), 'utf8').trim();
const sitemap = fs.readFileSync(path.join(__dirname, 'site', 'sitemap.xml'), 'utf8');
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

(async () => {
  // The key file must already be live, or the notice will be refused.
  const check = await fetch(`https://${HOST}/${key}.txt`, { headers: { 'user-agent': 'costofsaving-deploy-check' } });
  if (!check.ok || (await check.text()).trim() !== key) { console.error('The key file is not live on the site yet. Deploy first, then run this again.'); process.exit(1); }
  const r = await fetch('https://api.indexnow.org/indexnow', { method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key, keyLocation: `https://${HOST}/${key}.txt`, urlList }) });
  console.log(`Told IndexNow about ${urlList.length} pages. It answered ${r.status} ${r.statusText}.`);
  console.log(r.status === 200 || r.status === 202 ? 'Accepted.' : 'Not accepted. ' + (await r.text()).slice(0, 300));
})().catch((e) => { console.error('Could not reach IndexNow:', e.message); process.exit(1); });
