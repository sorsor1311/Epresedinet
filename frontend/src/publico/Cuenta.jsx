import React, { useState } from 'react';
import { CalendarClock, Heart, Sparkles, UserRound, LogIn, SearchX, XCircle } from 'lucide-react';
import { api, deYmd, MESES, horaDe, fechaHora, dinero, cap } from '../api.js';
import { Modal, BadgeEstado, Cargando, Vacio, usePeticion, useToast } from '../ui.jsx';
import { useFavoritos } from '../favoritos.js';
import SelectorHorario from './SelectorHorario.jsx';
import { TarjetaInmueble, DetalleInmueble } from './Catalogo.jsx';
import Perfil from '../admin/Perfil.jsx';

function MisCitas({ ir }) {
  const toast = useToast();
  const r = usePeticion(() => api('/portal/cliente/citas'), []);
  const [reprog, setReprog] = useState(null), [hora, setHora] = useState({ fecha: '', hora: '' });
  async function ejecutar(c, accion) {
    try { await api(`/portal/cliente/citas/${c.id_solicitud}`, { metodo: 'PATCH', cuerpo: { accion, ...(accion === 'reprogramar' ? hora : {}) } }); toast(accion === 'cancelar' ? 'Cita cancelada' : 'Cita reprogramada'); setReprog(null); r.recargar(); }
    catch (e) { toast(e.message, 'error'); }
  }
  if (r.cargando) return <Cargando/>;
  const activas = r.datos.filter(c => ['programada', 'reprogramada'].includes(c.estado)), historial = r.datos.filter(c => !activas.includes(c));
  const Fila = ({ c }) => { const f = deYmd(c.fecha_contacto), abierta = activas.includes(c); return <div className="cita-c">
    <div className="fecha-mini"><b>{f.getDate()}</b><small>{MESES[f.getMonth()].slice(0, 3)}</small></div>
    <div style={{ minWidth: 0 }}><b>{c.propiedad}</b><div style={{ color: 'var(--muted)', fontSize: 13.5, marginTop: 3 }}>{c.tipo}{c.zona ? ` · ${c.zona}` : ''} · {horaDe(c.fecha_contacto)}{c.agente ? ` · Asesor ${c.agente}` : ''}</div><div style={{ marginTop: 6 }}><BadgeEstado estado={c.estado}/></div></div>
    {abierta && <div style={{ display: 'flex', gap: 8 }}><button className="btn sm suave" onClick={() => { setReprog(c); setHora({ fecha: '', hora: '' }); }}><CalendarClock size={14}/> Reprogramar</button>
      <button className="btn sm peligro" onClick={() => window.confirm('¿Cancelar esta cita?') && ejecutar(c, 'cancelar')}><XCircle size={14}/> Cancelar</button></div>}</div>; };
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
    <div className="cd"><div className="cd-h"><h3>Próximas citas</h3><span>{activas.length}</span></div><div className="cd-b sin">{activas.length ? activas.map(c => <Fila key={c.id_solicitud} c={c}/>) :
      <Vacio icono={CalendarClock} titulo="No tienes citas programadas" texto="Cuéntale al asistente qué buscas y agenda una visita con un asesor."><button className="btn" onClick={() => ir('asistente')}>Hablar con el asistente</button></Vacio>}</div></div>
    {historial.length > 0 && <div className="cd"><div className="cd-h"><h3>Historial</h3><span>{historial.length}</span></div><div className="cd-b sin">{historial.map(c => <Fila key={c.id_solicitud} c={c}/>)}</div></div>}
    {reprog && <Modal titulo="Reprogramar cita" subtitulo={`${reprog.propiedad} · actualmente ${fechaHora(reprog.fecha_contacto)}`} onCerrar={() => setReprog(null)}>
      <SelectorHorario valor={hora} onCambio={setHora}/><div className="acciones-form"><button className="btn ghost" onClick={() => setReprog(null)}>Cancelar</button><button className="btn" disabled={!hora.hora} onClick={() => ejecutar(reprog, 'reprogramar')}>Confirmar nuevo horario</button></div></Modal>}
  </div>;
}

