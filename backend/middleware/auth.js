// backend/middleware/auth.js
const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && typeof authHeader === 'string') {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') token = parts[1];
    }

    // Soporte para cookie (si usas cookies para tokens)
    if (!token && req.cookies) {
      token = req.cookies.accessToken || req.cookies.refreshToken || null;
    }

    if (!token) return res.status(401).json({ error: 'No autorizado' });

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET no está definido en las variables de entorno');
      return res.status(500).json({ error: 'Configuración del servidor incompleta' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Normalizar payload: soporta id_usuario o id
    const id_usuario = payload.id_usuario || payload.id || payload.sub || null;

    req.user = {
      id_usuario,
      email: payload.email || null,
      rol: payload.rol || payload.role || null
    };

    next();
  } catch (err) {
    if (err && err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    console.error('Auth middleware error:', err && err.stack ? err.stack : err);
    return res.status(401).json({ error: 'Token inválido' });
  }
}

module.exports = authMiddleware;
