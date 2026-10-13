// Turns a filled-in form into an answer for the "Is it worth it?" page.
//
// All the sums are done by worth.js. This file reads the slots, calls the right
// sum for the kind of decision, and puts the result into one common shape, so
// every scenario is shown the same way:
//
//   verdict   a few words, with a tone (good / mixed / bad)
//   headline  one sentence with the key figure
//   left, right   two amounts to set side by side (what you pay, what you get)
//   lines     up to three short sentences that explain it
//   working   every figure behind the answer, as label and value
'use strict';
(function (root) {
  const W = typeof module !== 'undefined' && module.exports ? require('./worth') : root.Worth;
  const S = typeof module !== 'undefined' && module.exports ? require('./worth-scenarios') : root.WorthScenarios;

  const money = (v) => {
    const a = Math.abs(v), sign = v < 0 ? '-' : '';
    return `${sign}$${a >= 100 || Number.isInteger(a) ? Math.round(a).toLocaleString('en-US') : a.toFixed(2)}`;
  };
  const cents = (v) => `$${v.toFixed(2)}`;
  const pct = (v) => `${(v * 100).toFixed(v < 0.1 ? 1 : 0).replace(/\.0$/, '')}%`;
  const num = (v) => (Number.isInteger(v) ? String(v) : String(+v.toFixed(2)));

  // Read one slot. Returns NaN when it cannot be understood.
  function read(field, text) {
    const t = String(text == null ? '' : text).trim();
    if (t === '') return field.optional ? 0 : NaN;
    if (field.type === 'money') return W.parseMoney(t);
    if (field.type === 'chance' || field.type === 'rate') return W.parseChance(t);
    const n = parseFloat(t.replace(/,/g, ''));
    return Number.isFinite(n) ? n : NaN;
  }

  // Read every slot for a kind. Returns { values } or { missing: [labels] }.
  function readAll(kindId, raw, labels = {}) {
    const kind = S.KINDS[kindId];
    const values = {}, missing = [];
    for (const f of kind.fields) {
      const v = read(f, raw[f.id]);
      const label = labels[f.id] || f.label;
      if (!Number.isFinite(v) || v < 0) missing.push(label);
      else if (!f.optional && v === 0 && !['resale', 'lostIncomePerYear', 'yearsToFinish', 'chanceLose', 'altRate', 'cushion'].includes(f.id)) missing.push(label);
      else values[f.id] = v;
    }
    return missing.length ? { missing } : { values };
  }

  const ANSWER = {
    saving(v) {
      const r = W.evaluateSaving({ saved: v.saved, extras: v.extras || 0, hours: v.hours || 0, hourValue: v.hourValue || 0, chanceWrong: v.chanceWrong || 0, costWrong: v.costWrong || 0 });
      // The tipping point: the one input the answer turns on, and where it turns.
      let tipping;
      if (r.breakEvenHourValue !== null && r.breakEvenHourValue <= 0) tipping = 'Even with your time counted as free, the extras and the risk come to more than the saving.';
      else if (r.breakEvenHourValue !== null) tipping = `It stops being worth it once an hour of your time is worth more than ${cents(r.breakEvenHourValue)}. You put ${cents(v.hourValue || 0)}.`;
      else if (r.breakEvenChance !== null && r.breakEvenChance >= 1) tipping = 'It still saves money even if it goes wrong for certain.';
      else if (r.breakEvenChance !== null && r.breakEvenChance > 0) tipping = `It stops being worth it if the chance of it going wrong is above ${pct(r.breakEvenChance)}. You put ${pct(v.chanceWrong || 0)}.`;
      else tipping = 'Add your hours or the risk to see where this stops being worth it.';
      const parts = [`extras ${money(v.extras || 0)}`];
      if (v.hours) parts.push(`your time ${money(r.timeCost)}`);
      if (v.costWrong) parts.push(`risk ${money(r.expectedRisk)}`);
      return {
        tone: r.tone, verdict: r.verdict,
        headline: r.net >= 0 ? `You come out ${money(r.net)} ahead.` : `It costs you ${money(-r.net)} more than it saves.`,
        left: { label: 'You save', amount: v.saved, sub: 'the price difference' },
        right: { label: 'It costs you', amount: r.totalCost, sub: 'extras, time and risk' },
        lines: [tipping, `For every $1 saved, it costs you ${cents(r.perDollar)}.`, `What it costs: ${parts.join(', ')}.`],
        working: [['You save', money(v.saved)], ['Extras', money(v.extras || 0)], ['Your time', `${num(v.hours || 0)} hours x ${cents(v.hourValue || 0)} = ${money(r.timeCost)}`], ['Risk, on average', `${pct(v.chanceWrong || 0)} x ${money(v.costWrong || 0)} = ${money(r.expectedRisk)}`], ['Total cost', money(r.totalCost)], ['Net', `${money(v.saved)} - ${money(r.totalCost)} = ${money(r.net)}`], ['Cost per $1 saved', cents(r.perDollar)],
          ...(r.breakEvenHourValue !== null ? [['Break-even value of an hour', cents(Math.max(0, r.breakEvenHourValue))]] : []),
          ...(r.breakEvenChance !== null ? [['Break-even chance of it going wrong', pct(Math.min(1, Math.max(0, r.breakEvenChance)))]] : [])],
      };
    },
    finance(v) {
      const r = W.evaluateFinance({ price: v.price, down: v.down || 0, apr: v.apr || 0, months: v.months, fees: v.fees || 0, saveRate: v.saveRate || 0, cushionLeft: v.cushionLeft || 0, cushionNeed: v.cushionNeed || 0 });
      const lines = [`The payment is ${cents(r.payment)} a month for ${num(v.months)} months: ${money(r.paidInAll)} in all, ${money(r.interest)} of it interest${v.fees ? ` and ${money(v.fees)} fees` : ''}.`];
      // The tipping point: what the cash would have to earn for borrowing to break even.
      if (r.breakEvenRate === 0) lines.push('Borrowing is no dearer even if your cash earns nothing.');
      else if (r.breakEvenRate !== null) lines.push(`Borrowing only wins if your cash earns more than ${pct(r.breakEvenRate)} a year. You put ${pct(v.saveRate || 0)}.`);
      if (v.cushionNeed > 0) lines.push(r.shortOfCushion ? `Paying cash would leave ${money(v.cushionLeft || 0)}, less than the ${money(v.cushionNeed)} you want to keep for emergencies.`
        : `Paying cash would still leave ${money(v.cushionLeft || 0)}, which covers the ${money(v.cushionNeed)} you want to keep.`);
      return {
        tone: r.tone, verdict: r.verdict,
        headline: r.extra > 0 ? `Borrowing costs you ${money(r.extra)} more than paying cash.` : `Borrowing leaves you ${money(-r.extra)} ahead of paying cash.`,
        left: { label: 'Pay cash', amount: v.price, sub: 'today' },
        right: { label: 'Borrow', amount: r.borrowToday, sub: "in today's money" },
        lines,
        working: [['Borrowed', `${money(v.price)} - ${money(v.down || 0)} = ${money(r.borrowed)}`], ['Monthly payment', cents(r.payment)], ['Paid in all', `${money(v.down || 0)} + ${cents(r.payment)} x ${num(v.months)} + ${money(v.fees || 0)} = ${money(r.paidInAll)}`], ['Interest', money(r.interest)], ["Borrowing, in today's money", `at ${pct(v.saveRate || 0)} a year: ${money(r.borrowToday)}`], ['Extra cost of borrowing', `${money(r.borrowToday)} - ${money(v.price)} = ${money(r.extra)}`], ...(r.breakEvenRate !== null ? [['Break-even cash rate', pct(r.breakEvenRate)]] : [])],
      };
    },
    wait(v) {
      const r = W.evaluateWait({ costNow: v.costNow, months: v.months, growth: v.growth || 0, chanceWorse: v.chanceWorse || 0, costWorse: v.costWorse || 0, meanwhile: v.meanwhile || 0, earnRate: v.earnRate || 0 });
      const span = `${num(v.months)} month${v.months === 1 ? '' : 's'}`;
      const lines = [];
      // The tipping point: the chance of it getting worse at which waiting stops paying.
      if (r.breakEvenChance !== null) lines.push(r.breakEvenChance <= 0 ? 'Waiting does not pay even if it never gets worse.'
        : r.breakEvenChance >= 1 ? 'Waiting pays even if it is certain to get worse.'
          : `Waiting only pays if the chance of it getting worse is under ${pct(r.breakEvenChance)}. You put ${pct(v.chanceWorse || 0)}.`);
      lines.push(`For every $1 you put off, you pay ${cents(r.perDollar)}.`);
      if (v.growth > 0) lines.push(`Left alone it grows from ${money(v.costNow)} to ${money(r.costLater)}. Each month's growth is added to the last, so it multiplies.`);
      if (r.earned > 0) lines.push(`Keeping the money earns you ${money(r.earned)} meanwhile, which is already counted.`);
      return {
        tone: r.tone, verdict: r.verdict,
        headline: r.waitingCosts >= 0 ? `Putting it off for ${span} costs you ${money(r.waitingCosts)}.` : `Putting it off for ${span} leaves you ${money(-r.waitingCosts)} ahead.`,
        left: { label: 'Deal with it now', amount: v.costNow, sub: 'for certain' },
        right: { label: 'Put it off', amount: Math.max(0, r.laterTotal), sub: 'on average' },
        lines: lines.slice(0, 4),
        working: [['Cost later', v.growth > 0 ? `${money(v.costNow)} x (1 + ${pct(v.growth)}) ^ ${num(v.months)} = ${money(r.costLater)}` : money(r.costLater)], ['Expected later', `${pct(1 - (v.chanceWorse || 0))} x ${money(r.costLater)} + ${pct(v.chanceWorse || 0)} x ${money(v.costWorse || 0)} = ${money(r.expectedLater)}`], ['Carrying cost', `${money(v.meanwhile || 0)} x ${num(v.months)} = ${money(r.carrying)}`], ['Earned by waiting', `${money(v.costNow)} x ${pct(v.earnRate || 0)} x ${num(v.months)} / 12 = ${money(r.earned)}`], ['Putting it off costs', `${money(r.expectedLater)} + ${money(r.carrying)} - ${money(r.earned)} = ${money(r.laterTotal)}`], ['Waiting costs you', `${money(r.laterTotal)} - ${money(v.costNow)} = ${money(r.waitingCosts)}`], ['Per $1 put off', cents(r.perDollar)],
          ...(r.breakEvenChance !== null ? [['Break-even chance', pct(Math.min(1, Math.max(0, r.breakEvenChance)))]] : [])],
      };
    },
    outing(v) {
      const r = W.evaluateOuting({ people: v.people, ticket: v.ticket, travel: v.travel || 0, food: v.food || 0, extras: v.extras || 0, hours: v.hours, funHours: v.funHours || 0, worth: v.worth, liking: v.liking || 0 });
      const rest = r.total - r.tickets;
      const tipping = r.roomForTheRest <= 0 ? `The tickets alone come to more than the ${money(r.worthInAll)} it is worth to you.`
        : `It is worth it as long as everything besides the tickets stays under ${money(r.roomForTheRest)}. It comes to ${money(rest)}.`;
      const lines = [tipping, `For every $1 of ticket, you pay ${cents(r.perTicketDollar)} in all.`];
      // Taste as a tipping point: the liking at which cost and worth are level.
      if (r.likingNeeded !== null) lines.unshift(r.likingNeeded > 10 ? `Even at 10 out of 10 it costs more than the ${money(v.worth)} you said was the most you would pay.`
        : `It is worth it at ${num(+Math.max(1, r.likingNeeded).toFixed(1))} out of 10 or more. You put ${num(r.likingUsed)}.`);
      if (r.perFunHour !== null) lines.push(`That is ${cents(r.perFunHour)} a person for each hour of fun: ${num(v.funHours)} hours out of ${num(v.hours)}, or ${pct(r.funShare)} of the trip.`);
      else lines.push(`The tickets are ${pct(r.tickets / r.total)} of what it costs.`);
      return {
        tone: r.tone, verdict: r.verdict,
        headline: `The ticket says ${money(v.ticket)} each. It really costs ${money(r.perPerson)} each.`,
        left: { label: 'It costs in all', amount: r.total, sub: `${money(r.tickets)} of it is tickets` },
        right: { label: 'It is worth to you', amount: r.worthInAll, sub: `${num(v.people)} x ${money(r.worthEach)}` },
        lines: lines.slice(0, 4),
        working: [...(r.likingUsed !== null ? [['Worth to each', `${money(v.worth)} x ${num(r.likingUsed)} / 10 = ${money(r.worthEach)}`], ['Liking needed', `10 x ${money(r.perPerson)} / ${money(v.worth)} = ${num(+r.likingNeeded.toFixed(2))}`]] : []), ['Tickets', `${num(v.people)} x ${money(v.ticket)} = ${money(r.tickets)}`], ['It costs in all', `${money(r.tickets)} + ${money(v.travel || 0)} + ${money(v.food || 0)} + ${money(v.extras || 0)} = ${money(r.total)}`], ['Per person', `${money(r.total)} / ${num(v.people)} = ${money(r.perPerson)}`], ['Per $1 of ticket', cents(r.perTicketDollar)], ...(r.perFunHour !== null ? [['Per person, per hour of fun', `${money(r.total)} / (${num(v.people)} x ${num(v.funHours)}) = ${cents(r.perFunHour)}`]] : []), ['Worth in all', `${num(v.people)} x ${money(r.worthEach)} = ${money(r.worthInAll)}`], ['Net', money(r.net)], ['Most the rest can cost', money(Math.max(0, r.roomForTheRest))]],
      };
    },
    addons(v, name, labels) {
      // What one of them is called: a traveller's fare is "each", a room is "a night", a car is "a day".
      const counted = String((labels && labels.people) || '').toLowerCase();
      const per = counted.includes('night') ? 'a night' : counted.includes('day') ? 'a day' : 'each';
      const r = W.evaluateAddons({ people: v.people, base: v.base, add1: v.add1 || 0, add2: v.add2 || 0, add3: v.add3 || 0, add4: v.add4 || 0, once: v.once || 0, full: v.full });
      const one = v.people === 1;
      const tipping = r.roomForAddons <= 0 ? `The advertised price is no lower than the ${money(v.full)} that includes everything.`
        : `It stays cheaper as long as the add-ons come to less than ${money(r.roomForAddons)} ${per}. They come to ${money(r.addEach)}.`;
      const lines = [tipping];
      if (r.perBaseDollar !== null) lines.push(`For every $1 of the advertised price, you pay ${cents(r.perBaseDollar)} in all.`);
      lines.push(r.addOnsAll > 0 ? `The add-ons are ${pct(r.addOnShare)} of what you pay.` : 'With no add-ons, the advertised price is the price.');
      lines.push(r.net > 0 ? `It saves ${money(r.net)}${one ? '' : ' in all'} against the price that includes everything.` : r.net < 0 ? `It costs ${money(-r.net)}${one ? '' : ' in all'} more than the price that includes everything.` : 'The two come to the same.');
      return {
        tone: r.tone, verdict: r.verdict,
        headline: `It says ${money(v.base)} ${per}. It really costs ${money(r.perPerson)} ${per}.`,
        left: { label: 'Advertised, with add-ons', amount: r.total, sub: `${money(r.baseAll)} of it is the advertised price` },
        right: { label: 'Everything included', amount: r.fullAll, sub: `${num(v.people)} x ${money(v.full)}` },
        lines: lines.slice(0, 4),
        working: [['Add-ons ' + per, `${money(v.add1 || 0)} + ${money(v.add2 || 0)} + ${money(v.add3 || 0)} + ${money(v.add4 || 0)} = ${money(r.addEach)}`],
          ['It really costs', `${num(v.people)} x (${money(v.base)} + ${money(r.addEach)}) + ${money(v.once || 0)} = ${money(r.total)}`],
          [per.charAt(0).toUpperCase() + per.slice(1), `${money(r.total)} / ${num(v.people)} = ${money(r.perPerson)}`],
          ['Everything included', `${num(v.people)} x ${money(v.full)} = ${money(r.fullAll)}`],
          ['Room for add-ons', `${money(v.full)} - ${money(v.base)} - ${money(v.once || 0)} / ${num(v.people)} = ${money(r.roomForAddons)} ${per}`]],
      };
    },
    own(v, name) {
      const r = W.evaluateOwn({ price: v.price, years: v.years, resale: v.resale || 0, pawn: v.pawn || 0, uses: v.uses || 0, worthMonthly: v.worthMonthly });
      // The person's own words for the thing, without a leading "a", "the" or "my".
      const said = String(name || '').trim().replace(/^(a|an|the|my|this)\s+/i, '');
      const it = said ? `The ${said}` : 'It';
      const lines = [`It pays for itself if you keep it ${num(+r.yearsToPay.toFixed(1))} years. You plan ${num(v.years)}.`];
      if (r.perUse !== null) lines.push(`That is ${cents(r.perUse)} each time you use it.`);
      if (r.goneOnDayOne !== null) lines.push(`The day you buy it, ${money(r.goneOnDayOne)} of the ${money(v.price)} cannot be got back: a pawn shop would give ${money(v.pawn)}.`);
      else lines.push(r.net >= 0 ? `Over the ${num(v.years)} years it is worth ${money(r.net)} more to you than it costs.` : `Over the ${num(v.years)} years it costs ${money(-r.net)} more than it is worth to you.`);
      return {
        tone: r.tone, verdict: r.verdict,
        headline: `${it} costs you ${cents(r.perMonth)} a month. You said having it is worth ${cents(v.worthMonthly)}.`,
        left: { label: 'It costs you', amount: r.netCost, sub: v.resale ? `${money(v.price)} less ${money(v.resale)} back` : 'in all' },
        right: { label: 'It is worth to you', amount: r.worthInAll, sub: `${num(v.years)} years x ${cents(v.worthMonthly)} a month` },
        lines,
        working: [['Net cost', `${money(v.price)} - ${money(v.resale || 0)} = ${money(r.netCost)}`], ['Cost per month', `${money(r.netCost)} / (${num(v.years)} x 12) = ${cents(r.perMonth)}`], ...(r.perUse !== null ? [['Cost per use', `${money(r.netCost)} / (${num(v.uses)} x 52 x ${num(v.years)}) = ${cents(r.perUse)}`]] : []), ['Worth in all', `${cents(v.worthMonthly)} x 12 x ${num(v.years)} = ${money(r.worthInAll)}`], ['Net', money(r.net)], ['Years to pay for itself', num(+r.yearsToPay.toFixed(2))], ...(r.goneOnDayOne !== null ? [['Gone on day one', `${money(v.price)} - ${money(v.pawn)} = ${money(r.goneOnDayOne)}`]] : [])],
      };
    },
    job(v) {
      const r = W.evaluateJob({ takeHome: v.takeHome, costs: v.costs || 0, hours: v.hours, extraHours: v.extraHours || 0, altHourly: v.altHourly });
      const tipping = r.breakEvenCosts > 0
        ? `It beats your other option as long as the job costs you less than ${money(r.breakEvenCosts)} a week. You put ${money(v.costs || 0)}.`
        : 'Even if the job cost you nothing, the hours it takes put it behind your other option.';
      return {
        tone: r.tone, verdict: r.verdict,
        headline: `On paper it pays ${cents(r.statedHourly)} an hour. Really it pays ${cents(r.realHourly)}.`,
        left: { label: 'This job', amount: Math.max(0, r.kept), sub: 'a week, after what it costs you' },
        right: { label: 'Your other option', amount: r.other, sub: `${num(r.hoursGiven)} hours x ${cents(v.altHourly)}` },
        lines: [tipping,
          r.ahead >= 0 ? `Over a year you come out ${money(r.ahead * 52)} ahead of your other option.` : `Over a year you come out ${money(-r.ahead * 52)} behind your other option.`,
          `It takes ${num(r.hoursGiven)} hours of your week, not ${num(v.hours)}.`],
        working: [['Kept each week', `${money(v.takeHome)} - ${money(v.costs || 0)} = ${money(r.kept)}`], ['Hours given', `${num(v.hours)} + ${num(v.extraHours || 0)} = ${num(r.hoursGiven)}`], ['Stated hourly rate', `${money(v.takeHome)} / ${num(v.hours)} = ${cents(r.statedHourly)}`], ['Real hourly rate', `${money(r.kept)} / ${num(r.hoursGiven)} = ${cents(r.realHourly)}`], ['Other option, same hours', `${num(r.hoursGiven)} x ${cents(v.altHourly)} = ${money(r.other)}`], ['Ahead each week', money(r.ahead)], ['Break-even job costs', money(Math.max(0, r.breakEvenCosts))]],
      };
    },
    protection(v) {
      const r = W.evaluateSimple({ kind: 'protection', price: v.price, chance: v.chance, payout: v.payout, cushion: v.cushion });
      const headline = r.worthOnAverage ? 'On average it pays back more than it costs.'
        : r.canAbsorb ? `You could cover this yourself, and on average it costs you ${money(r.extraCost)} more than it returns.`
          : `It costs ${money(r.extraCost)} more than it returns on average. What you are buying is not having to face a ${money(v.payout)} bill.`;
      return {
        tone: r.tone, verdict: r.verdict, headline,
        left: { label: 'You pay', amount: r.paid, sub: 'for certain' },
        right: { label: 'You get back', amount: r.back, sub: `on average: ${pct(v.chance)} of ${money(v.payout)}` },
        lines: [
          `For every $1 you pay, you get back ${cents(r.perDollar)} on average.`,
          `The price would be fair if the chance were ${pct(r.breakEvenChance)}. You put ${pct(v.chance)}.`,
          r.canAbsorb ? `A ${money(v.payout)} bill is within the ${money(v.cushion)} you said you could handle.`
            : `A ${money(v.payout)} bill is more than the ${money(v.cushion)} you said you could handle.`,
        ],
        working: [['You pay', money(r.paid)], ['Chance x payout', `${pct(v.chance)} x ${money(v.payout)} = ${money(r.back)}`], ['Back per $1 paid', cents(r.perDollar)], ['Break-even chance', `${money(v.price)} / ${money(v.payout)} = ${pct(r.breakEvenChance)}`], ['Costs more than it returns by', money(r.extraCost)]],
      };
    },
    bet(v) {
      const times = v.times || 1;
      const r = W.evaluateSimple({ kind: 'bet', price: v.price, times, chance: v.chance, payout: v.payout, otherPayback: v.otherPayback || 0 });
      return {
        tone: r.tone, verdict: r.verdict,
        headline: r.worthOnAverage ? `On average you come out ${money(-r.extraCost)} ahead.` : `Expect to lose ${money(r.extraCost)} of the ${money(r.paid)}.`,
        left: { label: 'You pay', amount: r.paid, sub: times > 1 ? `${num(times)} x ${money(v.price)}` : 'for certain' },
        right: { label: 'You get back', amount: r.back, sub: 'on average' },
        lines: [
          `For every $1 you pay, you get back ${cents(r.perDollar)} on average.`,
          `Your chance of the prize on one go is ${W.oneIn(v.chance)}.`,
          r.worthOnAverage ? 'Check the numbers twice: a bet that pays on average is rare.' : `If you play, treat the ${money(r.extraCost)} as the price of the fun.`,
        ],
        working: [['You pay', `${num(times)} x ${money(v.price)} = ${money(r.paid)}`], ['Average back per go', `${W.oneIn(v.chance)} of ${money(v.payout)}${v.otherPayback ? ` + ${cents(v.otherPayback)}` : ''} = ${cents(r.backPerGo)}`], ['Average back in all', money(r.back)], ['Back per $1 paid', cents(r.perDollar)], ['Expected loss', money(r.extraCost)]],
      };
    },
    subscription(v) {
      const r = W.evaluateUse({ mode: 'sub', price: v.price, uses: v.uses, altPrice: v.altPrice });
      return {
        tone: r.tone, verdict: r.verdict,
        headline: `It costs you ${cents(r.costPerUse)} a use. Paying each time would be ${cents(v.altPrice)}.`,
        left: { label: 'You pay', amount: r.netCost, sub: 'each month' },
        right: { label: 'What you use is worth', amount: r.altCost, sub: `${num(v.uses)} x ${cents(v.altPrice)}` },
        lines: [
          `It pays for itself at ${num(Math.ceil(r.breakEvenUses - 1e-9))} uses a month. You put ${num(v.uses)}.`,
          r.saving >= 0 ? `Over a year that is ${money(r.saving * 12)} saved.` : `Over a year that is ${money(-r.saving * 12)} spent for nothing.`,
        ],
        working: [['Cost per use', `${money(v.price)} / ${num(v.uses)} = ${cents(r.costPerUse)}`], ['Uses to break even', `${money(v.price)} / ${cents(v.altPrice)} = ${num(+r.breakEvenUses.toFixed(2))}`], ['Worth of what you use', `${num(v.uses)} x ${cents(v.altPrice)} = ${money(r.altCost)}`], ['Difference each month', money(r.saving)]],
      };
    },
    buy(v) {
      const r = W.evaluateUse({ mode: 'buy', price: v.price, resale: v.resale || 0, years: v.years, uses: v.uses, altPrice: v.altPrice });
      return {
        tone: r.tone, verdict: r.verdict,
        headline: `It costs you ${cents(r.costPerUse)} a use. The other way is ${cents(v.altPrice)}.`,
        left: { label: 'Buying costs', amount: r.netCost, sub: v.resale ? `${money(v.price)} less ${money(v.resale)} back` : 'in all' },
        right: { label: 'Paying each time', amount: r.altCost, sub: `${num(r.totalUses)} x ${cents(v.altPrice)}` },
        lines: [
          `It pays for itself after ${num(Math.ceil(r.breakEvenUses - 1e-9))} uses. You expect ${num(r.totalUses)}.`,
          r.saving >= 0 ? `Buying saves you ${money(r.saving)} over the ${num(v.years)} years.` : `Buying costs you ${money(-r.saving)} more over the ${num(v.years)} years.`,
        ],
        working: [['Net cost', `${money(v.price)} - ${money(v.resale || 0)} = ${money(r.netCost)}`], ['Total uses', `${num(v.uses)} x ${num(v.years)} = ${num(r.totalUses)}`], ['Cost per use', `${money(r.netCost)} / ${num(r.totalUses)} = ${cents(r.costPerUse)}`], ['Uses to break even', num(+r.breakEvenUses.toFixed(2))], ['Paying each time', money(r.altCost)]],
      };
    },
    loan(v) {
      const r = W.evaluateLoan({ get: v.get, payBack: v.payBack, days: v.days, itemValue: v.itemValue || 0, chanceLose: v.chanceLose || 0, altRate: v.altRate || 0 });
      const pawn = v.itemValue > 0;
      const lines = [`The fee is ${money(r.fee)} on ${money(v.get)} for ${num(v.days)} days.`];
      if (pawn) lines.push(`With a ${pct(v.chanceLose)} chance of losing an item worth ${money(v.itemValue)}, the expected cost is ${money(r.expectedCost)}.`);
      lines.push(r.fee === 0 ? 'No fee, as long as every payment is on time. Late fees change the answer.'
        : v.altRate > 0 ? `The same money at ${pct(v.altRate)} a year would cost ${money(r.altCost)}.` : 'You gave no cheaper option to compare with.');
      return {
        tone: r.fee === 0 ? 'good' : r.tone, verdict: r.fee === 0 ? 'Costs nothing if paid on time' : r.verdict,
        headline: r.fee === 0 ? 'You pay back exactly what you got.' : `That is ${pct(r.apr)} a year.`,
        left: { label: 'Your other option', amount: r.altCost, sub: `at ${pct(v.altRate || 0)} a year` },
        right: { label: 'This deal', amount: r.expectedCost, sub: pawn ? 'expected cost' : 'the fee' },
        lines,
        working: [['Fee', `${money(v.payBack)} - ${money(v.get)} = ${money(r.fee)}`], ['Yearly rate', `${money(r.fee)} / ${money(v.get)} x 365 / ${num(v.days)} = ${pct(r.apr)}`], ...(pawn ? [['Loss if you cannot repay', `${money(v.itemValue)} - ${money(v.get)} = ${money(r.forfeitLoss)}`], ['Expected cost', money(r.expectedCost)]] : []), ['Other option would cost', money(r.altCost)]],
      };
    },
    invest(v) {
      const DISCOUNT = 0.03;      // later dollars count a little less; stated on the page
      const r = W.evaluateInvest({ upfront: v.upfront, yearsToFinish: v.yearsToFinish || 0, lostIncomePerYear: v.lostIncomePerYear || 0, extraPerYear: v.extraPerYear, chance: v.chance, benefitYears: v.benefitYears, discount: DISCOUNT });
      const back = r.cost + r.net;
      return {
        tone: r.tone, verdict: r.verdict,
        headline: r.paybackAt !== null ? `It has paid for itself by year ${r.paybackAt}.` : `It does not pay for itself within ${num((v.yearsToFinish || 0) + v.benefitYears)} years.`,
        left: { label: 'It costs', amount: r.cost, sub: v.lostIncomePerYear ? 'cost plus pay given up' : 'up front' },
        right: { label: 'It brings back', amount: back, sub: "in today's money" },
        lines: [
          `Counting the ${pct(v.chance)} chance it works out, it brings in ${money(r.gainPerYear)} a year on average.`,
          r.net >= 0 ? `Over the whole period you come out ${money(r.net)} ahead.` : `Over the whole period you come out ${money(-r.net)} behind.`,
          'Later years are counted a little less (3% a year), because money now can be saved.',
        ],
        working: [['Total cost', `${money(v.upfront)} + ${money(v.lostIncomePerYear || 0)} x ${num(v.yearsToFinish || 0)} = ${money(r.cost)}`], ['Average gain per year', `${pct(v.chance)} x ${money(v.extraPerYear)} = ${money(r.gainPerYear)}`], ['Simple payback', Number.isFinite(r.paybackYears) ? `${num(+r.paybackYears.toFixed(1))} years` : 'never'], ['Brought back, discounted at 3%', money(back)], ['Net', money(r.net)]],
      };
    },
  };
  ANSWER.pawn = ANSWER.loan;

  // Two ways of having the same thing. The words differ; the sum is one.
  const versus = (words) => (v, name) => {
    const r = W.evaluateVersus({ priceA: v.priceA, yearsA: v.yearsA, runA: v.runA || 0, chanceA: v.chanceA || 0, priceB: v.priceB, yearsB: v.yearsB, runB: v.runB || 0, resaleB: v.resaleB || 0 });
    const said = String(name || '').trim().replace(/^(a|an|the|my|this)\s+/i, '');
    const lines = [
      r.mostAcanCost > 0 ? `${words.aWins} as long as ${words.aPrice} is under ${money(r.mostAcanCost)}. You put ${money(v.priceA)}.` : `${words.bNoun} costs less a year than the upkeep alone on the other.`,
      `${words.aPriceCap} is ${pct(r.shareOfB)} of the price of a new one.`,
    ];
    if (v.chanceA > 0) lines.push(`That counts a ${pct(v.chanceA)} chance of paying ${money(v.priceA)} and not getting the years.`);
    return {
      tone: r.tone,
      verdict: r.winner === null ? 'Close call' : r.winner === 'A' ? words.aVerdict : 'Buy new',
      headline: `${words.aHead(said)} costs ${money(r.perYearA)} a year. A new one costs ${money(r.perYearB)} a year.`,
      left: { label: words.aLabel, amount: r.perYearA, sub: 'a year' },
      right: { label: 'New', amount: r.perYearB, sub: 'a year' },
      lines,
      working: [[`${words.aLabel}, per year`, `${money(v.priceA)} / (${num(v.yearsA)} x ${pct(1 - Math.min(0.99, v.chanceA || 0))}) + ${money(v.runA || 0)} = ${money(r.perYearA)}`], ['New, per year', `(${money(v.priceB)} - ${money(v.resaleB || 0)}) / ${num(v.yearsB)} + ${money(v.runB || 0)} = ${money(r.perYearB)}`], ['Difference a year', money(r.aheadPerYear)], [`Most ${words.aPrice} can be`, `(${money(r.perYearB)} - ${money(v.runA || 0)}) x ${num(v.yearsA)} x ${pct(1 - Math.min(0.99, v.chanceA || 0))} = ${money(r.mostAcanCost)}`]],
    };
  };
  ANSWER.fix = versus({ aVerdict: 'Fix it', aLabel: 'Fixed', aHead: (said) => (said ? `Fixing the ${said}` : 'Fixing it'), aWins: 'Fixing wins', aPrice: 'the repair', aPriceCap: 'The repair', bNoun: 'A new one' });
  ANSWER.used = versus({ aVerdict: 'Buy used', aLabel: 'Used', aHead: (said) => `A used ${said || 'one'}`, aWins: 'Used wins', aPrice: 'the used price', aPriceCap: 'The used price', bNoun: 'A new one' });

  // WHICH LINE IS THE TIPPING POINT. Most answers include one line that says
  // what would have to change for the answer to flip. The page shows that line
  // on its own, labelled, so this says where it is in each kind of answer.
  // -1 means that kind of answer has no tipping point to show.
  const first = () => 0;
  const startsWith = (...openings) => (lines) => lines.findIndex((l) => openings.some((o) => l.startsWith(o)));
  const TIP_LINE = {
    saving: first, own: first, addons: first, job: first, fix: first, used: first, subscription: first, buy: first, outing: first,
    protection: () => 1,
    wait: startsWith('Waiting only pays if', 'Waiting does not pay even', 'Waiting pays even'),
    finance: startsWith('Borrowing only wins if', 'Borrowing is no dearer'),
  };

  // The whole job: slots in, answer out.
  // `name` is what the person calls their own item, on the scenarios that ask for it.
  function answer(kindId, raw, labels, name) {
    const got = readAll(kindId, raw, labels);
    if (got.missing) return { incomplete: true, missing: got.missing };
    const a = ANSWER[kindId](got.values, name, labels);
    a.tip = TIP_LINE[kindId] ? TIP_LINE[kindId](a.lines) : -1;
    return a;
  }

  const api = { answer, readAll, read };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.WorthAnswer = api;
})(typeof window !== 'undefined' ? window : this);
