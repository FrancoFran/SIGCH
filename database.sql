CREATE TYPE rol_enum AS ENUM ('recepcionista','psicologo','administrador');

CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre_completo VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  contrasena_hash VARCHAR(255) NOT NULL,
  rol rol_enum NOT NULL,
  activo BOOLEAN DEFAULT true,
  fecha_creacion TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS psicologos (
  id_psicologo INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_usuario INTEGER NOT NULL,
  nombre_completo VARCHAR(100) NOT NULL,
  especialidad VARCHAR(100) NOT NULL,
  registro_profesional VARCHAR(50) NOT NULL UNIQUE,
  activo BOOLEAN DEFAULT true,
  CONSTRAINT fk_psicologo_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);

CREATE TABLE IF NOT EXISTS pacientes (
  id_paciente INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre_completo VARCHAR(100) NOT NULL,
  ci VARCHAR(20) NOT NULL UNIQUE,
  fecha_nacimiento DATE NOT NULL,
  telefono VARCHAR(20) NOT NULL,
  email VARCHAR(150),
  direccion TEXT,
  activo BOOLEAN DEFAULT true,
  fecha_registro TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS citas (
  id_cita INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_paciente INTEGER NOT NULL,
  id_psicologo INTEGER NOT NULL,
  fecha_hora TIMESTAMP NOT NULL,
  motivo TEXT,
  estado TEXT DEFAULT 'programada',
  activo BOOLEAN DEFAULT true,
  fecha_registro TIMESTAMP DEFAULT now(),
  CONSTRAINT fk_cita_paciente FOREIGN KEY (id_paciente) REFERENCES pacientes(id_paciente),
  CONSTRAINT fk_cita_psicologo FOREIGN KEY (id_psicologo) REFERENCES psicologos(id_psicologo)
);

INSERT INTO usuarios (nombre_completo, email, contrasena_hash, rol) VALUES
('Administrador Sistema', 'admin@sigch.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'administrador'),
('Dr. Carlos Mamani', 'cmamani@sigch.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'psicologo'),
('Ana Quispe', 'aquispe@sigch.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'recepcionista');

INSERT INTO psicologos (id_usuario, nombre_completo, especialidad, registro_profesional) VALUES
(2, 'Dr. Carlos Mamani', 'Psicología Clínica', 'REG-001-LP');

INSERT INTO pacientes (nombre_completo, ci, fecha_nacimiento, telefono, email, direccion) VALUES
('María López Flores', '7654321', '1990-05-15', '72345678', 'mlopez@email.com', 'Av. Montes 123, La Paz'),
('Juan Pérez Ticona', '8765432', '1985-08-22', '71234567', 'jperez@email.com', 'Calle Comercio 45, La Paz');

INSERT INTO citas (id_paciente, id_psicologo, fecha_hora, motivo, estado) VALUES
(1, 1, now() + INTERVAL '1 day', 'Primera consulta por ansiedad', 'programada'),
(2, 1, now() + INTERVAL '2 day', 'Seguimiento terapéutico', 'programada');
