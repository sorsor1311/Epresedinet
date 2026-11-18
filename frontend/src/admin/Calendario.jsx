import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Mail, Phone, Briefcase, Home, UserRound, Clock, CheckCircle2, XCircle, CalendarClock, StickyNote } from 'lucide-react';
import { api, MESES, DIAS, cap, ymd, deYmd, hoy, sumar, lunesDe, horaDe, minutosDe, fechaHora, ESTADO_CITA } from '../api.js';
import { Modal, Badge, BadgeEstado, Campo, Cargando, useToast } from '../ui.jsx';
import SelectorHorario from '../publico/SelectorHorario.jsx';

const PALETA = ['#18488e', '#1689a9', '#c27c0e', '#7a4fb5', '#1c8c5e', '#c0392b', '#d1498a', '#4f6d7a'];
const H0 = 7, H1 = 20, HH = 52;   // rejilla de 07:00 a 20:00
const abierta = e => e.estado === 'programada' || e.estado === 'reprogramada';

function rangoVisible(vista, ref) {
  if (vista === 'mes') { const ini = lunesDe(new Date(ref.getFullYear(), ref.getMonth(), 1)); return { desde: ini, hasta: sumar(ini, 41) }; }
  if (vista === 'semana') { const ini = lunesDe(ref); return { desde: ini, hasta: sumar(ini, 6) }; }
  return { desde: ref, hasta: ref };
}
function titulo(vista, ref) {
  if (vista === 'mes') return `${cap(MESES[ref.getMonth()])} ${ref.getFullYear()}`;
  if (vista === 'dia') return `${cap(DIAS[ref.getDay()])} ${ref.getDate()} de ${MESES[ref.getMonth()]}`;
  const a = lunesDe(ref), b = sumar(a, 6);
  return `${a.getDate()} ${MESES[a.getMonth()].slice(0, 3)} – ${b.getDate()} ${MESES[b.getMonth()].slice(0, 3)} ${b.getFullYear()}`;
}

