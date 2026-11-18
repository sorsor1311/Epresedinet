/** Revisa que todo esté bien conectado (Node, .env, MySQL, esquema, cuentas, frontend). Uso: npm run diagnostico */
const fs = require('node:fs');
const path = require('node:path');
const env = require('../src/config/env');
const pool = require('../src/config/db');

const ok = t => console.log('  ✔', t), mal = (t, ayuda) => { console.log('  ✖', t); if (ayuda) console.log('     → ' + ayuda); fallos++; };
let fallos = 0;
(async () => {
  console.log('\nDiagnóstico EPRESEDI\n');
  const [mayor] = process.versions.node.split('.').map(Number);
  mayor >= 18 ? ok(`Node.js ${process.versions.node}`) : mal(`Node.js ${process.versions.node} es muy antiguo`, 'Instala Node 18 o superior (https://nodejs.org).');
  fs.existsSync(path.join(__dirname, '..', '.env')) ? ok('Archivo backend/.env encontrado') : mal('No existe backend/.env', 'Copia backend/.env.example a backend/.env y completa tus datos de MySQL.');
  !env.jwtTemporal ? ok('JWT_SECRET configurado') : mal('JWT_SECRET no está definido (o tiene menos de 32 caracteres)', 'Genera uno: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))" y pégalo en backend/.env');
  const problemas = await pool.diagnosticarBD();
  if (problemas.length) problemas.forEach(p => mal(p)); else {
    ok(`MySQL conectado y esquema completo (${env.db.database}@${env.db.host}:${env.db.port})`);
    const [[r]] = await pool.query("SELECT (SELECT COUNT(*) FROM usuarios u JOIN roles r ON r.id_rol=u.fk_rol WHERE r.nombre='Administrador') AS admins, (SELECT COUNT(*) FROM agentes WHERE activo=1) AS agentes, (SELECT COUNT(*) FROM propiedades WHERE estado='disponible') AS inmuebles, (SELECT COUNT(*) FROM propietarios) AS propietarios");
    r.admins ? ok(`${r.admins} administrador(es) registrado(s)`) : mal('No hay ningún administrador', 'npm run usuario -- --rol Administrador --usuario admin --correo admin@tuempresa.com --nombre "Administrador" --password "ClaveSegura2026"');
    r.agentes ? ok(`${r.agentes} asesor(es) activo(s)`) : mal('No hay asesores activos: los clientes no podrán agendar citas', 'Crea asesores con: npm run usuario -- --rol Agente ... (o desde Administración > Asesores)');
    r.inmuebles ? ok(`${r.inmuebles} inmueble(s) disponible(s)`) : mal('No hay inmuebles disponibles', r.propietarios ? 'Cárgalos: npm run db:catalogo (edita database/02_catalogo_inicial.sql)' : 'Primero crea un propietario (npm run usuario -- --rol Propietario ...) y luego npm run db:catalogo');
  }
  fs.existsSync(path.join(env.frontendDist, 'index.html')) ? ok('Frontend compilado (el backend servirá el sitio completo)') : console.log('  · Frontend sin compilar (normal en desarrollo: usa npm run dev en /frontend; para producción: npm run build)');
  console.log(`\n  Alta de inmuebles desde el panel: ${env.altaInmueblesAdmin ? 'ACTIVADA' : 'desactivada'}\n`);
  console.log(fallos ? `✖ ${fallos} punto(s) por resolver.\n` : '✔ Todo listo. Inicia con: npm start\n');
  await pool.end(); process.exit(fallos ? 1 : 0);
})();
