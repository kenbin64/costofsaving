#!/usr/bin/env node
// Tests for the "Is it worth it?" page: the sums, the reading of what people
// type, and every example in the picker.
// Run: node worth_test.js
'use strict';
const W = require('./worth');
const { KINDS, GROUPS } = require('./worth-scenarios');
const { answer, read } = require('./worth-answer');

let pass = 0, fail = 0;
function ok(cond, name, detail = '') {
  if (cond) { pass++; console.log(`  OK   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' - ' + detail : ''}`); }
}
const section = (label) => console.log('\n-- ' + label + ' --');
const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));
const all = GROUPS.flatMap((g) => g.items);

section('1. Reading what people type');
{
  ok(W.parseMoney('$1,200') === 1200 && W.parseMoney('25k') === 25000 && W.parseMoney('2.5M') === 2500000 && W.parseMoney('79') === 79, 'money: $1,200, 25k, 2.5M and 79');
  ok(near(W.parseChance('5%'), 0.05) && near(W.parseChance('0.05'), 0.05) && near(W.parseChance('1 in 20'), 0.05) && near(W.parseChance('1/20'), 0.05), 'chance: 5%, 0.05, 1 in 20 and 1/20 all mean the same');
  ok(near(W.parseChance('1 in 292,201,338'), 1 / 292201338), 'chance: 1 in 292,201,338');
  ok(near(W.parseChance('8'), 0.08), 'a bare 8 in a chance slot is read as 8%');
  ok(Number.isNaN(read({ type: 'money' }, 'abc')) && Number.isNaN(read({ type: 'money' }, '')), 'nonsense or an empty required slot is not a number');
  ok(read({ type: 'money', optional: true }, '') === 0, 'an empty optional slot counts as zero');
}

section('2. One outcome: protection and bets');
{
  // Warranty: pay 79 for an 8% chance of a 250 repair.
  const r = W.evaluateSimple({ kind: 'protection', price: 79, chance: 0.08, payout: 250, cushion: 1000 });
  ok(near(r.back, 20) && near(r.perDollar, 20 / 79), '8% of 250 is 20 back, which is 25 cents per dollar paid');
  ok(near(r.breakEvenChance, 79 / 250), 'the price would be fair at a 31.6% chance');
  ok(r.canAbsorb === true && r.verdict === 'Skip it', 'a 250 bill is within a 1,000 cushion: skip it');
  ok(W.evaluateSimple({ kind: 'protection', price: 79, chance: 0.08, payout: 250, cushion: 100 }).verdict === 'You are paying for peace of mind', 'the same deal when 250 would hurt: paying for peace of mind');
  ok(W.evaluateSimple({ kind: 'protection', price: 45, chance: 0.05, payout: 1200, cushion: 500 }).verdict === 'Worth it', 'trip cover at 45 for 5% of 1,200 (60 back): worth it');
  // Lottery: 2 a ticket, jackpot 100M at 1 in 292,201,338, plus 0.32 from smaller prizes.
  const lot = W.evaluateSimple({ kind: 'bet', price: 2, chance: 1 / 292201338, payout: 100e6, otherPayback: 0.32 });
  ok(near(lot.backPerGo, 100e6 / 292201338 + 0.32) && lot.backPerGo > 0.66 && lot.backPerGo < 0.67, 'a 2 dollar ticket returns about 66 cents on average', String(lot.backPerGo));
  ok(lot.verdict === 'Not worth it on average', 'so it is not worth it on average');
  // The lower-tier average, from the published Powerball odds and prizes.
  const tiers = [[1e6, 11688053.52], [50000, 913129.18], [100, 36525.17], [100, 14494.11], [7, 579.76], [7, 701.33], [4, 91.98], [4, 38.32]];
  const lower = tiers.reduce((s, [prize, odds]) => s + prize / odds, 0);
  ok(Math.abs(lower - 0.32) < 0.005, `the smaller prizes add up to ${lower.toFixed(4)} a ticket, the 0.32 used in the example`);
  const slots = W.evaluateSimple({ kind: 'bet', price: 1, times: 600, chance: 0.1, payout: 9.2 });
  ok(near(slots.paid, 600) && near(slots.back, 552) && near(slots.extraCost, 48), '600 one-dollar spins at 92 cents back: 600 in, 552 back, 48 lost');
}

