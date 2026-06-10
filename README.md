# SIGCH — Sistema de Gestión de Citas e Historiales Clínicos
### Centro de Servicios Psicológicos La Paz · UNIFRANZ 2026

---

## Cómo ejecutar

1. Descomprime el archivo `.zip` en cualquier carpeta.
2. Abre el archivo **`index.html`** directamente en tu navegador (Chrome, Firefox, Edge o Safari).
   - No requiere servidor ni instalación de dependencias.
   - Los datos se almacenan en `localStorage` del navegador.

---

## Credenciales de prueba

| Rol            | Correo              | Contraseña  |
|----------------|---------------------|-------------|
| Administrador  | admin@csplp.bo      | Admin1234   |
| Recepcionista  | recep@csplp.bo      | Recep1234   |
| Psicólogo      | psi1@csplp.bo       | Psico1234   |

> También puedes hacer clic en los chips de acceso rápido en la pantalla de login.

---

## Módulos implementados

### Autenticación (RF-01 al RF-05)
- Inicio de sesión con validación de credenciales
- Bloqueo temporal tras 3 intentos fallidos (RF-03)
- Cierre automático de sesión por inactividad (15 min) — RNF-01
- Control de acceso por roles (RBAC): Administrador, Recepcionista, Psicólogo

### Pacientes (RF-06)
- Registro completo (nombre, CI, fecha de nacimiento, teléfono, correo, dirección, ocupación, motivo de consulta, contacto de emergencia)
- Edición y baja lógica (no física)
- Búsqueda en tiempo real por nombre, CI o correo (RF-10)

### Citas (RF-07, RF-08)
- Agendamiento con selección de paciente, fecha, hora, psicólogo y duración
- Validación automática de conflictos de horario (RNF-07)
- Reprogramación y cancelación
- Vista en lista y calendario interactivo (día/semana/mes)
- Marcar cita como realizada

### Historial Clínico (RF-09)
- Registro de notas de sesión: diagnóstico, hipótesis, tratamiento, técnicas, observaciones, estado emocional, avances
- Acceso restringido: cada psicólogo solo ve/edita sus propias notas
- Timeline cronológico por paciente

### Usuarios (RF-05)
- CRUD completo de usuarios con asignación de roles
- Baja lógica de usuarios

### Reportes (RF-11)
- Estadísticas de citas por estado
- Actividad por psicólogo
- Listado exportable de citas programadas

### Auditoría (RNF-01)
- Registro automático de todas las acciones: login, logout, creación/edición/baja de registros

---

## Stack técnico
- **Frontend:** HTML5 + CSS3 + JavaScript ES6+ (Vanilla, sin frameworks)
- **Almacenamiento:** localStorage (simula base de datos MySQL en cliente)
- **Fuentes:** Google Fonts — Outfit + Inter
- **Arquitectura:** Módulos separados por responsabilidad (Store, UI, Pages, App)

---

## Requerimientos no funcionales cubiertos
- **RNF-01 Seguridad:** RBAC, bloqueo por intentos, auditoría, cierre por inactividad
- **RNF-03 Usabilidad:** máx 3 clics para agendar una cita, notificaciones visuales inmediatas
- **RNF-04 Compatibilidad:** funciona en Chrome, Firefox, Edge y Safari; diseño responsivo
- **RNF-07 Integridad:** validación de duplicidad de citas; bajas lógicas

---

*Proyecto académico — Análisis y Diseño I — UNIFRANZ El Alto, Marzo 2026*
