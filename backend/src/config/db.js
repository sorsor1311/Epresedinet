const mysql = require('mysql2/promise');
const env = require('./env');

const pool = mysql.createPool({
  host: env.db.host, port: env.db.port, user: env.db.user, password: env.db.password, database: env.db.database,
  charset: 'utf8mb4',
  dateStrings: true,      // las fechas viajan como 'AAAA-MM-DD HH:MM:SS' (hora de Colombia, sin conversiones de zona)
  decimalNumbers: true,   // los DECIMAL (dinero) llegan como número, no como texto
  waitForConnections: true, connectionLimit: 10, queueLimit: 0
});

const TABLAS_REQUERIDAS = ['roles', 'usuarios', 'propiedades', 'tipo_propiedades', 'agentes', 'clientes', 'propietarios',
  'interesados', 'solicitudes_contacto', 'horarios_asesor', 'busquedas', 'notificaciones', 'propiedad_fotos', 'auditoria'];

/** Verifica conexión y esquema. Devuelve una lista de problemas con la solución sugerida (vacía = todo bien). */
async function diagnosticarBD() {
  const problemas = [];
  try {
    const [filas] = await pool.query('SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?', [env.db.database]);
    const existentes = new Set(filas.map(f => f.t));
    const faltan = TABLAS_REQUERIDAS.filter(t => !existentes.has(t));
    if (faltan.length) problemas.push(`Faltan tablas en "${env.db.database}": ${faltan.join(', ')}. Solución: npm run db:instalar`);
  } catch (e) {
    const pistas = {
      ECONNREFUSED: `MySQL no está encendido en ${env.db.host}:${env.db.port}. Inicia el servicio MySQL (XAMPP/Workbench/Docker) y revisa DB_HOST/DB_PORT en backend/.env.`,
      ER_ACCESS_DENIED_ERROR: 'Usuario o contraseña de MySQL incorrectos. Revisa DB_USER y DB_PASSWORD en backend/.env.',
      ER_BAD_DB_ERROR: `La base de datos "${env.db.database}" no existe. Solución: npm run db:instalar`,
      ENOTFOUND: `No se encuentra el servidor "${env.db.host}". Revisa DB_HOST en backend/.env.`
    };
    problemas.push(pistas[e.code] || `No se pudo consultar la base de datos: ${e.message}`);
  }
  return problemas;
}

module.exports = pool;
module.exports.diagnosticarBD = diagnosticarBD;
module.exports.TABLAS_REQUERIDAS = TABLAS_REQUERIDAS;
