import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const cfg = [join(process.env.APPDATA || '', 'xdg.config/.wrangler/config/default.toml'), join(process.env.USERPROFILE || '', '.wrangler/config/default.toml')].find((p) => existsSync(p));
const token = /oauth_token\s*=\s*"([^"]+)"/.exec(readFileSync(cfg, 'utf8'))[1];
const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
const zone = (await (await fetch('https://api.cloudflare.com/client/v4/zones?name=costofsaving.com', { headers: H })).json()).result[0];
const acct = zone.account.id;
const gql = async (query) => (await fetch('https://api.cloudflare.com/client/v4/graphql', { method: 'POST', headers: H, body: JSON.stringify({ query }) })).json();
const f = `datetime_geq: "2026-10-04T00:00:00Z", datetime_leq: "${new Date().toISOString()}", requestHost_like: "%costofsaving.com", bot: 0`;
const q = (dims, limit = 40) => `{ viewer { accounts(filter: {accountTag: "${acct}"}) { rumPageloadEventsAdaptiveGroups(limit: ${limit}, filter: {${f}}, orderBy: [count_DESC]) { count sum { visits } dimensions { ${dims} } } } } }`;
for (const dims of ['date', 'requestPath', 'countryName', 'refererHost', 'deviceType']) {
  const out = await gql(q(dims));
  if (out.errors) { console.log(dims, 'ERRORS', JSON.stringify(out.errors).slice(0, 500)); continue; }
  console.log('== by', dims);
  for (const r of out.data.viewer.accounts[0].rumPageloadEventsAdaptiveGroups.slice(0, 22)) console.log(`  ${String(Object.values(r.dimensions)[0] || '(none)').padEnd(34)} page loads ${String(r.count).padStart(5)}   visits ${r.sum.visits}`);
}
const all = await gql(`{ viewer { accounts(filter: {accountTag: "${acct}"}) { human: rumPageloadEventsAdaptiveGroups(limit: 1, filter: {${f}}) { count sum { visits } } bots: rumPageloadEventsAdaptiveGroups(limit: 1, filter: {${f.replace('bot: 0', 'bot: 1')}}) { count sum { visits } } } } }`);
console.log('TOTAL', JSON.stringify(all.errors || all.data.viewer.accounts[0]));
