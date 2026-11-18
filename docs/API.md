# Referencia de la API REST
Base: `/api` · JSON · Autenticación: cabecera `Authorization: Bearer <token>` (se obtiene en `/auth/login`).
Respuesta correcta: `{ "success": true, "data": ... }` · Error: `{ "success": false, "message": "texto claro" }`.
Acceso: 🌐 público · 🔑 cualquier sesión · 👤 Cliente · 🏠 Propietario · 🧑‍💼 Agente+Admin · 🛡️ solo Administrador.

## Autenticación
| Método y ruta | Acceso | Descripción |
|---|---|---|
| `POST /auth/register` | 🌐 | Registro de **cliente** (`usuario, correo, password≥8, nombre, telefono(10), profesion`) |
| `POST /auth/login` | 🌐 | `{ correo, password }` → `{ token, usuario }` (10 intentos/min por IP) |
| `GET /auth/me` · `PUT /auth/me` | 🔑 | Ver / editar mi perfil |
| `PUT /auth/password` | 🔑 | `{ actual, nueva }` |

## Inmuebles
| Ruta | Acceso | Descripción |
|---|---|---|
| `GET /propiedades`, `GET /propiedades/:id` | 🌐 | Público: solo `disponible`. Personal: todos los estados (+ propietario, ids de fotos) |
| `GET /tipos-propiedad` · `GET /config` | 🌐 | Tipos de inmueble · opciones públicas (`alta_inmuebles_admin`) |
| `POST /propiedades` | 🛡️ | Crear (solo si `PERMITIR_ALTA_INMUEBLES_ADMIN=true`; si no, 405) |
| `PUT /propiedades/:id` | 🛡️ | Editar datos / cambiar estado (RF017) |
| `DELETE /propiedades/:id` | 🛡️ | Eliminar (409 si tiene contratos/citas → usar estado `inactiva`) |
| `POST /propiedades/:id/fotos` | 🛡️ | `multipart` campo `fotos` (JPG/PNG/WebP ≤5 MB, hasta 8) o `urls[]` |
| `DELETE /propiedades/:id/fotos/:idFoto` | 🛡️ | Quitar foto |

## Atención al cliente (`/atencion`)
| Ruta | Acceso | Descripción |
|---|---|---|
| `GET /zonas` | 🌐 | Zonas con inmuebles disponibles |
| `POST /buscar` | 🌐 | `{ tipo, modalidad: compra\|arriendo, zona, presupuesto, sesion }` → inmuebles con `compatibilidad` (guarda historial) |
| `GET /similares?sesion=&excluir=` | 🌐 | Recomendaciones según el historial |
| `POST /chat` | 🌐 | Pregunta libre (IA local opcional) |
| `POST /interesados` | 🌐 | `{ nombre, edad≥18, correo, ocupacion, telefono? }` |
| `GET /disponibilidad?fecha=AAAA-MM-DD` | 🌐 | Horas libres (citas de 1 h cada 30 min) |
| `POST /citas` | 🌐 | `{ id_interesado, id_propiedad, fecha, hora }` → asigna asesor automáticamente |
| `GET /citas/consulta?codigo=` · `PATCH /citas/gestionar` | 🌐 | Consultar / cancelar / reprogramar con código (RF016) |
| `GET /calendario?desde=&hasta=&agente=` | 🧑‍💼 | Citas, visitas y disponibilidad (el asesor solo ve la suya; máx. 62 días) |
| `GET /citas?estado=&agente=` | 🧑‍💼 | Solicitudes |
| `POST /citas/interna` | 🧑‍💼 | Agendar por teléfono/oficina |
| `PATCH /citas/:id/estado` · `PATCH /citas/:id/reprogramar` | 🧑‍💼 | Atender, cancelar, reprogramar |
| `GET /interesados` · `GET /historial` | 🧑‍💼 | Clientes interesados · búsquedas |
| `POST /agentes` | 🛡️ | Registrar asesor (crea cuenta + horario base) |
| `GET /agentes/detalle` · `GET /agentes/horarios` | 🧑‍💼 | Asesores y franjas |
| `POST /agentes/horarios` · `DELETE /agentes/horarios/:id` · `PUT /agentes/:id` · `PATCH /agentes/:id/activo` | 🛡️ | Gestión de disponibilidad (RF013/RF014) |
| `GET /reportes` · `GET /analisis?dias=` | 🧑‍💼 | RF018 y análisis de demanda |
| `GET /reportes/citas.csv` · `GET /auditoria` | 🛡️ | Exportación · registro de actividad |
| `GET /notificaciones` | 🧑‍💼 | Avisos enviados |

## Portal por rol (`/portal`)
| Ruta | Acceso | Descripción |
|---|---|---|
| `GET /cliente/citas` · `PATCH /cliente/citas/:id` | 👤 | Seguimiento y cambio de mis citas |
| `GET /cliente/historial` · `GET /cliente/recomendaciones` | 👤 | Mis búsquedas y recomendaciones |
| `GET /propietario/resumen` · `/propiedades` · `/contratos` | 🏠 | Mi portafolio, consultas y pagos |

## Operación
`contratos`, `pagos`, `remodelaciones`, `visitas`: `GET/POST /:recurso`, `GET/PUT/DELETE /:recurso/:id` (🧑‍💼; eliminar solo 🛡️).
`clientes`, `propietarios`, `agentes`: lectura 🧑‍💼, edición 🛡️. `POST /propietarios` y `POST /clientes` 🛡️ (crean la cuenta). `GET /dashboard/resumen` 🧑‍💼.