section('3. Cost per use');
{
  const gym = W.evaluateUse({ mode: 'sub', price: 40, uses: 3, altPrice: 15 });
  ok(near(gym.costPerUse, 40 / 3) && near(gym.breakEvenUses, 40 / 15) && gym.worth, 'gym: 40 over 3 visits is 13.33 a visit, under the 15 day pass');
  const drill = W.evaluateUse({ mode: 'buy', price: 150, resale: 30, years: 5, uses: 6, altPrice: 25 });
  ok(drill.netCost === 120 && drill.totalUses === 30 && near(drill.costPerUse, 4) && near(drill.saving, 630), 'drill: 120 net over 30 uses is 4 a use; renting would be 750, so 630 saved');
  ok(W.evaluateUse({ mode: 'sub', price: 15.49, uses: 2, altPrice: 5 }).verdict === 'Not worth it', 'streaming at 7.75 a film against a 5 rental: not worth it');
}

section('4. Loans');
{
  const pay = W.evaluateLoan({ get: 400, payBack: 460, days: 14, altRate: 0.22 });
  ok(pay.fee === 60 && near(pay.apr, 60 / 400 * 365 / 14) && pay.apr > 3.9 && pay.apr < 3.92, 'payday: 60 on 400 for 14 days is 391% a year', String(pay.apr));
  ok(near(pay.altCost, 400 * 0.22 * 14 / 365), 'the same money on a 22% card costs 3.38');
  ok(pay.verdict === 'Very expensive money', 'verdict: very expensive money');
  const pawn = W.evaluateLoan({ get: 150, payBack: 240, days: 90, itemValue: 600, chanceLose: 0.2, altRate: 0.22 });
  ok(near(pawn.expectedCost, 0.8 * 90 + 0.2 * 450), 'pawn: 80% of the 90 fee plus 20% of losing 450 of value is 162', String(pawn.expectedCost));
  ok(W.evaluateLoan({ get: 400, payBack: 400, days: 42, altRate: 0.22 }).fee === 0, 'pay in 4 with no fee has a fee of zero');
}

section('5. Investments');
{
  const solar = W.evaluateInvest({ upfront: 15000, yearsToFinish: 0, lostIncomePerYear: 0, extraPerYear: 1500, chance: 0.95, benefitYears: 25, discount: 0.03 });
  ok(solar.cost === 15000 && near(solar.gainPerYear, 1425) && near(solar.paybackYears, 15000 / 1425), 'solar: 95% of 1,500 is 1,425 a year, a simple payback of 10.5 years');
  // Discounted gains by hand: 1425 x (1 - 1.03^-25) / 0.03.
  ok(near(solar.net + solar.cost, 1425 * (1 - Math.pow(1.03, -25)) / 0.03, 1e-9), 'the discounted total matches the annuity formula');
  const none = W.evaluateInvest({ upfront: 15000, yearsToFinish: 0, lostIncomePerYear: 0, extraPerYear: 1500, chance: 0.95, benefitYears: 25, discount: 0 });
  ok(near(none.net, 1425 * 25 - 15000), 'with no discounting it is simply 25 years of gains less the cost');
  const degree = W.evaluateInvest({ upfront: 100000, yearsToFinish: 4, lostIncomePerYear: 30000, extraPerYear: 25000, chance: 0.6, benefitYears: 40, discount: 0.03 });
  ok(degree.cost === 220000 && near(degree.gainPerYear, 15000), 'degree: 100,000 plus four years of 30,000 given up is 220,000; 60% of 25,000 is 15,000 a year');
}

