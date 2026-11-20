const pool = require('../config/db');
const env = require('../config/env');
const { fallo, ejecutar } = require('../utils/errores');
const { adjuntarFotos } = require('../services/catalogoService');
const { auditar } = require('../services/auditoriaService');
const { recibir, guardarImagenes, borrarImagen } = require('../middlewares/subida');

const ESTADOS = ['disponible', 'reservada', 'arrendada', 'vendida', 'inactiva'];
const EDITABLES = ['direccion', 'precio_venta', 'precio_arrendamiento', 'estado', 'fk_propietario', 'fk_tipo_propiedad', 'zona', 'habitaciones', 'banos', 'parqueaderos', 'area_m2', 'foto_url', 'descripcion'];
const esPersonal = u => !!u && ['Administrador', 'Agente'].includes(u.rol);

function validar(d, { completo = false } = {}) {
  const tiene = k => Object.hasOwn(d, k);
  if (completo) for (const k of ['direccion', 'fk_propietario', 'fk_tipo_propiedad']) if (!d[k]) throw fallo(`El campo ${k} es obligatorio`);
  if (tiene('direccion') && !String(d.direccion || '').trim()) throw fallo('La dirección es obligatoria');
  for (const k of ['precio_venta', 'precio_arrendamiento']) if (tiene(k) && (!Number.isFinite(Number(d[k] ?? 0)) || Number(d[k] ?? 0) < 0)) throw fallo(`${k} debe ser un número mayor o igual a cero`);
  if (completo && !(Number(d.precio_venta) > 0 || Number(d.precio_arrendamiento) > 0)) throw fallo('Define un precio de venta, de arriendo o ambos');
  if (tiene('estado') && !ESTADOS.includes(String(d.estado).toLowerCase())) throw fallo('Estado de propiedad no válido');
  for (const k of ['fk_propietario', 'fk_tipo_propiedad']) if (tiene(k) && (!Number.isInteger(Number(d[k])) || Number(d[k]) <= 0)) throw fallo(`${k} debe ser un identificador positivo`);
  for (const k of ['habitaciones', 'banos', 'parqueaderos']) if (tiene(k) && d[k] != null && d[k] !== '' && (!Number.isInteger(Number(d[k])) || Number(d[k]) < 0)) throw fallo(`${k} debe ser un entero mayor o igual a cero`);
  if (tiene('area_m2') && d.area_m2 != null && d.area_m2 !== '' && (!Number.isFinite(Number(d.area_m2)) || Number(d.area_m2) <= 0)) throw fallo('El área debe ser positiva');
  if (d.foto_url && !/^(https?:\/\/|\/uploads\/)/i.test(d.foto_url)) throw fallo('La foto debe ser un enlace http(s)');
}

exports.configPublica = (_req, res) => res.json({ success: true, data: { alta_inmuebles_admin: env.altaInmueblesAdmin } });

exports.tipos = ejecutar(async (_req, res) => {
  const [filas] = await pool.query('SELECT id_tipo_propiedad, nombre FROM tipo_propiedades ORDER BY nombre');
  res.json({ success: true, data: filas });
});

// RF003: el público solo ve inmuebles disponibles; el personal ve todos los estados (RF017).
exports.listar = ejecutar(async (req, res) => {
  const staff = esPersonal(req.usuario);
  const [filas] = await pool.query(`SELECT p.*${staff ? ', pr.nombre AS propietario_nombre' : ''} FROM propiedades p
      ${staff ? 'LEFT JOIN propietarios pr ON pr.id_propietario = p.fk_propietario' : ''}
      ${staff ? '' : "WHERE p.estado = 'disponible'"} ORDER BY p.id_propiedad DESC LIMIT 500`);
  res.json({ success: true, data: await adjuntarFotos(filas) });
});

exports.obtener = ejecutar(async (req, res) => {
  const [filas] = await pool.query('SELECT * FROM propiedades WHERE id_propiedad = ?', [req.params.id]);
  if (!filas.length || (!esPersonal(req.usuario) && filas[0].estado !== 'disponible')) throw fallo('Inmueble no encontrado', 404);
  const dato = (await adjuntarFotos(filas))[0];
  if (esPersonal(req.usuario)) {   // el personal necesita los ids para poder quitar fotos
    const [ids] = await pool.query('SELECT id_foto, url FROM propiedad_fotos WHERE fk_propiedad = ? ORDER BY orden, id_foto', [req.params.id]);
    dato.fotos_ids = ids;
  }
  res.json({ success: true, data: dato });
});

// RF009 (alta): solo si PERMITIR_ALTA_INMUEBLES_ADMIN=true; de lo contrario se cargan desde la base de datos.
exports.crear = ejecutar(async (req, res) => {
  if (!env.altaInmueblesAdmin) throw fallo('Los inmuebles se registran directamente en la base de datos (database/02_catalogo_inicial.sql). Para habilitar el alta desde el panel define PERMITIR_ALTA_INMUEBLES_ADMIN=true en backend/.env.', 405);
  validar(req.body, { completo: true });
  const d = req.body, campos = EDITABLES.filter(k => Object.hasOwn(d, k) && d[k] !== '' && d[k] !== undefined);
  const [r] = await pool.query(`INSERT INTO propiedades (${campos.map(() => '??').join(',')}) VALUES (${campos.map(() => '?').join(',')})`, [...campos, ...campos.map(k => d[k])]);
  await auditar(req.usuario, 'crear', 'propiedad', r.insertId, d.direccion);
  res.status(201).json({ success: true, data: { id_propiedad: r.insertId } });
});

