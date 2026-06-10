// backend/routes/sesiones.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

function requireClinico(req, res, next) {
  const rol = req.headers['x-user-rol'];

  if (rol !== 'administrador' && rol !== 'psicologo') {
    return res.status(403).json({ error: 'No tiene permiso para gestionar sesiones clínicas.' });
  }

  next();
}

router.get('/', requireClinico, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        s.id_sesion,
        s.id_cita,
        s.id_paciente,
        pa.nombre_completo AS paciente_nombre,
        s.id_psicologo,
        ps.nombre_completo AS psicologo_nombre,
        s.numero_sesion,
        s.fecha,
        s.resumen,
        s.tecnicas_aplicadas,
        s.tareas_asignadas,
        s.evolucion,
        s.activo,
        s.fecha_registro
      FROM sesiones_clinicas s
      INNER JOIN pacientes pa ON s.id_paciente = pa.id_paciente
      INNER JOIN psicologos ps ON s.id_psicologo = ps.id_psicologo
      ORDER BY s.fecha DESC, s.id_sesion DESC
    `);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', requireClinico, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM sesiones_clinicas WHERE id_sesion = $1',
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Sesión no encontrada.' });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireClinico, async (req, res) => {
  const {
    id_cita,
    id_paciente,
    id_psicologo,
    numero_sesion,
    fecha,
    resumen,
    tecnicas_aplicadas,
    tareas_asignadas,
    evolucion
  } = req.body;

  if (!id_cita || !id_paciente || !id_psicologo || !numero_sesion || !fecha || !resumen) {
    return res.status(400).json({
      error: 'Cita, paciente, psicólogo, número de sesión, fecha y resumen son obligatorios.'
    });
  }

  try {
    // CORRECCIÓN: Se cambió el último parámetro de los VALUES de "1" a "true"
    const [rows] = await pool.query(`
      INSERT INTO sesiones_clinicas
        (id_cita, id_paciente, id_psicologo, numero_sesion, fecha, resumen, tecnicas_aplicadas, tareas_asignadas, evolucion, activo)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
      RETURNING id_sesion
    `, [
      id_cita,
      id_paciente,
      id_psicologo,
      numero_sesion,
      fecha,
      resumen,
      tecnicas_aplicadas || null,
      tareas_asignadas || null,
      evolucion || null
    ]);

    res.status(201).json({
      id_sesion: rows[0].id_sesion,
      message: 'Sesión clínica registrada correctamente.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', requireClinico, async (req, res) => {
  const {
    id_cita,
    id_paciente,
    id_psicologo,
    numero_sesion,
    fecha,
    resumen,
    tecnicas_aplicadas,
    tareas_asignadas,
    evolucion,
    activo
  } = req.body;

  try {
    // CORRECCIÓN: Convertimos "activo" a booleano puro para evitar conflictos en PostgreSQL
    const isActivo = activo === undefined ? true : (activo === true || activo === 1 || activo === 'true');

    await pool.query(`
      UPDATE sesiones_clinicas
      SET 
        id_cita = $1,
        id_paciente = $2,
        id_psicologo = $3,
        numero_sesion = $4,
        fecha = $5,
        resumen = $6,
        tecnicas_aplicadas = $7,
        tareas_asignadas = $8,
        evolucion = $9,
        activo = $10
      WHERE id_sesion = $11
    `, [
      id_cita,
      id_paciente,
      id_psicologo,
      numero_sesion,
      fecha,
      resumen,
      tecnicas_aplicadas || null,
      tareas_asignadas || null,
      evolucion || null,
      isActivo,
      req.params.id
    ]);

    res.json({ message: 'Sesión clínica actualizada correctamente.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireClinico, async (req, res) => {
  try {
    // CORRECCIÓN: Se cambió "activo = 0" por "activo = false"
    await pool.query(
      'UPDATE sesiones_clinicas SET activo = false WHERE id_sesion = $1',
      [req.params.id]
    );

    res.json({ message: 'Sesión clínica desactivada correctamente.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
