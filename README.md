# SIGCH — Sistema de Gestión de Citas e Historiales Clínicos

Sistema web completo para gestión de citas psicológicas, pacientes, historiales clínicos y control de usuarios.

---

## 📁 Estructura del Proyecto

```
sigch/
├── backend/
│   ├── config/
│   │   └── db.js              ← Conexión a MySQL
│   ├── routes/
│   │   ├── usuarios.js        ← CRUD + autenticación
│   │   ├── psicologos.js      ← CRUD psicólogos
│   │   ├── pacientes.js       ← CRUD + búsqueda
│   │   └── citas.js           ← CRUD + validación conflictos + estadísticas
│   ├── server.js              ← Entrada principal Express
│   └── package.json
├── frontend/
│   ├── css/style.css          ← Estilos completos
│   ├── js/app.js              ← Lógica frontend
│   └── index.html             ← Aplicación SPA
└── database.sql               ← Script de base de datos
```

---

## ⚙️ Requisitos Previos

- **Node.js** v16 o superior → https://nodejs.org
- **MySQL** 8.0 o superior → https://dev.mysql.com/downloads/
- **npm** (incluido con Node.js)

---

## 🚀 Instalación Paso a Paso

### Paso 1 — Crear la base de datos

Abre tu cliente MySQL (MySQL Workbench, HeidiSQL, DBeaver o terminal):

```sql
-- Opción A: desde terminal MySQL
mysql -u root -p < database.sql

-- Opción B: copiar y pegar el contenido de database.sql en tu cliente MySQL
```

Esto creará la base de datos `sigch` con sus 4 tablas y datos de prueba.

---

### Paso 2 — Instalar dependencias del backend

```bash
cd backend
npm install
```

Esto instala: `express`, `mysql2`, `bcrypt`, `cors`

---

### Paso 3 — Configurar conexión a la base de datos

Edita el archivo `backend/config/db.js` con tus credenciales MySQL:

```javascript
const pool = mysql.createPool({
  host:     'localhost',   // tu host MySQL
  user:     'root',        // tu usuario MySQL
  password: '',            // tu contraseña MySQL
  database: 'sigch'        // dejar como está
});
```

> También puedes usar variables de entorno:
> ```bash
> DB_HOST=localhost DB_USER=root DB_PASSWORD=mipass node server.js
> ```

---

### Paso 4 — Iniciar el servidor

```bash
cd backend
node server.js
```

Deberías ver:
```
✅ SIGCH corriendo en http://localhost:3000
   Credenciales de prueba: admin@sigch.com / password
```

---

### Paso 5 — Abrir la aplicación

Abre tu navegador y ve a:
```
http://localhost:3000
```

---

## 🔐 Credenciales de Prueba

| Email                  | Contraseña | Rol            |
|------------------------|------------|----------------|
| admin@sigch.com        | password   | Administrador  |
| cmamani@sigch.com      | password   | Psicólogo      |
| aquispe@sigch.com      | password   | Recepcionista  |

---

## 📋 Funcionalidades

| Módulo        | Funcionalidades                                                              |
|---------------|------------------------------------------------------------------------------|
| **Dashboard** | Estadísticas generales, próximas citas                                       |
| **Citas**     | Crear, editar, cancelar, validación de conflictos de horario                 |
| **Calendario**| Vista mensual con indicadores de citas programadas                           |
| **Pacientes** | CRUD completo, búsqueda por nombre o CI, eliminación lógica                  |
| **Psicólogos**| CRUD, vinculación con usuario del sistema                                    |
| **Usuarios**  | CRUD, roles (administrador/psicólogo/recepcionista), contraseñas cifradas    |

---

## 🌐 Endpoints de la API

### Usuarios `/api/usuarios`
| Método | Ruta                    | Descripción                    |
|--------|-------------------------|--------------------------------|
| GET    | /api/usuarios           | Listar todos                   |
| GET    | /api/usuarios/:id       | Obtener por ID                 |
| POST   | /api/usuarios           | Crear usuario                  |
| PUT    | /api/usuarios/:id       | Actualizar usuario             |
| DELETE | /api/usuarios/:id       | Desactivar (baja lógica)       |
| POST   | /api/usuarios/auth/login| Autenticar credenciales        |

### Psicólogos `/api/psicologos`
| Método | Ruta                    | Descripción                    |
|--------|-------------------------|--------------------------------|
| GET    | /api/psicologos         | Listar todos                   |
| GET    | /api/psicologos/:id     | Obtener por ID                 |
| POST   | /api/psicologos         | Registrar psicólogo            |
| PUT    | /api/psicologos/:id     | Actualizar                     |
| DELETE | /api/psicologos/:id     | Desactivar (baja lógica)       |

### Pacientes `/api/pacientes`
| Método | Ruta                    | Descripción                    |
|--------|-------------------------|--------------------------------|
| GET    | /api/pacientes?q=texto  | Listar / buscar por nombre o CI|
| GET    | /api/pacientes/:id      | Obtener por ID                 |
| POST   | /api/pacientes          | Registrar paciente             |
| PUT    | /api/pacientes/:id      | Actualizar                     |
| DELETE | /api/pacientes/:id      | Desactivar (baja lógica)       |

### Citas `/api/citas`
| Método | Ruta                        | Descripción                    |
|--------|-----------------------------|--------------------------------|
| GET    | /api/citas                  | Listar todas                   |
| GET    | /api/citas?estado=programada| Filtrar por estado             |
| GET    | /api/citas?fecha=YYYY-MM-DD | Filtrar por fecha              |
| GET    | /api/citas/:id              | Obtener por ID                 |
| POST   | /api/citas                  | Agendar (valida conflictos)    |
| PUT    | /api/citas/:id              | Actualizar / reprogramar       |
| DELETE | /api/citas/:id              | Cancelar cita                  |
| GET    | /api/citas/stats/resumen    | Estadísticas generales         |

---

## 🛠 Solución de Problemas

**Error: "connect ECONNREFUSED"**
→ Verifica que MySQL esté ejecutándose: `sudo service mysql start`

**Error: "Access denied for user"**
→ Revisa usuario y contraseña en `backend/config/db.js`

**Error: "Unknown database 'sigch'"**
→ Ejecuta primero el script `database.sql`

**Puerto 3000 ocupado**
→ Cambia el puerto: `PORT=4000 node server.js` y accede a `http://localhost:4000`

---

## 🔧 Desarrollo con recarga automática

```bash
cd backend
npm run dev   # requiere nodemon (incluido como devDependency)
```
