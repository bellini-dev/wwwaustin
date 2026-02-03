const { Pool } = require('pg');

const useProd = (process.env.DB_USE_PROD || '').toString().toLowerCase();
const connectionString =
  useProd === '1' || useProd === 'true' ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
});

module.exports = { pool };
