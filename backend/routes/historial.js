// backend/routes/historial.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

// Helper: obtener id_psicologo a partir del id_usuario (si existe)
async function getIdPsicologoByUsuario(idUsuario) {
  try {
    const [rows] = await pool.query('SELECT id_psicologo FROM psicologos WHERE id_usuario = ? LIMIT 1', [idUsuario]);
    if (!rows || rows.length === 0) return null;
    return rows[0].id_psicologo;
  } catch (err) {
    console.error('getIdPsicologoByUsuario error:', err && err.stack ? err.stack : err);
    return null;
  }
}

// Helper: verificar si psicólogo tiene relación con paciente (existe al menos una cita o sesión)
async function psicologoTienePaciente(idPsicologo, idPaciente) {
  try {
    const [r] = await pool.query(
      'SELECT 1 FROM citas WHERE id_psicologo = ? AND id_paciente = ? LIMIT 1',
      [idPsicologo, idPaciente]
    );
    if (r && r.length > 0) return true;

    const [s] = await pool.query(
      'SELECT 1 FROM sesiones_clinicas WHERE id_psicologo = ? AND id_paciente = ? LIMIT 1',
      [idPsicologo, idPaciente]
    );
    return !!(s && s.length > 0);
  } catch (err) {
    console.error('psicologoTienePaciente error:', err && err.stack ? err.stack : err);
    return false;
  }
}

// Middleware combinado: autentica y luego permite solo admin o psicologo
async function requireHistorialAccess(req, res, next) {
  await authMiddleware(req, res, async () => {
    const rol = String(req.user?.rol || '').toLowerCase();
    if (rol !== 'administrador' && rol !== 'psicologo') {
      return res.status(403).json({ error: 'No tiene permiso para acceder al historial clínico' });
    }
    next();
  });
}

// GET /api/historial
// admin: todos; psicologo: solo historiales de pacientes con los que tiene relación
router.get('/', requireHistorialAccess, async (req, res) => {
  try {
    const rol = String(req.user.rol || '').toLowerCase();

    if (rol === 'administrador') {
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
      return res.json(rows);
    }

    // psicologo -> obtener id_psicologo y filtrar por sus pacientes
    if (rol === 'psicologo') {
      const idPsicologo = await getIdPsicologoByUsuario(req.user.id_usuario);
      if (!idPsicologo) return res.status(403).json({ error: 'No se encontró perfil de psicólogo para este usuario.' });

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
        WHERE h.id_psicologo = ?
        ORDER BY h.fecha DESC, h.id_historial DESC
      `, [idPsicologo]);

      return res.json(rows);
    }

    return res.status(403).json({ error: 'No tienes permiso para listar historiales' });
  } catch (err) {
    console.error('ERROR GET /api/historial', err && err.stack ? err.stack : err);
    res.status(500).json({ error: 'Error interno', detail: err.message });
  }
});

// GET /api/historial/:id  -> admin: todo, psicologo: solo si pertenece a su paciente
router.get('/:id', requireHistorialAccess, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

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
      WHERE h.id_historial = ? LIMIT 1
    `, [id]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Historial no encontrado' });
    }

    const historial = rows[0];
    const rol = String(req.user.rol || '').toLowerCase();

    if (rol === 'administrador') return res.json(historial);

    if (rol === 'psicologo') {
      const idPsicologo = await getIdPsicologoByUsuario(req.user.id_usuario);
      if (!idPsicologo) return res.status(403).json({ error: 'No se encontró perfil de psicólogo para este usuario.' });
      if (Number(historial.id_psicologo) !== Number(idPsicologo)) {
        // Si el historial fue creado por otro psicólogo, denegar
        return res.status(403).json({ error: 'No tienes permiso para ver este historial' });
      }
      return res.json(historial);
    }

    return res.status(403).json({ error: 'No tienes permiso para ver este historial' });
  } catch (err) {
    console.error('ERROR GET /api/historial/:id', err && err.stack ? err.stack : err);
    res.status(500).json({ error: 'Error interno', detail: err.message });
  }
});

