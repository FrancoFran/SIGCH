// backend/config/db.js
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port:     Number(process.env.DB_PORT) || 6543,
  ssl: {
    rejectUnauthorized: false
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

// ADAPTADOR DEFINTIVO: Emula el comportamiento exacto de mysql2.
// Cuando ejecutas pool.query(), interceptamos el resultado y devolvemos 
// un array donde la primera posición es el array de filas puras (.rows).
// Esto hace que la sintaxis `const [rows] = await pool.query(...)` funcione nativamente.
module.exports = {
  query: async (text, params) => {
    try {
      const res = await pool.query(text, params);
      
      // Si la consulta fue un UPDATE o DELETE, simulamos la propiedad affectedRows de MySQL
      // usando el rowCount real de PostgreSQL para que no tronen las validaciones de edición.
      if (res.command === 'UPDATE' || res.command === 'DELETE') {
        return [{ affectedRows: res.rowCount, rowCount: res.rowCount }, res];
      }
      
      // Para consultas SELECT e INSERT ordinarias, devolvemos las filas directamente
      return [res.rows || [], res];
    } catch (err) {
      // Re-lanzamos el error para que sea capturado por el try/catch de las rutas
      throw err;
    }
  }
};
