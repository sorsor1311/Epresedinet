const crypto = require('node:crypto');
const pool = require('../config/db');
const { fallo, correoValido } = require('../utils/errores');
const { interpretarFechaHora, asignarAsesor } = require('./agendaService');
const { notificar, mensajes } = require('./notificationService');

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generarCodigo() {
  const c = Array.from(crypto.randomBytes(8), b => ALFABETO[b % 32]).join('');
  return `EPR-${c.slice(0, 4)}-${c.slice(4)}`;
}

const ESTADOS_CITA = ['programada', 'reprogramada', 'cancelada', 'atendida'];

const SELECT_CITA = `SELECT s.id_solicitud, s.fecha_contacto, s.estado, s.notas, s.origen, s.fk_propiedad, s.fk_agente,
    p.direccion AS propiedad, p.zona, t.nombre AS tipo, a.nombre AS agente,
    i.id_interesado, i.nombre AS cliente, i.edad, i.correo, i.telefono, i.ocupacion
  FROM solicitudes_contacto s
  JOIN interesados i ON i.id_interesado = s.fk_interesado
  JOIN propiedades p ON p.id_propiedad = s.fk_propiedad
  JOIN tipo_propiedades t ON t.id_tipo_propiedad = p.fk_tipo_propiedad
  LEFT JOIN agentes a ON a.id_agente = s.fk_agente`;

async function agenteDe(usuario) {
  if (usuario?.rol !== 'Agente') return null;
  const [[fila]] = await pool.execute('SELECT id_agente FROM agentes WHERE fk_usuario = ?', [usuario.id_usuario]);
  if (!fila) throw fallo('Tu usuario no tiene un perfil de asesor asociado', 403);
  return fila.id_agente;
}

async function citaVisible(id, usuario) {
  const [[cita]] = await pool.execute(`${SELECT_CITA} WHERE s.id_solicitud = ?`, [id]);
  if (!cita) throw fallo('Cita no encontrada', 404);
  const propio = await agenteDe(usuario);
  if (propio && cita.fk_agente !== propio) throw fallo('Esta cita pertenece a otro asesor', 403);
  return cita;
}

async function citaDelCliente(id, usuario) {
  const [[cita]] = await pool.execute(`${SELECT_CITA} WHERE s.id_solicitud = ? AND i.fk_usuario = ?`, [id, usuario.id_usuario]);
  if (!cita) throw fallo('Cita no encontrada', 404);
  return cita;
}

async function avisarCita(cita, codigo) {
  const [[asesor]] = cita.fk_agente ? await pool.execute('SELECT correo FROM agentes WHERE id_agente = ?', [cita.fk_agente]) : [[null]];
  const base = { propiedad: cita.propiedad, fecha: cita.fecha_contacto };
  if (codigo) await notificar(cita.correo, 'EPRESEDI: tu cita fue confirmada', mensajes.citaCliente({ nombre: cita.cliente, asesor: cita.agente, codigo, ...base }));
  if (asesor?.correo) await notificar(asesor.correo, 'EPRESEDI: nueva cita asignada', mensajes.citaAsesor({ cliente: cita.cliente, correo: cita.correo, telefono: cita.telefono, ocupacion: cita.ocupacion, ...base }), cita.fk_agente);
}

