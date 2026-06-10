const express = require('express');
const router = express.Router();
const pool = require('../config/db');

function requireAdminOrRecepcion(req, res, next) {
  const rol = req.headers['x-user-rol'];

  if (rol !== 'administrador' && rol !== 'recepcionista') {
    return res.status(403).json({ error: 'No tiene permiso para gestionar recordatorios.' });
  }

  next();
}

router.get('/', requireAdminOrRecepcion, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        r.id_recordatorio,
        r.id_cita,
        c.fecha_hora,
        pa.nombre_completo AS paciente_nombre,
        ps.nombre_completo AS psicologo_nombre,
        r.tipo,
        r.mensaje,
        r.enviado,
        r.fecha_programada,
        r.fecha_envio,
        r.activo
      FROM recordatorios r
      INNER JOIN citas c ON r.id_cita = c.id_cita
      INNER JOIN pacientes pa ON c.id_paciente = pa.id_paciente
      INNER JOIN psicologos ps ON c.id_psicologo = ps.id_psicologo
      ORDER BY r.fecha_programada DESC
    `);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAdminOrRecepcion, async (req, res) => {
  const { id_cita, tipo, mensaje, fecha_programada } = req.body;

  if (!id_cita || !mensaje || !fecha_programada) {
    return res.status(400).json({ error: 'Cita, mensaje y fecha programada son obligatorios.' });
  }

  try {
    const [result] = await pool.query(`
      INSERT INTO recordatorios
        (id_cita, tipo, mensaje, enviado, fecha_programada, activo)
      VALUES (?, ?, ?, 0, ?, 1)
    `, [
      id_cita,
      tipo || 'recordatorio_24h',
      mensaje,
      fecha_programada
    ]);

    res.status(201).json({
      id_recordatorio: result.insertId,
      message: 'Recordatorio registrado correctamente.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/enviado', requireAdminOrRecepcion, async (req, res) => {
  try {
    await pool.query(`
      UPDATE recordatorios
      SET enviado = 1, fecha_envio = NOW()
      WHERE id_recordatorio = ?
    `, [req.params.id]);

    res.json({ message: 'Recordatorio marcado como enviado.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireAdminOrRecepcion, async (req, res) => {
  try {
    await pool.query(
      'UPDATE recordatorios SET activo = 0 WHERE id_recordatorio = ?',
      [req.params.id]
    );

    res.json({ message: 'Recordatorio desactivado correctamente.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
