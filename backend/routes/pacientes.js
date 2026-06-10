const express = require('express');
const router = express.Router();
const pool = require('../config/db');

function requireAdminOrRecepcion(req, res, next) {
  const rol = req.headers['x-user-rol'];

  if (rol !== 'administrador' && rol !== 'recepcionista') {
    return res.status(403).json({
      error: 'No tiene permiso para gestionar pacientes.'
    });
  }

  next();
}

// GET /api/pacientes?q=texto — listar / buscar solo activos
router.get('/', async (req, res) => {
  const q = req.query.q || '';

  try {
    let sql = `
      SELECT 
        id_paciente,
        nombre_completo,
        ci,
        fecha_nacimiento,
        telefono,
        email,
        direccion,
        activo,
        fecha_registro
      FROM pacientes
      WHERE activo = 1
    `;

    const params = [];

    if (q.trim() !== '') {
      sql += ` AND (nombre_completo LIKE ? OR ci LIKE ?)`;
      params.push(`%${q}%`, `%${q}%`);
    }

    sql += ` ORDER BY id_paciente DESC`;

    const [rows] = await pool.query(sql, params);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pacientes/:id — obtener por id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        id_paciente,
        nombre_completo,
        ci,
        fecha_nacimiento,
        telefono,
        email,
        direccion,
        activo,
        fecha_registro
      FROM pacientes
      WHERE id_paciente = ?
    `, [req.params.id]);

    if (!rows.length) {
      return res.status(404).json({ error: 'Paciente no encontrado.' });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pacientes — crear
router.post('/', requireAdminOrRecepcion, async (req, res) => {
  const {
    nombre_completo,
    ci,
    fecha_nacimiento,
    telefono,
    email,
    direccion
  } = req.body;

  if (!nombre_completo || !ci || !fecha_nacimiento || !telefono) {
    return res.status(400).json({
      error: 'Nombre, CI, fecha de nacimiento y teléfono son obligatorios.'
    });
  }

  try {
    const [result] = await pool.query(`
      INSERT INTO pacientes
        (nombre_completo, ci, fecha_nacimiento, telefono, email, direccion, activo)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `, [
      nombre_completo,
      ci,
      fecha_nacimiento,
      telefono,
      email || null,
      direccion || null
    ]);

    res.status(201).json({
      id_paciente: result.insertId,
      message: 'Paciente registrado correctamente.'
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'Ya existe un paciente con ese CI.'
      });
    }

    res.status(500).json({ error: err.message });
  }
});

// PUT /api/pacientes/:id — editar
router.put('/:id', requireAdminOrRecepcion, async (req, res) => {
  const {
    nombre_completo,
    ci,
    fecha_nacimiento,
    telefono,
    email,
    direccion,
    activo
  } = req.body;

  if (!nombre_completo || !ci || !fecha_nacimiento || !telefono) {
    return res.status(400).json({
      error: 'Nombre, CI, fecha de nacimiento y teléfono son obligatorios.'
    });
  }

  try {
    const [result] = await pool.query(`
      UPDATE pacientes
      SET 
        nombre_completo = ?,
        ci = ?,
        fecha_nacimiento = ?,
        telefono = ?,
        email = ?,
        direccion = ?,
        activo = ?
      WHERE id_paciente = ?
    `, [
      nombre_completo,
      ci,
      fecha_nacimiento,
      telefono,
      email || null,
      direccion || null,
      activo === undefined ? 1 : activo,
      req.params.id
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Paciente no encontrado.' });
    }

    res.json({ message: 'Paciente actualizado correctamente.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'Ya existe un paciente con ese CI.'
      });
    }

    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/pacientes/:id — baja lógica
router.delete('/:id', requireAdminOrRecepcion, async (req, res) => {
  try {
    const idPaciente = Number(req.params.id);

    const [result] = await pool.query(
      'UPDATE pacientes SET activo = 0 WHERE id_paciente = ?',
      [idPaciente]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'No se encontró el paciente.'
      });
    }

    res.json({
      message: 'Paciente desactivado correctamente.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
