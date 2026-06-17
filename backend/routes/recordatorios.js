// backend/routes/recordatorios.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/roles'); // requireRole(...allowedRoles)

// GET /api/recordatorios
// Requisito del sistema: "Los recordatorios deben verlos todos" -> cualquier usuario autenticado
router.get('/', async (req, res) => {
  try {
    // Autenticación: permitir a cualquier usuario autenticado ver recordatorios
    await authMiddleware(req, res, async () => {
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
    });
  } catch (err) {
    console.error('ERROR GET /api/recordatorios', err && err.stack ? err.stack : err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/recordatorios  -> solo administrador o recepcionista
router.post('/', async (req, res) => {
  try {
    await authMiddleware(req, res, async () => {
      // requireRole middleware expects req.user set by authMiddleware
      const middleware = requireRole('administrador', 'recepcionista');
      middleware(req, res, async () => {
        const { id_cita, tipo, mensaje, fecha_programada } = req.body;

        if (!id_cita || !mensaje || !fecha_programada) {
          return res.status(400).json({ error: 'Cita, mensaje y fecha programada son obligatorios.' });
        }

        const [result] = await pool.query(`
          INSERT INTO recordatorios
            (id_cita, tipo, mensaje, enviado, fecha_programada, activo, fecha_registro)
          VALUES (?, ?, ?, 0, ?, 1, NOW())
        `, [
          id_cita,
          tipo || 'recordatorio_24h',
          mensaje,
          fecha_programada
        ]);

        const id_recordatorio = result && (result.insertId || (result[0] && result[0].id_recordatorio)) ? (result.insertId || result[0].id_recordatorio) : null;

        res.status(201).json({
          id_recordatorio,
          message: 'Recordatorio registrado correctamente.'
        });
      });
    });
  } catch (err) {
    console.error('ERROR POST /api/recordatorios', err && err.stack ? err.stack : err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/recordatorios/:id/enviado  -> solo admin o recepcionista
router.put('/:id/enviado', async (req, res) => {
  try {
    await authMiddleware(req, res, async () => {
      const middleware = requireRole('administrador', 'recepcionista');
      middleware(req, res, async () => {
        await pool.query(`
          UPDATE recordatorios
          SET enviado = 1, fecha_envio = NOW()
          WHERE id_recordatorio = ?
        `, [req.params.id]);

        res.json({ message: 'Recordatorio marcado como enviado.' });
      });
    });
  } catch (err) {
    console.error('ERROR PUT /api/recordatorios/:id/enviado', err && err.stack ? err.stack : err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/recordatorios/:id  -> solo admin o recepcionista (desactivar)
router.delete('/:id', async (req, res) => {
  try {
    await authMiddleware(req, res, async () => {
      const middleware = requireRole('administrador', 'recepcionista');
      middleware(req, res, async () => {
        await pool.query(
          'UPDATE recordatorios SET activo = 0 WHERE id_recordatorio = ?',
          [req.params.id]
        );

        res.json({ message: 'Recordatorio desactivado correctamente.' });
      });
    });
  } catch (err) {
    console.error('ERROR DELETE /api/recordatorios/:id', err && err.stack ? err.stack : err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