section('6. Every scenario in the picker');
{
  ok(all.length >= 25 && new Set(all.map((s) => s.id)).size === all.length, `${all.length} scenarios, each with its own id`);
  ok(all.every((s) => KINDS[s.kind]), 'every scenario uses a known kind');
  ok(all.every((s) => Object.keys(s.example).every((k) => KINDS[s.kind].fields.some((f) => f.id === k))), 'every example fills only slots that exist on its form');
  ok(all.every((s) => KINDS[s.kind].fields.filter((f) => !f.optional).every((f) => s.example[f.id] !== undefined && s.example[f.id] !== '')), 'every example fills every required slot');
  let good = true; const tones = new Set();
  for (const s of all) {
    const a = answer(s.kind, s.example, s.labels);
    if (a.incomplete || !a.verdict || !a.headline || !Number.isFinite(a.left.amount) || !Number.isFinite(a.right.amount) || a.lines.some((l) => /NaN|undefined|Infinity/.test(l)) || a.working.some((w) => /NaN|undefined/.test(w[1]))) { good = false; console.log('       problem with', s.id, JSON.stringify(a).slice(0, 200)); }
    else { tones.add(a.tone); console.log(`       ${s.label.padEnd(26)} ${a.verdict.padEnd(34)} ${a.left.label}: ${Math.round(a.left.amount).toLocaleString().padStart(9)}   ${a.right.label}: ${Math.round(a.right.amount).toLocaleString().padStart(9)}`); }
  }
  ok(good, 'every example produces a complete answer with no broken figures');
  ok(tones.size === 3, 'between them the examples show all three kinds of answer: good, mixed and bad');
  ok(answer('protection', { price: '79', chance: '', payout: '250', cushion: '1000' }).incomplete === true, 'a form with an empty required slot is reported as incomplete, not guessed at');
  ok(answer('protection', { price: '79', chance: '8%', payout: '250', cushion: '1000' }, { chance: 'Chance it breaks' }).verdict === 'Skip it', 'the same figures typed by hand give the same answer as the example');
}

section('An everyday saving (worked by hand)');
{
  // Save 1,500. Extras 250. 30 hours at 20 = 600. 20% of 1,200 = 240. Total 1,090.
  const r = W.evaluateSaving({ saved: 1500, extras: 250, hours: 30, hourValue: 20, chanceWrong: 0.2, costWrong: 1200 });
  ok(near(r.timeCost, 600) && near(r.expectedRisk, 240) && near(r.totalCost, 1090), 'time, risk and total cost: 600, 240, 1,090');
  ok(near(r.net, 410) && near(r.perDollar, 1090 / 1500), 'net is 410 and each $1 saved costs about 73 cents');
  ok(r.verdict === 'Worth it, barely' && r.tone === 'mixed', 'costing more than half the saving is reported as barely worth it');
  ok(near(r.breakEvenHourValue, (1500 - 250 - 240) / 30), 'break-even hour value is (1,500 - 250 - 240) / 30 = 33.67');
  ok(near(r.breakEvenChance, (1500 - 250 - 600) / 1200), 'break-even chance is (1,500 - 250 - 600) / 1,200 = 54.2%');
  // Substituting each tipping point back in must give a net of exactly zero.
  ok(near(W.evaluateSaving({ saved: 1500, extras: 250, hours: 30, hourValue: r.breakEvenHourValue, chanceWrong: 0.2, costWrong: 1200 }).net, 0, 1e-9), 'at the break-even hour value the net is zero');
  ok(near(W.evaluateSaving({ saved: 1500, extras: 250, hours: 30, hourValue: 20, chanceWrong: r.breakEvenChance, costWrong: 1200 }).net, 0, 1e-9), 'at the break-even chance the net is zero');
  const bare = W.evaluateSaving({ saved: 100 });
  ok(bare.net === 100 && bare.verdict === 'Worth it' && bare.breakEvenHourValue === null && bare.breakEvenChance === null, 'with nothing set against it the whole saving is kept and no tipping point is invented');
  const lose = W.evaluateSaving({ saved: 25, extras: 9, hours: 1.5, hourValue: 15 });
  ok(near(lose.net, -6.5) && lose.verdict === 'Not worth it', 'a $25 saving that costs $31.50 is a loss of $6.50');
  ok(answer('saving', { saved: '100', extras: '150', hours: '2', hourValue: '10' }).lines[0].startsWith('Even with your time counted as free'), 'when the extras alone exceed the saving, the answer says time is not the issue');
}