export default function Calendario({ usuario }) {
  const toast = useToast();
  const esAdmin = usuario.rol === 'Administrador';
  const [vista, setVista] = useState('semana');
  const [ref, setRef] = useState(() => new Date());
  const [agente, setAgente] = useState('');
  const [verDisp, setVerDisp] = useState(true);
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [sel, setSel] = useState(null);
  const [nueva, setNueva] = useState(null);

  const cargar = useCallback(async () => {
    const { desde, hasta } = rangoVisible(vista, ref);
    try { setDatos(await api(`/atencion/calendario?desde=${ymd(desde)}&hasta=${ymd(hasta)}${agente ? '&agente=' + agente : ''}`)); setError(''); }
    catch (e) { setError(e.message); }
  }, [vista, ref, agente]);
  useEffect(() => { cargar(); }, [cargar]);

  const color = useMemo(() => { const m = {}; (datos?.agentes || []).forEach((a, i) => { m[a.id_agente] = PALETA[i % PALETA.length]; }); return id => m[id] || PALETA[0]; }, [datos?.agentes]);
  const mover = n => setRef(r => vista === 'mes' ? new Date(r.getFullYear(), r.getMonth() + n, 1) : sumar(r, n * (vista === 'semana' ? 7 : 1)));
  const eventosDia = d => (datos?.eventos || []).filter(e => e.inicio.slice(0, 10) === d).sort((a, b) => a.inicio.localeCompare(b.inicio));
  const abrirDia = d => { setRef(deYmd(d)); setVista('dia'); };

  const columnas = useMemo(() => {
    if (vista === 'semana') return Array.from({ length: 7 }, (_, i) => ({ clave: ymd(sumar(lunesDe(ref), i)), fecha: ymd(sumar(lunesDe(ref), i)), agente: agente ? Number(agente) : null }));
    const f = ymd(ref);
    if (esAdmin && !agente && datos?.agentes?.length) return datos.agentes.filter(a => a.activo).map(a => ({ clave: f + a.id_agente, fecha: f, agente: a.id_agente, nombre: a.nombre }));
    return [{ clave: f, fecha: f, agente: agente ? Number(agente) : null }];
  }, [vista, ref, agente, esAdmin, datos?.agentes]);

  return <div>
    <div className="ph"><div><h1>{esAdmin ? 'Calendario de citas' : 'Mi calendario'}</h1>
      <p>{esAdmin ? 'Agenda de todos los asesores. Las franjas verdes son horas en que cada asesor puede recibir citas.' : 'Tus citas con clientes y tus franjas de disponibilidad.'}</p></div>
      <button className="btn" onClick={() => setNueva({ fecha: ymd(new Date()), hora: '' })}><Plus size={17}/> Nueva cita</button></div>

    <div className="cal-barra">
      <div style={{ display: 'flex', gap: 6 }}><button className="btn sec icono" onClick={() => mover(-1)} aria-label="Anterior"><ChevronLeft size={18}/></button>
        <button className="btn sec" onClick={() => setRef(new Date())}>Hoy</button><button className="btn sec icono" onClick={() => mover(1)} aria-label="Siguiente"><ChevronRight size={18}/></button></div>
      <h2>{titulo(vista, ref)}</h2>
      <div className="seg" style={{ marginLeft: 'auto' }}>{[['mes', 'Mes'], ['semana', 'Semana'], ['dia', 'Día']].map(([k, t]) => <button key={k} className={vista === k ? 'activo' : ''} onClick={() => setVista(k)}>{t}</button>)}</div>
      {esAdmin && <select className="input" style={{ width: 'auto' }} value={agente} onChange={e => setAgente(e.target.value)} aria-label="Asesor"><option value="">Todos los asesores</option>{datos?.agentes.map(a => <option key={a.id_agente} value={a.id_agente}>{a.nombre}</option>)}</select>}
    </div>
    <div className="cal-leyenda">
      {esAdmin && datos?.agentes.map(a => <span key={a.id_agente}><i className="punto" style={{ background: color(a.id_agente) }}/>{a.nombre}{!a.activo && ' (inactivo)'}</span>)}
      <span><i className="punto" style={{ background: 'var(--ok)' }}/>Atendida</span><span><i className="punto" style={{ background: '#aab6c3' }}/>Cancelada</span>
      {vista !== 'mes' && <label style={{ marginLeft: 'auto', display: 'inline-flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}><input type="checkbox" checked={verDisp} onChange={e => setVerDisp(e.target.checked)}/> Mostrar disponibilidad</label>}
    </div>

    {error && <div className="aviso error">{error}</div>}
    {!datos && !error && <Cargando texto="Cargando calendario…"/>}
    {datos && vista === 'mes' && <Mes ref_={ref} eventosDia={eventosDia} color={color} abrirDia={abrirDia} onEvento={setSel}/>}
    {datos && vista !== 'mes' && <Rejilla columnas={columnas} datos={datos} eventosDia={eventosDia} color={color} verDisp={verDisp} vista={vista} onEvento={setSel} onVacio={(fecha, hora, ag) => setNueva({ fecha, hora, agente: ag })}/>}

    {sel && <DetalleEvento ev={sel} esAdmin={esAdmin} color={color(sel.id_agente)} onCerrar={() => setSel(null)} onCambio={() => { setSel(null); cargar(); }}/>}
    {nueva && <NuevaCita inicial={nueva} esAdmin={esAdmin} agentes={datos?.agentes || []} onCerrar={() => setNueva(null)} onCreada={() => { setNueva(null); cargar(); toast('Cita agendada y notificada'); }}/>}
  </div>;
}

function Mes({ ref_, eventosDia, color, abrirDia, onEvento }) {
  const ini = lunesDe(new Date(ref_.getFullYear(), ref_.getMonth(), 1));
  const dias = Array.from({ length: 42 }, (_, i) => sumar(ini, i));
  return <div className="mes">
    {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => <div key={d} className="dsem">{d}</div>)}
    {dias.map(d => { const f = ymd(d), ev = eventosDia(f); return <div key={f} role="button" tabIndex={0} className={'dia' + (d.getMonth() !== ref_.getMonth() ? ' fuera' : '') + (f === hoy() ? ' hoy' : '')} onClick={() => abrirDia(f)} onKeyDown={e => e.key === 'Enter' && abrirDia(f)}>
      <span className="num">{d.getDate()}</span>
      {ev.slice(0, 3).map(e => <div key={e.id} className={'ev-mini ' + e.estado + (e.tipo === 'visita' ? ' visita' : '')} style={{ '--c': color(e.id_agente) }} onClick={x => { x.stopPropagation(); onEvento(e); }} title={`${horaDe(e.inicio)} ${e.cliente}`}>{horaDe(e.inicio)} {e.cliente}</div>)}
      {ev.length > 3 && <span className="mas">+{ev.length - 3} más</span>}</div>; })}
  </div>;
}

/** Reparte en carriles los eventos que coinciden en el tiempo para que no se tapen entre sí. */
function carriles(eventos) {
  const res = []; let grupo = [], finGrupo = -1;
  const cerrar = () => { const total = Math.max(1, ...grupo.map(x => x.carril + 1)); grupo.forEach(x => res.push({ ...x, total })); grupo = []; };
  for (const e of eventos) {
    const a = minutosDe(e.inicio), b = minutosDe(e.fin);
    if (grupo.length && a >= finGrupo) { cerrar(); finGrupo = -1; }
    let carril = 0; while (grupo.some(x => x.carril === carril && minutosDe(x.e.fin) > a)) carril++;
    grupo.push({ e, carril }); finGrupo = Math.max(finGrupo, b);
  }
  if (grupo.length) cerrar();
  return res;
}

function Rejilla({ columnas, datos, eventosDia, color, verDisp, vista, onEvento, onVacio }) {
  const horas = Array.from({ length: H1 - H0 }, (_, i) => H0 + i);
  const [ahora, setAhora] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setAhora(new Date()), 60000); return () => clearInterval(t); }, []);
  const top = min => ((min - H0 * 60) / 60) * HH;
  const franjas = (fecha, ag) => datos.disponibilidad.filter(d => d.dia_semana === deYmd(fecha).getDay() && (!ag || d.fk_agente === ag));
  return <div className="rejilla"><div className="rej-in" style={{ gridTemplateColumns: `56px repeat(${columnas.length}, minmax(${vista === 'semana' ? 110 : 160}px, 1fr))`, '--hh': HH + 'px', '--minw': (56 + columnas.length * (vista === 'semana' ? 110 : 160)) + 'px' }}>
    <div className="rej-cab"><div/>{columnas.map(c => { const d = deYmd(c.fecha); return <div key={c.clave} className={c.fecha === hoy() ? 'hoy' : ''}>{c.nombre ? <>{c.nombre}<small>{cap(DIAS[d.getDay()])} {d.getDate()}</small></> : <>{cap(DIAS[d.getDay()]).slice(0, 3)} <small>{d.getDate()} {MESES[d.getMonth()].slice(0, 3)}</small></>}</div>; })}</div>
    <div className="rej-horas">{horas.map(h => <div key={h}>{String(h).padStart(2, '0')}:00</div>)}</div>
    {columnas.map(c => <div key={c.clave} className={'rej-col' + (c.fecha === hoy() ? ' hoy' : '')} style={{ height: horas.length * HH }}
      onClick={e => { const y = e.clientY - e.currentTarget.getBoundingClientRect().top; const min = Math.floor((y / HH) * 2) * 30 + H0 * 60; onVacio(c.fecha, `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`, c.agente); }}>
      {verDisp && franjas(c.fecha, c.agente).map((d, i) => { const a = Number(d.hora_inicio.slice(0, 2)) * 60 + Number(d.hora_inicio.slice(3)), b = Number(d.hora_fin.slice(0, 2)) * 60 + Number(d.hora_fin.slice(3)); return <div key={i} className="disp" style={{ top: top(a), height: ((b - a) / 60) * HH }} title={`${d.agente}: ${d.hora_inicio}–${d.hora_fin}`}/>; })}
      {carriles(eventosDia(c.fecha).filter(e => !c.agente || e.id_agente === c.agente)).map(({ e, carril, total }) => { const a = minutosDe(e.inicio), b = minutosDe(e.fin); return <button key={e.id} className={'ev ' + e.estado + (e.tipo === 'visita' ? ' visita' : '')} style={{ top: top(a), height: Math.max(26, ((b - a) / 60) * HH - 2), '--c': color(e.id_agente), left: `calc(${(carril / total) * 100}% + 3px)`, right: `calc(${((total - carril - 1) / total) * 100}% + 3px)` }}
        onClick={x => { x.stopPropagation(); onEvento(e); }} title={`${horaDe(e.inicio)} ${e.cliente} · ${e.agente}`}><b>{horaDe(e.inicio)} · {e.cliente}</b>{e.propiedad}</button>; })}
      {c.fecha === ymd(ahora) && ahora.getHours() >= H0 && ahora.getHours() < H1 && <div className="ahora" style={{ top: top(ahora.getHours() * 60 + ahora.getMinutes()) }}/>}
    </div>)}
  </div></div>;
}

