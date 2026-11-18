// Cliente HTTP, sesión y formateadores compartidos.
const BASE = (import.meta.env.VITE_API_URL || '') + '/api';

export const sesion = {
  token: () => sessionStorage.getItem('token') || '',
  usuario: () => { try { return JSON.parse(sessionStorage.getItem('usuario') || 'null'); } catch { return null; } },
  guardar(token, usuario) { sessionStorage.setItem('token', token); sessionStorage.setItem('usuario', JSON.stringify(usuario)); },
  cerrar() { sessionStorage.removeItem('token'); sessionStorage.removeItem('usuario'); }
};

export async function api(ruta, { metodo = 'GET', cuerpo, token = sesion.token() } = {}) {
  let respuesta;
  try {
    respuesta = await fetch(BASE + ruta, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      ...(cuerpo !== undefined ? { body: JSON.stringify(cuerpo) } : {})
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.');
  }
  const json = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    if (respuesta.status === 401 && token) { sesion.cerrar(); window.dispatchEvent(new Event('sesion-expirada')); }
    throw new Error(json.message || json.error?.message || 'No se pudo completar la operación');
  }
  return json.data ?? json;
}

export async function subir(ruta, formData) {
  const r = await fetch(BASE + ruta, { method: 'POST', headers: { Authorization: 'Bearer ' + sesion.token() }, body: formData });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(json.message || 'No se pudo subir el archivo');
  return json.data ?? json;
}
/** Las fotos subidas viven en el backend (/uploads/...): en desarrollo pasan por el proxy de Vite. */
export const urlFoto = u => (u && u.startsWith('/uploads/') ? (import.meta.env.VITE_API_URL || '') + u : u);

export async function descargar(ruta, nombre) {
  const r = await fetch(BASE + ruta, { headers: { Authorization: 'Bearer ' + sesion.token() } });
  if (!r.ok) throw new Error('No se pudo descargar el archivo');
  const url = URL.createObjectURL(await r.blob());
  Object.assign(document.createElement('a'), { href: url, download: nombre }).click();
  URL.revokeObjectURL(url);
}

// ---------- Formatos ----------
export const dinero = v => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(v || 0));
export const dineroCorto = v => {
  const n = Number(v || 0);
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1).replace('.0', '')} mil M`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(n % 1e6 ? 1 : 0).replace('.0', '')} M`;
  return dinero(n);
};
export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const cap = t => (t ? t[0].toUpperCase() + t.slice(1) : '');
const dos = n => String(n).padStart(2, '0');
export const ymd = d => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
export const deYmd = s => { const [a, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(a, m - 1, d); };
export const hoy = () => ymd(new Date());
export const sumar = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const lunesDe = d => { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); x.setHours(0, 0, 0, 0); return x; };
export const horaDe = s => String(s).slice(11, 16);
export const minutosDe = s => Number(horaDe(s).slice(0, 2)) * 60 + Number(horaDe(s).slice(3, 5));
export const fechaLarga = s => { const d = deYmd(s); return `${cap(DIAS[d.getDay()])} ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`; };
export const fechaHora = s => `${fechaLarga(s)}, ${horaDe(s)}`;
export const fechaCorta = s => { const d = deYmd(s); return `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`; };
export const etiquetaHora = h => { const [hh, mm] = h.split(':').map(Number); return `${hh % 12 || 12}:${dos(mm)} ${hh < 12 ? 'a. m.' : 'p. m.'}`; };

export const ESTADO_CITA = { programada: 'Programada', reprogramada: 'Reprogramada', atendida: 'Atendida', cancelada: 'Cancelada' };
export const TONO_ESTADO = { programada: 'info', reprogramada: 'warn', atendida: 'ok', cancelada: 'muted', disponible: 'ok', reservada: 'warn', arrendada: 'info', vendida: 'info', inactiva: 'muted' };
export const ESTADOS_INMUEBLE = ['disponible', 'reservada', 'arrendada', 'vendida', 'inactiva'];
export const precioInmueble = p => {
  const v = Number(p.precio_venta) > 0, a = Number(p.precio_arrendamiento) > 0;
  return { venta: v ? Number(p.precio_venta) : null, arriendo: a ? Number(p.precio_arrendamiento) : null, etiqueta: v && a ? 'Venta y arriendo' : v ? 'Venta' : 'Arriendo' };
};
