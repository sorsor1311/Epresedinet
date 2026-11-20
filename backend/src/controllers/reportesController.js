/** Reportes y análisis de atención (RF018, RF015)*/
const pool = require('../config/db');
const { ejecutar } = require('../utils/errores');
const { sumarDias } = require('../services/agendaService');
const { SELECT_CITA } = require('../services/citasService');

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

exports.notificaciones = ejecutar(async (req, res) => {
  const [filas] = req.usuario.rol === 'Administrador'
    ? await pool.query('SELECT * FROM notificaciones ORDER BY id_notificacion DESC LIMIT 200')
    : await pool.execute('SELECT n.* FROM notificaciones n JOIN agentes a ON a.id_agente = n.fk_agente WHERE a.fk_usuario = ? ORDER BY n.id_notificacion DESC LIMIT 200', [req.usuario.id_usuario]);
  res.json({ success: true, data: filas });
});

exports.reportes = ejecutar(async (req, res) => {
  const { desde, hasta } = req.query, conRango = FECHA.test(desde || '') && FECHA.test(hasta || '');
  const rango = conRango ? 'fecha_contacto >= ? AND fecha_contacto < ?' : '1 = 1', v = conRango ? [desde, sumarDias(hasta, 1)] : [];
  const [[total]] = await pool.query(`SELECT (SELECT COUNT(*) FROM interesados) AS interesados,
      (SELECT COUNT(*) FROM solicitudes_contacto WHERE ${rango}) AS citas,
      (SELECT COUNT(*) FROM solicitudes_contacto WHERE ${rango} AND estado IN ('programada','reprogramada')) AS pendientes,
      (SELECT COUNT(DISTINCT fk_interesado) FROM solicitudes_contacto WHERE ${rango} AND estado = 'atendida') AS clientes_atendidos`, [...v, ...v, ...v]);
  const [porEstado] = await pool.query(`SELECT estado, COUNT(*) AS total FROM solicitudes_contacto WHERE ${rango} GROUP BY estado`, v);
  const [propiedades] = await pool.query('SELECT p.id_propiedad, p.direccion, t.nombre AS tipo, COUNT(c.id_consulta) AS consultas FROM propiedades p JOIN tipo_propiedades t ON t.id_tipo_propiedad = p.fk_tipo_propiedad LEFT JOIN consultas_propiedad c ON c.fk_propiedad = p.id_propiedad GROUP BY p.id_propiedad, p.direccion, t.nombre ORDER BY consultas DESC, p.id_propiedad LIMIT 10');
  const [agentes] = await pool.query(`SELECT a.nombre, COALESCE(SUM(s.estado IN ('programada','reprogramada')), 0) AS citas, COALESCE(SUM(s.estado = 'atendida'), 0) AS atendidas
      FROM agentes a LEFT JOIN solicitudes_contacto s ON s.fk_agente = a.id_agente AND ${rango.replaceAll('fecha_contacto', 's.fecha_contacto')} GROUP BY a.id_agente, a.nombre ORDER BY citas DESC, a.nombre`, v);
  const [proximos] = await pool.query(`SELECT DATE_FORMAT(fecha_contacto, '%Y-%m-%d') AS dia, COUNT(*) AS citas FROM solicitudes_contacto WHERE estado IN ('programada','reprogramada') AND fecha_contacto >= CURDATE() AND fecha_contacto < CURDATE() + INTERVAL 14 DAY GROUP BY dia ORDER BY dia`);
  res.json({ success: true, data: { total, porEstado, propiedades, agentes: agentes.map(a => ({ ...a, citas: Number(a.citas), atendidas: Number(a.atendidas) })), proximos } });
});

