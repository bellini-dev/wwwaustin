require('dotenv').config();
const { confirmProdDb } = require('./confirm-prod');
const { pool } = require('../config/db');

const sampleEvents = [
  {
    what: "7 year birthday bash with limited merch, all-day specials, $2 Coors and BOGO burgers!",
    where: "Frazier's Long & Low",
    datetime: "2026-02-02T12:00:00.000Z",
    free_food: true,
    free_drinks: true,
  },
  {
    what: "Jo's 19th Annual Chili Cook-Off! Free to attend, and $25 tasting wristband = try everything and vote for a winner. Live music and activities too. Benefiting food insecurity in Austin!",
    where: "Jo's Coffee, 1300 South Congress",
    datetime: "2026-02-01T12:00:00.000Z",
    free_food: true,
    free_drinks: false,
  },
  {
    what: "7 year birthday bash with limited merch, all-day specials, $2 Coors and BOGO burgers!",
    where: "Frazier's Long & Low",
    datetime: "2026-02-02T12:00:00.000Z",
    free_food: true,
    free_drinks: true,
  },
  {
    what: "Jo's 19th Annual Chili Cook-Off! Free to attend, and $25 tasting wristband = try everything and vote for a winner. Live music and activities too. Benefiting food insecurity in Austin!",
    where: "Jo's Coffee, 1300 South Congress",
    datetime: "2026-02-01T17:00:00.000Z",
    free_food: true,
    free_drinks: false,
  },
  {
    what: "FREE Honey Butter Chicken Biscuits! No catch and no strings attached. Drive-thru or walk-in. One per person.",
    where: "Whataburger",
    datetime: "2026-02-04T12:00:00.000Z",
    free_food: true,
    free_drinks: false,
  },
  {
    what: "A full moon, the 'Snow Moon'",
    where: "The sky lol",
    datetime: "2026-02-01T22:09:00.000Z",
    free_food: false,
    free_drinks: false,
  },
  {
    what: "The much-anticipated Wishbone Bridge and Unity Underpass - the newest part of the Butler Hike & Bike Trail AKA the connecting/completion of the Lady Bird Lake trail at the Pleasant Valley bridge!",
    where: "Austin, Texas",
    datetime: "2026-02-07T12:00:00.000Z",
    free_food: false,
    free_drinks: false,
  },
];

async function seed() {
  await confirmProdDb('db:seed');
  for (const event of sampleEvents) {
    await pool.query(
      `INSERT INTO events (what, "where", datetime, free_food, free_drinks) VALUES ($1, $2, $3, $4, $5)`,
      [event.what, event.where, event.datetime, event.free_food ?? false, event.free_drinks ?? false]
    );
  }
  const { rows } = await pool.query('SELECT id, what, "where", datetime, free_food, free_drinks FROM events ORDER BY datetime');
  console.log('Inserted', sampleEvents.length, 'sample events. Current events:');
  rows.forEach((r) => console.log(' -', r.what.slice(0, 50) + '...', '|', r.where, '|', r.datetime));
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
