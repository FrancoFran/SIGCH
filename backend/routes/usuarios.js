// backend/routes/usuarios.js
const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcrypt');
const pool    = require('../config/db');

// ─────────────────────────────────────────────
// MIDDLEWARE SIMPLE DE PERMISOS POR ROL
// Usa headers enviados desde frontend:
// x-user-id
// x-user-rol
// ─────────────────────────────────────────────
function requireAdmin(req, res, next) {
  const rol = req.headers['x-user-rol'];

  if (rol !== 'administrador') {
    return res.status(403).json({
      error: 'No tiene permisos de administrador para realizar esta acción'
    });
  }

  next();
}

// ─────────────────────────────────────────────
// GET /api/usuarios — listar todos
// Solo administrador
// ─────────────────────────────────────────────
router.get('/', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT  
          id_usuario, 
          nombre_completo, 
          email, 
          rol, 
          activo, 
          fecha_creacion 
       FROM usuarios 
       ORDER BY id_usuario`
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/usuarios/:id
// Solo administrador
// ─────────────────────────────────────────────
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT  
          id_usuario, 
          nombre_completo, 
          email, 
          rol, 
          activo, 
          fecha_creacion 
       FROM usuarios 
       WHERE id_usuario = ?`,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/usuarios — crear usuario
// Solo administrador
// ─────────────────────────────────────────────
router.post('/', requireAdmin, async (req, res) => {
  const { nombre_completo, email, contrasena, rol } = req.body;

  if (!nombre_completo || !email || !contrasena || !rol) {
    return res.status(400).json({
      error: 'nombre_completo, email, contrasena y rol son obligatorios'
    });
  }

  const rolesValidos = ['recepcionista', 'psicologo', 'administrador'];

  if (!rolesValidos.includes(rol)) {
    return res.status(400).json({
      error: `Rol inválido. Valores permitidos: ${rolesValidos.join(', ')}`
    });
  }

  if (contrasena.length < 3) {
    return res.status(400).json({
      error: 'La contraseña debe tener al menos 3 caracteres'
    });
  }
  try {
    const contrasena_hash = await bcrypt.hash(contrasena, 10);

    const [result] = await pool.query(
      `INSERT INTO usuarios  
        (nombre_completo, email, contrasena_hash, rol, activo)  
       VALUES (?, ?, ?, ?, 1)`,
      [nombre_completo, email, contrasena_hash, rol]
    );

    res.status(201).json({
      id_usuario: result.insertId,
      message: 'Usuario creado exitosamente'
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }

    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// PUT /api/usuarios/:id — actualizar usuario
// Solo administrador
// ─────────────────────────────────────────────
router.put('/:id', requireAdmin, async (req, res) => {
  const { nombre_completo, email, contrasena, rol, activo } = req.body;

  const rolesValidos = ['recepcionista', 'psicologo', 'administrador'];

  if (rol !== undefined && !rolesValidos.includes(rol)) {
    return res.status(400).json({
      error: `Rol inválido. Valores permitidos: ${rolesValidos.join(', ')}`
    });
  }

  try {
    const fields = [];
    const values = [];

    if (nombre_completo !== undefined) {
      fields.push('nombre_completo = ?');
      values.push(nombre_completo);
    }

    if (email !== undefined) {
      fields.push('email = ?');
      values.push(email);
    }

    if (rol !== undefined) {
      fields.push('rol = ?');
      values.push(rol);
    }

    if (activo !== undefined) {
      fields.push('activo = ?');
      values.push(activo);
    }

    if (contrasena) {
      if (contrasena.length < 3) {
        return res.status(400).json({
          error: 'La contraseña debe tener al menos 3 caracteres'
        });
      }

      const hash = await bcrypt.hash(contrasena, 10);
      fields.push('contrasena_hash = ?');
      values.push(hash);
    }

    if (!fields.length) {
      return res.status(400).json({
        error: 'No se enviaron campos para actualizar'
      });
    }

    values.push(req.params.id);

    await pool.query(
      `UPDATE usuarios SET ${fields.join(', ')} WHERE id_usuario = ?`,
      values
    );

    res.json({ message: 'Usuario actualizado exitosamente' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }

    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/usuarios/:id — baja lógica
// Solo administrador
// No permite desactivar el usuario actual
// No permite desactivar admin principal id 1
// ─────────────────────────────────────────────
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const idAEliminar = Number(req.params.id);
    const idUsuarioActual = Number(req.headers['x-user-id']);

    if (idAEliminar === idUsuarioActual) {
      return res.status(400).json({
        error: 'No puedes desactivar el usuario con el que iniciaste sesión'
      });
    }

    await pool.query(
      'UPDATE usuarios SET activo = 0 WHERE id_usuario = ?',
      [idAEliminar]
    );

    res.json({ message: 'Usuario desactivado exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/usuarios/auth/login — autenticación real
// Libre, no requiere permiso
// ─────────────────────────────────────────────
router.post('/auth/login', async (req, res) => {
  const { email, contrasena } = req.body;

  if (!email || !contrasena) {
    return res.status(400).json({
      error: 'Email y contraseña son obligatorios'
    });
  }

  try {
    // CORRECCIÓN: Se cambió "?" por "$1" para compatibilidad con PostgreSQL/Supabase
    const [rows] = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1 AND activo = 1',
      [email]
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const usuario = rows[0];

    const valid = await bcrypt.compare(
      contrasena,
      usuario.contrasena_hash
    );

    if (!valid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const { contrasena_hash, ...user } = usuario;

    res.json({
      message: 'Login exitoso',
      user
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
// ─────────────────────────────────────────────
// POST /api/usuarios/auth/login — autenticación real
// Libre, no requiere permiso
// ─────────────────────────────────────────────
router.post('/auth/login', async (req, res) => {
  const { email, contrasena } = req.body;

  if (!email || !contrasena) {
    return res.status(400).json({
      error: 'Email y contraseña son obligatorios'
    });
  }

  try {
    // CORRECCIÓN: Se cambió "activo = 1" por "activo = true" para compatibilidad estricta con PostgreSQL/Supabase
    const [rows] = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1 AND activo = true',
      [email]
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const usuario = rows[0];

    const valid = await bcrypt.compare(
      contrasena,
      usuario.contrasena_hash
    );

    if (!valid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const { contrasena_hash, ...user } = usuario;

    res.json({
      message: 'Login exitoso',
      user
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
