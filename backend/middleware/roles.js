// backend/middleware/roles.js
module.exports = function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'No autorizado' });
    const userRole = String(req.user.rol || '').toLowerCase();
    const allowed = allowedRoles.map(r => String(r).toLowerCase());
    if (!allowed.includes(userRole)) {
      return res.status(403).json({ error: 'Permiso denegado' });
    }
    next();
  };
};
