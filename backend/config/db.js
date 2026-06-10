// backend/config/db.js
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port:     Number(process.env.DB_PORT) || 6543, // Puerto del pooler IPv4 de Supabase
  ssl: {
    rejectUnauthorized: false // Requerido para conexiones seguras en infraestructura en la nube
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

// Envoltura para mantener la compatibilidad exacta con la sintaxis de desestructuración [rows] usada en el backend
module.exports = {
  query: (text, params) => pool.query(text, params).then(res => [res.rows, res])
};
