/**
 * Create an admin user. No API can create admins; run this script only.
 * Usage: node scripts/create-admin.js <email> <password>
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

async function createAdmin() {
  const email = process.argv[2];
  const password = process.argv[3];
  if (!email || !password) {
    console.error('Usage: node scripts/create-admin.js <email> <password>');
    process.exit(1);
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await pool.query(
    'INSERT INTO admin_users (email, password_hash) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET password_hash = $2',
    [email, passwordHash]
  );
  console.log('Admin created/updated:', email);
  await pool.end();
}

createAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});
