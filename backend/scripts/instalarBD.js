/**
 * Ejecuta un script SQL de /database (con soporte de DELIMITER) usando las credenciales del .env.
 * No requiere tener el cliente "mysql" instalado.
 *
 *   npm run db:instalar                       -> database/01_instalar_esquema.sql
 *   npm run db:catalogo -- --propietario x@y  -> database/02_catalogo_inicial.sql
 */
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');
const env = require('../src/config/env');

const args = process.argv.slice(2);
const archivo = args.find(a => a.endsWith('.sql')) || 'database/01_instalar_esquema.sql';
const iProp = args.indexOf('--propietario');
const propietario = iProp >= 0 ? args[iProp + 1] : null;

function dividir(sql) {
  const sentencias = []; let delimitador = ';', actual = '';
  for (const linea of sql.split(/\r?\n/)) {
    const d = linea.match(/^\s*DELIMITER\s+(\S+)\s*$/i);
    if (d) { delimitador = d[1]; continue; }
    if (!actual && (!linea.trim() || linea.trim().startsWith('--'))) continue;
    actual += linea + '\n';
    if (actual.trimEnd().endsWith(delimitador)) {
      const s = actual.trimEnd().slice(0, -delimitador.length).trim();
      if (s) sentencias.push(s);
      actual = '';
    }
  }
  if (actual.trim()) sentencias.push(actual.trim());
  return sentencias;
}

(async () => {
  let sql = fs.readFileSync(path.resolve(__dirname, '..', '..', archivo), 'utf8');
  // El script usa el nombre "Inmobiliaria"; se adapta al DB_NAME configurado en el .env
  sql = sql.replace(/(CREATE DATABASE IF NOT EXISTS |USE |ALTER DATABASE )Inmobiliaria\b/g, `$1\`${env.db.database.replace(/`/g, '')}\``);
  if (propietario) sql = sql.replace(/SET @propietario = '[^']*';/, `SET @propietario = '${propietario.replace(/'/g, '')}';`);
  const conexion = await mysql.createConnection({ host: env.db.host, port: env.db.port, user: env.db.user, password: env.db.password, charset: 'utf8mb4' });
  try {
    for (const s of dividir(sql)) await conexion.query(s);
    console.log(`✔ ${path.basename(archivo)} ejecutado correctamente en ${env.db.host}:${env.db.port}`);
  } catch (e) {
    console.error('✖ Error ejecutando el script:', e.sqlMessage || e.message);
    process.exitCode = 1;
  } finally { await conexion.end(); }
})().catch(e => { console.error('✖ No se pudo conectar a MySQL:', e.code || '', e.message); process.exit(1); });
