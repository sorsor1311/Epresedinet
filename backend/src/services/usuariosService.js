const bcrypt = require('bcrypt');
const pool = require('../config/db');
const { fallo, correoValido, telefonoValido } = require('../utils/errores');

const ROLES = ['Administrador', 'Agente', 'Propietario', 'Cliente'];
const TABLA_PERFIL = { Agente: 'agentes', Propietario: 'propietarios', Cliente: 'clientes' };
const HORARIO_BASE = [[1, 2, 3, 4, 5], [['08:00', '12:00'], ['14:00', '18:00']]];

async function crearCuenta({ rol, usuario, correo, password, nombre, telefono, profesion, correoVerificado = true }, externa = null) {
  if (!ROLES.includes(rol)) throw fallo('Rol inválido');
  if (!String(usuario || '').trim() || !String(nombre || '').trim() && rol !== 'Administrador') throw fallo('Faltan usuario o nombre');
  const correoNormalizado = String(correo || '').trim().toLowerCase();
  if (!correoValido(correoNormalizado)) throw fallo('Correo electrónico inválido');
  if (!password || password.length < 8) throw fallo('La contraseña debe tener al menos 8 caracteres');
  if (rol !== 'Administrador' && !telefonoValido(telefono)) throw fallo('El teléfono debe contener 10 dígitos');
  if (rol === 'Cliente' && !String(profesion || '').trim()) throw fallo('La profesión es obligatoria');

  const conexion = externa || await pool.getConnection();
  try {
    if (!externa) await conexion.beginTransaction();
    const [dup] = await conexion.execute(
      'SELECT id_usuario FROM usuarios WHERE usuario = ? OR LOWER(correo) = ?',
      [usuario.trim(), correoNormalizado]
    );
    if (dup.length) throw fallo('El usuario o el correo ya están registrados', 409);
    const [[filaRol]] = await conexion.execute('SELECT id_rol FROM roles WHERE nombre = ?', [rol]);
    if (!filaRol) throw fallo('Falta el rol en la base de datos. Ejecuta: npm run db:instalar', 500);
    const [u] = await conexion.execute('INSERT INTO usuarios (usuario, password, correo, fk_rol) VALUES (?,?,?,?)', [usuario.trim(), await bcrypt.hash(password, 10), correo.trim(), filaRol.id_rol]);

    let idPerfil = null, vinculado = false;
    if (TABLA_PERFIL[rol]) {
      const tabla = TABLA_PERFIL[rol], pk = { agentes: 'id_agente', propietarios: 'id_propietario', clientes: 'id_cliente' }[tabla];
      const [[previo]] = await conexion.execute(`SELECT ${pk} AS id FROM ${tabla} WHERE correo = ? AND fk_usuario IS NULL LIMIT 1`, [correo.trim()]);
      if (previo) {
        await conexion.execute(`UPDATE ${tabla} SET fk_usuario = ? WHERE ${pk} = ?`, [u.insertId, previo.id]);
        idPerfil = previo.id; vinculado = true;
      } else if (rol === 'Cliente') {
        [{ insertId: idPerfil }] = await conexion.execute('INSERT INTO clientes (nombre, telefono, correo, profesion, fk_usuario) VALUES (?,?,?,?,?)', [nombre.trim(), telefono, correo.trim(), profesion.trim(), u.insertId]);
      } else {
        [{ insertId: idPerfil }] = await conexion.execute(`INSERT INTO ${tabla} (nombre, telefono, correo, fk_usuario) VALUES (?,?,?,?)`, [nombre.trim(), telefono, correo.trim(), u.insertId]);
      }
      if (rol === 'Agente') {
        const [[tiene]] = await conexion.execute('SELECT COUNT(*) AS n FROM horarios_asesor WHERE fk_agente = ?', [idPerfil]);
        if (!tiene.n) for (const dia of HORARIO_BASE[0]) for (const [ini, fin] of HORARIO_BASE[1])
          await conexion.execute('INSERT INTO horarios_asesor (fk_agente, dia_semana, hora_inicio, hora_fin) VALUES (?,?,?,?)', [idPerfil, dia, ini, fin]);
      }
    }
    if (!externa) await conexion.commit();
    return { id_usuario: u.insertId, id_perfil: idPerfil, vinculado, rol, usuario: usuario.trim(), correo: correo.trim() };
  } catch (e) {
    if (!externa) await conexion.rollback();
    if (e.code === 'ER_DUP_ENTRY') throw fallo('El usuario o el correo ya están registrados', 409);
    throw e;
  } finally { if (!externa) conexion.release(); }
}

module.exports = { crearCuenta, ROLES };
