/**
 * One-time migration: convert RSVP status from yes/maybe to interested only.
 * Run: node scripts/migrate-rsvp-to-interested.js
 */
require('dotenv').config();
const { confirmProdDb } = require('./confirm-prod');
const { pool } = require('../config/db');

async function migrate() {
  await confirmProdDb('migrate-rsvp-to-interested');
  const client = await pool.connect();
  try {
    await client.query("UPDATE rsvps SET status = 'interested' WHERE status IN ('yes', 'maybe')");
    const { rows } = await client.query(
      "SELECT conname FROM pg_constraint WHERE conrelid = 'rsvps'::regclass AND contype = 'c'"
    );
    for (const { conname } of rows) {
      await client.query(`ALTER TABLE rsvps DROP CONSTRAINT "${conname}"`);
    }
    await client.query("ALTER TABLE rsvps ADD CONSTRAINT rsvps_status_check CHECK (status IN ('interested'))");
    console.log('Migration complete: RSVP status is now "interested" only.');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
