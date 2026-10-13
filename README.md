# Cost of Saving

The source of [costofsaving.com](https://costofsaving.com): free calculators that put a saving beside what it
costs, for purchases, jobs, repairs, business cuts and hiring steps.

- **Every formula is published:** https://costofsaving.com/formulas
- **Nothing typed into a calculator leaves the browser.** The sums run on the page.

## How it is put together

- Each calculator is a plain JavaScript module with no dependencies (`worth.js`, `saving.js`, `gig.js`,
  `arrange.js`, `barriers.js`, `multiple.js`), with a page script beside it.
- `build-site.js` turns the pages and the scenario lists into the whole site, checks every internal link,
  and writes the sitemap.
- `worker.js` is the one piece that runs on a server (Cloudflare Workers): the feedback form and a count of
  visits. Its rules are in `feedback-core.mjs` and `stats-core.mjs`.

## Tests

Every calculator has a test file beside it (`*_test.js`, `*_test.mjs`). The tests include sums worked by
hand, the edges, and tipping points fed back in. Run one with Node:

    node worth_test.js

## Building

    node build-site.js

The built site is written to `site/`, which is not kept in this repository.

## Credit

Concept and direction: Kenneth W. Bingham. Built with Claude under a standing directive to be skeptical, to
insist on proof, and to make no claim that has not been run. The ideas are the author's; the AI implemented
and verified them.

© 2026 Kenneth W. Bingham.