section('Is this job worth it? (worked by hand)');
{
  // Kept 800 - 150 = 650. Hours 40 + 8 = 48. Real rate 650 / 48 = 13.54. Stated 800 / 40 = 20.
  // Other option 48 x 12 = 576. Ahead 74 a week.
  const r = W.evaluateJob({ takeHome: 800, costs: 150, hours: 40, extraHours: 8, altHourly: 12 });
  ok(near(r.kept, 650) && r.hoursGiven === 48 && near(r.realHourly, 650 / 48) && near(r.statedHourly, 20), 'kept 650 over 48 hours: 13.54 an hour, against 20 on paper');
  ok(near(r.other, 576) && near(r.ahead, 74) && r.verdict === 'Worth it', 'the other option is worth 576, so the job is 74 a week ahead');
  ok(near(r.breakEvenCosts, 224), 'break-even job costs are 800 - 576 = 224');
  ok(near(W.evaluateJob({ takeHome: 800, costs: r.breakEvenCosts, hours: 40, extraHours: 8, altHourly: 12 }).ahead, 0, 1e-9), 'at the break-even costs the job and the other option are level');
  ok(W.evaluateJob({ takeHome: 300, costs: 320, hours: 20, altHourly: 10 }).verdict === 'This job costs you money', 'costs above the take-home pay are reported as a job that costs money');
  ok(W.evaluateJob({ takeHome: 220, costs: 45, hours: 12, extraHours: 3, altHourly: 14 }).verdict === 'Your other option pays more', '175 over 15 hours is 11.67 an hour, behind 14');
  ok(W.evaluateJob({ takeHome: 1000, costs: 260, hours: 40, extraHours: 12, altHourly: 14.5 }).verdict === 'Close call', '14.23 an hour against 14.50 is a close call');
}

section('How much you like the band (worked by hand)');
{
  // Top worth 190 at 8 out of 10 is 152 each. The night costs 295 for two, 147.50 each.
  const r = W.evaluateOuting({ people: 2, ticket: 95, travel: 35, food: 40, extras: 30, hours: 5, funHours: 2.5, worth: 190, liking: 8 });
  ok(near(r.worthEach, 152) && near(r.worthInAll, 304) && near(r.net, 9), 'liking 8 of 10 makes a top worth of 190 into 152 each, 304 for two, 9 ahead');
  ok(near(r.likingNeeded, 10 * 147.5 / 190) && r.verdict === 'Close call', 'it needs a liking of 7.76; at 8 it is a close call');
  // Put the tipping point back in: at exactly that liking, cost and worth are level.
  ok(near(W.evaluateOuting({ people: 2, ticket: 95, travel: 35, food: 40, extras: 30, hours: 5, worth: 190, liking: r.likingNeeded }).net, 0, 1e-9), 'at exactly the liking needed, cost and worth are level');
  const liked = (n) => W.evaluateOuting({ people: 2, ticket: 95, travel: 35, food: 40, extras: 30, hours: 5, worth: 190, liking: n });
  ok(liked(10).verdict === 'Worth it' && liked(5).verdict === 'Not worth it', 'the same night is worth it at 10 out of 10 and not at 5');
  ok(near(liked(8).worthInAll - liked(4).worthInAll, liked(4).worthInAll), 'worth is a straight line in liking: 8 is worth exactly twice 4');
  ok(liked(15).likingUsed === 10 && liked(0).likingUsed === null && near(liked(0).worthEach, 190), 'a liking above 10 counts as 10, and none given leaves the worth as it stands');
  ok(answer('outing', { people: '2', ticket: '200', hours: '5', worth: '150', liking: '10' }).lines[0].startsWith('Even at 10 out of 10'), 'when even a 10 is not enough, the answer says so');
}

