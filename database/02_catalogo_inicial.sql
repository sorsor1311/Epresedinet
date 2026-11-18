-- =====================================================================
--  EPRESEDI · Carga de inmuebles (casas, apartamentos, lotes y locales)
--
--  Los inmuebles se pueden cargar de DOS formas (RF009):
--    A) Directamente en la base de datos con este script (por defecto).
--    B) Desde el panel del administrador, si en backend/.env pones
--       PERMITIR_ALTA_INMUEBLES_ADMIN=true  (incluye subida de fotos).
--
--  Requisitos previos:
--    1) npm run db:instalar
--    2) Crear al menos un propietario:
--         npm run usuario -- --rol Propietario --usuario prop1 --correo propietario@correo.com \
--                            --nombre "Nombre del propietario" --telefono 3001112233 --password "ClaveSegura1"
--    3) npm run db:catalogo -- --propietario propietario@correo.com
--
--  Cómo agregar un inmueble:   CALL sp_registrar_propiedad(
--        tipo, correo_propietario, direccion, zona, habitaciones, baños, area_m2,
--        precio_venta, precio_arriendo, url_foto_portada, descripcion);
--     · tipo: 'Casa' | 'Apartamento' | 'Lote' | 'Local'
--     · Solo venta  -> precio_arriendo = 0      · Solo arriendo -> precio_venta = 0
--     · Lotes y locales: habitaciones = NULL
--     · Fotos adicionales: CALL sp_agregar_foto(id_inmueble, 'https://...', orden);
--
--  Cambiar estado / precio (también desde Administración > Propiedades):
--     UPDATE propiedades SET estado = 'reservada' WHERE id_propiedad = 3;
--     estados: disponible, reservada, arrendada, vendida, inactiva
--
--  IMPORTANTE: lo de abajo son EJEMPLOS del formato. Reemplázalos por tu
--  inventario real.
-- =====================================================================
USE Inmobiliaria;
SET NAMES utf8mb4;
SET @propietario = 'propietario@correo.com';

-- Apartamentos
CALL sp_registrar_propiedad('Apartamento', @propietario, 'Calle 10 # 25-40, Medellín', 'El Poblado', 3, 2, 78.50, 380000000, 0, NULL,
  'Apartamento en piso 8 con balcón, cocina integral y zonas comunes con gimnasio.');
CALL sp_registrar_propiedad('Apartamento', @propietario, 'Calle 72 # 43-20, Bello', 'Bello', 2, 1, 56.00, 0, 1700000, NULL,
  'Apartamento remodelado, cerca al metro y centros comerciales.');

-- Casas
CALL sp_registrar_propiedad('Casa', @propietario, 'Carrera 45 # 18-80, Envigado', 'Envigado', 4, 3, 190.00, 640000000, 0, NULL,
  'Casa de dos pisos con patio, garaje para dos vehículos y cuarto de servicio.');
CALL sp_registrar_propiedad('Casa', @propietario, 'Carrera 20 # 7-15, Sabaneta', 'Sabaneta', 3, 2, 120.00, 0, 2900000, NULL,
  'Casa en conjunto cerrado con zona verde y vigilancia.');

-- Lotes
CALL sp_registrar_propiedad('Lote', @propietario, 'Vereda La Ceja, Rionegro', 'Rionegro', NULL, NULL, 1200.00, 210000000, 0, NULL,
  'Lote plano con acceso pavimentado y servicios públicos en el límite del predio.');

-- Locales
CALL sp_registrar_propiedad('Local', @propietario, 'Carrera 50 # 49-10, Centro de Medellín', 'Centro', NULL, 1, 42.00, 0, 3200000, NULL,
  'Local comercial con vitrina a la calle, mezzanine y baño.');
CALL sp_registrar_propiedad('Local', @propietario, 'Calle 33 # 74-20, Laureles', 'Laureles', NULL, 1, 65.00, 450000000, 3800000, NULL,
  'Local esquinero en zona gastronómica, disponible para venta o arriendo.');

SELECT COUNT(*) AS inmuebles_registrados FROM propiedades;
