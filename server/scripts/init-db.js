require('dotenv').config();
const { confirmProdDb } = require('./confirm-prod');
const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function init() {
  await confirmProdDb('db:init');
  const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(sql);
  console.log('Database schema initialized.');
  await pool.end();
}

init().catch((err) => {
  console.error(err);
  process.exit(1);
});