section('Putting it off (worked by hand)');
{
  // Now 400. Six months on: 70% it is still 400, 30% it is 2,200. Expected 940.
  // The 400 kept earns 400 x 4% x 6 / 12 = 8. Putting it off costs 932, which is 532 more.
  const r = W.evaluateWait({ costNow: 400, months: 6, chanceWorse: 0.3, costWorse: 2200, earnRate: 0.04 });
  ok(near(r.costLater, 400) && near(r.expectedLater, 940) && near(r.earned, 8), 'expected later 940, and 8 earned by keeping the money');
  ok(near(r.laterTotal, 932) && near(r.waitingCosts, 532) && near(r.perDollar, 2.33) && r.verdict === 'Waiting costs you', 'putting it off costs 932: 532 more, or 2.33 per $1');
  ok(near(r.breakEvenChance, 8 / 1800), 'waiting only pays under a chance of 8 / 1,800 = 0.44%');
  ok(near(W.evaluateWait({ costNow: 400, months: 6, chanceWorse: r.breakEvenChance, costWorse: 2200, earnRate: 0.04 }).waitingCosts, 0, 1e-9), 'at exactly that chance, waiting costs nothing');
  // Compounding: 2,000 at 1.8% a month for 12 months is 2,000 x 1.018 ^ 12 = 2,477.44.
  const card = W.evaluateWait({ costNow: 2000, months: 12, growth: 0.018, earnRate: 0.04 });
  ok(near(card.costLater, 2000 * Math.pow(1.018, 12)) && Math.abs(card.costLater - 2477.44) < 0.01, 'a balance at 1.8% a month grows to 2,477.44 in a year');
  ok(card.costLater - 2000 > 12 * 0.018 * 2000, 'which is more than twelve months of simple interest, because it multiplies');
  ok(near(card.waitingCosts, card.costLater - 2000 - 80) && card.breakEvenChance === null, 'less the 80 the money earned; and with nothing bigger to become, no break-even chance is invented');
  const pays = W.evaluateWait({ costNow: 1200, months: 12, chanceWorse: 0.05, costWorse: 1300, earnRate: 0.04 });
  ok(near(pays.waitingCosts, -43) && pays.verdict === 'Waiting pays', 'a working appliance kept a year: 43 ahead, so waiting pays');
  ok(W.evaluateWait({ costNow: 1000, months: 3, meanwhile: 20 }).verdict === 'Waiting costs little', '60 of carrying cost on 1,000 is under a tenth: waiting costs little');
  ok(near(W.evaluateWait({ costNow: 500, months: 0 }).waitingCosts, 0), 'not waiting at all costs nothing');
}

section('Borrow or pay cash (worked by hand)');
{
  // 12,000 over 12 months at 12% a year is 1% a month. Payment = 12,000 x 0.01 / (1 - 1.01 ^ -12) = 1,066.19.
  const r = W.evaluateFinance({ price: 12000, apr: 0.12, months: 12 });
  ok(Math.abs(r.payment - 1066.19) < 0.005 && Math.abs(r.interest - 794.23) < 0.01, 'the textbook loan payment: 1,066.19 a month, 794.23 of interest');
  ok(near(r.borrowToday, r.paidInAll) && near(r.extra, r.interest), 'with cash earning nothing, borrowing costs exactly the interest more');
  ok(Math.abs(r.breakEvenRate - 0.12) < 1e-9, 'with no fees, the break-even cash rate is exactly the loan rate');
  // Put the tipping point back in: at that cash rate the two cost the same.
  const fee = W.evaluateFinance({ price: 20000, down: 4000, apr: 0.075, months: 60, fees: 300, saveRate: 0.04 });
  ok(Math.abs(W.evaluateFinance({ price: 20000, down: 4000, apr: 0.075, months: 60, fees: 300, saveRate: fee.breakEvenRate }).extra) < 1e-6, 'with fees, the break-even rate put back in makes the extra cost zero');
  ok(fee.breakEvenRate > 0.075 && fee.extra > 0, 'and fees push the break-even above the loan rate');
  // A 0% deal: 1,800 over 18 months is 100 a month. With cash at 4% it is worth less than 1,800 today.
  const zero = W.evaluateFinance({ price: 1800, months: 18, saveRate: 0.04 });
  ok(near(zero.payment, 100) && zero.interest === 0 && zero.extra < 0 && zero.verdict === 'Borrowing costs less' && zero.breakEvenRate === 0, 'a 0% deal: 100 a month, no interest, and borrowing costs less');
  ok(W.evaluateFinance({ price: 24000, down: 4000, apr: 0.075, months: 60, fees: 300, saveRate: 0.04, cushionLeft: 3000, cushionNeed: 6000 }).verdict === 'Borrowing costs more, but keeps your cushion', 'when cash would leave too little for emergencies, the answer says borrowing keeps the cushion');
  ok(W.evaluateFinance({ price: 24000, down: 4000, apr: 0.075, months: 60, fees: 300, saveRate: 0.04, cushionLeft: 9000, cushionNeed: 6000 }).verdict === 'Pay cash', 'with the cushion covered, the answer is to pay cash');
  // An independent check of the present value: add up each payment discounted month by month.
  let sum = 4000 + 300; const s = 0.04 / 12; for (let m = 1; m <= 60; m++) sum += fee.payment / Math.pow(1 + s, m);
  ok(Math.abs(sum - fee.borrowToday) < 1e-6, 'the present value matches each payment discounted one month at a time');
}

