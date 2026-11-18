# Guía de instalación y conexión (Frontend · Backend · Base de datos)

Cómo se conectan las tres partes:

```
 Navegador ──► FRONTEND (React/Vite) ──/api/*──► BACKEND (Node/Express) ──► MySQL / MariaDB
   :5173 (desarrollo)   proxy de Vite              :5000                      :3306
   :5000 (producción: el backend entrega también el sitio compilado)
```

* El **frontend nunca habla con la base de datos**: solo llama a `/api/...`.
* En **desarrollo** Vite (puerto 5173) reenvía `/api` al backend (puerto 5000).
* En **producción** basta un solo proceso: el backend sirve la API **y** el sitio compilado (`frontend/dist`) en el puerto 5000.

## 0. Requisitos
| Programa | Versión | Para qué |
|---|---|---|
| Node.js | 18 o superior (https://nodejs.org) | backend y frontend |
| MySQL 8 o MariaDB 10.5+ | encendido (XAMPP, MySQL Workbench/Server, Docker…) | base de datos |

## 1. Instalar dependencias (una vez)
Desde la carpeta raíz del proyecto (`Epresedi/`):
```
npm run instalar
```
(equivale a `npm install` dentro de `backend/` y de `frontend/`).

## 2. Configurar el backend
1. Copia `backend/.env.example` a `backend/.env`.
2. Edita `backend/.env`:
   * `DB_USER` y `DB_PASSWORD`: tu usuario y clave de MySQL (en XAMPP: `root` y clave vacía).
   * `JWT_SECRET`: obligatorio en producción, mínimo 32 caracteres. Genera uno con
     `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
   * Opcional: `RESEND_API_KEY` y `MAIL_FROM` para enviar correos reales; `PERMITIR_ALTA_INMUEBLES_ADMIN=true` para que el administrador agregue inmuebles desde el panel.

## 3. Crear la base de datos
```
cd backend
npm run db:instalar
```
Ejecuta `database/01_instalar_esquema.sql`. **No necesitas el cliente `mysql` en el PATH** (lo hace Node). El script es idempotente y funciona:
* sobre una base **vacía** (crea todo),
* sobre tu modelo **BDDEPRESEDI.mwb** (agrega usuarios, roles, citas, calendario… conservando tus datos),
* sobre la versión anterior del proyecto (renombra tablas a minúscula).

El instalador usa el nombre de base de datos de `DB_NAME` (por defecto `Inmobiliaria`).
Si prefieres Workbench: abre `database/01_instalar_esquema.sql` y ejecútalo completo (rayo); en ese caso la base se llamará `Inmobiliaria` (o cambia ese nombre en las 3 primeras líneas del script y en `DB_NAME`).

## 4. Crear las cuentas iniciales
```
npm run usuario -- --rol Administrador --usuario admin --correo admin@tuempresa.com --nombre "Administrador" --password "UnaClaveSegura1"
npm run usuario -- --rol Agente --usuario ana --correo ana@tuempresa.com --nombre "Ana Ruiz" --telefono 3011112222 --password "UnaClaveSegura1"
npm run usuario -- --rol Propietario --usuario prop1 --correo propietario@correo.com --nombre "Nombre Propietario" --telefono 3001112233 --password "UnaClaveSegura1"
```
Si ya tenías asesores/propietarios en tu base (modelo .mwb) con ese mismo correo, la cuenta **se vincula** a ese registro en vez de duplicarlo.

## 5. Cargar inmuebles
* **Por base de datos** (por defecto): edita `database/02_catalogo_inicial.sql` con tu inventario real y ejecuta `npm run db:catalogo -- --propietario propietario@correo.com`.
* **Desde el panel** (RF009): en `backend/.env` pon `PERMITIR_ALTA_INMUEBLES_ADMIN=true`, reinicia y usa *Propiedades → Nuevo inmueble* (incluye subida de fotos).

## 6. Verificar que todo está conectado
```
npm run diagnostico
```
Imprime ✔/✖ para: Node, `.env`, `JWT_SECRET`, conexión a MySQL, tablas, administrador, asesores e inmuebles, con la solución de cada ✖.

## 7. Ejecutar

**Desarrollo** (dos terminales):
```
cd backend  && npm run dev        # API en http://localhost:5000
cd frontend && npm run dev        # Sitio en http://localhost:5173
```
**Producción / entrega** (un solo proceso):
```
npm run build        # compila el frontend
npm start            # backend + sitio en http://localhost:5000
```

## Problemas frecuentes
| Síntoma | Causa | Solución |
|---|---|---|
| `connect ECONNREFUSED 127.0.0.1:3306` | MySQL apagado | Enciende MySQL (XAMPP: *Start* en MySQL) |
| `Access denied for user` | usuario/clave incorrectos | Corrige `DB_USER` / `DB_PASSWORD` en `backend/.env` |
| `Unknown database` / `Faltan tablas` | no se ejecutó el instalador | `npm run db:instalar` |
| Login responde 500 o "Error interno" | tabla `usuarios`/`roles` inexistente (modelo .mwb original) | `npm run db:instalar` y crea cuentas |
| Pantalla en blanco o "No se pudo conectar con el servidor" | backend apagado o puerto distinto | `npm run dev` en `backend`; si cambiaste `PORT`, arranca el frontend con `VITE_PROXY=http://localhost:PUERTO npm run dev` |
| `Table 'inmobiliaria.Agentes' doesn't exist` (Linux/Docker) | nombres con Mayúscula | `npm run db:instalar` (renombra a minúscula) |
| Los clientes no pueden agendar ("No hay asesores disponibles") | sin asesores activos o sin horarios | crea asesores (paso 4) y revisa *Asesores y horarios* |
| 429 "Demasiadas solicitudes" | protección contra abuso | espera un minuto (ajustable con `LIMITE_AUTH` / `LIMITE_PUBLICO`) |
| `bcrypt` no compila en Windows | falta toolchain | usa Node LTS (trae binarios precompilados) o `npm rebuild bcrypt` |
