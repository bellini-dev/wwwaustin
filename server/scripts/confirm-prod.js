/**
 * Prompts for confirmation when running a DB script against the production database.
 * Use at the start of init-db, seed-events, migrate-*, create-admin, etc.
 *
 * Production is detected when you explicitly target prod:
 * - DB_USE_PROD=1 or DB_USE_PROD=true (then config/db.js uses DATABASE_URL_PROD)
 *
 * Local: npm run db:init  → uses DATABASE_URL, no prompt.
 * Prod:  DB_USE_PROD=1 npm run db:init  → uses DATABASE_URL_PROD, prompt then run.
 *
 * Usage: await confirmProdDb('db:init');
 */
const readline = require('readline');

function looksLikeProd() {
  const useProd = (process.env.DB_USE_PROD || '').toString().toLowerCase();
  return useProd === '1' || useProd === 'true';
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
    console.error('You are targeting the production database (DATABASE_URL_PROD).');
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
