const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const app = express();

app.set('trust proxy', 1);

// Helmet con Content Security Policy que permite cargar FullCalendar desde jsdelivr
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "https://cdn.jsdelivr.net", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'", process.env.FRONTEND_ORIGIN || "'self'"],
        frameAncestors: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
      }
    }
  })
);

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || true,
    credentials: true
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use(express.static(path.join(__dirname, '..', 'frontend')));

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
app.use('/api/eventos', require('./routes/eventos'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err && err.stack ? err.stack : err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

process.on('SIGINT', () => {
  if (module.exports && module.exports.pool && typeof module.exports.pool.end === 'function') {
    module.exports.pool.end().then(() => process.exit(0)).catch(() => process.exit(1));
  } else {
    process.exit(0);
  }
});

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log('SIGCH corriendo en http://localhost:' + PORT);
  });
}

module.exports = app;
