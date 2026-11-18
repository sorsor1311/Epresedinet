const env = require('./config/env');
const pool = require('./config/db');
const app = require('./app');

async function iniciar() {
  const problemas = await pool.diagnosticarBD();
  if (problemas.length) {
    console.error('\n✖ El servidor no puede iniciar todavía:');
    problemas.forEach(p => console.error('  · ' + p));
    console.error('\nTambién puedes ejecutar: npm run diagnostico\n');
    process.exit(1);
  }
  const servidor = app.listen(env.puerto, () => {
    console.log(`✔ Base de datos conectada (${env.db.database}@${env.db.host})`);
    console.log(`✔ API lista en http://localhost:${env.puerto}/api/health`);
    if (app.locals.sirveFrontend) console.log(`✔ Sitio web en http://localhost:${env.puerto}`);
    console.log(`  Alta de inmuebles desde el panel: ${env.altaInmueblesAdmin ? 'ACTIVADA' : 'desactivada (se cargan por base de datos)'}`);
  });
  const cerrar = () => servidor.close(() => pool.end().then(() => process.exit(0)));
  process.on('SIGINT', cerrar); process.on('SIGTERM', cerrar);
}
iniciar();
