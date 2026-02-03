/**
 * Prompts for confirmation when running a DB script against a production-like database.
 * Use at the start of init-db, seed-events, migrate-*, create-admin, etc.
 *
 * Production is detected when:
 * - NODE_ENV === 'production', or
 * - DATABASE_URL contains 'prod' or 'production' (case-insensitive), or
 * - DB_TARGET=prod is set
 *
 * Usage: await confirmProdDb('db:init');
 */
const readline = require('readline');

function looksLikeProd() {
  const url = (process.env.DATABASE_URL || '').toLowerCase();
  const nodeEnv = (process.env.NODE_ENV || '').toLowerCase();
  const dbTarget = (process.env.DB_TARGET || '').toLowerCase();
  if (nodeEnv === 'production') return true;
  if (dbTarget === 'prod' || dbTarget === 'production') return true;
  if (url.includes('prod') || url.includes('production')) return true;
  return false;
}

function confirmProdDb(scriptName) {
  return new Promise((resolve, reject) => {
    if (!looksLikeProd()) {
      resolve();
      return;
    }
    console.error('');
    console.error('*** WARNING: PRODUCTION DATABASE ***');
    console.error('You are about to run:', scriptName);
    console.error('DATABASE_URL appears to point at a production database.');
    console.error('');
    console.error('This can overwrite or change production data.');
    console.error("Type 'yes' and press Enter to continue, or press Ctrl+C / enter anything else to abort.");
    console.error('');
    const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
    rl.question('Continue? Type "yes": ', (answer) => {
      rl.close();
      const ok = (answer || '').trim().toLowerCase() === 'yes';
      if (!ok) {
        console.error('Aborted. No changes made.');
        process.exit(0);
      }
      resolve();
    });
  });
}

module.exports = { confirmProdDb, looksLikeProd };