function DetalleEvento({ ev, esAdmin, color, onCerrar, onCambio }) {
  const toast = useToast();
  const [reprog, setReprog] = useState(false);
  const [hora, setHora] = useState({ fecha: '', hora: '' });
  const [ocupado, setOcupado] = useState(false);
  const cita = ev.tipo === 'cita';
  async function estado(e) {
    if (e === 'cancelada' && !window.confirm('¿Cancelar esta cita? Se notificará al cliente.')) return;
    setOcupado(true);
    try { await api(`/atencion/citas/${ev.id_solicitud}/estado`, { metodo: 'PATCH', cuerpo: { estado: e } }); toast(e === 'atendida' ? 'Cita marcada como atendida' : 'Cita cancelada'); onCambio(); }
    catch (err) { toast(err.message, 'error'); } finally { setOcupado(false); }
  }
  async function reprogramar() {
    setOcupado(true);
    try { await api(`/atencion/citas/${ev.id_solicitud}/reprogramar`, { metodo: 'PATCH', cuerpo: hora }); toast('Cita reprogramada y cliente notificado'); onCambio(); }
    catch (err) { toast(err.message, 'error'); } finally { setOcupado(false); }
  }
  return <Modal lateral titulo={cita ? 'Cita con cliente' : 'Visita programada'} subtitulo={fechaHora(ev.inicio) + ' – ' + horaDe(ev.fin)} onCerrar={onCerrar}>
    <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}><BadgeEstado estado={ev.estado}/>{ev.tipo === 'visita' && <Badge tono="info">Visita</Badge>}{ev.origen === 'interno' && <Badge>Agendada por el equipo</Badge>}</div>
    <div className="det-lista">
      <div className="det-fila"><UserRound size={18}/><div><b>{ev.cliente}</b>{ev.edad && <small>{ev.edad} años</small>}</div></div>
      {ev.ocupacion && <div className="det-fila"><Briefcase size={18}/><div>{ev.ocupacion}</div></div>}
      {ev.correo && <div className="det-fila"><Mail size={18}/><a href={'mailto:' + ev.correo}>{ev.correo}</a></div>}
      {ev.telefono && <div className="det-fila"><Phone size={18}/><a href={'tel:' + ev.telefono}>{ev.telefono}</a></div>}
      <div className="det-fila"><Home size={18}/><div><b>{ev.propiedad}</b>{ev.tipo_inmueble && <small>{ev.tipo_inmueble}</small>}</div></div>
      <div className="det-fila"><Clock size={18}/><div>Asesor: <b style={{ color }}>{ev.agente}</b></div></div>
      {ev.notas && <div className="det-fila"><StickyNote size={18}/><div>{ev.notas}</div></div>}
    </div>
    {cita && abierta(ev) && !reprog && <div className="acciones-form" style={{ justifyContent: 'flex-start', marginTop: 26 }}>
      <button className="btn" disabled={ocupado} onClick={() => estado('atendida')}><CheckCircle2 size={16}/> Marcar atendida</button>
      <button className="btn sec" onClick={() => setReprog(true)}><CalendarClock size={16}/> Reprogramar</button>
      <button className="btn peligro" disabled={ocupado} onClick={() => estado('cancelada')}><XCircle size={16}/> Cancelar</button></div>}
    {reprog && <div style={{ marginTop: 24 }}><h3 style={{ fontSize: 15, marginBottom: 10 }}>Nuevo horario</h3><SelectorHorario valor={hora} onCambio={setHora}/>
      <div className="acciones-form" style={{ justifyContent: 'flex-start' }}><button className="btn" disabled={!hora.hora || ocupado} onClick={reprogramar}>Guardar cambio</button><button className="btn ghost" onClick={() => setReprog(false)}>Volver</button></div></div>}
    {cita && !abierta(ev) && <p style={{ marginTop: 20, color: 'var(--muted)', fontSize: 13 }}>Esta cita está {ESTADO_CITA[ev.estado].toLowerCase()} y ya no admite cambios.</p>}
  </Modal>;
}