function ParaTi({ tipos, ir }) {
  const r = usePeticion(() => Promise.all([api('/portal/cliente/recomendaciones'), api('/portal/cliente/historial')]), []);
  const [abierto, setAbierto] = useState(null);
  if (r.cargando) return <Cargando/>;
  const [rec, hist] = r.datos;
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
    <div><h3 style={{ marginBottom: 12 }}>Recomendados según tus búsquedas</h3>
      {rec.length ? <div className="rejilla-inm" style={{ paddingBottom: 0 }}>{rec.map(p => <TarjetaInmueble key={p.id_propiedad} p={p} tipo={p.tipo_nombre} onVer={setAbierto}/>)}</div>
        : <Vacio icono={Sparkles} titulo="Aún no tenemos recomendaciones" texto="Haz una búsqueda con el asistente y aprenderemos lo que te gusta."><button className="btn" onClick={() => ir('asistente')}>Buscar con el asistente</button></Vacio>}</div>
    {hist.length > 0 && <div className="cd"><div className="cd-h"><h3>Mis búsquedas recientes</h3></div><div className="tbl-caja" style={{ border: 0 }}><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Negociación</th><th>Zona</th><th>Presupuesto</th></tr></thead>
      <tbody>{hist.slice(0, 10).map(b => <tr key={b.id_busqueda}><td>{b.creada_en.slice(0, 10)}</td><td>{b.tipo || 'Cualquiera'}</td><td>{cap(b.modalidad)}</td><td>{b.zona || 'Cualquiera'}</td><td>{dinero(b.presupuesto)}</td></tr>)}</tbody></table></div></div>}
    {abierto && <DetalleInmueble p={abierto} tipo={abierto.tipo_nombre} onCerrar={() => setAbierto(null)}/>}
  </div>;
}

function MiLista({ propiedades, tipos, ir }) {
  const fav = useFavoritos(); const [abierto, setAbierto] = useState(null);
  const lista = propiedades.filter(p => fav.ids.includes(p.id_propiedad));
  return lista.length ? <><p style={{ color: 'var(--muted)', marginBottom: 14 }}>Guarda los inmuebles que te interesan y pide cita para el que prefieras.</p>
    <div className="rejilla-inm" style={{ paddingBottom: 0 }}>{lista.map(p => <TarjetaInmueble key={p.id_propiedad} p={p} tipo={tipos[p.fk_tipo_propiedad]} onVer={setAbierto}/>)}</div>
    {abierto && <DetalleInmueble p={abierto} tipo={tipos[abierto.fk_tipo_propiedad]} onCerrar={() => setAbierto(null)}/>}</>
    : <Vacio icono={Heart} titulo="Tu lista está vacía" texto="Toca el corazón en cualquier inmueble para guardarlo aquí y compararlo después."><button className="btn" onClick={() => ir('propiedades')}>Explorar inmuebles</button></Vacio>;
}

export default function Cuenta({ usuario, tab, ir, propiedades, tipos, onPerfil }) {
  const logueado = usuario?.rol === 'Cliente';
  const actual = logueado ? (['citas', 'recomendados', 'lista', 'perfil'].includes(tab) ? tab : 'citas') : 'lista';
  const fav = useFavoritos();
  const tabs = logueado ? [['citas', 'Mis citas', CalendarClock], ['recomendados', 'Para ti', Sparkles], ['lista', `Mi lista (${fav.ids.length})`, Heart], ['perfil', 'Mi perfil', UserRound]] : [['lista', `Mi lista (${fav.ids.length})`, Heart]];
  return <>
    <div className="cuenta-cab"><div className="contenedor"><span className="ceja">{logueado ? 'Mi cuenta' : 'Lista de interés'}</span><h1>{logueado ? `Hola, ${usuario.nombre || usuario.usuario}` : 'Tu lista de interés'}</h1>
      <p>{logueado ? 'Sigue tus citas, revisa recomendaciones y administra tus datos.' : 'Los inmuebles que guardaste en este navegador.'}</p>
      <div className="tabs">{tabs.map(([k, t, I]) => <button key={k} className={actual === k ? 'on' : ''} onClick={() => ir('cuenta/' + k)}><I size={15} style={{ verticalAlign: -3, marginRight: 6 }}/>{t}</button>)}</div></div></div>
    <div className="contenedor" style={{ padding: '26px 0 70px' }}>
      {!logueado && <div className="aviso" style={{ marginBottom: 18 }}><LogIn size={18}/><div>Inicia sesión como cliente para hacer seguimiento de tus citas y recibir recomendaciones personalizadas. <button className="btn sm" style={{ marginLeft: 8 }} onClick={() => ir('acceso')}>Ingresar</button></div></div>}
      {actual === 'citas' && <MisCitas ir={ir}/>}{actual === 'recomendados' && <ParaTi tipos={tipos} ir={ir}/>}
      {actual === 'lista' && <MiLista propiedades={propiedades} tipos={tipos} ir={ir}/>}{actual === 'perfil' && <Perfil embebido onActualizado={onPerfil}/>}
    </div></>;
}
