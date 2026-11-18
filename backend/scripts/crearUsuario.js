/**
 * Crea una cuenta real con su perfil (Administrador, Agente, Propietario o Cliente).
 *
 *   npm run usuario -- --rol Administrador --usuario laura --correo laura@epresedi.com --nombre "Laura Gómez" --password "ClaveSegura2026"
 *   npm run usuario -- --rol Agente --usuario ana --correo ana@epresedi.com --nombre "Ana Ruiz" --telefono 3011112222 --password "ClaveSegura2026"
 *
 * Si ya existe un asesor/propietario/cliente con ese correo y sin cuenta (p. ej. cargado desde el modelo .mwb),
 * la cuenta se VINCULA a ese registro en vez de duplicarlo. También acepta NUEVA_PASSWORD como variable de entorno.
 */
const pool = require('../src/config/db');
const { crearCuenta } = require('../src/services/usuariosService');

const args = Object.fromEntries(process.argv.slice(2).reduce((p, v, i, t) => (v.startsWith('--') ? [...p, [v.slice(2), t[i + 1]]] : p), []));

crearCuenta({ rol: args.rol, usuario: args.usuario, correo: args.correo, nombre: args.nombre, telefono: args.telefono, profesion: args.profesion || 'No indicada', password: args.password || process.env.NUEVA_PASSWORD })
  .then(c => console.log(`✔ Cuenta creada: ${c.usuario} (${c.rol})${c.vinculado ? ' — vinculada a un perfil existente' : ''}. Inicia sesión con el correo ${c.correo}.`))
  .catch(e => { console.error('✖ No se pudo crear la cuenta:', e.message); process.exitCode = 1; })
  .finally(() => pool.end());