exports.actualizar = ejecutar(async (req, res) => {
  validar(req.body);
  const campos = EDITABLES.filter(k => Object.hasOwn(req.body, k));
  if (!campos.length) throw fallo('No hay datos para actualizar');
  const [r] = await pool.query(`UPDATE propiedades SET ${campos.map(() => '?? = ?').join(', ')} WHERE id_propiedad = ?`, [...campos.flatMap(k => [k, req.body[k] === '' ? null : req.body[k]]), req.params.id]);
  if (!r.affectedRows) throw fallo('Inmueble no encontrado', 404);
  await auditar(req.usuario, 'actualizar', 'propiedad', Number(req.params.id), campos.map(k => `${k}=${req.body[k]}`).join(', '));
  res.json({ success: true });
});

exports.eliminar = ejecutar(async (req, res) => {
  const [fotos] = await pool.query('SELECT url FROM propiedad_fotos WHERE fk_propiedad = ?', [req.params.id]);
  const [r] = await pool.query('DELETE FROM propiedades WHERE id_propiedad = ?', [req.params.id]);
  if (!r.affectedRows) throw fallo('Inmueble no encontrado', 404);
  fotos.forEach(f => borrarImagen(f.url));
  await auditar(req.usuario, 'eliminar', 'propiedad', Number(req.params.id));
  res.json({ success: true });
});

exports.subirFotos = [(req, res, next) => recibir(req, res, e => (e ? next(fallo(e.code === 'LIMIT_FILE_SIZE' ? 'Cada foto debe pesar máximo 5 MB' : e.message)) : next())),
  ejecutar(async (req, res) => {
    const [[p]] = await pool.query('SELECT id_propiedad, foto_url FROM propiedades WHERE id_propiedad = ?', [req.params.id]);
    if (!p) throw fallo('Inmueble no encontrado', 404);
    const urls = [...guardarImagenes(req.files || []), ...[].concat(req.body?.urls || []).filter(u => /^https?:\/\//i.test(u))];
    if (!urls.length) throw fallo('Selecciona al menos una imagen');
    const [[{ m }]] = await pool.query('SELECT COALESCE(MAX(orden), 0) AS m FROM propiedad_fotos WHERE fk_propiedad = ?', [p.id_propiedad]);
    for (const [i, url] of urls.entries()) await pool.query('INSERT IGNORE INTO propiedad_fotos (fk_propiedad, url, orden) VALUES (?,?,?)', [p.id_propiedad, url, m + i + 1]);
    if (!p.foto_url) await pool.query('UPDATE propiedades SET foto_url = ? WHERE id_propiedad = ?', [urls[0], p.id_propiedad]);
    await auditar(req.usuario, 'fotos', 'propiedad', p.id_propiedad, `${urls.length} foto(s) agregadas`);
    res.status(201).json({ success: true, data: { urls } });
  })];

exports.eliminarFoto = ejecutar(async (req, res) => {
  const [[f]] = await pool.query('SELECT * FROM propiedad_fotos WHERE id_foto = ? AND fk_propiedad = ?', [req.params.idFoto, req.params.id]);
  if (!f) throw fallo('Foto no encontrada', 404);
  await pool.query('DELETE FROM propiedad_fotos WHERE id_foto = ?', [f.id_foto]);
  borrarImagen(f.url);
  const [[otra]] = await pool.query('SELECT url FROM propiedad_fotos WHERE fk_propiedad = ? ORDER BY orden, id_foto LIMIT 1', [req.params.id]);
  await pool.query('UPDATE propiedades SET foto_url = ? WHERE id_propiedad = ? AND foto_url = ?', [otra?.url ?? null, req.params.id, f.url]);
  await auditar(req.usuario, 'fotos', 'propiedad', Number(req.params.id), 'foto eliminada');
  res.json({ success: true });
});

// RF011: recomendaciones simples por tipo y presupuesto.
exports.recomendaciones = ejecutar(async (req, res) => {
  const presupuesto = Number(req.query.presupuesto), tipo = req.query.tipo ? Number(req.query.tipo) : null;
  if (!Number.isFinite(presupuesto) || presupuesto <= 0) throw fallo('Indica un presupuesto válido');
  const [filas] = await pool.query("SELECT * FROM propiedades WHERE estado = 'disponible'");
  const lista = filas.filter(p => tipo === null || p.fk_tipo_propiedad === tipo).map(p => {
    const precio = Number(p.precio_venta) || Number(p.precio_arrendamiento) || 0;
    return { ...p, puntaje: 40 + (precio > 0 && precio <= presupuesto ? 40 : 0) + (tipo !== null ? 20 : 0) };
  }).sort((a, b) => b.puntaje - a.puntaje).slice(0, 10);
  res.json({ success: true, data: await adjuntarFotos(lista) });
});
