require('dotenv').config();
const { pool } = require('../config/db');

const sampleEvents = [
  {
    what: "7 year birthday bash with limited merch, all-day specials, $2 Coors and BOGO burgers!",
    where: "Frazier's Long & Low",
    when: "Monday, February 2",
    datetime: "2026-02-02T12:00:00.000Z",
  },
  {
    what: "Jo's 19th Annual Chili Cook-Off! Free to attend, and $25 tasting wristband = try everything and vote for a winner. Live music and activities too. Benefiting food insecurity in Austin!",
    where: "Jo's Coffee, 1300 South Congress",
    when: "Sunday 2/1, Noon-3pm",
    datetime: "2026-02-01T17:00:00.000Z",
  },
  {
    what: "FREE Honey Butter Chicken Biscuits! No catch and no strings attached. Drive-thru or walk-in. One per person.",
    where: "Whataburger",
    when: "Wednesday 2/4, 6am til 11am",
    datetime: "2026-02-04T12:00:00.000Z",
  },
  {
    what: "A full moon, the 'Snow Moon'",
    where: "The sky lol",
    when: "Sunday 2/1, 4:09pm peak",
    datetime: "2026-02-01T22:09:00.000Z",
  },
  {
    what: "The much-anticipated Wishbone Bridge and Unity Underpass - the newest part of the Butler Hike & Bike Trail AKA the connecting/completion of the Lady Bird Lake trail at the Pleasant Valley bridge!",
    where: "Austin, Texas",
    when: "Opening Saturday, February 7",
    datetime: "2026-02-07T12:00:00.000Z",
  },
  {
    what: "$323 round-trip flights on Copa Airlines",
    where: "Austin, Texas --> Lima, Peru",
    when: "February-May",
    datetime: null,
  },
  {
    what: "Four Record Friday - FRENCH DANCE EDITION (plus French artisan market). 1) Phoenix - 'Wolfgang Amadeus Phoenix' 2) M83 - 'Hurry Up, We're Dreaming' 3) Daft Punk - 'Random Access Memories' 4) Justice - '†'",
    where: "Justine's, 4710 E. 5th",
    when: "Friday 1/30, 7-11pm",
    datetime: "2026-01-31T01:00:00.000Z",
  },
  {
    what: "'Live From New York! The Lorne Michaels Collection' - an exhibition showcasing materials donated by SNL creator LORNE MICHAELS and featuring an archive from his career in TV and the 50-year history of SNL! Open thru March 20th.",
    where: "Harry Ransom Center in Austin",
    when: "Free admission every Tuesday-Sunday",
    datetime: null,
  },
  {
    what: "Aba's new sister restaurant, Ēma! Menu of Mediterranean small plates from Top Chef alum CJ Jacobson. Reservations now available!",
    where: "The Domain",
    when: "Opening Saturday, January 31",
    datetime: "2026-01-31T12:00:00.000Z",
  },
  {
    what: "Swedish Hill Downtown!",
    where: "415 Colorado (5th & Colorado)",
    when: "Now Open",
    datetime: null,
  },
  {
    what: "$1 PHO and $1 BOBA for Pho Please's 10th birthday!",
    where: "Pho Please, 1920 E. Riverside",
    when: "Saturday 1/31, 11am-6pm",
    datetime: "2026-01-31T17:00:00.000Z",
  },
  {
    what: "$5 MARGS ALL DAY, EVERY FLAVOR",
    where: "Hopdoddy - all locations",
    when: "Now through Sunday",
    datetime: null,
  },
  {
    what: "6-year anniversary! $6 margarita + tequila shot combos (get both for $6). $6 food menu. FREE TATTOS 2-4pm. Free gift bags.",
    where: "The Lucky Duck, 1300 E. 6th",
    when: "Sunday, February 1 (doors at Noon)",
    datetime: "2026-02-01T18:00:00.000Z",
  },
  {
    what: "FREE CRAWFISH BOIL - first drop 2pm, first come first served. Also $1 frozen margs and $2 beers from Noon-2pm.",
    where: "Bungalow, 83 Rainey",
    when: "Saturday, January 31 (doors at Noon)",
    datetime: "2026-01-31T18:00:00.000Z",
  },
  {
    what: "LE GARAGE SALE - deep discounts on designer clothes and goods from hundreds of fan-favorite local boutiques and designers (everything a fraction of normal cost)",
    where: "Palmer Events Center",
    when: "Saturday 1/24 + Sunday 1/25",
    datetime: "2026-01-24T12:00:00.000Z",
  },
];

async function seed() {
  for (const event of sampleEvents) {
    await pool.query(
      `INSERT INTO events (what, "where", "when", datetime) VALUES ($1, $2, $3, $4)`,
      [event.what, event.where, event.when, event.datetime]
    );
  }
  const { rows } = await pool.query('SELECT id, what, "where", "when", datetime FROM events ORDER BY datetime NULLS LAST');
  console.log('Inserted', sampleEvents.length, 'sample events. Current events:');
  rows.forEach((r) => console.log(' -', r.what.slice(0, 50) + '...', '|', r.where, '|', r.when || r.datetime));
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});