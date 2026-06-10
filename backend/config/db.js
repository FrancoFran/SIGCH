// backend/config/db.js
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port:     Number(process.env.DB_PORT) || 6543, // Usamos el puerto del pooler de Supabase
  ssl: {
    rejectUnauthorized: false // Requerido para conexiones seguras en la nube (Supabase/Vercel)
  }
});

// Mantener compatibilidad con la sintaxis .query que usabas en mysql2
module.exports = {
  query: (text, params) => pool.query(text, params).then(res => [res.rows, res])
};
