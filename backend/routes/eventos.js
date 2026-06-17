// backend/routes/eventos.js
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/roles');

/**
 * Normaliza el resultado de pool.query() usado en tu proyecto.
 * pool.query puede devolver [rows, res] o res con .rows.
 */
async function normalizeQueryResult(qres) {
  if (!qres) return [];
  if (Array.isArray(qres) && qres.length === 2 && Array.isArray(qres[0])) return qres[0];
  if (Array.isArray(qres) && qres.rows) return qres.rows;
  if (qres.rows) return qres.rows;
  if (Array.isArray(qres)) return qres;
  return [];
}

/**
 * GET /api/eventos
 * Query params opcionales:
 *  - start (ISO date)
 *  - end   (ISO date)
 *  - assigned=me  -> devuelve solo eventos asignados o creados por el usuario
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { start, end, assigned } = req.query;
    const params = [];
    let where = 'WHERE activo = true';

    if (start) {
      params.push(start);
      where += ` AND inicio >= $${params.length}`;
    }
    if (end) {
      params.push(end);
      where += ` AND inicio <= $${params.length}`;
    }
    if (assigned === 'me') {
      params.push(req.user.id_usuario);
      where += ` AND (asignado_a = $${params.length} OR creado_por = $${params.length})`;
    }

    const q = `SELECT id_evento, titulo, descripcion, inicio, fin, ubicacion, creado_por, asignado_a, tipo, creado_en, actualizado_en
               FROM eventos ${where}
               ORDER BY inicio`;
    const qres = await pool.query(q, params);
    const rows = await normalizeQueryResult(qres);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/eventos error:', err && err.stack ? err.stack : err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * POST /api/eventos
 * Crea un evento. Roles permitidos: administrador, recepcionista, psicologo
 */
router.post(
  '/',
  authMiddleware,
  requireRole('administrador', 'recepcionista', 'psicologo'),
  body('titulo').isString().trim().isLength({ min: 1 }),
  body('inicio').isISO8601(),
  body('fin').isISO8601(),
  body('ubicacion').optional().isString().trim(),
  body('descripcion').optional().isString().trim(),
  body('asignado_a').optional().isInt(),
  body('tipo').optional().isString().trim(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Datos inválidos', details: errors.array() });

    const { titulo, descripcion, inicio, fin, ubicacion, asignado_a, tipo } = req.body;

    // Validación lógica: fin > inicio
    if (new Date(fin) <= new Date(inicio)) {
      return res.status(400).json({ error: 'La fecha de fin debe ser posterior a la fecha de inicio' });
    }

    try {
      const insert = `INSERT INTO eventos (titulo, descripcion, inicio, fin, ubicacion, creado_por, asignado_a, tipo)
                      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id_evento`;
      const qres = await pool.query(insert, [
        titulo.trim(),
        descripcion || null,
        inicio,
        fin,
        ubicacion || null,
        req.user.id_usuario,
        asignado_a || null,
        tipo || null
      ]);
      const rows = await normalizeQueryResult(qres);
      const id = rows && rows[0] ? rows[0].id_evento : null;
      if (!id) return res.status(500).json({ error: 'No se pudo crear el evento' });

      const [created] = await pool.query('SELECT * FROM eventos WHERE id_evento = $1', [id]);
      res.status(201).json(created[0] || {});
    } catch (err) {
      console.error('POST /api/eventos error:', err && err.stack ? err.stack : err);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
);

/**
 * PUT /api/eventos/:id
 * Actualiza un evento. Permiten: administrador, creador del evento, asignado al evento.
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const [rows] = await pool.query('SELECT * FROM eventos WHERE id_evento = $1', [id]);
    if (!rows || !rows.length) return res.status(404).json({ error: 'Evento no encontrado' });
    const evento = rows[0];

    const isAdmin = String(req.user.rol).toLowerCase() === 'administrador';
    if (!isAdmin && evento.creado_por !== req.user.id_usuario && evento.asignado_a !== req.user.id_usuario) {
      return res.status(403).json({ error: 'Permiso denegado' });
    }

    const allowed = ['titulo','descripcion','inicio','fin','ubicacion','asignado_a','tipo','activo'];
    const fields = [];
    const values = [];
    let idx = 1;
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        // validación simple para fechas
        if ((key === 'inicio' || key === 'fin') && req.body[key] && isNaN(Date.parse(req.body[key]))) {
          return res.status(400).json({ error: `Campo ${key} no es una fecha válida` });
        }
        fields.push(`${key} = $${idx++}`);
        values.push(req.body[key]);
      }
    }

    if (fields.length === 0) return res.status(400).json({ error: 'No se enviaron campos para actualizar' });

    // Si actualizan inicio/fin, validar relación
    const newInicio = req.body.inicio ? new Date(req.body.inicio) : new Date(evento.inicio);
    const newFin = req.body.fin ? new Date(req.body.fin) : new Date(evento.fin);
    if (newFin <= newInicio) return res.status(400).json({ error: 'La fecha de fin debe ser posterior a la fecha de inicio' });

    values.push(id);
    const q = `UPDATE eventos SET ${fields.join(', ')}, actualizado_en = now() WHERE id_evento = $${idx}`;
    await pool.query(q, values);
    res.json({ message: 'Evento actualizado' });
  } catch (err) {
    console.error('PUT /api/eventos/:id error:', err && err.stack ? err.stack : err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * DELETE /api/eventos/:id
 * Desactiva (soft delete) un evento. Permiten: administrador o creador.
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const [rows] = await pool.query('SELECT * FROM eventos WHERE id_evento = $1', [id]);
    if (!rows || !rows.length) return res.status(404).json({ error: 'Evento no encontrado' });
    const evento = rows[0];

    const isAdmin = String(req.user.rol).toLowerCase() === 'administrador';
    if (!isAdmin && evento.creado_por !== req.user.id_usuario) {
      return res.status(403).json({ error: 'Permiso denegado' });
    }

    await pool.query('UPDATE eventos SET activo = false, actualizado_en = now() WHERE id_evento = $1', [id]);
    res.json({ message: 'Evento eliminado' });
  } catch (err) {
    console.error('DELETE /api/eventos/:id error:', err && err.stack ? err.stack : err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
