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
    const [pacientes] = await pool.query('SELECT COUNT(*) AS total FROM pacientes WHERE activo = 1');
    const [psicologos] = await pool.query('SELECT COUNT(*) AS total FROM psicologos WHERE activo = 1');
    const [usuarios] = await pool.query('SELECT COUNT(*) AS total FROM usuarios WHERE activo = 1');
    const [citas] = await pool.query('SELECT COUNT(*) AS total FROM citas');
    const [historiales] = await pool.query('SELECT COUNT(*) AS total FROM historial_clinico WHERE activo = 1');
    const [sesiones] = await pool.query('SELECT COUNT(*) AS total FROM sesiones_clinicas WHERE activo = 1');
    const [recordatorios] = await pool.query('SELECT COUNT(*) AS total FROM recordatorios WHERE activo = 1');

    res.json([
      { indicador: 'Pacientes activos', total: parseInt(pacientes[0].total || 0) },
      { indicador: 'Psicólogos activos', total: parseInt(psicologos[0].total || 0) },
      { indicador: 'Usuarios activos', total: parseInt(usuarios[0].total || 0) },
      { indicador: 'Citas registradas', total: parseInt(citas[0].total || 0) },
      { indicador: 'Historiales clínicos activos', total: parseInt(historiales[0].total || 0) },
      { indicador: 'Sesiones clínicas activas', total: parseInt(sesiones[0].total || 0) },
      { indicador: 'Recordatorios activos', total: parseInt(recordatorios[0].total || 0) }
    ]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/citas', requireAdmin, async (req, res) => {
  const { desde, hasta } = req.query;

  try {
    // CORRECCIÓN: Adaptación de validación de variables nulas parametrizadas de Postgres ($1, $2...)
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
      WHERE ($1::text IS NULL OR DATE(c.fecha_hora) >= $2::date)
        AND ($3::text IS NULL OR DATE(c.fecha_hora) <= $4::date)
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
