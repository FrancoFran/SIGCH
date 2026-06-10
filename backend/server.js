// server.js — Punto de entrada del backend SIGCH
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir frontend estático
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Rutas de la API
app.use('/api/usuarios',    require('./routes/usuarios'));
app.use('/api/psicologos', require('./routes/psicologos'));
app.use('/api/pacientes',  require('./routes/pacientes'));
app.use('/api/citas',      require('./routes/citas'));
app.use('/api/historial',  require('./routes/historial'));
app.use('/api/horarios',   require('./routes/horarios'));
app.use('/api/sesiones',   require('./routes/sesiones'));
app.use('/api/recordatorios', require('./routes/recordatorios'));
app.use('/api/auditoria',    require('./routes/auditoria'));
app.use('/api/reportes',     require('./routes/reportes'));

// Ruta raíz → index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n✅ SIGCH corriendo en http://localhost:${PORT}`);
  console.log('   Credenciales de prueba: admin@sigch.com / 123\n');
});
