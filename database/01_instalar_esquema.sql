-- =====================================================================================
--  EPRESEDI S.A.S. · Instalación / actualización del esquema de la base de datos
--
--  UN SOLO SCRIPT, IDEMPOTENTE (se puede ejecutar todas las veces que haga falta):
--    · Base de datos VACÍA ............ crea todo desde cero.
--    · Sobre el modelo BDDEPRESEDI.mwb  agrega lo que le falta (usuarios, roles, citas, etc.).
--    · Sobre la BD de la versión anterior (tablas con Mayúscula) las renombra a minúscula.
--
--  Cómo ejecutarlo:   mysql -u root -p < database/01_instalar_esquema.sql
--  (o en MySQL Workbench: File > Open SQL Script > ejecutar todo con el rayo)
--
--  Convención: TODOS los nombres de tabla van en minúscula (igual que el modelo .mwb), así el
--  proyecto funciona igual en Windows, Linux, Mac, Docker y hostings (donde MySQL distingue
--  mayúsculas).
-- =====================================================================================
CREATE DATABASE IF NOT EXISTS Inmobiliaria CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE Inmobiliaria;
SET NAMES utf8mb4;
ALTER DATABASE Inmobiliaria CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ---------- Utilidades temporales (se eliminan al final) ----------
DROP PROCEDURE IF EXISTS ep_agregar_columna;
DROP PROCEDURE IF EXISTS ep_renombrar_tabla;
DROP PROCEDURE IF EXISTS ep_convertir_utf8;
DELIMITER $$
CREATE PROCEDURE ep_agregar_columna(IN p_tabla VARCHAR(64), IN p_columna VARCHAR(64), IN p_definicion VARCHAR(255))
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_tabla AND COLUMN_NAME = p_columna) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_tabla, '` ADD COLUMN `', p_columna, '` ', p_definicion);
    PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;
  END IF;
END$$

-- Renombra una tabla heredada con Mayúscula (solo tiene efecto en sistemas que distinguen mayúsculas).
CREATE PROCEDURE ep_renombrar_tabla(IN p_viejo VARCHAR(64), IN p_nuevo VARCHAR(64))
BEGIN
  IF BINARY p_viejo <> BINARY p_nuevo
     AND EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY TABLE_NAME = BINARY p_viejo)
     AND NOT EXISTS (SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND BINARY TABLE_NAME = BINARY p_nuevo) THEN
    SET @ddl = CONCAT('RENAME TABLE `', p_viejo, '` TO `', p_nuevo, '`');
    PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;
  END IF;
END$$

