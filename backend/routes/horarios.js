const express = require('express');
const router = express.Router();
const pool = require('../config/db');

function requireAdmin(req, res, next) {
  const rol = req.headers['x-user-rol'];

  if (rol !== 'administrador') {
    return res.status(403).json({
      error: 'Solo el administrador puede gestionar horarios.'
    });
  }

  next();
}

// GET /api/horarios — listar activos
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        h.id_horario,
        h.id_psicologo,
        p.nombre_completo AS psicologo_nombre,
        h.dia_semana,
        h.hora_inicio,
        h.hora_fin,
        h.activo,
        h.fecha_creacion
      FROM horarios_psicologo h
      INNER JOIN psicologos p ON h.id_psicologo = p.id_psicologo
      WHERE h.activo = 1
      ORDER BY 
        p.nombre_completo,
        FIELD(h.dia_semana,'lunes','martes','miercoles','jueves','viernes','sabado','domingo'),
        h.hora_inicio
    `);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/horarios/:id — obtener uno
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        id_horario,
        id_psicologo,
        dia_semana,
        hora_inicio,
        hora_fin,
        activo
      FROM horarios_psicologo
      WHERE id_horario = ?
    `, [req.params.id]);

    if (!rows.length) {
      return res.status(404).json({ error: 'Horario no encontrado.' });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/horarios — crear
router.post('/', requireAdmin, async (req, res) => {
  const { id_psicologo, dia_semana, hora_inicio, hora_fin } = req.body;

  if (!id_psicologo || !dia_semana || !hora_inicio || !hora_fin) {
    return res.status(400).json({
      error: 'Psicólogo, día, hora inicio y hora fin son obligatorios.'
    });
  }

  if (hora_inicio >= hora_fin) {
    return res.status(400).json({
      error: 'La hora de inicio debe ser menor que la hora fin.'
    });
  }

  try {
    const [result] = await pool.query(`
      INSERT INTO horarios_psicologo
        (id_psicologo, dia_semana, hora_inicio, hora_fin, activo)
      VALUES (?, ?, ?, ?, 1)
    `, [id_psicologo, dia_semana, hora_inicio, hora_fin]);

    res.status(201).json({
      id_horario: result.insertId,
      message: 'Horario registrado correctamente.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/horarios/:id — editar
router.put('/:id', requireAdmin, async (req, res) => {
  const { id_psicologo, dia_semana, hora_inicio, hora_fin, activo } = req.body;

  if (!id_psicologo || !dia_semana || !hora_inicio || !hora_fin) {
    return res.status(400).json({
      error: 'Psicólogo, día, hora inicio y hora fin son obligatorios.'
    });
  }

  if (hora_inicio >= hora_fin) {
    return res.status(400).json({
      error: 'La hora de inicio debe ser menor que la hora fin.'
    });
  }

  try {
    const [result] = await pool.query(`
      UPDATE horarios_psicologo
      SET 
        id_psicologo = ?,
        dia_semana = ?,
        hora_inicio = ?,
        hora_fin = ?,
        activo = ?
      WHERE id_horario = ?
    `, [
      id_psicologo,
      dia_semana,
      hora_inicio,
      hora_fin,
      activo === undefined ? 1 : activo,
      req.params.id
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Horario no encontrado.' });
    }

    res.json({ message: 'Horario actualizado correctamente.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/horarios/:id — baja lógica
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.query(
      'UPDATE horarios_psicologo SET activo = 0 WHERE id_horario = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Horario no encontrado.' });
    }

    res.json({ message: 'Horario desactivado correctamente.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
