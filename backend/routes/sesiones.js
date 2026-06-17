// backend/routes/sesiones.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/roles'); // ya existente en tu repo

// Helper: obtener id_psicologo a partir del id_usuario (si existe)
async function getIdPsicologoByUsuario(idUsuario) {
  try {
    const [rows] = await pool.query('SELECT id_psicologo FROM psicologos WHERE id_usuario = ? LIMIT 1', [idUsuario]);
    if (!rows || rows.length === 0) return null;
    return rows[0].id_psicologo;
  } catch (err) {
    console.error('getIdPsicologoByUsuario error:', err);
    return null;
  }
}

// Middleware combinado: autentica y luego permite solo admin o psicologo
async function requireClinico(req, res, next) {
  // Primero auth
  await authMiddleware(req, res, async () => {
    // Luego rol
    const rol = String(req.user?.rol || '').toLowerCase();
    if (rol !== 'administrador' && rol !== 'psicologo') {
      return res.status(403).json({ error: 'No tiene permiso para gestionar sesiones clínicas.' });
    }
    next();
  });
}

// GET /api/sesiones  -> admin: todos, psicologo: solo sus sesiones
router.get('/', requireClinico, async (req, res) => {
  try {
    const rol = String(req.user.rol || '').toLowerCase();

    if (rol === 'administrador') {
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
      return res.json(rows);
    }

    // psicologo -> obtener id_psicologo y filtrar
    if (rol === 'psicologo') {
      const idPsicologo = await getIdPsicologoByUsuario(req.user.id_usuario);
      if (!idPsicologo) return res.status(403).json({ error: 'No se encontró perfil de psicólogo para este usuario.' });

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
        WHERE s.id_psicologo = ?
        ORDER BY s.fecha DESC, s.id_sesion DESC
      `, [idPsicologo]);

      return res.json(rows);
    }

    return res.status(403).json({ error: 'No tienes permiso para listar sesiones' });
  } catch (err) {
    console.error('ERROR GET /api/sesiones', err && err.stack ? err.stack : err);
    res.status(500).json({ error: 'Error interno', detail: err.message });
  }
});

// GET /api/sesiones/:id  -> admin: todo, psicologo: solo si es suya
router.get('/:id', requireClinico, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const [rows] = await pool.query(
      'SELECT s.*, pa.nombre_completo AS paciente_nombre, ps.nombre_completo AS psicologo_nombre FROM sesiones_clinicas s INNER JOIN pacientes pa ON s.id_paciente = pa.id_paciente INNER JOIN psicologos ps ON s.id_psicologo = ps.id_psicologo WHERE s.id_sesion = ? LIMIT 1',
      [id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Sesión no encontrada.' });
    }

    const sesion = rows[0];
    const rol = String(req.user.rol || '').toLowerCase();

    if (rol === 'administrador') return res.json(sesion);

    if (rol === 'psicologo') {
      const idPsicologo = await getIdPsicologoByUsuario(req.user.id_usuario);
      if (!idPsicologo) return res.status(403).json({ error: 'No se encontró perfil de psicólogo para este usuario.' });
      if (Number(sesion.id_psicologo) !== Number(idPsicologo)) {
        return res.status(403).json({ error: 'No tienes permiso para ver esta sesión' });
      }
      return res.json(sesion);
    }

    return res.status(403).json({ error: 'No tienes permiso para ver esta sesión' });
  } catch (err) {
    console.error('ERROR GET /api/sesiones/:id', err && err.stack ? err.stack : err);
    res.status(500).json({ error: 'Error interno', detail: err.message });
  }
});

// POST /api/sesiones  -> crear sesión (admin o psicologo)
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
    const [result] = await pool.query(`
      INSERT INTO sesiones_clinicas
        (id_cita, id_paciente, id_psicologo, numero_sesion, fecha, resumen, tecnicas_aplicadas, tareas_asignadas, evolucion, activo, fecha_registro)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, true, NOW())
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

    // result.insertId para MySQL
    const id_sesion = result && (result.insertId || (result[0] && result[0].id_sesion)) ? (result.insertId || result[0].id_sesion) : null;

    res.status(201).json({
      id_sesion,
      message: 'Sesión clínica registrada correctamente.'
    });
  } catch (err) {
    console.error('ERROR POST /api/sesiones', err && err.stack ? err.stack : err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/sesiones/:id  -> actualizar (admin o psicologo propietario)
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
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    // Si es psicologo, verificar que la sesión pertenece a su perfil
    const rol = String(req.user.rol || '').toLowerCase();
    if (rol === 'psicologo') {
      const idPsicologo = await getIdPsicologoByUsuario(req.user.id_usuario);
      if (!idPsicologo) return res.status(403).json({ error: 'No se encontró perfil de psicólogo para este usuario.' });

      const [rowsCheck] = await pool.query('SELECT id_psicologo FROM sesiones_clinicas WHERE id_sesion = ? LIMIT 1', [id]);
      if (!rowsCheck || rowsCheck.length === 0) return res.status(404).json({ error: 'Sesión no encontrada.' });
      if (Number(rowsCheck[0].id_psicologo) !== Number(idPsicologo)) {
        return res.status(403).json({ error: 'No tienes permiso para modificar esta sesión' });
      }
    }

    const isActivo = activo === undefined ? true : (activo === true || activo === 1 || activo === 'true');

    await pool.query(`
      UPDATE sesiones_clinicas
      SET 
        id_cita = ?,
        id_paciente = ?,
        id_psicologo = ?,
        numero_sesion = ?,
        fecha = ?,
        resumen = ?,
        tecnicas_aplicadas = ?,
        tareas_asignadas = ?,
        evolucion = ?,
        activo = ?
      WHERE id_sesion = ?
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
      id
    ]);

    res.json({ message: 'Sesión clínica actualizada correctamente.' });
  } catch (err) {
    console.error('ERROR PUT /api/sesiones/:id', err && err.stack ? err.stack : err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/sesiones/:id  -> desactivar (admin o psicologo propietario)
router.delete('/:id', requireClinico, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    // Si es psicologo, verificar propiedad
    const rol = String(req.user.rol || '').toLowerCase();
    if (rol === 'psicologo') {
      const idPsicologo = await getIdPsicologoByUsuario(req.user.id_usuario);
      if (!idPsicologo) return res.status(403).json({ error: 'No se encontró perfil de psicólogo para este usuario.' });

      const [rowsCheck] = await pool.query('SELECT id_psicologo FROM sesiones_clinicas WHERE id_sesion = ? LIMIT 1', [id]);
      if (!rowsCheck || rowsCheck.length === 0) return res.status(404).json({ error: 'Sesión no encontrada.' });
      if (Number(rowsCheck[0].id_psicologo) !== Number(idPsicologo)) {
        return res.status(403).json({ error: 'No tienes permiso para eliminar esta sesión' });
      }
    }

    await pool.query('UPDATE sesiones_clinicas SET activo = false WHERE id_sesion = ?', [id]);

    res.json({ message: 'Sesión clínica desactivada correctamente.' });
  } catch (err) {
    console.error('ERROR DELETE /api/sesiones/:id', err && err.stack ? err.stack : err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