function NuevaCita({ inicial, esAdmin, agentes, onCerrar, onCreada }) {
  const toast = useToast();
  const [interesados, setInteresados] = useState([]);
  const [props, setProps] = useState([]);
  const [modo, setModo] = useState('existente');
  const [f, setF] = useState({ id_interesado: '', id_propiedad: '', id_agente: inicial.agente || '', notas: '' });
  const [hora, setHora] = useState({ fecha: inicial.fecha, hora: '' });
  const [nuevo, setNuevo] = useState({ nombre: '', edad: '', correo: '', ocupacion: '', telefono: '' });
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => {
    api('/atencion/interesados').then(setInteresados).catch(() => {});
    api('/propiedades').then(l => setProps(l.filter(p => p.estado === 'disponible'))).catch(() => {});
  }, []);
  const listo = hora.hora && f.id_propiedad && (modo === 'existente' ? f.id_interesado : nuevo.nombre && nuevo.correo && nuevo.edad && nuevo.ocupacion);
  async function guardar(e) {
    e.preventDefault(); setOcupado(true);
    try {
      await api('/atencion/citas/interna', { metodo: 'POST', cuerpo: { id_propiedad: f.id_propiedad, ...hora, notas: f.notas, ...(esAdmin && f.id_agente ? { id_agente: f.id_agente } : {}), ...(modo === 'existente' ? { id_interesado: f.id_interesado } : { interesado: nuevo }) } });
      onCreada();
    } catch (err) { toast(err.message, 'error'); } finally { setOcupado(false); }
  }
  return <Modal titulo="Nueva cita" subtitulo="Registra una cita solicitada por teléfono o en la oficina" onCerrar={onCerrar} ancho={640}>
    <form className="form-col" onSubmit={guardar}>
      <div className="seg" style={{ alignSelf: 'flex-start' }}><button type="button" className={modo === 'existente' ? 'activo' : ''} onClick={() => setModo('existente')}>Cliente registrado</button><button type="button" className={modo === 'nuevo' ? 'activo' : ''} onClick={() => setModo('nuevo')}>Cliente nuevo</button></div>
      {modo === 'existente'
        ? <Campo etiqueta="Cliente"><select required value={f.id_interesado} onChange={e => setF({ ...f, id_interesado: e.target.value })}><option value="">Selecciona…</option>{interesados.map(i => <option key={i.id_interesado} value={i.id_interesado}>{i.nombre} · {i.correo}</option>)}</select></Campo>
        : <div className="rejilla-form"><Campo etiqueta="Nombre completo" className="completo"><input required value={nuevo.nombre} onChange={e => setNuevo({ ...nuevo, nombre: e.target.value })}/></Campo>
            <Campo etiqueta="Edad"><input type="number" min="18" required value={nuevo.edad} onChange={e => setNuevo({ ...nuevo, edad: e.target.value })}/></Campo><Campo etiqueta="Ocupación"><input required value={nuevo.ocupacion} onChange={e => setNuevo({ ...nuevo, ocupacion: e.target.value })}/></Campo>
            <Campo etiqueta="Correo"><input type="email" required value={nuevo.correo} onChange={e => setNuevo({ ...nuevo, correo: e.target.value })}/></Campo><Campo etiqueta="Teléfono"><input value={nuevo.telefono} onChange={e => setNuevo({ ...nuevo, telefono: e.target.value })}/></Campo></div>}
      <Campo etiqueta="Inmueble de interés"><select required value={f.id_propiedad} onChange={e => setF({ ...f, id_propiedad: e.target.value })}><option value="">Selecciona…</option>{props.map(p => <option key={p.id_propiedad} value={p.id_propiedad}>#{p.id_propiedad} · {p.direccion}</option>)}</select></Campo>
      {esAdmin && <Campo etiqueta="Asesor" ayuda="Déjalo en automático para asignar al asesor con la agenda más libre"><select value={f.id_agente} onChange={e => setF({ ...f, id_agente: e.target.value })}><option value="">Automático</option>{agentes.filter(a => a.activo).map(a => <option key={a.id_agente} value={a.id_agente}>{a.nombre}</option>)}</select></Campo>}
      <SelectorHorario valor={hora} onCambio={setHora}/>
      <Campo etiqueta="Notas (opcional)"><textarea maxLength={300} value={f.notas} onChange={e => setF({ ...f, notas: e.target.value })}/></Campo>
      <div className="acciones-form"><button type="button" className="btn ghost" onClick={onCerrar}>Cancelar</button><button className="btn" disabled={!listo || ocupado}>{ocupado ? 'Agendando…' : 'Agendar cita'}</button></div>
    </form></Modal>;
}