exports.analisis = ejecutar(async (req, res) => {
  const dias = Math.min(365, Math.max(7, Number(req.query.dias) || 30));
  const [serie] = await pool.query(`SELECT DATE_FORMAT(creada_en, '%Y-%m-%d') AS dia, COUNT(*) AS solicitudes, SUM(estado = 'atendida') AS atendidas, SUM(estado = 'cancelada') AS canceladas
      FROM solicitudes_contacto WHERE creada_en >= CURDATE() - INTERVAL ? DAY GROUP BY dia ORDER BY dia`, [dias - 1]);
  const porDia = new Map(serie.map(s => [s.dia, s]));
  const hoy = new Date(), completa = [];
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(hoy); d.setDate(d.getDate() - i);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const s = porDia.get(k);
    completa.push({ dia: k, solicitudes: Number(s?.solicitudes || 0), atendidas: Number(s?.atendidas || 0), canceladas: Number(s?.canceladas || 0) });
  }
  const [[embudo]] = await pool.query(`SELECT
      (SELECT COUNT(*) FROM busquedas WHERE creada_en >= CURDATE() - INTERVAL ? DAY) AS busquedas,
      (SELECT COUNT(*) FROM interesados WHERE creado_en >= CURDATE() - INTERVAL ? DAY) AS interesados,
      (SELECT COUNT(*) FROM solicitudes_contacto WHERE creada_en >= CURDATE() - INTERVAL ? DAY) AS citas,
      (SELECT COUNT(*) FROM solicitudes_contacto WHERE creada_en >= CURDATE() - INTERVAL ? DAY AND estado = 'atendida') AS atendidas,
      (SELECT COUNT(*) FROM solicitudes_contacto WHERE creada_en >= CURDATE() - INTERVAL ? DAY AND estado = 'cancelada') AS canceladas`, Array(5).fill(dias));
  const [porTipo] = await pool.query(`SELECT COALESCE(tipo, 'Cualquiera') AS nombre, COUNT(*) AS total FROM busquedas WHERE creada_en >= CURDATE() - INTERVAL ? DAY GROUP BY nombre ORDER BY total DESC`, [dias]);
  const [porZona] = await pool.query(`SELECT COALESCE(NULLIF(zona, ''), 'Cualquiera') AS nombre, COUNT(*) AS total FROM busquedas WHERE creada_en >= CURDATE() - INTERVAL ? DAY GROUP BY nombre ORDER BY total DESC LIMIT 8`, [dias]);
  const [porModalidad] = await pool.query(`SELECT modalidad AS nombre, COUNT(*) AS total, ROUND(AVG(presupuesto)) AS presupuesto_promedio FROM busquedas WHERE creada_en >= CURDATE() - INTERVAL ? DAY GROUP BY modalidad`, [dias]);
  const [inventario] = await pool.query('SELECT t.nombre, SUM(p.estado = \'disponible\') AS disponibles, COUNT(p.id_propiedad) AS total FROM tipo_propiedades t LEFT JOIN propiedades p ON p.fk_tipo_propiedad = t.id_tipo_propiedad GROUP BY t.id_tipo_propiedad, t.nombre ORDER BY t.nombre');
  const cerradas = Number(embudo.atendidas) + Number(embudo.canceladas);
  res.json({ success: true, data: { dias, serie: completa, embudo, cumplimiento: cerradas ? Math.round((Number(embudo.atendidas) / cerradas) * 100) : null,
    porTipo, porZona, porModalidad: porModalidad.map(m => ({ ...m, presupuesto_promedio: Number(m.presupuesto_promedio) })), inventario: inventario.map(i => ({ nombre: i.nombre, disponibles: Number(i.disponibles || 0), total: Number(i.total) })) } });
});

exports.csvCitas = ejecutar(async (_req, res) => {
  const [filas] = await pool.query(`${SELECT_CITA} ORDER BY s.fecha_contacto DESC`);
  const celda = v => `"${String(v ?? '').replaceAll('"', '""')}"`;
  const cab = ['Fecha', 'Estado', 'Cliente', 'Correo', 'Teléfono', 'Ocupación', 'Inmueble', 'Asesor', 'Origen', 'Notas'];
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="citas-epresedi.csv"');
  res.send('\uFEFF' + [cab.map(celda).join(','), ...filas.map(c => [c.fecha_contacto, c.estado, c.cliente, c.correo, c.telefono, c.ocupacion, c.propiedad, c.agente, c.origen, c.notas].map(celda).join(','))].join('\r\n'));
});

exports.auditoria = ejecutar(async (_req, res) => {
  const [filas] = await pool.query('SELECT * FROM auditoria ORDER BY id_auditoria DESC LIMIT 300');
  res.json({ success: true, data: filas });
});