-- Convierte a utf8mb4 las tablas que aún no lo estén (evita tildes dañadas como "MedellÃn").
CREATE PROCEDURE ep_convertir_utf8()
BEGIN
  DECLARE fin INT DEFAULT 0;
  DECLARE t VARCHAR(64);
  DECLARE cur CURSOR FOR SELECT TABLE_NAME FROM information_schema.TABLES
                          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' AND TABLE_COLLATION NOT LIKE 'utf8mb4%';
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET fin = 1;
  OPEN cur;
  bucle: LOOP
    FETCH cur INTO t;
    IF fin = 1 THEN LEAVE bucle; END IF;
    SET @ddl = CONCAT('ALTER TABLE `', t, '` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;
  END LOOP;
  CLOSE cur;
END$$
DELIMITER ;

-- ---------- 0. Tablas heredadas con Mayúscula -> minúscula ----------
CALL ep_renombrar_tabla('Roles', 'roles');
CALL ep_renombrar_tabla('Usuarios', 'usuarios');
CALL ep_renombrar_tabla('Clientes', 'clientes');
CALL ep_renombrar_tabla('Agentes', 'agentes');
CALL ep_renombrar_tabla('Propietarios', 'propietarios');
CALL ep_renombrar_tabla('Tipo_propiedades', 'tipo_propiedades');
CALL ep_renombrar_tabla('Propiedades', 'propiedades');
CALL ep_renombrar_tabla('Remodelaciones', 'remodelaciones');
CALL ep_renombrar_tabla('Visitas', 'visitas');
CALL ep_renombrar_tabla('Contratos', 'contratos');
CALL ep_renombrar_tabla('Pagos', 'pagos');
CALL ep_renombrar_tabla('Interesados', 'interesados');
CALL ep_renombrar_tabla('Busquedas', 'busquedas');
CALL ep_renombrar_tabla('HorariosAsesor', 'horarios_asesor');
CALL ep_renombrar_tabla('SolicitudesContacto', 'solicitudes_contacto');
CALL ep_renombrar_tabla('Notificaciones', 'notificaciones');
CALL ep_renombrar_tabla('ConsultasPropiedad', 'consultas_propiedad');
CALL ep_renombrar_tabla('PropiedadFotos', 'propiedad_fotos');

-- ---------- 1. Tablas base (modelo BDDEPRESEDI.mwb + autenticación) ----------
CREATE TABLE IF NOT EXISTS roles (
  id_rol INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(50) NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario INT PRIMARY KEY AUTO_INCREMENT,
  usuario VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  correo VARCHAR(150) NOT NULL UNIQUE,
  fk_rol INT NOT NULL,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (fk_rol) REFERENCES roles(id_rol)
);
CREATE TABLE IF NOT EXISTS tipo_propiedades (
  id_tipo_propiedad INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL
);
CREATE TABLE IF NOT EXISTS clientes (
  id_cliente INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  telefono VARCHAR(10) NOT NULL,
  correo VARCHAR(150) NOT NULL,
  profesion VARCHAR(50) NOT NULL,
  fk_usuario INT NULL UNIQUE,
  FOREIGN KEY (fk_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS agentes (
  id_agente INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  telefono VARCHAR(10) NOT NULL,
  correo VARCHAR(150) NOT NULL,
  fk_usuario INT NULL UNIQUE,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  FOREIGN KEY (fk_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS propietarios (
  id_propietario INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  telefono VARCHAR(10) NOT NULL,
  correo VARCHAR(150) NOT NULL,
  fk_usuario INT NULL UNIQUE,
  FOREIGN KEY (fk_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS propiedades (
  id_propiedad INT PRIMARY KEY AUTO_INCREMENT,
  direccion VARCHAR(150) NOT NULL,
  precio_venta DECIMAL(14,2) NOT NULL DEFAULT 0,
  precio_arrendamiento DECIMAL(14,2) NOT NULL DEFAULT 0,
  estado VARCHAR(30) DEFAULT 'disponible',
  fk_propietario INT NOT NULL,
  fk_tipo_propiedad INT NOT NULL,
  FOREIGN KEY (fk_propietario) REFERENCES propietarios(id_propietario) ON DELETE CASCADE,
  FOREIGN KEY (fk_tipo_propiedad) REFERENCES tipo_propiedades(id_tipo_propiedad)
);
CREATE TABLE IF NOT EXISTS remodelaciones (
  id_remodelacion INT PRIMARY KEY AUTO_INCREMENT,
  descripcion_obra TEXT NOT NULL,
  presupuesto_estimado DECIMAL(14,2) NOT NULL,
  fecha_inicio DATETIME,
  fecha_fin_estimada DATETIME,
  estado ENUM('Cotización','En proceso','Finalizada','Cancelada') DEFAULT 'Cotización',
  fk_propiedad INT NOT NULL,
  fk_cliente INT NOT NULL,
  fk_agente INT NOT NULL,
  FOREIGN KEY (fk_propiedad) REFERENCES propiedades(id_propiedad) ON DELETE CASCADE,
  FOREIGN KEY (fk_cliente) REFERENCES clientes(id_cliente) ON DELETE CASCADE,
  FOREIGN KEY (fk_agente) REFERENCES agentes(id_agente) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS visitas (
  id_visita INT PRIMARY KEY AUTO_INCREMENT,
  fecha DATETIME NOT NULL,
  fk_cliente INT NOT NULL,
  fk_propiedad INT NOT NULL,
  fk_agente INT NOT NULL,
  FOREIGN KEY (fk_cliente) REFERENCES clientes(id_cliente) ON DELETE CASCADE,
  FOREIGN KEY (fk_propiedad) REFERENCES propiedades(id_propiedad) ON DELETE CASCADE,
  FOREIGN KEY (fk_agente) REFERENCES agentes(id_agente) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS contratos (
  id_contrato INT PRIMARY KEY AUTO_INCREMENT,
  fecha_inicio DATETIME NOT NULL,
  fecha_final DATETIME NOT NULL,
  valor_total DECIMAL(14,2) NOT NULL,
  fk_propiedad INT NOT NULL,
  fk_cliente INT NOT NULL,
  fk_agente INT NOT NULL,
  fk_propietario INT NOT NULL,
  FOREIGN KEY (fk_propiedad) REFERENCES propiedades(id_propiedad),
  FOREIGN KEY (fk_cliente) REFERENCES clientes(id_cliente),
  FOREIGN KEY (fk_agente) REFERENCES agentes(id_agente),
  FOREIGN KEY (fk_propietario) REFERENCES propietarios(id_propietario)
);
CREATE TABLE IF NOT EXISTS pagos (
  id_pago INT PRIMARY KEY AUTO_INCREMENT,
  pago_total DECIMAL(14,2) NOT NULL,
  fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP,
  fk_contrato INT NOT NULL,
  FOREIGN KEY (fk_contrato) REFERENCES contratos(id_contrato) ON DELETE CASCADE
);

-- ---------- 2. Ajustes sobre tablas que ya existían (modelo .mwb / versión anterior) ----------
CALL ep_agregar_columna('usuarios',     'fecha_creacion', 'DATETIME NULL DEFAULT CURRENT_TIMESTAMP');
CALL ep_agregar_columna('clientes',     'correo',         'VARCHAR(150) NULL');
CALL ep_agregar_columna('clientes',     'fk_usuario',     'INT NULL');
CALL ep_agregar_columna('agentes',      'correo',         'VARCHAR(150) NULL');
CALL ep_agregar_columna('agentes',      'fk_usuario',     'INT NULL');
CALL ep_agregar_columna('agentes',      'activo',         'TINYINT(1) NOT NULL DEFAULT 1');
CALL ep_agregar_columna('propietarios', 'correo',         'VARCHAR(150) NULL');
CALL ep_agregar_columna('propietarios', 'fk_usuario',     'INT NULL');
CALL ep_agregar_columna('pagos',        'fecha_pago',     'DATETIME NULL DEFAULT CURRENT_TIMESTAMP');
-- Datos del inmueble que exigen RF003 / RF009 (precio, ubicación, habitaciones, área, fotos, características)
CALL ep_agregar_columna('propiedades',  'area_m2',        'DECIMAL(10,2) NULL');
CALL ep_agregar_columna('propiedades',  'habitaciones',   'INT NULL');
CALL ep_agregar_columna('propiedades',  'zona',           'VARCHAR(120) NULL');
CALL ep_agregar_columna('propiedades',  'foto_url',       'VARCHAR(500) NULL');
CALL ep_agregar_columna('propiedades',  'banos',          'INT NULL');
CALL ep_agregar_columna('propiedades',  'parqueaderos',   'INT NULL');
CALL ep_agregar_columna('propiedades',  'descripcion',    'TEXT NULL');
CALL ep_agregar_columna('propiedades',  'creada_en',      'DATETIME NULL DEFAULT CURRENT_TIMESTAMP');

-- El dinero pasa de FLOAT (impreciso) a DECIMAL (primero se limpian los NULL que permitía el modelo .mwb)
UPDATE propiedades SET precio_venta = 0 WHERE precio_venta IS NULL;
UPDATE propiedades SET precio_arrendamiento = 0 WHERE precio_arrendamiento IS NULL;
UPDATE contratos SET valor_total = 0 WHERE valor_total IS NULL;
ALTER TABLE propiedades    MODIFY precio_venta          DECIMAL(14,2) NOT NULL DEFAULT 0,
                           MODIFY precio_arrendamiento  DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE contratos      MODIFY valor_total           DECIMAL(14,2) NOT NULL;
ALTER TABLE pagos          MODIFY pago_total            DECIMAL(14,2) NOT NULL;
ALTER TABLE remodelaciones MODIFY presupuesto_estimado  DECIMAL(14,2) NOT NULL;
UPDATE propiedades SET estado = LOWER(TRIM(COALESCE(estado, 'disponible')));

-- El correo del perfil se copia desde la cuenta de acceso cuando existe
UPDATE clientes      p JOIN usuarios u ON u.id_usuario = p.fk_usuario SET p.correo = u.correo WHERE p.correo IS NULL OR p.correo = '';
UPDATE agentes       p JOIN usuarios u ON u.id_usuario = p.fk_usuario SET p.correo = u.correo WHERE p.correo IS NULL OR p.correo = '';
UPDATE propietarios  p JOIN usuarios u ON u.id_usuario = p.fk_usuario SET p.correo = u.correo WHERE p.correo IS NULL OR p.correo = '';

-- ---------- 3. Tablas de atención al cliente, calendario y seguimiento ----------
CREATE TABLE IF NOT EXISTS interesados (
  id_interesado INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  edad INT NOT NULL,
  correo VARCHAR(150) NOT NULL,
  ocupacion VARCHAR(100) NOT NULL,
  telefono VARCHAR(15) NULL,
  fk_usuario INT NULL,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (fk_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
  INDEX idx_interesados_correo (correo),
  INDEX idx_interesados_usuario (fk_usuario)
);
CREATE TABLE IF NOT EXISTS busquedas (
  id_busqueda INT AUTO_INCREMENT PRIMARY KEY,
  fk_usuario INT NULL,
  sesion VARCHAR(80) NOT NULL,
  tipo VARCHAR(100),
  presupuesto DECIMAL(14,2),
  zona VARCHAR(120),
  modalidad ENUM('compra','arriendo'),
  creada_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (fk_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
  INDEX idx_busquedas_usuario (fk_usuario, creada_en),
  INDEX idx_busquedas_sesion (sesion, creada_en)
);
CREATE TABLE IF NOT EXISTS horarios_asesor (
  id_horario INT AUTO_INCREMENT PRIMARY KEY,
  fk_agente INT NOT NULL,
  dia_semana TINYINT NOT NULL,           -- 0 = domingo ... 6 = sábado
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  FOREIGN KEY (fk_agente) REFERENCES agentes(id_agente) ON DELETE CASCADE,
  UNIQUE KEY uq_horario (fk_agente, dia_semana, hora_inicio, hora_fin)
);
CREATE TABLE IF NOT EXISTS solicitudes_contacto (
  id_solicitud INT AUTO_INCREMENT PRIMARY KEY,
  fk_interesado INT NOT NULL,
  fk_propiedad INT NOT NULL,
  fk_agente INT NULL,
  fecha_contacto DATETIME NOT NULL,
  estado ENUM('programada','reprogramada','cancelada','atendida') NOT NULL DEFAULT 'programada',
  codigo_gestion CHAR(64) NOT NULL UNIQUE,
  notas VARCHAR(300) NULL,
  origen ENUM('chatbot','interno') NOT NULL DEFAULT 'chatbot',
  creada_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (fk_interesado) REFERENCES interesados(id_interesado),
  FOREIGN KEY (fk_propiedad) REFERENCES propiedades(id_propiedad),
  FOREIGN KEY (fk_agente) REFERENCES agentes(id_agente),
  INDEX idx_solicitud_agente_fecha (fk_agente, fecha_contacto, estado),
  INDEX idx_solicitud_propiedad (fk_propiedad)
);
CREATE TABLE IF NOT EXISTS notificaciones (
  id_notificacion INT AUTO_INCREMENT PRIMARY KEY,
  fk_agente INT NULL,
  correo_destino VARCHAR(150) NOT NULL,
  asunto VARCHAR(180) NOT NULL,
  contenido TEXT NOT NULL,
  enviada TINYINT(1) NOT NULL DEFAULT 0,
  creada_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (fk_agente) REFERENCES agentes(id_agente) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS consultas_propiedad (
  id_consulta INT AUTO_INCREMENT PRIMARY KEY,
  fk_propiedad INT NOT NULL,
  creada_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (fk_propiedad) REFERENCES propiedades(id_propiedad) ON DELETE CASCADE,
  INDEX idx_consultas_propiedad (fk_propiedad)
);
CREATE TABLE IF NOT EXISTS propiedad_fotos (
  id_foto INT AUTO_INCREMENT PRIMARY KEY,
  fk_propiedad INT NOT NULL,
  url VARCHAR(500) NOT NULL,                 -- enlace http(s) o ruta /uploads/... de una foto subida
  orden INT NOT NULL DEFAULT 1,
  FOREIGN KEY (fk_propiedad) REFERENCES propiedades(id_propiedad) ON DELETE CASCADE,
  UNIQUE KEY uq_foto (fk_propiedad, url(255)),
  INDEX idx_fotos_propiedad (fk_propiedad, orden)
);
-- Registro de actividad del personal (quién cambió qué), visible para el administrador
CREATE TABLE IF NOT EXISTS auditoria (
  id_auditoria INT AUTO_INCREMENT PRIMARY KEY,
  fk_usuario INT NULL,
  usuario VARCHAR(50) NULL,
  accion VARCHAR(40) NOT NULL,
  entidad VARCHAR(40) NOT NULL,
  id_entidad INT NULL,
  detalle VARCHAR(300) NULL,
  creada_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_auditoria_fecha (creada_en),
  INDEX idx_auditoria_entidad (entidad, id_entidad)
);

-- ---------- 4. Datos maestros ----------
INSERT IGNORE INTO roles (id_rol, nombre) VALUES (1,'Administrador'),(2,'Agente'),(3,'Cliente'),(4,'Propietario');
INSERT INTO tipo_propiedades (id_tipo_propiedad, nombre)
  SELECT v.id, v.n FROM (SELECT 1 AS id, 'Casa' AS n UNION SELECT 2, 'Apartamento' UNION SELECT 3, 'Lote' UNION SELECT 4, 'Local') v
   WHERE NOT EXISTS (SELECT 1 FROM tipo_propiedades t WHERE LOWER(t.nombre) = LOWER(v.n));

-- ---------- 5. Codificación UTF-8 en todas las tablas ----------
CALL ep_convertir_utf8();

-- ---------- 6. Validaciones del inventario (a nivel de base de datos) ----------
DROP TRIGGER IF EXISTS trg_propiedades_validar_ins;
DROP TRIGGER IF EXISTS trg_propiedades_validar_upd;
DELIMITER $$
CREATE TRIGGER trg_propiedades_validar_ins BEFORE INSERT ON propiedades FOR EACH ROW
BEGIN
  SET NEW.estado = LOWER(TRIM(COALESCE(NEW.estado, 'disponible')));
  SET NEW.direccion = TRIM(NEW.direccion);
  IF NEW.direccion = '' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La dirección es obligatoria'; END IF;
  IF NEW.estado NOT IN ('disponible','reservada','arrendada','vendida','inactiva') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Estado no válido (disponible, reservada, arrendada, vendida o inactiva)';
  END IF;
  IF COALESCE(NEW.precio_venta, 0) < 0 OR COALESCE(NEW.precio_arrendamiento, 0) < 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Los precios no pueden ser negativos';
  END IF;
  IF COALESCE(NEW.precio_venta, 0) = 0 AND COALESCE(NEW.precio_arrendamiento, 0) = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Define un precio de venta, de arrendamiento o ambos';
  END IF;
  IF NEW.area_m2 IS NOT NULL AND NEW.area_m2 <= 0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El área debe ser mayor a cero'; END IF;
  IF NEW.habitaciones IS NOT NULL AND NEW.habitaciones < 0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Habitaciones no puede ser negativo'; END IF;
  IF NEW.foto_url IS NOT NULL AND NEW.foto_url NOT REGEXP '^(https?://|/uploads/)' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La foto debe ser un enlace http(s) o una imagen subida';
  END IF;
END$$

CREATE TRIGGER trg_propiedades_validar_upd BEFORE UPDATE ON propiedades FOR EACH ROW
BEGIN
  SET NEW.estado = LOWER(TRIM(COALESCE(NEW.estado, 'disponible')));
  SET NEW.direccion = TRIM(NEW.direccion);
  IF NEW.direccion = '' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La dirección es obligatoria'; END IF;
  IF NEW.estado NOT IN ('disponible','reservada','arrendada','vendida','inactiva') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Estado no válido (disponible, reservada, arrendada, vendida o inactiva)';
  END IF;
  IF COALESCE(NEW.precio_venta, 0) < 0 OR COALESCE(NEW.precio_arrendamiento, 0) < 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Los precios no pueden ser negativos';
  END IF;
  IF COALESCE(NEW.precio_venta, 0) = 0 AND COALESCE(NEW.precio_arrendamiento, 0) = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Define un precio de venta, de arrendamiento o ambos';
  END IF;
  IF NEW.area_m2 IS NOT NULL AND NEW.area_m2 <= 0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El área debe ser mayor a cero'; END IF;
  IF NEW.habitaciones IS NOT NULL AND NEW.habitaciones < 0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Habitaciones no puede ser negativo'; END IF;
  IF NEW.foto_url IS NOT NULL AND NEW.foto_url NOT REGEXP '^(https?://|/uploads/)' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La foto debe ser un enlace http(s) o una imagen subida';
  END IF;
END$$
DELIMITER ;

-- ---------- 7. Registro de inmuebles directamente desde la base de datos ----------
--  Tipos válidos: Casa, Apartamento, Lote, Local. El propietario se identifica por su correo.
--  Devuelve el id del inmueble creado.
DROP PROCEDURE IF EXISTS sp_registrar_propiedad;
DROP PROCEDURE IF EXISTS sp_agregar_foto;
DELIMITER $$
CREATE PROCEDURE sp_registrar_propiedad(
  IN p_tipo VARCHAR(100), IN p_correo_propietario VARCHAR(150), IN p_direccion VARCHAR(150), IN p_zona VARCHAR(120),
  IN p_habitaciones INT, IN p_banos INT, IN p_area_m2 DECIMAL(10,2),
  IN p_precio_venta DECIMAL(14,2), IN p_precio_arrendamiento DECIMAL(14,2),
  IN p_foto_url VARCHAR(500), IN p_descripcion TEXT)
BEGIN
  DECLARE v_tipo INT;
  DECLARE v_prop INT;
  SELECT id_tipo_propiedad INTO v_tipo FROM tipo_propiedades WHERE LOWER(nombre) = LOWER(TRIM(p_tipo)) LIMIT 1;
  IF v_tipo IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tipo de inmueble inexistente (usa Casa, Apartamento, Lote o Local)'; END IF;
  SELECT p.id_propietario INTO v_prop FROM propietarios p
   WHERE p.correo = TRIM(p_correo_propietario) LIMIT 1;
  IF v_prop IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No existe un propietario con ese correo (créalo con: npm run usuario -- --rol Propietario ...)'; END IF;
  INSERT INTO propiedades (direccion, zona, habitaciones, banos, area_m2, precio_venta, precio_arrendamiento,
                           foto_url, descripcion, estado, fk_propietario, fk_tipo_propiedad)
  VALUES (p_direccion, p_zona, p_habitaciones, p_banos, p_area_m2, COALESCE(p_precio_venta, 0), COALESCE(p_precio_arrendamiento, 0),
          p_foto_url, p_descripcion, 'disponible', v_prop, v_tipo);
  SET @ultimo_inmueble = LAST_INSERT_ID();
  IF p_foto_url IS NOT NULL THEN
    INSERT IGNORE INTO propiedad_fotos (fk_propiedad, url, orden) VALUES (@ultimo_inmueble, p_foto_url, 1);
  END IF;
  SELECT @ultimo_inmueble AS id_propiedad;
END$$

CREATE PROCEDURE sp_agregar_foto(IN p_id_propiedad INT, IN p_url VARCHAR(500), IN p_orden INT)
BEGIN
  IF p_url NOT REGEXP '^(https?://|/uploads/)' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La foto debe ser un enlace http o https'; END IF;
  IF NOT EXISTS (SELECT 1 FROM propiedades WHERE id_propiedad = p_id_propiedad) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El inmueble no existe';
  END IF;
  INSERT IGNORE INTO propiedad_fotos (fk_propiedad, url, orden) VALUES (p_id_propiedad, p_url, COALESCE(p_orden, 1));
  UPDATE propiedades SET foto_url = p_url WHERE id_propiedad = p_id_propiedad AND foto_url IS NULL;
END$$
DELIMITER ;

-- ---------- 8. Horario base (L-V 8-12 y 14-18) para asesores que aún no tienen horario ----------
INSERT IGNORE INTO horarios_asesor (fk_agente, dia_semana, hora_inicio, hora_fin)
SELECT a.id_agente, d.dia, h.ini, h.fin
  FROM agentes a
  JOIN (SELECT 1 AS dia UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5) d
  JOIN (SELECT '08:00:00' AS ini, '12:00:00' AS fin UNION SELECT '14:00:00', '18:00:00') h
 WHERE NOT EXISTS (SELECT 1 FROM horarios_asesor x WHERE x.fk_agente = a.id_agente);

DROP PROCEDURE IF EXISTS ep_agregar_columna;
DROP PROCEDURE IF EXISTS ep_renombrar_tabla;
DROP PROCEDURE IF EXISTS ep_convertir_utf8;
SELECT 'Esquema EPRESEDI instalado/actualizado correctamente' AS resultado;