section('Fix it or buy new, and new or used (worked by hand)');
{
  // Repair 280, lasts 3 years, 20% chance it does not hold: 280 / (3 x 0.8) = 116.67, plus 40 upkeep = 156.67 a year.
  // New 750 over 10 years = 75, plus 15 upkeep = 90 a year.
  const r = W.evaluateVersus({ priceA: 280, yearsA: 3, chanceA: 0.2, runA: 40, priceB: 750, yearsB: 10, runB: 15 });
  ok(near(r.perYearA, 280 / 2.4 + 40) && near(r.perYearB, 90) && r.winner === 'B', 'fixing costs 156.67 a year, new costs 90: buy new');
  ok(near(r.mostAcanCost, (90 - 40) * 3 * 0.8) && near(r.mostAcanCost, 120), 'the repair is only worth it under (90 - 40) x 3 x 0.8 = 120');
  ok(near(W.evaluateVersus({ priceA: r.mostAcanCost, yearsA: 3, chanceA: 0.2, runA: 40, priceB: 750, yearsB: 10, runB: 15 }).aheadPerYear, 0, 1e-9), 'at exactly that repair price the two cost the same a year');
  ok(near(r.shareOfB, 280 / 750), 'the repair is 37% of the price of a new one');
  ok(W.evaluateVersus({ priceA: 90, yearsA: 3, priceB: 750, yearsB: 10 }).winner === 'A', 'a 90 repair that lasts three years beats a 750 replacement');
  // Used 14,000 / (8 x 0.95) + 900 = 2,742.11. New (32,000 - 5,000) / 12 + 500 = 2,750.
  const car = W.evaluateVersus({ priceA: 14000, yearsA: 8, chanceA: 0.05, runA: 900, priceB: 32000, yearsB: 12, runB: 500, resaleB: 5000 });
  ok(near(car.perYearA, 14000 / 7.6 + 900) && near(car.perYearB, 2750) && car.winner === null, 'used 2,742 a year against new 2,750 is a close call');
  ok(W.evaluateVersus({ priceA: 500, yearsA: 2, runA: 400, priceB: 900, yearsB: 10, runB: 20 }).mostAcanCost === 0, 'when the upkeep alone costs more than a new one, no repair price is worth it');
  const named = answer('fix', { priceA: '280', yearsA: '3', chanceA: '20%', runA: '40', priceB: '750', yearsB: '10', runB: '15' }, undefined, 'my washing machine');
  ok(named.verdict === 'Buy new' && named.headline.startsWith('Fixing the washing machine costs $157 a year'), 'the answer names the thing and says to buy new');
  ok(answer('used', { priceA: '6,000', yearsA: '6', priceB: '32,000', yearsB: '12' }).verdict === 'Buy used', 'a cheap used one that lasts wins as "Buy used"');
}

