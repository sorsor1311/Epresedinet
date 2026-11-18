# Cambios realizados a la base de datos (comunicación obligatoria)

Se partió de **BDDEPRESEDI.mwb**. Todo se aplica con un único script idempotente: `database/01_instalar_esquema.sql`. El diagrama actualizado está en `docs/modelo_er.png` (fuente editable: `docs/modelo_er.dot`). Para verlo en Workbench: *File → Import → Reverse Engineer MySQL Create Script* con el SQL.

## 1. Lo que NO se tocó
Las 9 tablas del modelo original conservan nombres, claves y relaciones: `agentes`, `clientes`, `propietarios`, `tipo_propiedades`, `propiedades`, `contratos`, `pagos`, `remodelaciones`, `visitas`.

## 2. Tablas nuevas y por qué
| Tabla | Requisito que la exige |
|---|---|
| `roles`, `usuarios` | Fase 4 (login/registro/JWT/roles): el modelo original no tenía dónde guardar cuentas ni contraseñas cifradas. |
| `interesados` | RF005: datos del cliente interesado (nombre, edad, correo, ocupación) sin exigirle cuenta. |
| `solicitudes_contacto` | RF006, RF007, RF012, RF016: cita con asesor, estado (`programada/reprogramada/cancelada/atendida`) y código de gestión. |
| `horarios_asesor` | RF013, RF014: disponibilidad semanal de cada asesor (base de la asignación automática). |
| `busquedas` | RF010, RF011: historial de búsquedas para recomendar. |
| `notificaciones` | RF008, RF015: constancia de cada aviso enviado. |
| `consultas_propiedad` | RF018: "propiedades más consultadas". |
| `propiedad_fotos` | RF003, RF009: varias fotografías por inmueble. |
| `auditoria` | Control interno: quién cambió qué (pantalla *Registro de actividad*). |

## 3. Columnas agregadas a tablas existentes
* `propiedades`: `zona`, `habitaciones`, `banos`, `parqueaderos`, `area_m2`, `foto_url`, `descripcion`, `creada_en` (RF003 exige ubicación, habitaciones, área, fotografías).
* `agentes`: `activo` (RF013) y `fk_usuario`. `clientes` / `propietarios`: `fk_usuario`.
* `agentes`, `clientes`, `propietarios`: se **mantiene `correo`** tal como estaba en el modelo .mwb (se copia de la cuenta si existe).
* `pagos`: `fecha_pago`.

## 4. Cambios de tipo y reglas
* **Dinero FLOAT → DECIMAL(14,2)** (`precio_venta`, `precio_arrendamiento`, `valor_total`, `pago_total`, `presupuesto_estimado`): FLOAT pierde precisión con valores de cientos de millones.
* `propiedades.estado` se normaliza a minúscula y se valida (RF017): `disponible, reservada, arrendada, vendida, inactiva`.
* **Triggers** `trg_propiedades_validar_ins/upd`: dirección obligatoria, estado válido, precios no negativos, al menos un precio > 0, área > 0, foto con enlace http(s) o ruta `/uploads/`.
* **Procedimientos** `sp_registrar_propiedad` y `sp_agregar_foto` para cargar inmuebles directamente en la BD.
* Todas las tablas pasan a **utf8mb4** (evita "MedellÃn").

## 5. Nombres de tabla en minúscula
El modelo .mwb ya usaba minúsculas; el código usaba `Agentes`, `Propiedades`… Eso funciona en Windows pero **falla en Linux/Docker/hosting** (MySQL distingue mayúsculas). Ahora todo está en minúscula y el script renombra las tablas heredadas.

## 6. Datos existentes
El script conserva tus datos: convierte precios NULL a 0, normaliza estados ("Disponible" → "disponible"), crea horario base (L–V 8–12 y 14–18) para asesores sin horario y completa los tipos de inmueble (Casa, Apartamento, Lote, Local).
