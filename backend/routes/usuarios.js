// backend/routes/usuarios.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');

const LOGIN_RATE_LIMIT = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Intenta de nuevo más tarde.' }
});


function generateAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
}

function generateRefreshToken(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No autorizado' });
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'Formato de token inválido' });
  const token = parts[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.rol !== role) {
      return res.status(403).json({ error: 'No tiene permisos para realizar esta acción' });
    }
    next();
  };
}

router.get('/', authMiddleware, requireRole('administrador'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id_usuario, nombre_completo, email, rol, activo, fecha_creacion
       FROM usuarios
       ORDER BY id_usuario`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/:id', authMiddleware, requireRole('administrador'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const [rows] = await pool.query(
      `SELECT id_usuario, nombre_completo, email, rol, activo, fecha_creacion
       FROM usuarios
       WHERE id_usuario = $1`,
      [id]
    );

    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post(
  '/',
  authMiddleware,
  requireRole('administrador'),
  body('nombre_completo').isString().isLength({ min: 1 }),
  body('email').isEmail(),
  body('contrasena').isString().isLength({ min: 8 }),
  body('rol').isIn(['recepcionista', 'psicologo', 'administrador']),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Datos inválidos', details: errors.array() });

    const { nombre_completo, email, contrasena, rol } = req.body;

    try {
      const contrasena_hash = await bcrypt.hash(contrasena, 10);

      const [rows] = await pool.query(
        `INSERT INTO usuarios (nombre_completo, email, contrasena_hash, rol, activo)
         VALUES ($1, $2, $3, $4, true) RETURNING id_usuario`,
        [nombre_completo.trim(), email.trim().toLowerCase(), contrasena_hash, rol]
      );

      res.status(201).json({ id_usuario: rows[0].id_usuario, message: 'Usuario creado exitosamente' });
    } catch (err) {
      if (err.code === '23505' || (err.message && err.message.toLowerCase().includes('unique'))) {
        return res.status(409).json({ error: 'El email ya está registrado' });
      }
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
);

router.put(
  '/:id',
  authMiddleware,
  requireRole('administrador'),
  body('email').optional().isEmail(),
  body('contrasena').optional().isString().isLength({ min: 8 }),
  body('rol').optional().isIn(['recepcionista', 'psicologo', 'administrador']),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Datos inválidos', details: errors.array() });

    const { nombre_completo, email, contrasena, rol, activo } = req.body;

    try {
      const fields = [];
      const values = [];
      let idx = 1;

      if (nombre_completo !== undefined) {
        fields.push(`nombre_completo = $${idx++}`);
        values.push(nombre_completo.trim());
      }
      if (email !== undefined) {
        fields.push(`email = $${idx++}`);
        values.push(email.trim().toLowerCase());
      }
      if (rol !== undefined) {
        fields.push(`rol = $${idx++}`);
        values.push(rol);
      }
      if (activo !== undefined) {
        fields.push(`activo = $${idx++}`);
        values.push(Boolean(activo));
      }
      if (contrasena) {
        const hash = await bcrypt.hash(contrasena, 10);
        fields.push(`contrasena_hash = $${idx++}`);
        values.push(hash);
      }

      if (!fields.length) return res.status(400).json({ error: 'No se enviaron campos para actualizar' });

      values.push(Number(req.params.id));
      const query = `UPDATE usuarios SET ${fields.join(', ')} WHERE id_usuario = $${idx}`;
      await pool.query(query, values);

      res.json({ message: 'Usuario actualizado exitosamente' });
    } catch (err) {
      if (err.code === '23505' || (err.message && err.message.toLowerCase().includes('unique'))) {
        return res.status(409).json({ error: 'El email ya está registrado' });
      }
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
);

router.delete('/:id', authMiddleware, requireRole('administrador'), async (req, res) => {
  try {
    const idAEliminar = Number(req.params.id);
    const idUsuarioActual = Number(req.user.id_usuario);

    if (Number.isNaN(idAEliminar)) return res.status(400).json({ error: 'ID inválido' });

    if (idAEliminar === idUsuarioActual) {
      return res.status(400).json({ error: 'No puedes desactivar el usuario con el que iniciaste sesión' });
    }

    await pool.query('UPDATE usuarios SET activo = false WHERE id_usuario = $1', [idAEliminar]);

    res.json({ message: 'Usuario desactivado exitosamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post(
  '/auth/login',
  LOGIN_RATE_LIMIT,
  body('email').isEmail(),
  body('contrasena').isString().isLength({ min: 1 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Datos inválidos', details: errors.array() });

    const { email, contrasena } = req.body;

    try {
      const [rows] = await pool.query(
        'SELECT * FROM usuarios WHERE LOWER(email) = LOWER($1) AND activo = true',
        [email.trim().toLowerCase()]
      );

      if (!rows.length) return res.status(401).json({ error: 'Credenciales inválidas' });

      const usuario = rows[0];
      const hashEnBaseDatos = usuario.contrasena_hash || usuario.contrasenahash || usuario.contraseña_hash;

      if (!hashEnBaseDatos) return res.status(500).json({ error: 'Estructura de usuario inválida' });

      const valid = await bcrypt.compare(String(contrasena).trim(), String(hashEnBaseDatos));

      if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });

      const payload = {
        id_usuario: usuario.id_usuario,
        email: usuario.email,
        rol: usuario.rol
      };

      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken(payload);

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      const { contrasena_hash, contrasenahash, contraseña_hash, ...userSafe } = usuario;

      res.json({ message: 'Login exitoso', user: userSafe, accessToken });
    } catch (err) {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
);

router.post('/auth/refresh', async (req, res) => {
  const token = req.cookies && req.cookies.refreshToken;
  if (!token) return res.status(401).json({ error: 'No autorizado' });

  try {
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const newAccess = generateAccessToken({
      id_usuario: payload.id_usuario,
      email: payload.email,
      rol: payload.rol
    });
    res.json({ accessToken: newAccess });
  } catch (err) {
    return res.status(401).json({ error: 'Refresh token inválido o expirado' });
  }
});

router.post('/auth/logout', async (req, res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
  res.json({ message: 'Sesión cerrada' });
});

module.exports = router;
