/** Chat-bot y búsqueda de inmuebles (RF001-RF004, RF010, RF011). */
const crypto = require('node:crypto');
const pool = require('../config/db');
const env = require('../config/env');
const { fallo, ejecutar } = require('../utils/errores');
const { buscarInmuebles } = require('../services/catalogoService');

exports.zonas = ejecutar(async (_req, res) => {
  const [filas] = await pool.query("SELECT DISTINCT zona FROM propiedades WHERE estado = 'disponible' AND zona IS NOT NULL AND zona <> '' ORDER BY zona");
  res.json({ success: true, data: filas.map(f => f.zona) });
});

exports.buscar = ejecutar(async (req, res) => {
  const sesion = String(req.body.sesion || '').slice(0, 80) || crypto.randomUUID();
  const { tipo, presupuesto, zona, modalidad } = req.body;
  if (!['compra', 'arriendo'].includes(modalidad)) throw fallo('Selecciona compra o arriendo');
  const propiedades = await buscarInmuebles({ tipo, presupuesto, zona, modalidad });
  await pool.execute('INSERT INTO busquedas (fk_usuario, sesion, tipo, presupuesto, zona, modalidad) VALUES (?,?,?,?,?,?)',
    [req.usuario?.id_usuario ?? null, sesion, tipo || null, Number(presupuesto), zona || null, modalidad]);
  res.json({ success: true, data: propiedades });
});


async function similaresPara({ usuario, sesion, excluir = [] }) {
  const [historial] = usuario
    ? await pool.execute('SELECT * FROM busquedas WHERE fk_usuario = ? OR sesion = ? ORDER BY id_busqueda DESC LIMIT 10', [usuario.id_usuario, sesion || ''])
    : await pool.execute('SELECT * FROM busquedas WHERE sesion = ? ORDER BY id_busqueda DESC LIMIT 10', [sesion]);
  if (!historial.length) return [];
  const ultima = historial[0], mismas = historial.filter(b => b.modalidad === ultima.modalidad);
  return buscarInmuebles({ modalidad: ultima.modalidad, presupuesto: Math.max(...mismas.map(b => Number(b.presupuesto))), tipos: [...new Set(mismas.map(b => b.tipo).filter(Boolean))], zona: '' }, { excluir, tolerancia: 1.3 });
}
exports.similaresPara = similaresPara;
exports.similares = ejecutar(async (req, res) => {
  const sesion = String(req.query.sesion || '').slice(0, 80);
  if (!sesion && !req.usuario) throw fallo('Se requiere la sesión de búsqueda');
  const excluir = String(req.query.excluir || '').split(',').map(Number).filter(Number.isInteger);
  res.json({ success: true, data: await similaresPara({ usuario: req.usuario, sesion, excluir }) });
});

exports.historial = ejecutar(async (_req, res) => {
  const [filas] = await pool.query(`SELECT b.id_busqueda, b.creada_en, b.tipo, b.modalidad, b.presupuesto, b.zona, u.correo AS usuario
    FROM busquedas b LEFT JOIN usuarios u ON u.id_usuario = b.fk_usuario ORDER BY b.id_busqueda DESC LIMIT 200`);
  res.json({ success: true, data: filas });
});

exports.consulta = ejecutar(async (req, res) => {
  const [[p]] = await pool.execute('SELECT id_propiedad FROM propiedades WHERE id_propiedad = ?', [req.params.id]);
  if (!p) throw fallo('Propiedad no encontrada', 404);
  await pool.execute('INSERT INTO consultas_propiedad (fk_propiedad) VALUES (?)', [req.params.id]);
  res.status(201).json({ success: true });
});

exports.chat = ejecutar(async (req, res) => {
  const mensaje = String(req.body.mensaje || '').slice(0, 600);
  if (!mensaje.trim()) throw fallo('Escribe tu consulta');
  const propiedades = await buscarInmuebles({ presupuesto: req.body.presupuesto || 999999999999, tipo: req.body.tipo || '', zona: req.body.zona || '', modalidad: req.body.modalidad || 'compra' }, { tolerancia: 1, limite: 8 });
  const inventario = propiedades.map(p => ({ id: p.id_propiedad, tipo: p.tipo_nombre, direccion: p.direccion, zona: p.zona, precio: p.precio_mostrado, habitaciones: p.habitaciones, area_m2: p.area_m2 }));
  try {
    const r = await fetch(env.ollama.url + '/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(30000),
      body: JSON.stringify({ model: env.ollama.modelo, stream: false, think: false, messages: [
        { role: 'system', content: 'Eres el asistente inmobiliario de EPRESEDI. Responde en español, con brevedad y amabilidad. Recomienda únicamente propiedades de este inventario real citando su dirección. No inventes datos ni disponibilidad. Si no hay opciones, dilo. Inventario: ' + JSON.stringify(inventario) },
        { role: 'user', content: mensaje }] })
    });
    if (!r.ok) throw Error('Ollama no disponible');
    const contenido = (await r.json()).message?.content;
    if (!contenido) throw Error('Respuesta vacía');
    res.json({ success: true, data: { mensaje: contenido, ia: true, propiedades: inventario } });
  } catch {
    res.json({ success: true, data: { mensaje: inventario.length ? `Encontré ${inventario.length} inmuebles disponibles que pueden interesarte. Elige uno para ver el detalle o solicitar una cita.` : 'No encontré inmuebles con esas características. Prueba ajustando el presupuesto o la zona.', ia: false, propiedades: inventario } });
  }
});
