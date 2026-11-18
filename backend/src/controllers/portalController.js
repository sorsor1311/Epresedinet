/** Áreas personales: seguimiento de citas del Cliente y panel del Propietario. */
const pool = require('../config/db');
const { fallo, ejecutar } = require('../utils/errores');
const C = require('../services/citasService');
const { similaresPara } = require('./catalogoController');
const { notificar, mensajes } = require('../services/notificationService');
const { adjuntarFotos } = require('../services/catalogoService');

// ---------- Cliente ----------
exports.misCitas = ejecutar(async (req, res) => {
  const [filas] = await pool.query(`${C.SELECT_CITA} WHERE i.fk_usuario = ? ORDER BY s.fecha_contacto DESC LIMIT 200`, [req.usuario.id_usuario]);
  res.json({ success: true, data: filas.map(({ correo, telefono, edad, ocupacion, ...c }) => c) });
});

exports.gestionarMiCita = ejecutar(async (req, res) => {
  const { accion, fecha, hora } = req.body;
  if (!['cancelar', 'reprogramar'].includes(accion)) throw fallo('Acción inválida');
  const cita = await C.citaDelCliente(req.params.id, req.usuario);
  if (['cancelada', 'atendida'].includes(cita.estado)) throw fallo('Esta cita ya está cerrada', 409);
  let nueva = null;
  if (accion === 'cancelar') await C.cancelar(cita);
  else { nueva = await C.reprogramar(cita, { fecha, hora }); await notificar(cita.correo, 'EPRESEDI: cambio en tu cita', mensajes.cambioCita({ nombre: cita.cliente, propiedad: cita.propiedad, accion: 'reprogramada', fecha: nueva })); }
  res.json({ success: true, data: { fecha_contacto: nueva } });
});

exports.miHistorial = ejecutar(async (req, res) => {
  const [filas] = await pool.query('SELECT id_busqueda, creada_en, tipo, modalidad, presupuesto, zona FROM busquedas WHERE fk_usuario = ? ORDER BY id_busqueda DESC LIMIT 100', [req.usuario.id_usuario]);
  res.json({ success: true, data: filas });
});

exports.misRecomendaciones = ejecutar(async (req, res) => res.json({ success: true, data: await similaresPara({ usuario: req.usuario, sesion: '' }) }));

// ---------- Propietario ----------
async function propietarioDe(usuario) {
  const [[p]] = await pool.execute('SELECT id_propietario, nombre FROM propietarios WHERE fk_usuario = ?', [usuario.id_usuario]);
  if (!p) throw fallo('Tu usuario no tiene un perfil de propietario asociado', 403);
  return p;
}

exports.propietarioPropiedades = ejecutar(async (req, res) => {
  const p = await propietarioDe(req.usuario);
  const [filas] = await pool.query(`SELECT pr.*, t.nombre AS tipo_nombre,
      (SELECT COUNT(*) FROM consultas_propiedad c WHERE c.fk_propiedad = pr.id_propiedad AND c.creada_en >= NOW() - INTERVAL 30 DAY) AS consultas_30d,
      (SELECT COUNT(*) FROM solicitudes_contacto s WHERE s.fk_propiedad = pr.id_propiedad AND s.estado IN ('programada','reprogramada') AND s.fecha_contacto >= NOW()) AS citas_pendientes,
      (SELECT COUNT(*) FROM solicitudes_contacto s WHERE s.fk_propiedad = pr.id_propiedad) AS solicitudes_total
    FROM propiedades pr JOIN tipo_propiedades t ON t.id_tipo_propiedad = pr.fk_tipo_propiedad WHERE pr.fk_propietario = ? ORDER BY pr.id_propiedad DESC`, [p.id_propietario]);
  res.json({ success: true, data: await adjuntarFotos(filas) });
});

exports.propietarioContratos = ejecutar(async (req, res) => {
  const p = await propietarioDe(req.usuario);
  const [filas] = await pool.query(`SELECT c.id_contrato, c.fecha_inicio, c.fecha_final, c.valor_total, pr.direccion AS propiedad, cl.nombre AS cliente,
      COALESCE((SELECT SUM(pg.pago_total) FROM pagos pg WHERE pg.fk_contrato = c.id_contrato), 0) AS pagado
    FROM contratos c JOIN propiedades pr ON pr.id_propiedad = c.fk_propiedad JOIN clientes cl ON cl.id_cliente = c.fk_cliente WHERE c.fk_propietario = ? ORDER BY c.fecha_inicio DESC`, [p.id_propietario]);
  res.json({ success: true, data: filas });
});

exports.propietarioResumen = ejecutar(async (req, res) => {
  const p = await propietarioDe(req.usuario);
  const [[k]] = await pool.query(`SELECT
      (SELECT COUNT(*) FROM propiedades WHERE fk_propietario = ?) AS inmuebles,
      (SELECT COUNT(*) FROM propiedades WHERE fk_propietario = ? AND estado = 'disponible') AS disponibles,
      (SELECT COUNT(*) FROM consultas_propiedad c JOIN propiedades x ON x.id_propiedad = c.fk_propiedad WHERE x.fk_propietario = ? AND c.creada_en >= NOW() - INTERVAL 30 DAY) AS consultas_30d,
      (SELECT COUNT(*) FROM solicitudes_contacto s JOIN propiedades x ON x.id_propiedad = s.fk_propiedad WHERE x.fk_propietario = ? AND s.estado IN ('programada','reprogramada') AND s.fecha_contacto >= NOW()) AS citas_pendientes,
      (SELECT COALESCE(SUM(pg.pago_total),0) FROM pagos pg JOIN contratos c ON c.id_contrato = pg.fk_contrato WHERE c.fk_propietario = ?) AS recaudado`, Array(5).fill(p.id_propietario));
  const [porEstado] = await pool.query('SELECT estado, COUNT(*) AS total FROM propiedades WHERE fk_propietario = ? GROUP BY estado', [p.id_propietario]);
  res.json({ success: true, data: { propietario: p.nombre, ...k, por_estado: porEstado } });
});
