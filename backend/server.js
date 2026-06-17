// backend/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const app = express();

// Seguridad y CORS
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || true,
    credentials: true
  })
);
app.use(cookieParser());

// Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Servir frontend estático
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Rutas de la API
app.use('/api/usuarios', require('./routes/usuarios'));
app.use('/api/psicologos', require('./routes/psicologos'));
app.use('/api/pacientes', require('./routes/pacientes'));
app.use('/api/citas', require('./routes/citas'));
app.use('/api/historial', require('./routes/historial'));
app.use('/api/horarios', require('./routes/horarios'));
app.use('/api/sesiones', require('./routes/sesiones'));
app.use('/api/recordatorios', require('./routes/recordatorios'));
app.use('/api/auditoria', require('./routes/auditoria'));
app.use('/api/reportes', require('./routes/reportes'));

// Ruta raíz → index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error(err && err.stack ? err.stack : err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Graceful shutdown (si usas pool en db.js)
process.on('SIGINT', () => {
  console.log('SIGINT recibido, cerrando servidor...');
  if (module.exports && module.exports.pool && typeof module.exports.pool.end === 'function') {
    module.exports.pool.end().then(() => process.exit(0)).catch(() => process.exit(1));
  } else {
    process.exit(0);
  }
});

// Solo escuchar en local; en Vercel/Serverless exportamos app
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`\n✅ SIGCH corriendo en http://localhost:${PORT}`);
    console.log('   Credenciales de prueba: admin@sigch.com / 123\n');
  });
}

module.exports = app;
