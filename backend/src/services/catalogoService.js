const pool = require('../config/db');
const { fallo } = require('../utils/errores');

const sinAcentos = texto => String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/** Agrega a cada inmueble su galería (`fotos`), con la portada primero. */
async function adjuntarFotos(filas) {
  if (!filas.length) return filas;
  const [fotos] = await pool.query('SELECT fk_propiedad, url FROM propiedad_fotos WHERE fk_propiedad IN (?) ORDER BY fk_propiedad, orden, id_foto', [filas.map(f => f.id_propiedad)]);
  const mapa = new Map();
  for (const f of fotos) mapa.set(f.fk_propiedad, [...(mapa.get(f.fk_propiedad) || []), f.url]);
  return filas.map(f => {
    const lista = mapa.get(f.id_propiedad) || [];
    if (f.foto_url && !lista.includes(f.foto_url)) lista.unshift(f.foto_url);
    return { ...f, fotos: lista };
  });
}

/** Compatibilidad (0-100) de un inmueble con la búsqueda: precio 50 · zona 30 · tipo 20 (el tipo ya se filtró). */
function puntuar(p, { modalidad, presupuesto, tolerancia = 1.15, zona = '' }) {
  const precio = Number(modalidad === 'arriendo' ? p.precio_arrendamiento : p.precio_venta);
  const exceso = Math.max(0, precio - presupuesto) / (presupuesto * (tolerancia - 1) || 1);
  const puntajePrecio = precio <= presupuesto ? 50 : Math.round(50 * (1 - Math.min(1, exceso)));
  const coincideZona = !zona || sinAcentos(`${p.zona || ''} ${p.direccion}`).includes(sinAcentos(zona));
  const compatibilidad = puntajePrecio + (coincideZona ? 30 : 0) + 20;
  return { ...p, precio_mostrado: precio, modalidad, compatibilidad, puntaje: compatibilidad, dentro_presupuesto: precio <= presupuesto, coincide_zona: coincideZona };
}

/**
 * RF002: inmuebles que mejor coinciden con lo que busca el cliente.
 * Filtros duros: disponible, modalidad con precio, tipo (si lo indicó) y presupuesto (+tolerancia).
 * Compatibilidad (0-100): precio 50 · zona 30 · tipo 20.
 */
async function buscarInmuebles(filtros, { excluir = [], tolerancia = 1.15, limite = 10 } = {}) {
  const modalidad = filtros.modalidad === 'arriendo' ? 'arriendo' : 'compra';
  const presupuesto = Number(filtros.presupuesto);
  if (!Number.isFinite(presupuesto) || presupuesto <= 0) throw fallo('Indica un presupuesto positivo');
  const tipos = (Array.isArray(filtros.tipos) ? filtros.tipos : [filtros.tipo]).map(sinAcentos).filter(Boolean);
  const zona = sinAcentos(filtros.zona);
  const columna = modalidad === 'arriendo' ? 'p.precio_arrendamiento' : 'p.precio_venta';
  const [filas] = await pool.query(
    `SELECT p.*, t.nombre AS tipo_nombre FROM propiedades p JOIN tipo_propiedades t ON t.id_tipo_propiedad = p.fk_tipo_propiedad
      WHERE p.estado = 'disponible' AND ${columna} > 0 AND ${columna} <= ? ORDER BY p.id_propiedad DESC LIMIT 1000`, [presupuesto * tolerancia]);
  const candidatos = filas.filter(p => !excluir.includes(p.id_propiedad) && (!tipos.length || tipos.includes(sinAcentos(p.tipo_nombre))));
  const puntuados = candidatos.map(p => puntuar(p, { modalidad, presupuesto, tolerancia, zona })).sort((a, b) => b.compatibilidad - a.compatibilidad || a.precio_mostrado - b.precio_mostrado).slice(0, limite);
  return adjuntarFotos(puntuados);
}

module.exports = { adjuntarFotos, buscarInmuebles, puntuar, sinAcentos };
