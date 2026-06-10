const express = require('express');
const router = express.Router();
const pool = require('../config/db');

function requireAdmin(req, res, next) {
  const rol = req.headers['x-user-rol'];

  if (rol !== 'administrador') {
    return res.status(403).json({ error: 'Solo el administrador puede ver reportes.' });
  }

  next();
}

router.get('/resumen', requireAdmin, async (req, res) => {
  try {
    const [[pacientes]] = await pool.query('SELECT COUNT(*) AS total FROM pacientes WHERE activo = 1');
    const [[psicologos]] = await pool.query('SELECT COUNT(*) AS total FROM psicologos WHERE activo = 1');
    const [[usuarios]] = await pool.query('SELECT COUNT(*) AS total FROM usuarios WHERE activo = 1');
    const [[citas]] = await pool.query('SELECT COUNT(*) AS total FROM citas');
    const [[historiales]] = await pool.query('SELECT COUNT(*) AS total FROM historial_clinico WHERE activo = 1');
    const [[sesiones]] = await pool.query('SELECT COUNT(*) AS total FROM sesiones_clinicas WHERE activo = 1');
    const [[recordatorios]] = await pool.query('SELECT COUNT(*) AS total FROM recordatorios WHERE activo = 1');

    res.json([
      { indicador: 'Pacientes activos', total: pacientes.total },
      { indicador: 'Psicólogos activos', total: psicologos.total },
      { indicador: 'Usuarios activos', total: usuarios.total },
      { indicador: 'Citas registradas', total: citas.total },
      { indicador: 'Historiales clínicos activos', total: historiales.total },
      { indicador: 'Sesiones clínicas activas', total: sesiones.total },
      { indicador: 'Recordatorios activos', total: recordatorios.total }
    ]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/citas', requireAdmin, async (req, res) => {
  const { desde, hasta } = req.query;

  try {
    const [rows] = await pool.query(`
      SELECT
        c.id_cita,
        c.fecha_hora,
        pa.nombre_completo AS paciente_nombre,
        ps.nombre_completo AS psicologo_nombre,
        c.motivo,
        c.estado,
        c.activo
      FROM citas c
      INNER JOIN pacientes pa ON c.id_paciente = pa.id_paciente
      INNER JOIN psicologos ps ON c.id_psicologo = ps.id_psicologo
      WHERE (? IS NULL OR DATE(c.fecha_hora) >= ?)
        AND (? IS NULL OR DATE(c.fecha_hora) <= ?)
      ORDER BY c.fecha_hora DESC
    `, [
      desde || null,
      desde || null,
      hasta || null,
      hasta || null
    ]);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
