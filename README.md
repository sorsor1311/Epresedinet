# EPRESEDI S.A.S. · Sistema de gestión inmobiliaria

Atención al cliente con asistente conversacional, catálogo de inmuebles, agenda automática de citas con asesores, calendario, portal por rol (Administrador, Asesor, Propietario y Cliente), reportes y análisis.

**Inicio rápido** (detalle en [`docs/INSTALACION.md`](docs/INSTALACION.md)):
```bash
npm run instalar                         # dependencias de backend y frontend
cp backend/.env.example backend/.env     # y completa DB_USER, DB_PASSWORD, JWT_SECRET
cd backend
npm run db:instalar                      # crea/actualiza la base de datos
npm run usuario -- --rol Administrador --usuario admin --correo admin@tuempresa.com --nombre "Administrador" --password "UnaClaveSegura1"
npm run diagnostico                      # verifica que todo esté conectado
cd .. && npm run build && npm start      # sitio + API en http://localhost:5000
```

| Documento | Contenido |
|---|---|
| [`docs/INSTALACION.md`](docs/INSTALACION.md) | Cómo conectar frontend, backend y base de datos + solución de problemas |
| [`docs/REQUISITOS.md`](docs/REQUISITOS.md) | RF001–RF018 → dónde se implementan y cómo se verifican |
| [`docs/FASES_MVP.md`](docs/FASES_MVP.md) | Cumplimiento de las 10 fases de la presentación |
| [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) | Capas, carpetas, flujo y matriz de roles |
| [`docs/CAMBIOS_BASE_DE_DATOS.md`](docs/CAMBIOS_BASE_DE_DATOS.md) | Qué se cambió en la BD y por qué · diagrama `docs/modelo_er.png` |
| [`docs/API.md`](docs/API.md) | Endpoints por rol |

Pruebas: `npm test` (unitarias) · `npm run prueba:api` dentro de `backend/` (integración contra servidor y BD reales; requiere `ADMIN_EMAIL` y `ADMIN_PASSWORD`).
