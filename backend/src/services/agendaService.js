/**
 * Agenda de asesores (RF006, RF007, RF014, RF016).
 */
const DURACION_MIN = 60;
const PASO_MIN = 30;
const ANTICIPACION_MIN = 60;
const VENTANA_CARGA_DIAS = 7;
const ZONA = '-05:00';

const { fallo } = require('../utils/errores');
const aMinutos = hhmm => { const [h, m] = String(hhmm).split(':'); return Number(h) * 60 + Number(m); };
const aHora = min => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const diaSemana = fecha => new Date(`${fecha}T00:00:00Z`).getUTCDay();
const sumarDias = (fecha, n) => { const d = new Date(`${fecha}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

function interpretarFechaHora(fecha, hora) {
  let f = String(fecha || ''), h = String(hora || '');
  if (!h && f.includes('T')) [f, h] = f.split('T');
  h = h.slice(0, 5);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f) || !/^\d{2}:\d{2}$/.test(h) || Number.isNaN(Date.parse(`${f}T${h}:00${ZONA}`))) throw fallo('Fecha u hora inválida');
  return { fecha: f, hora: h };
}
const esFuturo = (fecha, hora) => Date.parse(`${fecha}T${hora}:00${ZONA}`) >= Date.now() + ANTICIPACION_MIN * 60_000;

async function cargarContexto(db, fecha) {
  const [horarios] = await db.execute(
    `SELECT h.fk_agente, a.nombre, h.hora_inicio, h.hora_fin
       FROM horarios_asesor h JOIN agentes a ON a.id_agente = h.fk_agente
      WHERE a.activo = 1 AND h.activo = 1 AND h.dia_semana = ?`, [diaSemana(fecha)]);
  const desde = sumarDias(fecha, -VENTANA_CARGA_DIAS), hasta = sumarDias(fecha, VENTANA_CARGA_DIAS + 1);
  const [ocupados] = await db.execute(
    `SELECT fk_agente, fecha_contacto AS inicio, id_solicitud FROM solicitudes_contacto
      WHERE fk_agente IS NOT NULL AND estado IN ('programada','reprogramada') AND fecha_contacto >= ? AND fecha_contacto < ?
     UNION ALL
     SELECT fk_agente, fecha AS inicio, NULL AS id_solicitud FROM visitas WHERE fecha >= ? AND fecha < ?`,
    [desde, hasta, desde, hasta]);
  return { fecha, horarios, ocupados };
}

function elegirAsesor(contexto, hora, { excluirSolicitud = 0, soloAgente = null } = {}) {
  const inicio = aMinutos(hora), fin = inicio + DURACION_MIN;
  const candidatos = new Map();
  for (const h of contexto.horarios) {
    if (soloAgente && h.fk_agente !== soloAgente) continue;
    if (aMinutos(h.hora_inicio) <= inicio && fin <= aMinutos(h.hora_fin)) candidatos.set(h.fk_agente, { id: h.fk_agente, dia: 0, semana: 0, libre: true });
  }
  for (const o of contexto.ocupados) {
    const c = candidatos.get(o.fk_agente);
    if (!c || (excluirSolicitud && o.id_solicitud === excluirSolicitud)) continue;
    const diaOcupado = String(o.inicio).slice(0, 10);
    c.semana++;
    if (diaOcupado === contexto.fecha) {
      c.dia++;
      const t = aMinutos(String(o.inicio).slice(11, 16));
      if (t < fin && inicio < t + DURACION_MIN) c.libre = false;   // se solapa con otra cita
    }
  }
  const libres = [...candidatos.values()].filter(c => c.libre).sort((a, b) => a.dia - b.dia || a.semana - b.semana || a.id - b.id);
  return libres[0]?.id ?? null;
}

async function horariosDisponibles(db, fecha) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fecha))) throw fallo('Fecha inválida');
  const contexto = await cargarContexto(db, fecha);
  if (!contexto.horarios.length) return [];
  const desde = Math.min(...contexto.horarios.map(h => aMinutos(h.hora_inicio)));
  const hasta = Math.max(...contexto.horarios.map(h => aMinutos(h.hora_fin))) - DURACION_MIN;
  const horas = [];
  for (let t = desde; t <= hasta; t += PASO_MIN) {
    const hora = aHora(t);
    if (esFuturo(fecha, hora) && elegirAsesor(contexto, hora) !== null) horas.push(hora);
  }
  return horas;
}

async function asignarAsesor(conexion, fecha, hora, opciones = {}) {
  if (aMinutos(hora) % PASO_MIN !== 0) throw fallo(`Las citas inician en múltiplos de ${PASO_MIN} minutos`);
  if (!esFuturo(fecha, hora)) throw fallo(`La cita debe programarse con al menos ${ANTICIPACION_MIN} minutos de anticipación`);
  // Serializa asignaciones concurrentes para evitar que dos clientes tomen el mismo horario.
  await conexion.execute('SELECT id_agente FROM agentes WHERE activo = 1 FOR UPDATE');
  const contexto = await cargarContexto(conexion, fecha);
  const agente = elegirAsesor(contexto, hora, opciones);
  if (!agente) throw fallo('No hay asesores disponibles en ese horario. Elige otro día u hora.', 409);
  return agente;
}

module.exports = { DURACION_MIN, PASO_MIN, fallo, elegirAsesor, aMinutos, aHora, sumarDias, interpretarFechaHora, esFuturo, horariosDisponibles, asignarAsesor };