// POST /api/historial  -> crear historial (admin o psicologo)
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
    // Si el usuario es psicólogo, validar que está creando para su propio perfil
    const rol = String(req.user.rol || '').toLowerCase();
    if (rol === 'psicologo') {
      const idPsicologo = await getIdPsicologoByUsuario(req.user.id_usuario);
      if (!idPsicologo) return res.status(403).json({ error: 'No se encontró perfil de psicólogo para este usuario.' });
      if (Number(idPsicologo) !== Number(id_psicologo)) {
        return res.status(403).json({ error: 'No puedes crear historial para otro psicólogo' });
      }
    }

    const [rows] = await pool.query(`
      INSERT INTO historial_clinico
        (id_paciente, id_psicologo, fecha, diagnostico, tratamiento, observaciones, activo, fecha_registro)
      VALUES (?, ?, ?, ?, ?, ?, 1, NOW())
    `, [
      id_paciente,
      id_psicologo,
      fecha,
      diagnostico,
      tratamiento || null,
      observaciones || null
    ]);

    const id_historial = rows && (rows.insertId || (rows[0] && rows[0].id_historial)) ? (rows.insertId || rows[0].id_historial) : null;

    res.status(201).json({
      id_historial,
      message: 'Historial clínico registrado exitosamente'
    });
  } catch (err) {
    console.error('ERROR POST /api/historial', err && err.stack ? err.stack : err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/historial/:id  -> actualizar (admin o psicologo propietario)
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
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    // Si es psicologo, verificar que el historial pertenece a su perfil
    const rol = String(req.user.rol || '').toLowerCase();
    if (rol === 'psicologo') {
      const idPsicologo = await getIdPsicologoByUsuario(req.user.id_usuario);
      if (!idPsicologo) return res.status(403).json({ error: 'No se encontró perfil de psicólogo para este usuario.' });

      const [rowsCheck] = await pool.query('SELECT id_psicologo FROM historial_clinico WHERE id_historial = ? LIMIT 1', [id]);
      if (!rowsCheck || rowsCheck.length === 0) return res.status(404).json({ error: 'Historial no encontrado.' });
      if (Number(rowsCheck[0].id_psicologo) !== Number(idPsicologo)) {
        return res.status(403).json({ error: 'No tienes permiso para modificar este historial' });
      }
    }

    const isActivo = activo === undefined ? true : (activo === true || activo === 1 || activo === 'true');

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
      isActivo,
      id
    ]);

    res.json({ message: 'Historial clínico actualizado exitosamente' });
  } catch (err) {
    console.error('ERROR PUT /api/historial/:id', err && err.stack ? err.stack : err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/historial/:id  -> desactivar (admin o psicologo propietario)
router.delete('/:id', requireHistorialAccess, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    // Si es psicologo, verificar propiedad
    const rol = String(req.user.rol || '').toLowerCase();
    if (rol === 'psicologo') {
      const idPsicologo = await getIdPsicologoByUsuario(req.user.id_usuario);
      if (!idPsicologo) return res.status(403).json({ error: 'No se encontró perfil de psicólogo para este usuario.' });

      const [rowsCheck] = await pool.query('SELECT id_psicologo FROM historial_clinico WHERE id_historial = ? LIMIT 1', [id]);
      if (!rowsCheck || rowsCheck.length === 0) return res.status(404).json({ error: 'Historial no encontrado.' });
      if (Number(rowsCheck[0].id_psicologo) !== Number(idPsicologo)) {
        return res.status(403).json({ error: 'No tienes permiso para eliminar este historial' });
      }
    }

    await pool.query('UPDATE historial_clinico SET activo = 0 WHERE id_historial = ?', [id]);

    res.json({ message: 'Historial clínico desactivado exitosamente' });
  } catch (err) {
    console.error('ERROR DELETE /api/historial/:id', err && err.stack ? err.stack : err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
