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
      WHERE c.activo = true
    `;
    const vals = [];
    let paramIndex = 1;

    if (id_psicologo) { 
      sql += ` AND c.id_psicologo = $${paramIndex}`; 
      vals.push(id_psicologo); 
      paramIndex++;
    }
    if (estado) { 
      sql += ` AND c.estado = $${paramIndex}`;  
      vals.push(estado); 
      paramIndex++;
    }
    if (fecha) { 
      sql += ` AND DATE(c.fecha_hora) = $${paramIndex}`; 
      vals.push(fecha); 
      paramIndex++;
    }
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
    // CORRECCIÓN TOTAL: Se eliminó el "suicide" erróneo de la línea 49
    const [rows] = await pool.query(`
      SELECT c.*,
             p.nombre_completo AS paciente_nombre, p.ci AS paciente_ci,
             ps.nombre_completo AS psicologo_nombre
      FROM citas c
      JOIN pacientes  p  ON c.id_paciente  = p.id_paciente
      JOIN psicologos ps ON c.id_psicologo = ps.id_psicologo
      WHERE c.id_cita = $1
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
    const [conflict] = await pool.query(
      `SELECT id_cita FROM citas
       WHERE id_psicologo = $1 AND fecha_hora = $2 AND estado = 'programada' AND activo = true`,
      [id_psicologo, fecha_hora]
    );
    if (conflict.length) {
      return res.status(409).json({ error: 'Conflicto de horario: el psicólogo ya tiene una cita programada en esa fecha y hora' });
    }
    
    const [rows] = await pool.query(
      'INSERT INTO citas (id_paciente, id_psicologo, fecha_hora, motivo, estado, activo) VALUES ($1, $2, $3, $4, \'programada\', true) RETURNING id_cita',
      [id_paciente, id_psicologo, fecha_hora, motivo || null]
    );
    res.status(201).json({ id_cita: rows[0].id_cita, message: 'Cita agendada exitosamente' });
  } catch (err) {
    if (err.code === '23503' || err.message.includes('fk')) return res.status(400).json({ error: 'id_paciente o id_psicologo no existen' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/citas/:id
router.put('/:id', async (req, res) => {
  const { id_paciente, id_psicologo, fecha_hora, motivo, estado, activo } = req.body;
  try {
    if (fecha_hora && id_psicologo) {
      const [conflict] = await pool.query(
        `SELECT id_cita FROM citas
         WHERE id_psicologo = $1 AND fecha_hora = $2 AND estado = 'programada' AND activo = true AND id_cita != $3`,
        [id_psicologo, fecha_hora, req.params.id]
      );
      if (conflict.length) {
        return res.status(409).json({ error: 'Conflicto de horario: el psicólogo ya tiene una cita en esa fecha y hora' });
      }
    }
    
    const fields = [];
    const values = [];
    let paramIndex = 1;
    
    if (id_paciente !== undefined)  { fields.push(`id_paciente = $${paramIndex}`);  values.push(id_paciente); paramIndex++; }
    if (id_psicologo !== undefined) { fields.push(`id_psicologo = $${paramIndex}`); values.push(id_psicologo); paramIndex++; }
    if (fecha_hora !== undefined)   { fields.push(`fecha_hora = $${paramIndex}`);   values.push(fecha_hora); paramIndex++; }
    if (motivo !== undefined)       { fields.push(`motivo = $${paramIndex}`);       values.push(motivo); paramIndex++; }
    if (estado !== undefined)       { fields.push(`estado = $${paramIndex}`);       values.push(estado); paramIndex++; }
    if (activo !== undefined)       { fields.push(`activo = $${paramIndex}`);       values.push(activo === true || activo === 1); paramIndex++; }
    
    if (!fields.length) return res.status(400).json({ error: 'No se enviaron campos para actualizar' });
    
    values.push(req.params.id);
    await pool.query(`UPDATE citas SET ${fields.join(', ')} WHERE id_cita = $${paramIndex}`, values);
    res.json({ message: 'Cita actualizada exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/citas/:id
router.delete('/:id', async (req, res) => {
  try {
    await pool.query(`UPDATE citas SET activo = false, estado = 'cancelada' WHERE id_cita = $1`, [req.params.id]);
    res.json({ message: 'Cita cancelada exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/citas/stats/resumen
router.get('/stats/resumen', async (req, res) => {
  try {
    const [citasRows] = await pool.query(`
      SELECT
        COUNT(*) AS total_citas,
        SUM(CASE WHEN estado = 'programada' THEN 1 ELSE 0 END) AS programadas,
        SUM(CASE WHEN estado = 'realizada' THEN 1 ELSE 0 END)  AS realizadas,
        SUM(CASE WHEN estado = 'cancelada' THEN 1 ELSE 0 END)  AS canceladas
      FROM citas
    `);
    
    const [pacientesRows] = await pool.query('SELECT COUNT(*) AS total FROM pacientes WHERE activo = true');
    const [psicologosRows] = await pool.query('SELECT COUNT(*) AS total FROM psicologos WHERE activo = true');
    
    const totales = citasRows[0] || {};
    res.json({ 
      total_citas: parseInt(totales.total_citas || 0), 
      programadas: parseInt(totales.programadas || 0), 
      realizadas: parseInt(totales.realizadas || 0), 
      canceladas: parseInt(totales.canceladas || 0), 
      total_pacientes: parseInt(pacientesRows[0]?.total || 0), 
      total_psicologos: parseInt(psicologosRows[0]?.total || 0) 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
