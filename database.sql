-- ============================================
-- SIGCH - Sistema de Gestión de Citas e Historiales Clínicos
-- Script de creación de base de datos
-- ============================================

CREATE DATABASE IF NOT EXISTS sigch CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sigch;

-- Tabla: usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario      INT           NOT NULL AUTO_INCREMENT,
  nombre_completo VARCHAR(100)  NOT NULL,
  email           VARCHAR(150)  NOT NULL,
  contrasena_hash VARCHAR(255)  NOT NULL,
  rol             ENUM('recepcionista','psicologo','administrador') NOT NULL,
  activo          TINYINT(1)    DEFAULT 1,
  fecha_creacion  DATETIME      DEFAULT NOW(),
  PRIMARY KEY (id_usuario),
  UNIQUE KEY uq_email (email)
);

-- Tabla: psicologos
CREATE TABLE IF NOT EXISTS psicologos (
  id_psicologo        INT           NOT NULL AUTO_INCREMENT,
  id_usuario          INT           NOT NULL,
  nombre_completo     VARCHAR(100)  NOT NULL,
  especialidad        VARCHAR(100)  NOT NULL,
  registro_profesional VARCHAR(50)  NOT NULL,
  activo              TINYINT(1)    DEFAULT 1,
  PRIMARY KEY (id_psicologo),
  UNIQUE KEY uq_registro (registro_profesional),
  CONSTRAINT fk_psicologo_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);

-- Tabla: pacientes
CREATE TABLE IF NOT EXISTS pacientes (
  id_paciente      INT           NOT NULL AUTO_INCREMENT,
  nombre_completo  VARCHAR(100)  NOT NULL,
  ci               VARCHAR(20)   NOT NULL,
  fecha_nacimiento DATE          NOT NULL,
  telefono         VARCHAR(20)   NOT NULL,
  email            VARCHAR(150)  NULL,
  direccion        TEXT          NULL,
  activo           TINYINT(1)    DEFAULT 1,
  fecha_registro   DATETIME      DEFAULT NOW(),
  PRIMARY KEY (id_paciente),
  UNIQUE KEY uq_ci (ci)
);

-- Tabla: citas
CREATE TABLE IF NOT EXISTS citas (
  id_cita        INT       NOT NULL AUTO_INCREMENT,
  id_paciente    INT       NOT NULL,
  id_psicologo   INT       NOT NULL,
  fecha_hora     DATETIME  NOT NULL,
  motivo         TEXT      NULL,
  estado         ENUM('programada','realizada','cancelada') DEFAULT 'programada',
  activo         TINYINT(1) DEFAULT 1,
  fecha_registro DATETIME  DEFAULT NOW(),
  PRIMARY KEY (id_cita),
  CONSTRAINT fk_cita_paciente   FOREIGN KEY (id_paciente)  REFERENCES pacientes(id_paciente),
  CONSTRAINT fk_cita_psicologo  FOREIGN KEY (id_psicologo) REFERENCES psicologos(id_psicologo)
);

-- ============================================
-- Datos de prueba
-- ============================================

INSERT INTO usuarios (nombre_completo, email, contrasena_hash, rol) VALUES
('Administrador Sistema', 'admin@sigch.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'administrador'),
('Dr. Carlos Mamani', 'cmamani@sigch.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'psicologo'),
('Ana Quispe', 'aquispe@sigch.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'recepcionista');
-- Contraseña para todos: password

INSERT INTO psicologos (id_usuario, nombre_completo, especialidad, registro_profesional) VALUES
(2, 'Dr. Carlos Mamani', 'Psicología Clínica', 'REG-001-LP');

INSERT INTO pacientes (nombre_completo, ci, fecha_nacimiento, telefono, email, direccion) VALUES
('María López Flores', '7654321', '1990-05-15', '72345678', 'mlopez@email.com', 'Av. Montes 123, La Paz'),
('Juan Pérez Ticona', '8765432', '1985-08-22', '71234567', 'jperez@email.com', 'Calle Comercio 45, La Paz');

INSERT INTO citas (id_paciente, id_psicologo, fecha_hora, motivo, estado) VALUES
(1, 1, DATE_ADD(NOW(), INTERVAL 1 DAY), 'Primera consulta por ansiedad', 'programada'),
(2, 1, DATE_ADD(NOW(), INTERVAL 2 DAY), 'Seguimiento terapéutico', 'programada');
