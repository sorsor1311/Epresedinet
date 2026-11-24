const pool = require('../config/db');
const { randomBytes } = require('crypto');
const { fallo, ejecutar } = require('../utils/errores');
const servicios = ["Administración de inmuebles","Arriendo (requisitos del proceso)","Compra y venta de inmuebles","Presupuesto de obra","Avalúos","Desenglobe","Escrituras","Sucesión","Certificado de libertad y tradición","Compraventa (trámite)","Reparaciones locativas","Plomería y reparaciones hidráulicas","Instalaciones y reparaciones eléctricas","Pintura y resanes","Reparación de puertas, ventanas y cerraduras","Adecuaciones y remodelaciones","Mantenimiento de techos, pisos y paredes","Reparaciones generales de infraestructura"];
const estados = ['pendiente', 'en atención', 'cerrada'];
const consultar = async (sql, params = []) => {
  try { return await pool.execute(sql, params); }
  catch (e) { if (e.code === 'ER_NO_SUCH_TABLE') throw fallo('El módulo de servicios aún no está habilitado', 503); throw e; }
};
exports.crear = ejecutar(async (req, res) => {
  const { servicio } = req.body;
  const nombre = String(req.body.nombre || '').trim(), correo = String(req.body.correo || '').trim(), telefono = String(req.body.telefono || '').trim(), detalle = String(req.body.detalle || '').trim();
  if (!servicios.includes(servicio) || !nombre || nombre.length > 120 || correo.length > 150 || !/^\S+@\S+\.\S+$/.test(correo) || !/^\d{10}$/.test(telefono) || !detalle || detalle.length > 1000) throw fallo('Revisa los datos de la solicitud');
  const codigo = 'SER-' + randomBytes(8).toString('hex').toUpperCase();
  await consultar('INSERT INTO solicitudes_servicios (codigo, servicio, nombre, correo, telefono, detalle) VALUES (?,?,?,?,?,?)', [codigo, servicio, nombre, correo, telefono, detalle]);
  res.status(201).json({success:true,data:{codigo}});
});
exports.listar = ejecutar(async (_req,res) => {
  const [filas] = await consultar('SELECT * FROM solicitudes_servicios ORDER BY id DESC LIMIT 500');
  res.json({success:true,data:filas});
});
exports.estado = ejecutar(async (req,res) => {
  if (!estados.includes(req.body.estado)) throw fallo('Estado inválido');
  const [r] = await consultar('UPDATE solicitudes_servicios SET estado = ? WHERE id = ?', [req.body.estado, req.params.id]);
  if (!r.affectedRows) throw fallo('Solicitud no encontrada',404);
  res.json({success:true});
});
