'use strict';
// worth.js: the logic behind the "Is It Worth It?" page.
//
// A deal: you pay a price now; one or more things might happen, each with a
// chance and a payout. Everything follows from multiplying and dividing:
//   average payback   = sum of (chance x payout)   (z = x * y, the seed)
//   break-even chance = price / payout             (z = x / y, the bloom,
//                                                    single-outcome deals)
//   break-even factor = price / average payback    (how many times likelier
//                                                    the outcomes would need to be)
// For protection (warranties, insurance) one more question the average cannot
// answer: could you absorb the biggest loss yourself? That is the cushion check.

(function (root) {
  // Money: 79, $79, 1,200, 25k, 2.5M.
  function parseMoney(text) {
    const t = String(text).trim().replace(/[$,\s]/g, '').toLowerCase();
    const m = t.match(/^(\d*\.?\d+)(k|m|b)?$/);
    if (!m) return NaN;
    const v = parseFloat(m[1]);
    return { k: v * 1e3, m: v * 1e6, b: v * 1e9 }[m[2]] ?? v;
  }

  // Chance: 5%, 0.05, 1 in 20, 1/20, 1 in 292,201,338.
  // A bare number above 1 is read as a percent (5 means 5%).
  function parseChance(text) {
    const t = String(text).trim().toLowerCase().replace(/,/g, '');
    let m = t.match(/^(\d*\.?\d+)\s*(?:in|\/|out of)\s*(\d*\.?\d+)$/);
    if (m) return parseFloat(m[1]) / parseFloat(m[2]);
    m = t.match(/^(\d*\.?\d+)\s*%$/);
    if (m) return parseFloat(m[1]) / 100;
    m = t.match(/^(\d*\.?\d+)$/);
    if (m) { const v = parseFloat(m[1]); return v > 1 ? v / 100 : v; }
    return NaN;
  }

  // Readable "1 in N" for a chance, rounded to 2 significant figures.
  function oneIn(p) {
    if (!(p > 0)) return '';
    const n = 1 / p;
    if (n < 1.05) return 'almost certain';
    if (n < 10) return `1 in ${n.toFixed(1).replace(/\.0$/, '')}`;
    const digits = Math.floor(Math.log10(n)) - 1;
    const r = Math.round(n / Math.pow(10, digits)) * Math.pow(10, digits);
    return `1 in ${Math.round(r).toLocaleString('en-US')}`;
  }

  // kind: 'protection' (pay to cover a loss) or 'bet' (pay for a chance at a prize).
  // outcomes: [{ label, chance, payout }], treated as separate events that
  // cannot both happen in the same period.
  function evaluate({ kind, price, outcomes, cushion }) {
    const parts = outcomes.map((o) => ({ ...o, value: o.chance * o.payout }));
    const expected = parts.reduce((s, p) => s + p.value, 0);
    const totalChance = outcomes.reduce((s, o) => s + o.chance, 0);
    const biggest = Math.max(...outcomes.map((o) => o.payout));
    const perDollar = expected / price;
    const breakEvenFactor = price / expected;
    const breakEvenChance = outcomes.length === 1 ? price / outcomes[0].payout : null;
    const extraCost = price - expected;
    const worthOnAverage = perDollar >= 1;
    const canAbsorb = kind === 'protection' ? biggest <= cushion : null;

    let verdict, tone;
    if (kind === 'bet') {
      tone = worthOnAverage ? 'good' : 'bad';
      verdict = worthOnAverage ? 'Worth it on average' : 'Not worth it on average';
    } else if (worthOnAverage) {
      tone = 'good';
      verdict = canAbsorb ? 'Worth it on average' : 'Worth it';
    } else if (canAbsorb) {
      tone = 'bad';
      verdict = 'Skip it';
    } else {
      tone = 'mixed';
      verdict = 'You are paying for peace of mind';
    }
    return {
      parts, expected, totalChance, biggest, perDollar, breakEvenFactor,
      breakEvenChance, extraCost, worthOnAverage, canAbsorb, verdict, tone,
      chancesTooHigh: totalChance > 1 + 1e-9,
    };
  }

  // ----------------------------------------------------------------- uses
  // Subscriptions, memberships and purchases: is the cost per use lower than
  // what each use would cost another way (renting, paying at the door)?
  //   cost per use       = net cost / uses          (z = x / y)
  //   break-even uses    = net cost / other price   (z = x / y)
  //   value of the uses  = uses x other price       (z = x * y)
  // Subscription: price per month, uses per month.
  // Purchase: price minus resale, over years x uses per year.
  function evaluateUse({ mode, price, resale = 0, years = 1, uses, altPrice }) {
    const netCost = mode === 'buy' ? price - resale : price;
    const totalUses = mode === 'buy' ? uses * years : uses;
    const costPerUse = netCost / totalUses;
    const breakEvenUses = netCost / altPrice;
    const altCost = totalUses * altPrice;
    const saving = altCost - netCost;
    const worth = costPerUse <= altPrice;
    const close = Math.abs(costPerUse - altPrice) / altPrice < 0.1;
    return {
      netCost, totalUses, costPerUse, breakEvenUses, altCost, saving, worth,
      tone: close ? 'mixed' : worth ? 'good' : 'bad',
      verdict: close ? 'Close call' : worth ? 'Worth it' : 'Not worth it',
    };
  }

  // ----------------------------------------------------------------- loans
  // Pawn, payday, cash advance: you get money now and pay back more later.
  //   fee          = pay back - get
  //   yearly rate  = fee / get x 365 / days     (simple APR, how lenders quote it)
  // Pawn only: if you cannot repay, you keep the cash, owe nothing, and lose
  // the item. Expected cost = (1 - q) x fee + q x (item value - cash).
  // The comparison: the same money for the same days at your alternative rate.
  function evaluateLoan({ get, payBack, days, itemValue = 0, chanceLose = 0, altRate }) {
    const fee = payBack - get;
    const apr = (fee / get) * (365 / days);
    const forfeitLoss = Math.max(0, itemValue - get);
    const expectedCost = (1 - chanceLose) * fee + chanceLose * forfeitLoss;
    const altCost = get * altRate * (days / 365);
    const cap = 0.36; // 36% a year: the cap in the US Military Lending Act and many state laws
    const tone = apr > cap ? 'bad' : apr > altRate * 1.5 ? 'mixed' : 'good';
    return {
      fee, apr, forfeitLoss, expectedCost, altCost, extra: expectedCost - altCost, tone,
      verdict: apr > cap ? 'Very expensive money' : apr > altRate * 1.5 ? 'Costly, look for cheaper' : 'Reasonable if you need it',
    };
  }

  // ----------------------------------------------------------------- investments
  // Degree, course, certification, solar panels: pay now, gain every year after.
  //   total cost        = upfront + income lost while doing it
  //   expected gain/yr  = chance it works out x extra per year   (z = x * y)
  //   payback years     = total cost / expected gain per year     (z = x / y)
  // Later dollars are counted a little less (discount rate), because money
  // now can be saved or invested. 0% turns that off.
  function evaluateInvest({ upfront, yearsToFinish, lostIncomePerYear, extraPerYear, chance, benefitYears, discount }) {
    const cost = upfront + lostIncomePerYear * yearsToFinish;
    const gainPerYear = chance * extraPerYear;
    const paybackYears = gainPerYear > 0 ? cost / gainPerYear : Infinity;
    // Year-by-year running total, discounted. Gains start after finishing.
    const timeline = [];
    let running = -cost, paybackAt = null;
    const horizon = Math.ceil(yearsToFinish + benefitYears);
    timeline.push({ year: 0, total: running });
    for (let y = 1; y <= horizon; y++) {
      const earning = y > yearsToFinish ? Math.min(1, y - yearsToFinish) : 0;
      running += (earning * gainPerYear) / Math.pow(1 + discount, y);
      timeline.push({ year: y, total: running });
      if (paybackAt === null && running >= 0) paybackAt = y;
    }
    const net = running;
    const tone = net > cost * 0.25 ? 'good' : net > 0 ? 'mixed' : 'bad';
    return {
      cost, gainPerYear, paybackYears, timeline, paybackAt, net, tone,
      verdict: net > cost * 0.25 ? 'Worth it on these numbers' : net > 0 ? 'Barely pays off' : 'Does not pay off',
    };
  }

  // ----------------------------------------------------------------- one outcome
  // The simple form of a protection or a bet: one thing that might happen.
  //   paid          = price x times
  //   average back  = (chance x payout + other payback) x times     (z = x * y)
  //   back per $1   = average back / paid                           (z = x / y)
  //   break-even chance = (price - other payback) / payout          (z = x / y)
  // `otherPayback` is the average return per go from smaller prizes that are
  // not worth listing one by one (the lower tiers of a lottery).
  // For protection there is a second question the average cannot answer: could
  // you pay the loss yourself? If not, cover that loses a little on average can
  // still be the right call.
  function evaluateSimple({ kind, price, times = 1, chance, payout, otherPayback = 0, cushion = 0 }) {
    const backPerGo = chance * payout + otherPayback;
    const paid = price * times;
    const back = backPerGo * times;
    const perDollar = backPerGo / price;
    const worthOnAverage = perDollar >= 1;
    const canAbsorb = kind === 'protection' ? payout <= cushion : null;
    const breakEvenChance = payout > 0 ? Math.max(0, price - otherPayback) / payout : null;
    let verdict, tone;
    if (kind === 'bet') {
      tone = worthOnAverage ? 'good' : 'bad';
      verdict = worthOnAverage ? 'Worth it on average' : 'Not worth it on average';
    } else if (worthOnAverage) {
      tone = 'good'; verdict = 'Worth it';
    } else if (canAbsorb) {
      tone = 'bad'; verdict = 'Skip it';
    } else {
      tone = 'mixed'; verdict = 'You are paying for peace of mind';
    }
    return { paid, back, backPerGo, perDollar, worthOnAverage, canAbsorb, breakEvenChance, verdict, tone, extraCost: paid - back };
  }

  // ----------------------------------------------------------------- an everyday saving
  // Doing it yourself, buying the cheaper one, cooking at home: money is saved,
  // and something is paid for it in extras, in time, and in the risk of it
  // going wrong. The same sum as the business calculator, without lost income.
  //   time cost      = hours x value of an hour                     (z = x * y)
  //   expected risk  = chance it goes wrong x what that costs       (z = x * y)
  //   total cost     = extras + time cost + expected risk
  //   net            = saved - total cost
  //   cost per $1 saved = total cost / saved                        (z = x / y)
  // The two tipping points, each solved from net = 0:
  //   break-even hour value = (saved - extras - expected risk) / hours
  //   break-even chance     = (saved - extras - time cost) / cost if it goes wrong
  // Every figure must cover the same stretch of time (one job, one month, the
  // years the car is kept). The 0.5 line between "worth it" and "barely" is the
  // same presentation choice the business calculator uses.
  function evaluateSaving({ saved, extras = 0, hours = 0, hourValue = 0, chanceWrong = 0, costWrong = 0 }) {
    const timeCost = hours * hourValue;
    const expectedRisk = chanceWrong * costWrong;
    const totalCost = extras + timeCost + expectedRisk;
    const net = saved - totalCost;
    const perDollar = totalCost / saved;
    const breakEvenHourValue = hours > 0 ? (saved - extras - expectedRisk) / hours : null;
    const breakEvenChance = costWrong > 0 ? (saved - extras - timeCost) / costWrong : null;
    const tone = net < 0 ? 'bad' : perDollar >= 0.5 ? 'mixed' : 'good';
    return {
      timeCost, expectedRisk, totalCost, net, perDollar, breakEvenHourValue, breakEvenChance, tone,
      verdict: net < 0 ? 'Not worth it' : perDollar >= 0.5 ? 'Worth it, barely' : 'Worth it',
    };
  }

  // ----------------------------------------------------------------- a job, from the worker's side
  // A job pays a wage and costs something to hold: the commute, childcare, the
  // clothes and lunches, and hours that are given but not paid.
  //   kept          = take-home pay - what the job costs you
  //   hours given   = paid hours + unpaid hours
  //   real hourly   = kept / hours given                           (z = x / y)
  //   stated hourly = take-home pay / paid hours                   (z = x / y)
  //   other option  = other hourly rate x hours given              (z = x * y)
  //   ahead by      = kept - other option
  //   break-even job costs = take-home pay - other option
  // Everything is for the same period (a week on the form). "Close call" means
  // the real hourly rate is within 10% of the other option.
  function evaluateJob({ takeHome, costs = 0, hours, extraHours = 0, altHourly }) {
    const kept = takeHome - costs;
    const hoursGiven = hours + extraHours;
    const realHourly = kept / hoursGiven;
    const statedHourly = takeHome / hours;
    const other = altHourly * hoursGiven;
    const ahead = kept - other;
    const breakEvenCosts = takeHome - other;
    const close = Math.abs(realHourly - altHourly) / altHourly < 0.1;
    const tone = kept <= 0 ? 'bad' : close ? 'mixed' : ahead > 0 ? 'good' : 'bad';
    return {
      kept, hoursGiven, realHourly, statedHourly, other, ahead, breakEvenCosts, tone,
      verdict: kept <= 0 ? 'This job costs you money' : close ? 'Close call' : ahead > 0 ? 'Worth it' : 'Your other option pays more',
    };
  }

  // ----------------------------------------------------------------- something you own
  // A TV, a bike, a sofa: you pay once, use it for some years, and get a little
  // back at the end. Whether it is worth it is its cost per month against what
  // having it is worth to you per month.
  //   net cost        = price - resale at the end
  //   cost per month  = net cost / (years x 12)                    (z = x / y)
  //   cost per use    = net cost / (uses per week x 52 x years)    (z = x / y)
  //   worth in all    = worth per month x 12 x years               (z = x * y)
  //   years to pay for itself = net cost / (worth per month x 12)  (z = x / y)
  //   gone on day one = price - pawn value
  // The pawn value is what the thing turns back into if cash is needed in a
  // hurry. The rest of the price cannot be got back from the day it is bought.
  // The resale figure is taken as given whatever the years; in life it falls
  // the longer a thing is kept. "Close call" means within 10%.
  function evaluateOwn({ price, years, resale = 0, pawn = 0, uses = 0, worthMonthly }) {
    const netCost = price - resale;
    const perMonth = netCost / (years * 12);
    const perUse = uses > 0 ? netCost / (uses * 52 * years) : null;
    const worthInAll = worthMonthly * 12 * years;
    const net = worthInAll - netCost;
    const yearsToPay = netCost / (worthMonthly * 12);
    const goneOnDayOne = pawn > 0 ? price - pawn : null;
    const close = Math.abs(perMonth - worthMonthly) / worthMonthly < 0.1;
    const tone = close ? 'mixed' : net > 0 ? 'good' : 'bad';
    return {
      netCost, perMonth, perUse, worthInAll, net, yearsToPay, goneOnDayOne, tone,
      verdict: close ? 'Close call' : net > 0 ? 'Worth it' : 'Not worth it',
    };
  }

  // ----------------------------------------------------------------- a day out
  // An amusement park, a concert, a game. The ticket is the price on the sign.
  // The day costs more than the ticket: travel, parking, food, extras. And much
  // of the time paid for is spent queuing, not on the thing itself.
  //   tickets          = people x ticket price                     (z = x * y)
  //   the day costs    = tickets + travel + food + extras
  //   per person       = the day costs / people                    (z = x / y)
  //   per $1 of ticket = the day costs / tickets                   (z = x / y)
  //   per hour of fun  = the day costs / (people x hours of fun)   (z = x / y)
  //   worth in all     = people x what the day is worth to each    (z = x * y)
  //   most the rest can cost = worth in all - tickets
  // "Hours of fun" are the hours on rides or watching the show, not the hours
  // travelling and queuing. "Close call" means within 10%.
  //
  // HOW MUCH YOU WANT IT. Worth is a matter of taste, so taste is an input. With
  // a liking from 1 to 10, the worth figure is read as the most the person would
  // pay for a 10 out of 10, and scaled:
  //   worth to each = top worth x liking / 10                     (z = x * y)
  //   liking needed = 10 x cost per person / top worth            (z = x / y)
  // With no liking given, the worth figure is used as it stands.
  function evaluateOuting({ people, ticket, travel = 0, food = 0, extras = 0, hours, funHours = 0, worth, liking = 0 }) {
    const likingUsed = liking > 0 ? Math.min(10, liking) : null;
    const worthEach = likingUsed === null ? worth : worth * likingUsed / 10;
    const tickets = people * ticket;
    const total = tickets + travel + food + extras;
    const perPerson = total / people;
    const perTicketDollar = total / tickets;
    const perFunHour = funHours > 0 ? total / (people * funHours) : null;
    const funShare = funHours > 0 && hours > 0 ? Math.min(1, funHours / hours) : null;
    const worthInAll = people * worthEach;
    const net = worthInAll - total;
    const roomForTheRest = worthInAll - tickets;
    const close = Math.abs(perPerson - worthEach) / worthEach < 0.1;
    const likingNeeded = likingUsed === null ? null : 10 * perPerson / worth;
    return {
      tickets, total, perPerson, perTicketDollar, perFunHour, funShare, worthInAll, net, roomForTheRest,
      worthEach, likingUsed, likingNeeded,
      tone: close ? 'mixed' : net > 0 ? 'good' : 'bad',
      verdict: close ? 'Close call' : net > 0 ? 'Worth it' : 'Not worth it',
    };
  }

  // ----------------------------------------------------------------- the advertised price and its add-ons
  // A cheap fare, a room rate, a daily hire rate. The price shown is for the
  // bare thing; the bag, the seat, the resort fee and the rest are added after.
  // It is set against the option whose price already includes them.
  //   add-ons each      = the four add-ons added together
  //   really costs      = count x (advertised + add-ons each) + one-off extra    (z = x * y)
  //   the other option  = count x its all-in price                              (z = x * y)
  //   per $1 advertised = really costs / (count x advertised)                   (z = x / y)
  //   room for add-ons  = all-in price - advertised - one-off extra / count
  // `count` is travellers for a flight, nights for a room, days for a car.
  function evaluateAddons({ people, base, add1 = 0, add2 = 0, add3 = 0, add4 = 0, once = 0, full }) {
    const addEach = add1 + add2 + add3 + add4;
    const baseAll = people * base;
    const total = people * (base + addEach) + once;
    const perPerson = total / people;
    const addOnsAll = total - baseAll;
    const fullAll = people * full;
    const net = fullAll - total;                          // what the cheaper-looking option really saves
    const roomForAddons = full - base - once / people;    // the most the add-ons can come to, each
    const close = fullAll > 0 && Math.abs(net) / fullAll < 0.05;
    return {
      addEach, baseAll, total, perPerson, addOnsAll, fullAll, net, roomForAddons,
      perBaseDollar: baseAll > 0 ? total / baseAll : null,
      addOnShare: total > 0 ? addOnsAll / total : 0,
      tone: close ? 'mixed' : net > 0 ? 'good' : 'bad',
      verdict: close ? 'Close call' : net > 0 ? 'Still cheaper' : 'Not cheaper',
    };
  }

  // ----------------------------------------------------------------- putting it off
  // A repair, a bill, a check-up. Dealing with it now has a known price. Putting
  // it off costs nothing today, and then one of two things happens: it costs
  // what it would have cost (perhaps grown), or it turns into something bigger.
  //   cost later        = cost now x (1 + growth each month) ^ months     (it compounds)
  //   expected later    = (1 - chance) x cost later + chance x cost if it gets worse   (z = x * y)
  //   carrying cost     = cost each month meanwhile x months               (z = x * y)
  //   earned by waiting = cost now x yearly rate x months / 12             (z = x * y)
  //   putting it off costs = expected later + carrying cost - earned by waiting
  //   waiting costs you    = putting it off costs - cost now
  //   per $1 put off       = putting it off costs / cost now               (z = x / y)
  // The tipping point, solved from "waiting costs you = 0":
  //   break-even chance = (cost now + earned - carrying cost - cost later) / (cost if worse - cost later)
  // "Waiting costs little" means under a tenth of the cost now.
  function evaluateWait({ costNow, months, growth = 0, chanceWorse = 0, costWorse = 0, meanwhile = 0, earnRate = 0 }) {
    const costLater = costNow * Math.pow(1 + growth, months);
    const expectedLater = (1 - chanceWorse) * costLater + chanceWorse * costWorse;
    const carrying = meanwhile * months;
    const earned = costNow * earnRate * months / 12;
    const laterTotal = expectedLater + carrying - earned;
    const waitingCosts = laterTotal - costNow;
    const perDollar = laterTotal / costNow;
    const breakEvenChance = costWorse > costLater ? (costNow + earned - carrying - costLater) / (costWorse - costLater) : null;
    const tone = waitingCosts < 0 ? 'good' : waitingCosts < 0.1 * costNow ? 'mixed' : 'bad';
    return {
      costLater, expectedLater, carrying, earned, laterTotal, waitingCosts, perDollar, breakEvenChance, tone,
      verdict: waitingCosts < 0 ? 'Waiting pays' : waitingCosts < 0.1 * costNow ? 'Waiting costs little' : 'Waiting costs you',
    };
  }

  // ----------------------------------------------------------------- borrow or pay cash
  // Paying cash costs the price. Borrowing costs the payments, but the cash
  // stays in hand and can earn something meanwhile. To set the two side by
  // side, each payment is brought back to today's money at the rate the cash
  // would earn. That is a present value, the standard way to compare money
  // paid at different times.
  //   borrowed        = price - down payment
  //   monthly rate    = yearly loan rate / 12
  //   payment         = borrowed x rate / (1 - (1 + rate) ^ -months)      (borrowed / months when the rate is 0)
  //   paid in all     = down payment + payment x months + fees
  //   interest        = payment x months - borrowed
  //   borrowing, in today's money
  //                   = down payment + fees + payment x (1 - (1 + s) ^ -months) / s,   s = cash rate / 12
  //   extra cost of borrowing = borrowing in today's money - price
  // THE TIPPING POINT: the rate the cash would have to earn for borrowing to
  // cost the same as paying cash. With no fees it is exactly the loan rate.
  // With fees there is no tidy formula, so it is found by halving the range,
  // which is safe because a higher cash rate always makes borrowing look cheaper.
  // THE CUSHION: a second question the sum cannot answer. If paying cash would
  // leave less than the emergency money wanted, borrowing can be the right
  // call even when it costs more.
  function evaluateFinance({ price, down = 0, apr = 0, months, fees = 0, saveRate = 0, cushionLeft = 0, cushionNeed = 0 }) {
    const borrowed = Math.max(0, price - down);
    const rate = apr / 12;
    const payment = rate > 0 ? borrowed * rate / (1 - Math.pow(1 + rate, -months)) : borrowed / months;
    const paidInAll = down + payment * months + fees;
    const interest = payment * months - borrowed;
    const todayCost = (yearly) => {
      const s = yearly / 12;
      return down + fees + (s > 0 ? payment * (1 - Math.pow(1 + s, -months)) / s : payment * months);
    };
    const borrowToday = todayCost(saveRate);
    const extra = borrowToday - price;
    // The cash rate at which the two cost the same.
    let breakEvenRate = null;
    if (todayCost(0) <= price) breakEvenRate = 0;                 // borrowing is no dearer even if cash earns nothing
    else if (todayCost(10) < price) {                             // a crossing exists below 1,000% a year
      let lo = 0, hi = 10;
      for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (todayCost(mid) > price) lo = mid; else hi = mid; }
      breakEvenRate = hi;
    }
    const shortOfCushion = cushionNeed > 0 && cushionLeft < cushionNeed;
    let verdict, tone;
    if (extra <= 0) { verdict = 'Borrowing costs less'; tone = 'good'; }
    else if (shortOfCushion) { verdict = 'Borrowing costs more, but keeps your cushion'; tone = 'mixed'; }
    else { verdict = 'Pay cash'; tone = 'good'; }
    return { borrowed, payment, paidInAll, interest, borrowToday, extra, breakEvenRate, shortOfCushion, verdict, tone };
  }

  // ----------------------------------------------------------------- one way or the other
  // Fix it or buy new. Buy used or buy new. Two ways of having the same thing,
  // with different prices and different lives, so the fair comparison is what
  // each costs for a year of use.
  //   first way, per year  = price / (years it lasts x chance it lasts) + upkeep a year
  //   second way, per year = (price - resale at the end) / years it lasts + upkeep a year
  // "Chance it lasts" is 1 less the chance the first way fails early. If it
  // fails, the money is spent and the years are not had.
  // THE TIPPING POINT, solved from "the two cost the same per year":
  //   most the first way can cost = (second way per year - first way upkeep) x years x chance it lasts
  // No discounting: a year is counted the same whenever it falls. "Close call"
  // means the two are within 10% of each other.
  function evaluateVersus({ priceA, yearsA, runA = 0, chanceA = 0, priceB, yearsB, runB = 0, resaleB = 0 }) {
    const lasts = 1 - Math.min(0.99, chanceA);
    const perYearA = priceA / (yearsA * lasts) + runA;
    const perYearB = (priceB - resaleB) / yearsB + runB;
    const mostAcanCost = Math.max(0, (perYearB - runA) * yearsA * lasts);
    const close = Math.abs(perYearA - perYearB) / Math.min(perYearA, perYearB) < 0.1;
    return {
      perYearA, perYearB, mostAcanCost, shareOfB: priceA / priceB,
      aheadPerYear: Math.abs(perYearA - perYearB),
      winner: close ? null : perYearA < perYearB ? 'A' : 'B',
      tone: close ? 'mixed' : 'good',
    };
  }

  const api = { evaluateAddons, evaluateVersus, evaluateFinance, evaluateWait, evaluateOuting, evaluateOwn, evaluateJob, parseMoney, parseChance, oneIn, evaluate, evaluateSimple, evaluateUse, evaluateLoan, evaluateInvest, evaluateSaving };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Worth = api;
})(typeof window !== 'undefined' ? window : this);