section('Every answer that has a tipping point says where it is');
{
  const NONE = ['bet', 'loan', 'pawn', 'invest'];          // these answers have no single figure to flip on
  let good = true;
  for (const s of all) {
    const a = answer(s.kind, s.example, s.labels, s.item);
    const want = !NONE.includes(s.kind);
    // The card scenario has nothing bigger to become, so it has no chance to tip on.
    const has = a.tip >= 0 && typeof a.lines[a.tip] === 'string' && a.lines[a.tip].length > 10;
    if (want && !has && s.id !== 'card') { good = false; console.log('       no tipping point for', s.id); }
    if (!want && a.tip !== -1) { good = false; console.log('       unexpected tipping point for', s.id); }
  }
  ok(good, 'every spending, cutting, earning and waiting example names its tipping point');
  ok(answer('wait', { costNow: '2,000', months: '12', growth: '1.8%' }).tip === -1, 'an answer with nothing to tip on shows none, not a wrong line');
  ok(/under 8\.1%|more than 8\.1%/.test(answer('finance', { price: '24,000', down: '4,000', apr: '7.5%', months: '60', fees: '300', saveRate: '4%' }).lines[answer('finance', { price: '24,000', down: '4,000', apr: '7.5%', months: '60', fees: '300', saveRate: '4%' }).tip]), 'borrow or pay cash tips on the rate the cash would have to earn');
}

section('Four questions, four pages');
{
  const of = (q) => GROUPS.filter((g) => (g.q || 'spend') === q).map((g) => g.title).join(', ');
  ok(of('cut') === 'Saving money' && of('earn') === 'Work' && of('wait') === 'Putting it off', 'cutting, earning and putting off each have their own group');
  ok(GROUPS.filter((g) => (g.q || 'spend') === 'spend').length === 8, 'the other eight groups are spending decisions');
  ok(GROUPS.every((g) => ['spend', 'cut', 'earn', 'wait'].includes(g.q || 'spend')), 'every group answers one of the four questions');
}

section('Something you own (worked by hand)');
{
  // 700 less 80 back = 620. Over 6 years: 620 / 72 = 8.61 a month. Worth 15 x 72 = 1,080.
  const r = W.evaluateOwn({ price: 700, years: 6, resale: 80, pawn: 150, uses: 10, worthMonthly: 15 });
  ok(near(r.netCost, 620) && near(r.perMonth, 620 / 72) && near(r.worthInAll, 1080) && near(r.net, 460), 'net cost 620, 8.61 a month, worth 1,080 in all, 460 ahead');
  ok(near(r.perUse, 620 / (10 * 52 * 6)) && near(r.goneOnDayOne, 550), 'about 20 cents a use, and 550 gone on day one against a 150 pawn value');
  ok(near(r.yearsToPay, 620 / 180) && r.verdict === 'Worth it', 'it pays for itself in 620 / 180 = 3.44 years');
  ok(near(W.evaluateOwn({ price: 700, years: r.yearsToPay, resale: 80, worthMonthly: 15 }).net, 0, 1e-9), 'kept exactly that long, cost and worth are level');
  ok(W.evaluateOwn({ price: 2000, years: 3, worthMonthly: 20 }).verdict === 'Not worth it', '2,000 over 3 years is 55.56 a month against a worth of 20');
  const bare = W.evaluateOwn({ price: 500, years: 2, worthMonthly: 30 });
  ok(bare.perUse === null && bare.goneOnDayOne === null, 'with no uses and no pawn value given, neither figure is invented');
  const named = answer('own', { price: '700', years: '6', resale: '80', pawn: '150', uses: '10', worthMonthly: '15' }, undefined, 'a 55-inch TV');
  ok(named.headline.startsWith('The 55-inch TV costs you $8.61 a month'), 'the answer uses the name the person typed for their own item');
  ok(answer('own', { price: '700', years: '6', worthMonthly: '15' }).headline.startsWith('It costs you'), 'with no name typed it simply says "It"');
}

