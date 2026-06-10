const express = require('express');
const router = express.Router();
const pool = require('../config/db');

function requireHistorialAccess(req, res, next) {
  const rol = req.headers['x-user-rol'];

  if (rol !== 'administrador' && rol !== 'psicologo') {
    return res.status(403).json({
      error: 'No tiene permiso para acceder al historial clínico'
    });
  }

  next();
}

router.get('/', requireHistorialAccess, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        h.id_historial,
        h.id_paciente,
        p.nombre_completo AS paciente_nombre,
        h.id_psicologo,
        ps.nombre_completo AS psicologo_nombre,
        h.fecha,
        h.diagnostico,
        h.tratamiento,
        h.observaciones,
        h.activo,
        h.fecha_registro
      FROM historial_clinico h
      INNER JOIN pacientes p ON h.id_paciente = p.id_paciente
      INNER JOIN psicologos ps ON h.id_psicologo = ps.id_psicologo
      ORDER BY h.fecha DESC, h.id_historial DESC
    `);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', requireHistorialAccess, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        id_historial,
        id_paciente,
        id_psicologo,
        fecha,
        diagnostico,
        tratamiento,
        observaciones,
        activo
      FROM historial_clinico
      WHERE id_historial = ?
    `, [req.params.id]);

    if (!rows.length) {
      return res.status(404).json({ error: 'Historial no encontrado' });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireHistorialAccess, async (req, res) => {
  const {
    id_paciente,
    id_psicologo,
    fecha,
    diagnostico,
    tratamiento,
    observaciones
  } = req.body;

  if (!id_paciente || !id_psicologo || !fecha || !diagnostico) {
    return res.status(400).json({
      error: 'Paciente, psicólogo, fecha y diagnóstico son obligatorios'
    });
  }

  try {
    const [result] = await pool.query(`
      INSERT INTO historial_clinico
        (id_paciente, id_psicologo, fecha, diagnostico, tratamiento, observaciones, activo)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `, [
      id_paciente,
      id_psicologo,
      fecha,
      diagnostico,
      tratamiento || null,
      observaciones || null
    ]);

    res.status(201).json({
      id_historial: result.insertId,
      message: 'Historial clínico registrado exitosamente'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', requireHistorialAccess, async (req, res) => {
  const {
    id_paciente,
    id_psicologo,
    fecha,
    diagnostico,
    tratamiento,
    observaciones,
    activo
  } = req.body;

  try {
    await pool.query(`
      UPDATE historial_clinico
      SET 
        id_paciente = ?,
        id_psicologo = ?,
        fecha = ?,
        diagnostico = ?,
        tratamiento = ?,
        observaciones = ?,
        activo = ?
      WHERE id_historial = ?
    `, [
      id_paciente,
      id_psicologo,
      fecha,
      diagnostico,
      tratamiento || null,
      observaciones || null,
      activo === undefined ? 1 : activo,
      req.params.id
    ]);

    res.json({ message: 'Historial clínico actualizado exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireHistorialAccess, async (req, res) => {
  try {
    await pool.query(
      'UPDATE historial_clinico SET activo = 0 WHERE id_historial = ?',
      [req.params.id]
    );

    res.json({ message: 'Historial clínico desactivado exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
