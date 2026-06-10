// backend/routes/citas.js
const express = require('express');
const router  = express.Router();
const pool    = require('../config/db');

// GET /api/citas — con filtros opcionales
router.get('/', async (req, res) => {
  try {
    const { id_psicologo, estado, fecha } = req.query;
    let sql = `
      SELECT c.*,
             p.nombre_completo AS paciente_nombre, p.ci AS paciente_ci,
             ps.nombre_completo AS psicologo_nombre
      FROM citas c
      JOIN pacientes  p  ON c.id_paciente  = p.id_paciente
      JOIN psicologos ps ON c.id_psicologo = ps.id_psicologo
      WHERE 1=1
    `;
    const vals = [];
    if (id_psicologo) { sql += ' AND c.id_psicologo = ?'; vals.push(id_psicologo); }
    if (estado)       { sql += ' AND c.estado = ?';       vals.push(estado); }
    if (fecha)        { sql += ' AND DATE(c.fecha_hora) = ?'; vals.push(fecha); }
    sql += ' ORDER BY c.fecha_hora';
    const [rows] = await pool.query(sql, vals);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/citas/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.*,
             p.nombre_completo AS paciente_nombre, p.ci AS paciente_ci,
             ps.nombre_completo AS psicologo_nombre
      FROM citas c
      JOIN pacientes  p  ON c.id_paciente  = p.id_paciente
      JOIN psicologos ps ON c.id_psicologo = ps.id_psicologo
      WHERE c.id_cita = ?
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Cita no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/citas
router.post('/', async (req, res) => {
  const { id_paciente, id_psicologo, fecha_hora, motivo } = req.body;
  if (!id_paciente || !id_psicologo || !fecha_hora) {
    return res.status(400).json({ error: 'id_paciente, id_psicologo y fecha_hora son obligatorios' });
  }
  try {
    // Verificar conflicto de horario (mismo psicólogo, misma hora, estado programada)
    const [conflict] = await pool.query(
      `SELECT id_cita FROM citas
       WHERE id_psicologo = ? AND fecha_hora = ? AND estado = 'programada' AND activo = 1`,
      [id_psicologo, fecha_hora]
    );
    if (conflict.length) {
      return res.status(409).json({ error: 'Conflicto de horario: el psicólogo ya tiene una cita programada en esa fecha y hora' });
    }
    const [result] = await pool.query(
      'INSERT INTO citas (id_paciente, id_psicologo, fecha_hora, motivo) VALUES (?, ?, ?, ?)',
      [id_paciente, id_psicologo, fecha_hora, motivo || null]
    );
    res.status(201).json({ id_cita: result.insertId, message: 'Cita agendada exitosamente' });
  } catch (err) {
    if (err.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ error: 'id_paciente o id_psicologo no existen' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/citas/:id
router.put('/:id', async (req, res) => {
  const { id_paciente, id_psicologo, fecha_hora, motivo, estado, activo } = req.body;
  try {
    // Verificar conflicto al reprogramar
    if (fecha_hora && id_psicologo) {
      const [conflict] = await pool.query(
        `SELECT id_cita FROM citas
         WHERE id_psicologo = ? AND fecha_hora = ? AND estado = 'programada' AND activo = 1 AND id_cita != ?`,
        [id_psicologo, fecha_hora, req.params.id]
      );
      if (conflict.length) {
        return res.status(409).json({ error: 'Conflicto de horario: el psicólogo ya tiene una cita en esa fecha y hora' });
      }
    }
    const fields = [];
    const values = [];
    if (id_paciente !== undefined)  { fields.push('id_paciente = ?');  values.push(id_paciente); }
    if (id_psicologo !== undefined) { fields.push('id_psicologo = ?'); values.push(id_psicologo); }
    if (fecha_hora !== undefined)   { fields.push('fecha_hora = ?');   values.push(fecha_hora); }
    if (motivo !== undefined)       { fields.push('motivo = ?');       values.push(motivo); }
    if (estado !== undefined)       { fields.push('estado = ?');       values.push(estado); }
    if (activo !== undefined)       { fields.push('activo = ?');       values.push(activo); }
    if (!fields.length) return res.status(400).json({ error: 'No se enviaron campos para actualizar' });
    values.push(req.params.id);
    await pool.query(`UPDATE citas SET ${fields.join(', ')} WHERE id_cita = ?`, values);
    res.json({ message: 'Cita actualizada exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/citas/:id — cancelación lógica
router.delete('/:id', async (req, res) => {
  try {
    await pool.query(`UPDATE citas SET activo = 0, estado = 'cancelada' WHERE id_cita = ?`, [req.params.id]);
    res.json({ message: 'Cita cancelada exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/citas/stats/resumen — estadísticas para el panel admin
router.get('/stats/resumen', async (req, res) => {
  try {
    const [[totales]] = await pool.query(`
      SELECT
        COUNT(*) AS total_citas,
        SUM(estado = 'programada') AS programadas,
        SUM(estado = 'realizada')  AS realizadas,
        SUM(estado = 'cancelada')  AS canceladas
      FROM citas
    `);
    const [[pacientes]] = await pool.query('SELECT COUNT(*) AS total FROM pacientes WHERE activo = 1');
    const [[psicologos]] = await pool.query('SELECT COUNT(*) AS total FROM psicologos WHERE activo = 1');
    res.json({ ...totales, total_pacientes: pacientes.total, total_psicologos: psicologos.total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
