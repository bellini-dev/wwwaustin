const { Pool } = require('pg');

const useProd = (process.env.DB_USE_PROD || '').toString().toLowerCase();
const connectionString =
  useProd === '1' || useProd === 'true' ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL;

if (connectionString) {
  try {
    const url = new URL(connectionString);
    const db = (url.pathname || '/').replace(/^\//, '') || '(default)';
    const host = url.hostname || url.host || '(unknown)';
    console.log(`Database: connecting to ${host}/${db}`);
  } catch {
    console.log('Database: connecting (connection string present)');
  }
} else {
  console.log('Database: no connection string set (DATABASE_URL / DATABASE_URL_PROD)');
}

const pool = new Pool({
  connectionString,
});

module.exports = { pool };
