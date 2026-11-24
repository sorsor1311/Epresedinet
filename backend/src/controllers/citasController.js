/** Solicitudes de contacto y calendario (RF005-RF008, RF012, RF015, RF016). */
const pool = require('../config/db');
const { fallo, ejecutar } = require('../utils/errores');
const { horariosDisponibles, DURACION_MIN, aMinutos, aHora, sumarDias } = require('../services/agendaService');
const C = require('../services/citasService');
const { notificar, mensajes } = require('../services/notificationService');
const { auditar } = require('../services/auditoriaService');

// ---------- Cliente (público) ----------
exports.registrarInteresado = ejecutar(async (req, res) => {
  const id = await C.guardarInteresado(req.body, req.usuario?.id_usuario ?? null);
  const enviada = await notificar(req.body.correo, 'EPRESEDI: datos recibidos', mensajes.datosRecibidos(String(req.body.nombre).trim()));
  res.status(201).json({ success: true, data: { id_interesado: id, confirmacion_enviada: enviada } });
});

exports.disponibilidad = ejecutar(async (req, res) => {
  const fecha = String(req.query.fecha || '');
  res.json({ success: true, data: { fecha, duracion_min: DURACION_MIN, horas: await horariosDisponibles(pool, fecha) } });
});

exports.solicitar = ejecutar(async (req, res) => {
  const { id_interesado, id_propiedad, fecha, hora, tipo_persona, modalidad } = req.body;
  if (!['Empleado', 'Independiente', 'Pensionado', 'Persona Jurídica'].includes(tipo_persona)) throw fallo('Selecciona un tipo de persona válido');
  if (!['venta', 'arriendo'].includes(modalidad)) throw fallo('Selecciona compra o arriendo');
  if (![id_interesado, id_propiedad].every(v => Number.isInteger(Number(v)) && Number(v) > 0)) throw fallo('Selecciona un interesado y una propiedad');
  const cita = await C.crearCita({ id_interesado: Number(id_interesado), id_propiedad: Number(id_propiedad), fecha, hora, modalidad, notas: `Tipo de persona: ${tipo_persona}. Interés: ${modalidad === 'venta' ? 'Compra' : 'Arriendo'}.` });
  const [[d]] = await pool.execute(`${C.SELECT_CITA} WHERE s.id_solicitud = ?`, [cita.id_solicitud]);
  await C.avisarCita(d, cita.codigo_gestion).catch(() => false);
  res.status(201).json({ success: true, data: { ...cita, asesor: d.agente, fecha_contacto: d.fecha_contacto, propiedad: d.propiedad, tipo_persona, modalidad } });
});

exports.consultarPorCodigo = ejecutar(async (req, res) => {
  const codigo = String(req.query.codigo || '');
  if (!/^(EPR-[A-Z2-9]{4}-[A-Z2-9]{4}|[a-f0-9]{64})$/i.test(codigo.trim())) throw fallo('Código de gestión incorrecto');
  const [[c]] = await pool.execute(`${C.SELECT_CITA} WHERE s.codigo_gestion = ?`, [codigo]);
  if (!c) throw fallo('No encontramos una cita con ese código', 404);
  res.json({ success: true, data: { fecha_contacto: c.fecha_contacto, estado: c.estado, propiedad: c.propiedad, asesor: c.agente?.split(' ')[0] ?? null } });
});

exports.gestionarPorCodigo = ejecutar(async (req, res) => {
  const { codigo, accion, fecha, hora } = req.body;
  if (!['cancelar', 'reprogramar'].includes(accion) || !/^(EPR-[A-Z2-9]{4}-[A-Z2-9]{4}|[a-f0-9]{64})$/i.test(String(codigo || '').trim())) throw fallo('Código de gestión o acción incorrecta');
  const [[c]] = await pool.execute(`${C.SELECT_CITA} WHERE s.codigo_gestion = ?`, [codigo]);
  if (!c) throw fallo('Solicitud no encontrada', 404);
  if (['cancelada', 'atendida'].includes(c.estado)) throw fallo('Esta cita ya está cerrada', 409);
  let nueva = null;
  if (accion === 'cancelar') await C.cancelar(c);
  else { nueva = await C.reprogramar(c, { fecha, hora }); await notificar(c.correo, 'EPRESEDI: cambio en tu cita', mensajes.cambioCita({ nombre: c.cliente, propiedad: c.propiedad, accion: 'reprogramada', fecha: nueva })); }
  res.json({ success: true, message: accion === 'cancelar' ? 'Tu cita fue cancelada' : 'Tu cita fue reprogramada', data: { fecha_contacto: nueva } });
});

