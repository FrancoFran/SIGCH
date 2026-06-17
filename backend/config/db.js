// backend/config/db.js
const { Pool } = require('pg');

const maxPool = Number(process.env.DB_POOL_MAX) || (process.env.VERCEL ? 3 : 10);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  host: process.env.DATABASE_URL ? undefined : process.env.DB_HOST,
  user: process.env.DATABASE_URL ? undefined : process.env.DB_USER,
  password: process.env.DATABASE_URL ? undefined : process.env.DB_PASSWORD,
  database: process.env.DATABASE_URL ? undefined : process.env.DB_NAME,
  port: process.env.DATABASE_URL ? undefined : (Number(process.env.DB_PORT) || 5432),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: maxPool,
  idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS) || 30000,
  connectionTimeoutMillis: Number(process.env.DB_CONN_TIMEOUT_MS) || 2000
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection at:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('SIGINT', async () => {
  try {
    await pool.end();
    process.exit(0);
  } catch (e) {
    process.exit(1);
  }
});

module.exports = {
  query: async (text, params) => {
    try {
      const res = await pool.query(text, params);
      if (res.command === 'UPDATE' || res.command === 'DELETE') {
        return [{ affectedRows: res.rowCount, rowCount: res.rowCount }, res];
      }
      return [res.rows || [], res];
    } catch (err) {
      throw err;
    }
  },
  pool
};