section('A day out (worked by hand)');
{
  // 4 x 89 = 356 in tickets. Plus 60 + 120 + 70 = 606 in all. 151.50 each. Worth 4 x 120 = 480.
  const r = W.evaluateOuting({ people: 4, ticket: 89, travel: 60, food: 120, extras: 70, hours: 9, funHours: 3.5, worth: 120 });
  ok(r.tickets === 356 && r.total === 606 && near(r.perPerson, 151.5), 'tickets 356, the day 606, which is 151.50 each');
  ok(near(r.perTicketDollar, 606 / 356) && near(r.perFunHour, 606 / 14) && near(r.funShare, 3.5 / 9), 'about 1.70 per $1 of ticket, 43.29 a person per hour of fun, 39% of the trip');
  ok(r.worthInAll === 480 && near(r.net, -126) && r.verdict === 'Not worth it', 'worth 480 against 606: not worth it by 126');
  ok(near(r.roomForTheRest, 124), 'the rest can cost at most 480 - 356 = 124');
  // Put the tipping point back in: with exactly 124 of other costs, cost and worth are level.
  ok(near(W.evaluateOuting({ people: 4, ticket: 89, travel: 124, hours: 9, worth: 120 }).net, 0, 1e-9), 'with exactly that much besides the tickets, cost and worth are level');
  ok(W.evaluateOuting({ people: 2, ticket: 95, travel: 35, food: 40, extras: 30, hours: 5, worth: 150 }).verdict === 'Close call', '147.50 each against 150 is a close call');
  const bare = W.evaluateOuting({ people: 2, ticket: 25, hours: 4, worth: 60 });
  ok(bare.total === 50 && bare.perFunHour === null && bare.funShare === null && bare.verdict === 'Worth it', 'tickets only, with no hours of fun given: no per-hour figure is invented');
  ok(answer('outing', { people: '4', ticket: '200', hours: '9', worth: '120' }).lines[0].startsWith('The tickets alone'), 'when the tickets alone exceed what the day is worth, the answer says so');
}

section('The advertised price and its add-ons (worked by hand)');
{
  // Two tickets at 89. Add-ons each: 70 + 80 + 36 + 18 = 204. Plus 40 to reach the airport.
  // 2 x (89 + 204) + 40 = 626, which is 313 each. The other airline: 2 x 268 = 536.
  const r = W.evaluateAddons({ people: 2, base: 89, add1: 70, add2: 80, add3: 36, add4: 18, once: 40, full: 268 });
  ok(r.addEach === 204 && r.baseAll === 178 && r.total === 626 && near(r.perPerson, 313), 'an 89 fare with 204 of add-ons each and 40 of travel: 626, or 313 each');
  ok(r.fullAll === 536 && near(r.net, -90) && r.verdict === 'Not cheaper', 'against 536 with everything included, the cheap fare costs 90 more');
  ok(near(r.perBaseDollar, 626 / 178) && near(r.addOnShare, 448 / 626), 'about 3.52 paid for every $1 advertised, and 72% of the bill is add-ons');
  // Room for add-ons: 268 - 89 - 40 / 2 = 159 each. Put exactly that in and the two are level.
  ok(near(r.roomForAddons, 159) && near(W.evaluateAddons({ people: 2, base: 89, add1: 159, once: 40, full: 268 }).net, 0, 1e-9), 'the add-ons can come to 159 each before it stops being cheaper');
  // Travelling light: 89 + 18 = 107 against 268.
  const light = W.evaluateAddons({ people: 1, base: 89, add4: 18, full: 268 });
  ok(light.total === 107 && light.net === 161 && light.verdict === 'Still cheaper', 'with one small bag and any seat it is 107 against 268: still cheaper');
  ok(W.evaluateAddons({ people: 3, base: 129, add1: 45, add2: 30, add4: 22, full: 199 }).net === 3 * 199 - 3 * 226, 'a 129 room with 97 of nightly fees is 226 a night against 199');
  ok(W.evaluateAddons({ people: 2, base: 100, add1: 45, full: 150 }).verdict === 'Close call', '145 against 150 is a close call');
  ok(answer('addons', { people: '2', base: '89', add1: '70', add2: '80', add3: '36', add4: '18', once: '40', full: '268' }).headline === 'It says $89 each. It really costs $313 each.', 'the headline sets the advertised price beside the real one');
  ok(answer('addons', { people: '1', base: '300', full: '268' }).lines[0].startsWith('The advertised price is no lower'), 'when the advertised price is already the higher one, the answer says so');
  const night = answer('addons', { people: '3', base: '129', add1: '45', add2: '30', add4: '22', full: '199' }, { people: 'How many nights' });
  ok(night.headline === 'It says $129 a night. It really costs $226 a night.', 'for a room the answer speaks of nights, not of each');
}

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
