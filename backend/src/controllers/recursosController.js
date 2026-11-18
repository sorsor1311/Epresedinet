/** API REST de las entidades de operación: contratos, pagos, remodelaciones, visitas y personas. */
const pool = require('../config/db');
const { fallo, ejecutar } = require('../utils/errores');
const { agenteDe } = require('../services/citasService');
const { crearCuenta } = require('../services/usuariosService');
const { auditar } = require('../services/auditoriaService');

const RECURSOS = {
  remodelaciones: { tabla: 'remodelaciones', id: 'id_remodelacion', campos: ['descripcion_obra', 'presupuesto_estimado', 'fecha_inicio', 'fecha_fin_estimada', 'estado', 'fk_propiedad', 'fk_cliente', 'fk_agente'], escritura: 'personal' },
  visitas: { tabla: 'visitas', id: 'id_visita', campos: ['fecha', 'fk_cliente', 'fk_propiedad', 'fk_agente'], escritura: 'personal' },
  contratos: { tabla: 'contratos', id: 'id_contrato', campos: ['fecha_inicio', 'fecha_final', 'valor_total', 'fk_propiedad', 'fk_cliente', 'fk_agente', 'fk_propietario'], escritura: 'personal' },
  pagos: { tabla: 'pagos', id: 'id_pago', campos: ['pago_total', 'fk_contrato'], escritura: 'personal' },
  clientes: { tabla: 'clientes', id: 'id_cliente', campos: ['nombre', 'telefono', 'profesion'], escritura: 'admin' },
  propietarios: { tabla: 'propietarios', id: 'id_propietario', campos: ['nombre', 'telefono'], escritura: 'admin' },
  agentes: { tabla: 'agentes', id: 'id_agente', campos: ['nombre', 'telefono'], escritura: 'admin' }
};
const SOLO_LECTURA_PERSONAL = ['clientes', 'propietarios', 'agentes'];

function recurso(req) {
  const r = RECURSOS[req.params.recurso];
  if (!r) throw fallo('Recurso no encontrado', 404);
  return r;
}
function validar(nombre, d) {
  if (nombre === 'contratos') {
    if (Object.hasOwn(d, 'valor_total') && (!Number.isFinite(Number(d.valor_total)) || Number(d.valor_total) <= 0)) throw fallo('El valor del contrato debe ser positivo');
    if (d.fecha_inicio && d.fecha_final && new Date(String(d.fecha_final).replace(' ', 'T')) <= new Date(String(d.fecha_inicio).replace(' ', 'T'))) throw fallo('La fecha final debe ser posterior a la fecha inicial');
  }
  if (nombre === 'pagos' && Object.hasOwn(d, 'pago_total') && (!Number.isFinite(Number(d.pago_total)) || Number(d.pago_total) <= 0)) throw fallo('El pago debe ser positivo');
  if (nombre === 'remodelaciones' && Object.hasOwn(d, 'presupuesto_estimado') && (!Number.isFinite(Number(d.presupuesto_estimado)) || Number(d.presupuesto_estimado) < 0)) throw fallo('El presupuesto no puede ser negativo');
  if (Object.hasOwn(d, 'telefono') && !/^\d{10}$/.test(String(d.telefono))) throw fallo('El teléfono debe contener 10 dígitos');
}

