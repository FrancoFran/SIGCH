// backend/config/db.js
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 5432,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: Number(process.env.DB_POOL_MAX) || 10,
  idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS) || 30000,
  connectionTimeoutMillis: Number(process.env.DB_CONN_TIMEOUT_MS) || 2000
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