async function crearCita({ id_interesado, id_propiedad, fecha, hora, notas = null, origen = 'chatbot', soloAgente = null, modalidad = null }) {
  const { fecha: f, hora: h } = interpretarFechaHora(fecha, hora);
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const [[propiedad]] = await conexion.execute('SELECT id_propiedad, precio_venta, precio_arrendamiento FROM propiedades WHERE id_propiedad = ? AND estado = ?', [id_propiedad, 'disponible']);
    if (!propiedad) throw fallo('El inmueble ya no está disponible');
    if (modalidad && !(Number(modalidad === 'venta' ? propiedad.precio_venta : propiedad.precio_arrendamiento) > 0)) throw fallo('El inmueble no está disponible para esa negociación');
    const [[interesado]] = await conexion.execute('SELECT id_interesado FROM interesados WHERE id_interesado = ?', [id_interesado]);
    if (!interesado) throw fallo('Cliente interesado no encontrado', 404);
    const [[repetida]] = await conexion.execute(`SELECT id_solicitud FROM solicitudes_contacto WHERE fk_interesado = ? AND fk_propiedad = ? AND estado IN ('programada','reprogramada') AND fecha_contacto >= NOW() - INTERVAL 1 DAY`, [id_interesado, id_propiedad]);
    if (repetida) throw fallo('Ya existe una cita activa de este cliente para este inmueble', 409);
    const agente = await asignarAsesor(conexion, f, h, { soloAgente });
    const codigo = generarCodigo();
    const [r] = await conexion.execute('INSERT INTO solicitudes_contacto (fk_interesado, fk_propiedad, fk_agente, fecha_contacto, codigo_gestion, notas, origen) VALUES (?,?,?,?,?,?,?)',
      [id_interesado, id_propiedad, agente, `${f} ${h}:00`, codigo, notas, origen]);
    await conexion.commit();
    return { id_solicitud: r.insertId, codigo_gestion: codigo, id_agente: agente };
  } catch (e) { await conexion.rollback(); throw e; }
  finally { conexion.release(); }
}

async function reprogramar(cita, { fecha, hora }, { soloAgente = null, permitirReasignar = true } = {}) {
  const { fecha: f, hora: h } = interpretarFechaHora(fecha, hora);
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const [[actual]] = await conexion.execute('SELECT estado FROM solicitudes_contacto WHERE id_solicitud = ? FOR UPDATE', [cita.id_solicitud]);
    if (!actual || ['cancelada', 'atendida'].includes(actual.estado)) throw fallo('Esta cita ya está cerrada', 409);
    let agente;
    try { agente = await asignarAsesor(conexion, f, h, { excluirSolicitud: cita.id_solicitud, soloAgente: soloAgente ?? cita.fk_agente }); }
    catch (e) {
      if (!permitirReasignar || soloAgente || e.statusCode !== 409) throw e;
      agente = await asignarAsesor(conexion, f, h, { excluirSolicitud: cita.id_solicitud });
    }
    await conexion.execute('UPDATE solicitudes_contacto SET estado = ?, fecha_contacto = ?, fk_agente = ? WHERE id_solicitud = ?', ['reprogramada', `${f} ${h}:00`, agente, cita.id_solicitud]);
    await conexion.commit();
    return `${f} ${h}:00`;
  } catch (e) { await conexion.rollback(); throw e; }
  finally { conexion.release(); }
}

async function cancelar(cita) {
  if (['cancelada', 'atendida'].includes(cita.estado)) throw fallo('Esta cita ya está cerrada', 409);
  await pool.execute('UPDATE solicitudes_contacto SET estado = ? WHERE id_solicitud = ?', ['cancelada', cita.id_solicitud]);
  await notificar(cita.correo, 'EPRESEDI: cambio en tu cita', mensajes.cambioCita({ nombre: cita.cliente, propiedad: cita.propiedad, accion: 'cancelada' }));
}

function validarInteresado({ nombre, edad, correo, ocupacion, telefono }) {
  if (!String(nombre || '').trim() || !correoValido(correo) || !String(ocupacion || '').trim() || !Number.isInteger(Number(edad)) || Number(edad) < 18 || Number(edad) > 110)
    throw fallo('Completa nombre, edad válida (18 o más), correo y ocupación');
  if (telefono && !/^\+?\d{7,15}$/.test(String(telefono).replace(/[\s-]/g, ''))) throw fallo('El teléfono no es válido');
}

async function guardarInteresado(datos, idUsuario = null) {
  validarInteresado(datos);
  const [r] = await pool.execute('INSERT INTO interesados (nombre, edad, correo, ocupacion, telefono, fk_usuario) VALUES (?,?,?,?,?,?)',
    [String(datos.nombre).trim(), Number(datos.edad), String(datos.correo).trim(), String(datos.ocupacion).trim(), datos.telefono ? String(datos.telefono).replace(/[\s-]/g, '') : null, idUsuario]);
  return r.insertId;
}

module.exports = { ESTADOS_CITA, SELECT_CITA, agenteDe, citaVisible, citaDelCliente, avisarCita, crearCita, reprogramar, cancelar, guardarInteresado };
