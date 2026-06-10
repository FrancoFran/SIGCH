// backend/routes/psicologos.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

function requireAdmin(req, res, next) {
  const rol = req.headers['x-user-rol'];

  if (rol !== 'administrador') {
    return res.status(403).json({
      error: 'Solo el administrador puede gestionar psicólogos.'
    });
  }

  next();
}

// GET /api/psicologos — listar solo activos
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        id_psicologo,
        id_usuario,
        nombre_completo,
        especialidad,
        registro_profesional,
        activo
      FROM psicologos
      WHERE activo = true
      ORDER BY id_psicologo
    `);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/psicologos/:id — obtener por id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        id_psicologo,
        id_usuario,
        nombre_completo,
        especialidad,
        registro_profesional,
        activo
      FROM psicologos
      WHERE id_psicologo = $1
    `, [req.params.id]);

    if (!rows.length) {
      return res.status(404).json({ error: 'Psicólogo no encontrado.' });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/psicologos — crear
router.post('/', requireAdmin, async (req, res) => {
  const {
    id_usuario,
    nombre_completo,
    especialidad,
    registro_profesional
  } = req.body;

  if (!id_usuario || !nombre_completo || !especialidad || !registro_profesional) {
    return res.status(400).json({
      error: 'Usuario, nombre, especialidad y registro profesional son obligatorios.'
    });
  }

  try {
    // CORRECCIÓN: Se cambió "1" por "true" al insertar
    const [rows] = await pool.query(`
      INSERT INTO psicologos
        (id_usuario, nombre_completo, especialidad, registro_profesional, activo)
      VALUES ($1, $2, $3, $4, true)
      RETURNING id_psicologo
    `, [
      id_usuario,
      nombre_completo,
      especialidad,
      registro_profesional
    ]);

    res.status(201).json({
      id_psicologo: rows[0].id_psicologo,
      message: 'Psicólogo registrado correctamente.'
    });
  } catch (err) {
    if (err.code === '23505' || err.message.includes('unique constraint')) {
      return res.status(409).json({
        error: 'Ese usuario o registro profesional ya está asignado.'
      });
    }

    res.status(500).json({ error: err.message });
  }
});

// PUT /api/psicologos/:id — editar
router.put('/:id', requireAdmin, async (req, res) => {
  const {
    id_usuario,
    nombre_completo,
    especialidad,
    registro_profesional,
    activo
  } = req.body;

  if (!id_usuario || !nombre_completo || !especialidad || !registro_profesional) {
    return res.status(400).json({
      error: 'Usuario, nombre, especialidad y registro profesional son obligatorios.'
    });
  }

  try {
    const isActivo = activo === undefined ? true : (activo === true || activo === 1 || activo === 'true');

    const [result] = await pool.query(`
      UPDATE psicologos
      SET 
        id_usuario = $1,
        nombre_completo = $2,
        especialidad = $3,
        registro_profesional = $4,
        activo = $5
      WHERE id_psicologo = $6
    `, [
      id_usuario,
      nombre_completo,
      especialidad,
      registro_profesional,
      isActivo,
      req.params.id
    ]);

    if (result.affectedRows === 0 || result.rowCount === 0) {
      return res.status(404).json({ error: 'Psicólogo no encontrado.' });
    }

    res.json({ message: 'Psicólogo actualizado correctamente.' });
  } catch (err) {
    if (err.code === '23505' || err.message.includes('unique constraint')) {
      return res.status(409).json({
        error: 'Ese usuario o registro profesional ya está asignado.'
      });
    }

    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/psicologos/:id — baja lógica
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const idPsicologo = Number(req.params.id);

    const [result] = await pool.query(
      'UPDATE psicologos SET activo = false WHERE id_psicologo = $1',
      [idPsicologo]
    );

    if (result.affectedRows === 0 || result.rowCount === 0) {
      return res.status(404).json({
        error: 'No se encontró el psicólogo.'
      });
    }

    res.json({
      message: 'Psicólogo desactivado correctamente.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
