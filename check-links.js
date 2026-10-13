#!/usr/bin/env node
// Checks every link inside the built site: each one must lead to a file that exists.
// Run after a build:   node check-links.js
'use strict';
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, 'site');

function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? htmlFiles(path.join(dir, e.name)) : e.name.endsWith('.html') ? [path.join(dir, e.name)] : []));
}
// Where an address on the site leads: the file itself, the same name with .html, or a folder's index.
function exists(target) {
  return [target, target + '.html', path.join(target, 'index.html')].some((p) => fs.existsSync(p) && fs.statSync(p).isFile());
}

const files = htmlFiles(OUT);
let links = 0;
const broken = [];
for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const link = m[1];
    if (/^(https?:|mailto:|data:|#)/.test(link) || link.startsWith('/api/') || link.startsWith('/cdn-cgi/')) continue;
    links++;
    const clean = link.split('#')[0].split('?')[0];
    const target = clean.startsWith('/') ? path.join(OUT, clean) : path.join(path.dirname(file), clean);
    if (clean === '' || clean === './' || clean === '/') continue;       // the front page
    if (!exists(target)) broken.push(`${path.relative(OUT, file)} -> ${link}`);
  }
}
console.log(`${files.length} pages, ${links} links inside the site, ${broken.length} broken`);
for (const b of broken.slice(0, 40)) console.log('  BROKEN ' + b);
process.exit(broken.length ? 1 : 0);
