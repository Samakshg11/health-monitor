const { Pool } = require('pg');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is missing — PostgreSQL will not connect');
}

// Configure SSL based on environment variables
const sslConfig =
  process.env.DATABASE_SSL === 'false'
    ? false
    : process.env.NODE_ENV === 'production' || process.env.DATABASE_SSL === 'true'
    ? { rejectUnauthorized: false }
    : false;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig,
});

pool.on('error', (err) => {
  console.error('❌ Unexpected PostgreSQL pool error:', err.message);
});

module.exports = pool;
