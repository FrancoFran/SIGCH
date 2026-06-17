// backend/middleware/authorize.js
// Helpers de autorización reutilizables

module.exports = {
  // Requiere que exista req.user (authMiddleware debe ejecutarse antes)
  requireAuth: function(req, res, next) {
    if (!req.user) return res.status(401).json({ error: 'No autorizado' });
    next();
  },

  // Permite solo roles especificados
  allowRoles: function(...roles) {
    return (req, res, next) => {
      if (!req.user) return res.status(401).json({ error: 'No autorizado' });
      const userRole = String(req.user.rol || '').toLowerCase();
      const allowed = roles.map(r => String(r).toLowerCase());
      if (!allowed.includes(userRole)) return res.status(403).json({ error: 'Acceso prohibido' });
      next();
    };
  },

  // Permite acceso si es admin o si la función `isOwner(req, resource)` devuelve true.
  // isOwner puede ser una función async que comprueba ownership en BD.
  allowAdminOrOwner: function(isOwner) {
    return async (req, res, next) => {
      try {
        if (!req.user) return res.status(401).json({ error: 'No autorizado' });
        if (String(req.user.rol || '').toLowerCase() === 'administrador') return next();
        const owner = await isOwner(req);
        if (owner) return next();
        return res.status(403).json({ error: 'No tienes permiso para acceder a este recurso' });
      } catch (err) {
        console.error('authorize.allowAdminOrOwner error:', err && err.stack ? err.stack : err);
        return res.status(500).json({ error: 'Error interno', detail: err.message });
      }
    };
  }
};
