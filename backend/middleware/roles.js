// backend/middleware/roles.js
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'No autorizado' });
    if (Array.isArray(role)) {
      if (!role.includes(req.user.rol)) return res.status(403).json({ error: 'Permiso denegado' });
      return next();
    }
    if (req.user.rol !== role) return res.status(403).json({ error: 'Permiso denegado' });
    next();
  };
}

module.exports = { requireRole };
