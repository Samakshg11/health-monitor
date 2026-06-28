/**
 * db/init.js
 *
 * Creates the PostgreSQL `users` table if it does not already exist.
 * Called once at server startup — safe to re-run on every restart.
 *
 * Run standalone:  node db/init.js
 */
const pool = require('./postgres');

const SQL = `
  CREATE TABLE IF NOT EXISTS users (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name          VARCHAR(255),
    created_at    TIMESTAMP    DEFAULT NOW()
  );
`;

const initPostgres = async () => {
  try {
    await pool.query(SQL);
    console.log('✅ PostgreSQL users table ready');
  } catch (err) {
    console.error('❌ PostgreSQL init error:', err.message);
    // Don't crash the whole server — biometric routes still work via MongoDB.
  }
};

module.exports = initPostgres;

// Allow direct execution: `node db/init.js`
if (require.main === module) {
  initPostgres().then(() => process.exit(0));
}
