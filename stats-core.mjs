// The site's own count of visits and pages opened.
//
// Two numbers and the date counting began. Nothing else is kept: no address,
// no device, no page name, nothing that could tell one visitor from another.
// A page asks to be counted from the browser, so programs that fetch pages
// without running them (most crawlers and scanners) are not counted.
//
//   a page opened   every time a page is shown in a browser
//   a visit         the first page of a browser session
//
// The rules are here, apart from the server program, so they can be tested.
export const COUNT_LIMITS = { perDay: 5000 };      // a ceiling on one day's increase, so the total cannot be run up by a script

export const emptyStats = (since) => ({ views: 0, visits: 0, since, day: '', today: 0 });

// One page opened. `visit` says whether it was the first page of a session.
// Returns the new totals, or the same totals when the day's ceiling is reached.
export function bump(stats, { visit }, today) {
  const s = { ...emptyStats(today), ...stats };
  const sameDay = s.day === today;
  const countedToday = sameDay ? s.today : 0;
  if (countedToday >= COUNT_LIMITS.perDay) return { ...s, day: today, today: countedToday };
  return { ...s, views: s.views + 1, visits: s.visits + (visit ? 1 : 0), day: today, today: countedToday + 1 };
}

// What the site shows: the totals and the starting date, and nothing about the day's tally.
export const publicStats = (stats) => ({ views: stats.views || 0, visits: stats.visits || 0, since: stats.since || '' });

// Programs that announce themselves are not counted, even if they run the page.
export const looksAutomated = (userAgent) => /bot|crawl|spider|slurp|headless|preview|monitor|curl|wget|python|scrapy|check/i.test(userAgent || '');
