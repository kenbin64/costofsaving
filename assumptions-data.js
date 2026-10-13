// Before you decide: what is worth checking.
//
// Each entry is a sound starting point for a decision, the thing worth checking
// before acting on it, and the calculator on this site that checks it with real
// figures. The list is written into assumptions.html and the front page by
// build-site.js, which also checks that every link points at a page or scenario
// that exists.
//
// The tone matters, and it is deliberate. This is a checklist to help someone
// make a decision well. It does not say that any practice is wrong, and it is
// not a criticism of the people who make these decisions. Every starting point
// below is usually right. The sum shows the cases where a second look pays.
'use strict';

const ASSUMPTIONS = [
  { id: 'owners', who: 'Running a business', lead: 'Where the saving has a line in the accounts and the things around it do not.', items: [
    { says: 'Reducing headcount saves the payroll.',
      then: 'It does. The other half of the sum is what that work was supporting: output, know-how, and the customers who deal with those people. Counting both gives the full result.',
      href: 'saving.html#layoff', link: 'Reduce headcount: the full cost' },
    { says: 'A cut saves the amount on its line.',
      then: 'The saving shows at once, in one place. Related costs can show up later, under other headings. Setting the two side by side makes the case for the decision stronger.',
      href: 'paper.html', link: 'Good on paper' },
    { says: 'A lower-priced supplier lowers costs.',
      then: 'Often it does. Worth checking alongside the price: defect rates, delivery times and rework, which land on other budgets.',
      href: 'saving.html#supplier', link: 'Switch to a cheaper supplier' },
    { says: 'Maintenance and training can be deferred.',
      then: 'Deferring them helps this quarter. Worth checking what the deferral is likely to cost later, and the chance of it.',
      href: 'saving.html#maintenance', link: 'Skip maintenance' },
    { says: 'Marketing is a flexible budget.',
      then: 'It is. The sales it supports thin out over months, not on the day of the change, so the full effect arrives after the saving is counted.',
      href: 'saving.html#marketing', link: 'Cut marketing' },
    { says: 'Choosing where the team works is a cost decision.',
      then: 'It is, with two bottom lines: the business\'s, and each person\'s. Seeing both helps pick the arrangement that holds.',
      href: 'where.html', link: 'On-site, hybrid or work from home?' },
    { says: 'A thorough hiring process lowers the risk of a hire that does not work out.',
      then: 'It does, and the early rounds do most of it. Worth finding the round where time to hire starts costing more than the extra certainty is worth.',
      href: 'barriers.html#five', link: 'How many interview rounds?' },
    { says: 'A requirement narrows the field to stronger candidates.',
      then: 'It narrows the field. Worth checking how many people who could do the job it also screens out, since each of those has to be found again.',
      href: 'barriers.html#degree', link: 'Should the role require a degree?' },
    { says: 'A screening test helps choose well.',
      then: 'How well depends on the test. Two tests of the same length can screen very differently, and the figures show which one earns its place.',
      href: 'barriers.html#worksample', link: 'A work-sample test' },
    { says: 'A small fee adds revenue.',
      then: 'It does for every customer who pays it. Worth knowing how many can be lost before the fee stops paying.',
      href: 'barriers.html#convenience', link: 'A convenience fee at checkout' },
    { says: 'More checks reduce risk.',
      then: 'They do, with diminishing returns: each added step has less left to catch. The figures show how many steps do the job.',
      href: 'barriers.html#compliance', link: 'Compliance checks for new customers' },
    { says: 'An approval step adds control.',
      then: 'It does. Worth counting the time of everyone who has to ask, to find the number of sign-offs that gives the control at the least cost.',
      href: 'barriers.html#approval', link: 'Sign-offs on a request' },
  ] },
  { id: 'employees', who: 'Working, or looking for work', lead: 'Where the headline figure is the wage, the payout or the offer.', items: [
    { says: 'The pay is what I make.',
      then: 'Commuting, childcare, clothes, meals and unpaid hours all come out of it. What is left, divided by the hours it really takes, is the wage.',
      href: 'earn.html#job', link: 'Is this job worth it?' },
    { says: 'What the app paid out is my income.',
      then: 'The car, the fuel and the tax come out first. The miles are the largest cost and the easiest one not to count.',
      href: 'gig.html', link: 'Gig work log' },
    { says: 'A second job is extra money.',
      then: 'It is extra hours first. After its own costs and tax, the hourly figure can be well under the first job\'s.',
      href: 'earn.html#job-side', link: 'A second job or side gig' },
    { says: 'A higher salary farther away is a raise.',
      then: 'The longer commute is paid for in money and in hours, every working day.',
      href: 'earn.html#job-far', link: 'A better-paid job farther away' },
    { says: 'Applying costs nothing.',
      then: 'It costs hours: forms, assignments and interview rounds. Knowing what a process asks for helps decide where to put them.',
      href: 'barriers.html#takehome', link: 'A take-home assignment' },
    { says: 'Doing it myself is free.',
      then: 'It costs your hours, the tools, and sometimes doing it twice.',
      href: 'cut.html#diy', link: 'Do it yourself, not hire someone' },
  ] },
  { id: 'customers', who: 'Buying something', lead: 'Where the headline figure is the price shown.', items: [
    { says: 'The price is the cost.',
      then: 'The advertised fare is for the bare seat. The bag, the seat next to your family and the fees are added afterwards.',
      href: 'index.html#flight', link: 'Is the cheap flight really cheaper?' },
    { says: 'The cheaper one is the better deal.',
      then: 'A lower price can buy a shorter life or higher running costs. Cost per year of use is the figure that compares.',
      href: 'index.html#new-or-used', link: 'Buy new or used?' },
    { says: 'Repairing it is cheaper than replacing it.',
      then: 'A repair buys a few more years of an old machine. Set against the years a new one lasts, the smaller bill can be the dearer choice.',
      href: 'index.html#fix-or-new', link: 'Fix it or buy new?' },
    { says: 'Putting it off costs nothing.',
      then: 'It costs nothing today. Some problems stay the same size while they wait, and some grow.',
      href: 'wait.html#car-repair', link: 'Put off a car repair' },
    { says: 'Paying monthly makes it affordable.',
      then: 'A smaller payment over a longer time is a larger total.',
      href: 'index.html#borrow-or-cash', link: 'Borrow or pay cash?' },
    { says: 'The extended warranty is peace of mind.',
      then: 'It is a price paid for a chance. Set against how often the thing fails and what a repair costs, it may or may not be worth it.',
      href: 'index.html#warranty', link: 'Extended warranty' },
    { says: 'It is only a few dollars a month.',
      then: 'A subscription is priced by the month and paid for by the year. What matters is the cost each time you use it.',
      href: 'index.html#gym', link: 'Gym membership' },
    { says: 'A day out costs the price of the ticket.',
      then: 'Travel, parking, food and extras often come to more than the tickets do.',
      href: 'index.html#park', link: 'Is the trip to the amusement park worth it?' },
    { says: 'The room rate is the room rate.',
      then: 'Resort fees, parking and taxes are added per night, after the comparison has been made.',
      href: 'index.html#hotel-fees', link: 'A hotel room with a resort fee' },
  ] },
];

if (typeof module !== 'undefined' && module.exports) module.exports = { ASSUMPTIONS };
