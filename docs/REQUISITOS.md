# Trazabilidad de requerimientos (Proyecto de Software – Negocio de Inmobiliaria)

Cada requerimiento del documento, dónde está implementado y cómo se verifica.
Pruebas: `U` = `npm test` (9 pruebas unitarias) · `I` = `npm run prueba:api` (82 comprobaciones contra servidor y BD reales) · `E` = recorrido en navegador (Playwright).

| ID | Requerimiento | Implementación | Verificación |
|---|---|---|---|
| RF001 | Chat-Bot de atención inicial (tipo, presupuesto, zona, comprar/arrendar) | `frontend/src/publico/Asistente.jsx` (conversación guiada) · `POST /api/atencion/buscar` · IA opcional `POST /atencion/chat` (Ollama) | I, E |
| RF002 | Filtrar propiedades según preferencias | `services/catalogoService.js` (`buscarInmuebles`, `puntuar`: precio 50 + zona 30 + tipo 20; tolerancia +15 % de presupuesto) | U, I, E |
| RF003 | Ver información básica (precio, ubicación, habitaciones, área, fotos, tipo, compra/arriendo) | Catálogo y detalle: `publico/Catalogo.jsx` · galería `propiedad_fotos` · `GET /api/propiedades` | I, E |
| RF004 | Continuar o finalizar la búsqueda | Botones *Ver opciones similares / Cambiar mi búsqueda / Finalizar* en el asistente | E |
| RF005 | Registrar datos del interesado (nombre, edad, correo, ocupación) | `FlujoCita.jsx` · `POST /atencion/interesados` (valida mayoría de edad y correo) | I, E |
| RF006 | Solicitar contacto eligiendo fecha y hora | `SelectorHorario.jsx` (solo muestra horas realmente libres) · `POST /atencion/citas` | I, E |
| RF007 | Asignación automática al asesor con mayor disponibilidad | `services/agendaService.js` → `elegirAsesor`: cabe en su franja, sin solapes, menor carga del día, luego de la semana | U, I |
| RF008 | Confirmación por correo/mensaje | `services/notificationService.js` (Resend) + registro en `notificaciones` | I |
| RF009 | Administrador agrega, actualiza y elimina propiedades (precio, ubicación, área, fotos, características, estado) | `Panel → Propiedades` (alta con `PERMITIR_ALTA_INMUEBLES_ADMIN=true`, edición, fotos reales, baja, eliminación) **o** carga por BD (`sp_registrar_propiedad`) | I, E |
| RF010 | Guardar historial de búsquedas | tabla `busquedas` (por cuenta o sesión) · `Mi cuenta → Para ti` | I |
| RF011 | Recomendar propiedades similares | `GET /atencion/similares`, `GET /portal/cliente/recomendaciones` (usa el historial, amplía zona y presupuesto) | I, E |
| RF012 | Consultar solicitudes, clientes, propiedad, fecha y estado | `Panel → Solicitudes y citas`, `Clientes interesados`, **Calendario** (mes/semana/día) | I, E |
| RF013 | Registro de asesores (datos, correo, teléfono, horarios, activo/inactivo) | `Panel → Asesores y horarios` · `POST /atencion/agentes` | I, E |
| RF014 | Gestionar disponibilidad de asesores | franjas semanales editables · `POST/DELETE /atencion/agentes/horarios` (sin cruces) | I, E |
| RF015 | Notificar al asesor de nuevas citas | `avisarCita` → correo + `notificaciones` · campana en el panel | I |
| RF016 | Cambio o cancelación de citas | Por código (`PATCH /atencion/citas/gestionar`) o desde *Mi cuenta* (`PATCH /portal/cliente/citas/:id`); el estado se actualiza solo | I, E |
| RF017 | Clasificar propiedades por estado | selector de estado en *Propiedades*; el público solo ve `disponible` | I, E |
| RF018 | Reportes de atención | `Panel → Reportes y análisis` (clientes atendidos, citas, inmuebles más consultados, carga por asesor, demanda, embudo, CSV) | I, E |

## Requisitos transversales aplicados
* **Seguridad**: contraseñas con bcrypt; JWT sin estado; autorización por rol en cada ruta; límite de intentos (login 10/min); cabeceras `helmet` (CSP); validación de imágenes por contenido; mensajes de login que no revelan si el correo existe; un asesor solo ve y modifica sus citas; el cliente solo las suyas.
* **Integridad**: validaciones en BD (triggers), asignación de citas dentro de una transacción con bloqueo (sin dobles reservas), claves foráneas.
* **Usabilidad**: responsive (móvil/escritorio), accesibilidad básica (etiquetas, foco, `aria-*`), mensajes de error claros en español.
* **Mantenibilidad**: backend por capas (rutas → controladores → servicios), configuración centralizada y validada, pruebas automáticas, documentación.