exports.listar = ejecutar(async (req, res) => {
  const r = recurso(req);
  const [filas] = await pool.query('SELECT * FROM ?? ORDER BY ?? DESC LIMIT 500', [r.tabla, r.id]);
  res.json({ success: true, data: filas });
});
exports.obtener = ejecutar(async (req, res) => {
  const r = recurso(req);
  const [filas] = await pool.query('SELECT * FROM ?? WHERE ?? = ?', [r.tabla, r.id, req.params.id]);
  if (!filas.length) throw fallo('Registro no encontrado', 404);
  res.json({ success: true, data: filas[0] });
});
exports.crear = ejecutar(async (req, res) => {
  const r = recurso(req);
  if (r.escritura === 'admin') throw fallo('Usa el registro de cuentas para crear este tipo de perfil', 400);
  validar(req.params.recurso, req.body);
  const campos = r.campos.filter(k => Object.hasOwn(req.body, k) && req.body[k] !== '');
  if (!campos.length) throw fallo('No hay datos para registrar');
  const [x] = await pool.query(`INSERT INTO ?? (${campos.map(() => '??').join(',')}) VALUES (${campos.map(() => '?').join(',')})`, [r.tabla, ...campos, ...campos.map(k => req.body[k])]);
  await auditar(req.usuario, 'crear', req.params.recurso, x.insertId);
  res.status(201).json({ success: true, data: { [r.id]: x.insertId } });
});
exports.actualizar = ejecutar(async (req, res) => {
  const r = recurso(req);
  if (r.escritura === 'admin' && req.usuario.rol !== 'Administrador') throw fallo('Solo el administrador puede editar este recurso', 403);
  validar(req.params.recurso, req.body);
  const campos = r.campos.filter(k => Object.hasOwn(req.body, k));
  if (!campos.length) throw fallo('No hay datos para actualizar');
  const [x] = await pool.query(`UPDATE ?? SET ${campos.map(() => '?? = ?').join(', ')} WHERE ?? = ?`, [r.tabla, ...campos.flatMap(k => [k, req.body[k] === '' ? null : req.body[k]]), r.id, req.params.id]);
  if (!x.affectedRows) throw fallo('Registro no encontrado', 404);
  await auditar(req.usuario, 'actualizar', req.params.recurso, Number(req.params.id));
  res.json({ success: true });
});
exports.eliminar = ejecutar(async (req, res) => {
  const r = recurso(req);
  if (SOLO_LECTURA_PERSONAL.includes(req.params.recurso)) throw fallo('Este perfil no se elimina; para los asesores usa "Desactivar".', 405);
  const [x] = await pool.query('DELETE FROM ?? WHERE ?? = ?', [r.tabla, r.id, req.params.id]);
  if (!x.affectedRows) throw fallo('Registro no encontrado', 404);
  await auditar(req.usuario, 'eliminar', req.params.recurso, Number(req.params.id));
  res.json({ success: true });
});

// El administrador registra propietarios (necesarios para asociar inmuebles) y clientes.
const crearPerfil = rol => ejecutar(async (req, res) => {
  const c = await crearCuenta({ rol, ...req.body });
  await auditar(req.usuario, 'crear', rol.toLowerCase(), c.id_perfil, req.body.nombre);
  res.status(201).json({ success: true, data: { id_perfil: c.id_perfil, vinculado: c.vinculado } });
});
exports.crearPropietario = crearPerfil('Propietario');
exports.crearCliente = crearPerfil('Cliente');

exports.resumen = ejecutar(async (req, res) => {
  const propio = await agenteDe(req.usuario), f = propio ? ' AND s.fk_agente = ' + Number(propio) : '';
  const [[c]] = await pool.query(`SELECT (SELECT COUNT(*) FROM propiedades) AS propiedades, (SELECT COUNT(*) FROM clientes) AS clientes, (SELECT COUNT(*) FROM interesados) AS interesados,
      (SELECT COUNT(*) FROM contratos) AS contratos, (SELECT COUNT(*) FROM remodelaciones) AS remodelaciones, (SELECT COALESCE(SUM(pago_total),0) FROM pagos) AS ingresos,
      (SELECT COUNT(*) FROM solicitudes_contacto s WHERE s.estado IN ('programada','reprogramada') AND DATE(s.fecha_contacto) = CURDATE()${f}) AS citas_hoy,
      (SELECT COUNT(*) FROM solicitudes_contacto s WHERE s.estado IN ('programada','reprogramada') AND s.fecha_contacto >= NOW() AND s.fecha_contacto < NOW() + INTERVAL 7 DAY${f}) AS citas_semana,
      (SELECT COUNT(*) FROM solicitudes_contacto s WHERE s.estado IN ('programada','reprogramada') AND s.fecha_contacto >= NOW()${f}) AS citas_pendientes`);
  const [porEstado] = await pool.query('SELECT estado, COUNT(*) AS total FROM propiedades GROUP BY estado');
  const [porTipo] = await pool.query('SELECT t.nombre AS tipo, COUNT(p.id_propiedad) AS total FROM tipo_propiedades t LEFT JOIN propiedades p ON p.fk_tipo_propiedad = t.id_tipo_propiedad GROUP BY t.id_tipo_propiedad, t.nombre ORDER BY t.nombre');
  const [proximas] = await pool.query(`SELECT s.id_solicitud, s.fecha_contacto, s.estado, i.nombre AS cliente, p.direccion AS propiedad, a.nombre AS agente
      FROM solicitudes_contacto s JOIN interesados i ON i.id_interesado = s.fk_interesado JOIN propiedades p ON p.id_propiedad = s.fk_propiedad LEFT JOIN agentes a ON a.id_agente = s.fk_agente
     WHERE s.estado IN ('programada','reprogramada') AND s.fecha_contacto >= NOW()${f} ORDER BY s.fecha_contacto LIMIT 6`);
  res.json({ success: true, data: { ...c, ingresos: req.usuario.rol === 'Administrador' ? c.ingresos : null, propiedades_por_estado: porEstado, propiedades_por_tipo: porTipo, proximas_citas: proximas } });
});
