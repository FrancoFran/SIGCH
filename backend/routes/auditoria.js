const express = require('express');
const router = express.Router();
const pool = require('../config/db');

function requireAdmin(req, res, next) {
  const rol = req.headers['x-user-rol'];

  if (rol !== 'administrador') {
    return res.status(403).json({ error: 'Solo el administrador puede ver auditoría.' });
  }

  next();
}

router.get('/', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        id_auditoria,
        id_usuario,
        usuario_nombre,
        rol,
        modulo,
        accion,
        descripcion,
        ip,
        fecha
      FROM auditoria
      ORDER BY fecha DESC
      LIMIT 200
    `);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { modulo, accion, descripcion } = req.body;

  try {
    // CORRECCIÓN: Marcadores cambiados a $1, $2... para compatibilidad con PostgreSQL
    await pool.query(`
      INSERT INTO auditoria
        (id_usuario, usuario_nombre, rol, modulo, accion, descripcion, ip)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      req.headers['x-user-id'] || null,
      req.headers['x-user-name'] || null,
      req.headers['x-user-rol'] || null,
      modulo || 'Sistema',
      accion || 'Acción',
      descripcion || null,
      req.ip || null
    ]);

    res.status(201).json({ message: 'Auditoría registrada.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
