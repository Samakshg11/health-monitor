const { Pool } = require('pg');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is missing — PostgreSQL will not connect');
}

// Configure SSL based on environment variables.
// Some hosted/local Postgres URLs reject SSL even when NODE_ENV=production.
const initialSslConfig =
  process.env.DATABASE_SSL === 'false'
    ? false
    : process.env.NODE_ENV === 'production' || process.env.DATABASE_SSL === 'true'
    ? { rejectUnauthorized: false }
    : false;

const createPool = (ssl) => {
  const nextPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl,
  });

  nextPool.on('error', (err) => {
    console.error('❌ Unexpected PostgreSQL pool error:', err.message);
  });

  return nextPool;
};

const isSslUnsupportedError = (err) =>
  /does not support ssl connections/i.test(err?.message || '');

let pool = createPool(initialSslConfig);
let retriedWithoutSsl = false;

const query = async (...args) => {
  try {
    return await pool.query(...args);
  } catch (err) {
    const canRetryWithoutSsl =
      initialSslConfig &&
      process.env.DATABASE_SSL !== 'true' &&
      !retriedWithoutSsl &&
      isSslUnsupportedError(err);

    if (!canRetryWithoutSsl) {
      throw err;
    }

    retriedWithoutSsl = true;
    console.warn('⚠️ PostgreSQL rejected SSL; retrying with DATABASE_SSL=false behavior');
    await pool.end().catch(() => {});
    pool = createPool(false);
    return pool.query(...args);
  }
};

module.exports = {
  query,
  connect: (...args) => pool.connect(...args),
  end: (...args) => pool.end(...args),
};