// ---------- Personal ----------
exports.yo = ejecutar(async (req, res) => res.json({ success: true, data: { rol: req.usuario.rol, id_agente: await C.agenteDe(req.usuario) } }));

/** Calendario: el asesor ve solo su agenda; el administrador la de todos (y puede filtrar por asesor). */
exports.calendario = ejecutar(async (req, res) => {
  const desde = String(req.query.desde || ''), hasta = String(req.query.hasta || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta) || hasta < desde) throw fallo('Rango de fechas inválido');
  if (sumarDias(desde, 62) < hasta) throw fallo('El rango máximo es de 62 días');
  const propio = await C.agenteDe(req.usuario);
  const filtro = propio ?? (Number(req.query.agente) || null), extra = filtro ? [filtro] : [];
  const [citas] = await pool.query(`${C.SELECT_CITA} WHERE s.fecha_contacto >= ? AND s.fecha_contacto < ?${filtro ? ' AND s.fk_agente = ?' : ''} ORDER BY s.fecha_contacto`, [desde, sumarDias(hasta, 1), ...extra]);
  const [visitas] = await pool.query(`SELECT v.id_visita, v.fecha, v.fk_agente, a.nombre AS agente, c.nombre AS cliente, p.id_propiedad, p.direccion AS propiedad
    FROM visitas v JOIN agentes a ON a.id_agente = v.fk_agente JOIN clientes c ON c.id_cliente = v.fk_cliente JOIN propiedades p ON p.id_propiedad = v.fk_propiedad
    WHERE v.fecha >= ? AND v.fecha < ?${filtro ? ' AND v.fk_agente = ?' : ''} ORDER BY v.fecha`, [desde, sumarDias(hasta, 1), ...extra]);
  const [disponibilidad] = await pool.query(`SELECT h.fk_agente, a.nombre AS agente, h.dia_semana, TIME_FORMAT(h.hora_inicio,'%H:%i') AS hora_inicio, TIME_FORMAT(h.hora_fin,'%H:%i') AS hora_fin
    FROM horarios_asesor h JOIN agentes a ON a.id_agente = h.fk_agente WHERE h.activo = 1 AND a.activo = 1${filtro ? ' AND h.fk_agente = ?' : ''}`, extra);
  const [agentes] = await pool.query(`SELECT id_agente, nombre, activo FROM agentes${propio ? ' WHERE id_agente = ?' : ''} ORDER BY nombre`, propio ? [propio] : []);
  const fin = inicio => `${String(inicio).slice(0, 10)} ${aHora(aMinutos(String(inicio).slice(11, 16)) + DURACION_MIN)}`;
  const eventos = [
    ...citas.map(c => ({ id: `c${c.id_solicitud}`, tipo: 'cita', id_solicitud: c.id_solicitud, inicio: c.fecha_contacto, fin: fin(c.fecha_contacto), estado: c.estado, id_agente: c.fk_agente, agente: c.agente, cliente: c.cliente, correo: c.correo, telefono: c.telefono, ocupacion: c.ocupacion, edad: c.edad, id_propiedad: c.fk_propiedad, propiedad: c.propiedad, tipo_inmueble: c.tipo, notas: c.notas, origen: c.origen })),
    ...visitas.map(v => ({ id: `v${v.id_visita}`, tipo: 'visita', inicio: v.fecha, fin: fin(v.fecha), estado: 'programada', id_agente: v.fk_agente, agente: v.agente, cliente: v.cliente, id_propiedad: v.id_propiedad, propiedad: v.propiedad }))
  ];
  res.json({ success: true, data: { rol: req.usuario.rol, id_agente: propio, duracion_min: DURACION_MIN, agentes, eventos, disponibilidad } });
});

