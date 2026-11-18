/** Registro y disponibilidad de asesores (RF013, RF014). */
const pool = require('../config/db');
const { fallo, ejecutar, telefonoValido } = require('../utils/errores');
const { DURACION_MIN, aMinutos } = require('../services/agendaService');
const { crearCuenta } = require('../services/usuariosService');
const { agenteDe } = require('../services/citasService');
const { auditar } = require('../services/auditoriaService');

exports.crear = ejecutar(async (req, res) => {
  const { usuario, correo, password, nombre, telefono } = req.body;
  const cuenta = await crearCuenta({ rol: 'Agente', usuario, correo, password, nombre, telefono });
  await auditar(req.usuario, 'crear', 'asesor', cuenta.id_perfil, nombre);
  res.status(201).json({ success: true, data: { id_agente: cuenta.id_perfil, vinculado: cuenta.vinculado } });
});

exports.actualizar = ejecutar(async (req, res) => {
  const { nombre, telefono } = req.body;
  if (!String(nombre || '').trim() || !telefonoValido(telefono)) throw fallo('Indica nombre y un teléfono de 10 dígitos');
  const [r] = await pool.execute('UPDATE agentes SET nombre = ?, telefono = ? WHERE id_agente = ?', [nombre.trim(), telefono, req.params.id]);
  if (!r.affectedRows) throw fallo('Asesor no encontrado', 404);
  await auditar(req.usuario, 'actualizar', 'asesor', Number(req.params.id), nombre);
  res.json({ success: true });
});

exports.detalle = ejecutar(async (req, res) => {
  const propio = await agenteDe(req.usuario);
  const [filas] = await pool.query(`SELECT a.id_agente, a.nombre, a.telefono, a.activo, a.correo,
      (SELECT COUNT(*) FROM solicitudes_contacto s WHERE s.fk_agente = a.id_agente AND s.estado IN ('programada','reprogramada') AND s.fecha_contacto >= NOW()) AS citas_pendientes,
      (SELECT COUNT(*) FROM solicitudes_contacto s WHERE s.fk_agente = a.id_agente AND s.estado = 'atendida') AS citas_atendidas
    FROM agentes a ${propio ? 'WHERE a.id_agente = ?' : ''} ORDER BY a.nombre`, propio ? [propio] : []);
  res.json({ success: true, data: filas });
});

exports.horarios = ejecutar(async (req, res) => {
  const propio = await agenteDe(req.usuario);
  const [filas] = await pool.query(`SELECT h.id_horario, h.fk_agente, a.nombre, h.dia_semana, TIME_FORMAT(h.hora_inicio,'%H:%i') AS hora_inicio, TIME_FORMAT(h.hora_fin,'%H:%i') AS hora_fin
    FROM horarios_asesor h JOIN agentes a ON a.id_agente = h.fk_agente ${propio ? 'WHERE h.fk_agente = ?' : ''} ORDER BY a.nombre, h.dia_semana, h.hora_inicio`, propio ? [propio] : []);
  res.json({ success: true, data: filas });
});

exports.agregarHorario = ejecutar(async (req, res) => {
  const { fk_agente, dia_semana, hora_inicio, hora_fin } = req.body;
  if (!Number.isInteger(Number(fk_agente)) || !Number.isInteger(Number(dia_semana)) || Number(dia_semana) < 0 || Number(dia_semana) > 6 || !/^\d\d:\d\d$/.test(hora_inicio) || !/^\d\d:\d\d$/.test(hora_fin) || hora_inicio >= hora_fin)
    throw fallo('Horario inválido: la hora de fin debe ser posterior a la de inicio');
  if (aMinutos(hora_fin) - aMinutos(hora_inicio) < DURACION_MIN) throw fallo(`La franja debe durar al menos ${DURACION_MIN} minutos`);
  const [[cruce]] = await pool.execute('SELECT id_horario FROM horarios_asesor WHERE fk_agente = ? AND dia_semana = ? AND activo = 1 AND hora_inicio < ? AND hora_fin > ?', [fk_agente, dia_semana, hora_fin, hora_inicio]);
  if (cruce) throw fallo('La franja se cruza con otra ya registrada para ese día', 409);
  const [r] = await pool.execute('INSERT INTO horarios_asesor (fk_agente, dia_semana, hora_inicio, hora_fin) VALUES (?,?,?,?)', [fk_agente, dia_semana, hora_inicio, hora_fin]);
  await auditar(req.usuario, 'horario', 'asesor', Number(fk_agente), `día ${dia_semana} ${hora_inicio}-${hora_fin}`);
  res.status(201).json({ success: true, data: { id_horario: r.insertId } });
});

exports.quitarHorario = ejecutar(async (req, res) => {
  const [r] = await pool.execute('DELETE FROM horarios_asesor WHERE id_horario = ?', [req.params.id]);
  if (!r.affectedRows) throw fallo('Horario no encontrado', 404);
  await auditar(req.usuario, 'horario', 'asesor', null, `franja ${req.params.id} eliminada`);
  res.json({ success: true });
});

exports.cambiarActivo = ejecutar(async (req, res) => {
  const [r] = await pool.execute('UPDATE agentes SET activo = ? WHERE id_agente = ?', [req.body.activo ? 1 : 0, req.params.id]);
  if (!r.affectedRows) throw fallo('Asesor no encontrado', 404);
  await auditar(req.usuario, req.body.activo ? 'activar' : 'desactivar', 'asesor', Number(req.params.id));
  res.json({ success: true });
});
