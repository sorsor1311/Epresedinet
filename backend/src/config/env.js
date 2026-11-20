const path = require('node:path');
const crypto = require('node:crypto');
const dotenv = require('dotenv');

const archivoEntorno = process.env.ENV_FILE || '.env';

dotenv.config({
  path: path.resolve(__dirname, '..', '..', archivoEntorno)
});

const produccion = process.env.NODE_ENV === 'production';
let jwtSecret = process.env.JWT_SECRET || '';
let jwtTemporal = false;
if (jwtSecret.length < 32) {
  if (produccion) throw new Error('JWT_SECRET debe tener al menos 32 caracteres');
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
  corsOrigenes: (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean),
  limiteAuth: Number(process.env.LIMITE_AUTH) || 10,
  limitePublico: Number(process.env.LIMITE_PUBLICO) || 60,  
  trustProxy: process.env.TRUST_PROXY === 'true',
 
  altaInmueblesAdmin: process.env.PERMITIR_ALTA_INMUEBLES_ADMIN === 'true',
  uploadsDir: path.resolve(process.env.UPLOADS_DIR || path.join(__dirname, '..', '..', 'uploads')),
  frontendDist: path.resolve(process.env.FRONTEND_DIST || path.join(__dirname, '..', '..', '..', 'frontend', 'dist')),
  apiPublicUrl: (process.env.API_PUBLIC_URL || 'https://epresedi-backend.onrender.com').replace(/\/+$/, ''),
  resend: { apiKey: process.env.RESEND_API_KEY || '', from: process.env.MAIL_FROM || '' },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || ''
  },
  ollama: { url: process.env.OLLAMA_URL || 'http://127.0.0.1:11434', modelo: process.env.OLLAMA_MODEL || 'qwen3:4b' }
};
module.exports = env;


