# Cumplimiento de las 10 fases del MVP (presentación "FASE 0 – Pasos para crear un MVP")

La presentación usa ejemplos de comercio/logística (productos, pedidos, bodegas, repartidores). Se adaptaron al dominio inmobiliario:

| Presentación | En este proyecto |
|---|---|
| Productos | Propiedades (casas, apartamentos, lotes, locales) |
| Pedidos / seguimiento del pedido | Solicitudes de contacto (citas) / *Mi cuenta → Mis citas* |
| Clientes | Clientes registrados + clientes interesados |
| Bodegas | Propietarios (quienes aportan el inventario) |
| Repartidores | Asesores inmobiliarios |
| Carrito / proceso de compra | Lista de interés / solicitud de cita |
| Algoritmos logísticos (oferta ↔ demanda) | Asignación automática de asesores y recomendación de inmuebles |

| Fase | Estado | Evidencia |
|---|---|---|
| **1. Arquitectura** (división front/back, carpetas profesionales, flujo, roles) | ✅ | `docs/ARQUITECTURA.md`: capas, estructura de carpetas, flujo y matriz de 4 roles (Administrador, Agente, Propietario, Cliente) |
| **2. Base de datos** (modelo relacional + script SQL) | ✅ | `database/01_instalar_esquema.sql`, `docs/modelo_er.png`, `docs/CAMBIOS_BASE_DE_DATOS.md` |
| **3. Setup del backend** (Node + Express) | ✅ | `backend/` Express 5, `config/env.js` validado, `server.js` con diagnóstico, `npm run diagnostico` |
| **4. Autenticación** (registro, login, JWT, roles) | ✅ | `services/authService.js`, `middlewares/authMiddleware.js`; JWT **sin estado** (sin sesiones en memoria → escalable a varias instancias); roles Administrador/Agente/Propietario/Cliente; perfil y cambio de contraseña |
| **5. API REST** (propiedades, citas, clientes, propietarios, asesores) | ✅ | `docs/API.md` · rutas en `backend/src/routes/` |
| **6. Algoritmos** (conectar oferta y demanda) | ✅ | `agendaService.elegirAsesor` (disponibilidad + balanceo de carga) y `catalogoService.puntuar` (compatibilidad); 9 pruebas unitarias en `backend/tests/` |
| **7. Setup del frontend** (React + Vite) | ✅ | `frontend/` React 18 + Vite 6, proxy a la API |
| **8. Interfaz del cliente** (landing, catálogo, carrito, proceso de compra, seguimiento) | ✅ | Landing (`Inicio.jsx`), catálogo con filtros (`Catalogo.jsx`), lista de interés (`favoritos.js`), asistente + solicitud de cita (`Asistente.jsx`, `FlujoCita.jsx`), seguimiento (`Cuenta.jsx`) |
| **9. Dashboard administrativo** (productos, pedidos, bodegas, repartidores, análisis) | ✅ | `frontend/src/admin/`: Propiedades, Citas/Calendario, Propietarios, Asesores, Reportes y análisis (+ contratos, pagos, remodelaciones, visitas, auditoría) |
| **10. Deploy** | ✅ / ⚠️ | Un solo proceso en producción (`npm run build` + `npm start`) **probado**; `Dockerfile` y `docker-compose.yml` incluidos **sin probar** en este entorno (no había Docker) |

## Lo que se agregó por no estar en los archivos pero ser necesario
Pantallas del **Propietario** y del **Cliente** (Fase 1 exige "diseño de roles"; el proyecto solo tenía Administrador/Agente), seguimiento de citas del cliente (Fase 8), análisis con gráficos (Fase 9), registro de actividad, subida de fotos, scripts de instalación y diagnóstico, pruebas automáticas (Fase 6) y documentación.