exports.listar = ejecutar(async (req, res) => {
  const propio = await C.agenteDe(req.usuario), cond = [], val = [];
  if (propio) { cond.push('s.fk_agente = ?'); val.push(propio); } else if (Number(req.query.agente)) { cond.push('s.fk_agente = ?'); val.push(Number(req.query.agente)); }
  if (C.ESTADOS_CITA.includes(req.query.estado)) { cond.push('s.estado = ?'); val.push(req.query.estado); }
  const [filas] = await pool.query(`${C.SELECT_CITA}${cond.length ? ' WHERE ' + cond.join(' AND ') : ''} ORDER BY s.fecha_contacto DESC LIMIT 500`, val);
  res.json({ success: true, data: filas });
});

exports.cambiarEstado = ejecutar(async (req, res) => {
  if (!C.ESTADOS_CITA.includes(req.body.estado)) throw fallo('Estado inválido');
  const c = await C.citaVisible(req.params.id, req.usuario);
  await pool.execute('UPDATE solicitudes_contacto SET estado = ? WHERE id_solicitud = ?', [req.body.estado, c.id_solicitud]);
  if (req.body.estado === 'cancelada' && c.estado !== 'cancelada') await notificar(c.correo, 'EPRESEDI: cambio en tu cita', mensajes.cambioCita({ nombre: c.cliente, propiedad: c.propiedad, accion: 'cancelada' }));
  await auditar(req.usuario, 'estado', 'cita', c.id_solicitud, `${c.estado} → ${req.body.estado}`);
  res.json({ success: true });
});

exports.reprogramarPersonal = ejecutar(async (req, res) => {
  const c = await C.citaVisible(req.params.id, req.usuario), propio = await C.agenteDe(req.usuario);
  const nueva = await C.reprogramar(c, req.body, { soloAgente: propio, permitirReasignar: !propio });
  await notificar(c.correo, 'EPRESEDI: cambio en tu cita', mensajes.cambioCita({ nombre: c.cliente, propiedad: c.propiedad, accion: 'reprogramada', fecha: nueva }));
  await auditar(req.usuario, 'reprogramar', 'cita', c.id_solicitud, nueva);
  res.json({ success: true, data: { fecha_contacto: nueva } });
});

/** Cita agendada por el personal (cliente que llama por teléfono o llega a la oficina). */
exports.crearInterna = ejecutar(async (req, res) => {
  const propio = await C.agenteDe(req.usuario), { id_propiedad, fecha, hora, notas } = req.body;
  if (!Number.isInteger(Number(id_propiedad)) || Number(id_propiedad) <= 0) throw fallo('Selecciona un inmueble');
  const idInteresado = Number(req.body.id_interesado) > 0 ? Number(req.body.id_interesado) : await C.guardarInteresado(req.body.interesado || {});
  const cita = await C.crearCita({ id_interesado: idInteresado, id_propiedad: Number(id_propiedad), fecha, hora, notas: notas ? String(notas).slice(0, 300) : null, origen: 'interno', soloAgente: propio ?? (Number(req.body.id_agente) || null) });
  const [[d]] = await pool.execute(`${C.SELECT_CITA} WHERE s.id_solicitud = ?`, [cita.id_solicitud]);
  await C.avisarCita(d, cita.codigo_gestion);
  await auditar(req.usuario, 'crear', 'cita', cita.id_solicitud, `${d.cliente} · ${d.fecha_contacto}`);
  res.status(201).json({ success: true, data: d });
});

exports.interesados = ejecutar(async (req, res) => {
  const propio = await C.agenteDe(req.usuario);
  const [filas] = await pool.query(`SELECT i.id_interesado, i.nombre, i.edad, i.correo, i.telefono, i.ocupacion, i.creado_en, COUNT(s.id_solicitud) AS citas, MAX(s.fecha_contacto) AS ultima_cita
    FROM interesados i LEFT JOIN solicitudes_contacto s ON s.fk_interesado = i.id_interesado
    ${propio ? 'WHERE i.id_interesado IN (SELECT fk_interesado FROM solicitudes_contacto WHERE fk_agente = ?)' : ''}
    GROUP BY i.id_interesado ORDER BY i.id_interesado DESC LIMIT 500`, propio ? [propio] : []);
  res.json({ success: true, data: filas });
});
