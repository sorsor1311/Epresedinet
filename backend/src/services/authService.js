const bcrypt = require('bcrypt');
const pool = require('../config/db');
const { generarToken } = require('../utils/jwt');
const { fallo, telefonoValido } = require('../utils/errores');
const { crearCuenta } = require('./usuariosService');

const TABLA = { Cliente: 'clientes', Agente: 'agentes', Propietario: 'propietarios' };

class AuthService {
  /** Registro público: solo crea clientes. Los demás roles los crea el administrador. */
  static async registrarUsuario(datos = {}) {
    const { usuario, correo, password, nombre, telefono, profesion } = datos;
    if (![usuario, correo, password, nombre, telefono, profesion].every(v => typeof v === 'string' && v.trim()))
      throw fallo('Se requieren usuario, correo, password, nombre, telefono y profesion');
    const cuenta = await crearCuenta({ rol: 'Cliente', usuario, correo, password, nombre, telefono, profesion });
    const nuevo = { id_usuario: cuenta.id_usuario, usuario: cuenta.usuario, correo: cuenta.correo, rol: 'Cliente' };
    return { usuario: nuevo, token: generarToken(nuevo) };
  }

  static async login({ correo, password } = {}) {
    if (!correo || !password) throw fallo('El correo y la contraseña son requeridos');
    const [filas] = await pool.execute('SELECT u.id_usuario, u.usuario, u.correo, u.password, r.nombre AS rol FROM usuarios u INNER JOIN roles r ON r.id_rol = u.fk_rol WHERE u.correo = ?', [String(correo).trim()]);
    const u = filas[0];

    if (!u || !['Administrador', 'Agente'].includes(u.rol) || !(await bcrypt.compare(String(password), u.password))) throw fallo('Credenciales incorrectas', 401);
    const { password: _h, ...seguro } = u;
    return { usuario: seguro, token: generarToken(seguro) };
  }

  /** Perfil del usuario autenticado (nombre, teléfono, etc. según su rol). */
  static async perfil(sesion) {
    const [[u]] = await pool.execute('SELECT u.id_usuario, u.usuario, u.correo, u.fecha_creacion, r.nombre AS rol FROM usuarios u JOIN roles r ON r.id_rol = u.fk_rol WHERE u.id_usuario = ?', [sesion.id_usuario]);
    if (!u) throw fallo('Usuario no encontrado', 404);
    const tabla = TABLA[u.rol];
    let perfil = {};
    if (tabla) { const [[p]] = await pool.query('SELECT * FROM ?? WHERE fk_usuario = ?', [tabla, u.id_usuario]); perfil = p || {}; }
    return { ...u, nombre: perfil.nombre || u.usuario, telefono: perfil.telefono || '', profesion: perfil.profesion || '' };
  }

  static async actualizarPerfil(sesion, { nombre, telefono, profesion } = {}) {
    const tabla = TABLA[sesion.rol];
    if (!tabla) throw fallo('Tu rol no tiene perfil editable');
    if (nombre !== undefined && !String(nombre).trim()) throw fallo('El nombre es obligatorio');
    if (telefono !== undefined && !telefonoValido(telefono)) throw fallo('El teléfono debe contener 10 dígitos');
    const campos = { nombre, telefono, ...(sesion.rol === 'Cliente' ? { profesion } : {}) };
    const sets = Object.entries(campos).filter(([, v]) => v !== undefined);
    if (!sets.length) throw fallo('No hay datos para actualizar');
    await pool.query(`UPDATE ?? SET ${sets.map(() => '?? = ?').join(', ')} WHERE fk_usuario = ?`, [tabla, ...sets.flat(), sesion.id_usuario]);
    return AuthService.perfil(sesion);
  }

  static async cambiarPassword(sesion, { actual, nueva } = {}) {
    if (!nueva || String(nueva).length < 8) throw fallo('La nueva contraseña debe tener al menos 8 caracteres');
    const [[u]] = await pool.execute('SELECT password FROM usuarios WHERE id_usuario = ?', [sesion.id_usuario]);
    if (!u || !(await bcrypt.compare(String(actual || ''), u.password))) throw fallo('La contraseña actual no es correcta', 401);
    await pool.execute('UPDATE usuarios SET password = ? WHERE id_usuario = ?', [await bcrypt.hash(String(nueva), 10), sesion.id_usuario]);
  }
}
module.exports = AuthService;
