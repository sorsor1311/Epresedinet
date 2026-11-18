/**
 * Configuración centralizada. Lee el .env y valida lo imprescindible con mensajes claros,
 * para que un error de configuración se entienda en segundos y no como un fallo misterioso.
 */
const path = require('node:path');
const crypto = require('node:crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const produccion = process.env.NODE_ENV === 'production';
let jwtSecret = process.env.JWT_SECRET || '';
let jwtTemporal = false;
if (jwtSecret.length < 32) {
  if (produccion) throw new Error('JWT_SECRET debe tener al menos 32 caracteres (configúralo en backend/.env).');
  // En desarrollo se genera uno temporal para no bloquear el arranque (las sesiones se cierran al reiniciar).
  jwtSecret = crypto.randomBytes(48).toString('hex');
  jwtTemporal = true;
  console.warn('[config] JWT_SECRET ausente o corto: se usa uno temporal. Define uno fijo en backend/.env para no perder sesiones al reiniciar.');
  process.env.JWT_SECRET = jwtSecret;
}

const env = {
  produccion,
  puerto: Number(process.env.PORT) || 5000,
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'Inmobiliaria'
  },
  jwtSecret, jwtTemporal,
  jwtExpira: process.env.JWT_EXPIRES_IN || '8h',
  // Orígenes permitidos por CORS (separados por coma). Vacío = cualquiera (útil en desarrollo).
  corsOrigenes: (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean),
  // Máximo de intentos de login/registro por IP y minuto (protección contra fuerza bruta)
  limiteAuth: Number(process.env.LIMITE_AUTH) || 10,
  limitePublico: Number(process.env.LIMITE_PUBLICO) || 60,   // peticiones/minuto por IP en endpoints públicos
  trustProxy: process.env.TRUST_PROXY === 'true',
  // RF009: permite que el administrador agregue inmuebles desde el panel. Por defecto los inmuebles
  // se cargan directamente en la base de datos (ver database/02_catalogo_inicial.sql).
  altaInmueblesAdmin: process.env.PERMITIR_ALTA_INMUEBLES_ADMIN === 'true',
  uploadsDir: path.resolve(process.env.UPLOADS_DIR || path.join(__dirname, '..', '..', 'uploads')),
  frontendDist: path.resolve(process.env.FRONTEND_DIST || path.join(__dirname, '..', '..', '..', 'frontend', 'dist')),
  resend: { apiKey: process.env.RESEND_API_KEY || '', from: process.env.MAIL_FROM || '' },
  ollama: { url: process.env.OLLAMA_URL || 'http://127.0.0.1:11434', modelo: process.env.OLLAMA_MODEL || 'qwen3:4b' }
};
module.exports = env;
