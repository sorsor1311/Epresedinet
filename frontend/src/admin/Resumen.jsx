import React from 'react';
import { CalendarDays, ArrowRight } from 'lucide-react';
import { api, dinero, deYmd, MESES, horaDe, hoy, ESTADOS_INMUEBLE, cap, fechaCorta } from '../api.js';
import { usePeticion, Cargando, BadgeEstado } from '../ui.jsx';
import { LineaTiempo, BarrasLista, Apilada } from '../charts.jsx';
import { Cab } from './Shell.jsx';

const COLOR_ESTADO = { disponible: '#1c8c5e', reservada: '#d38a0a', arrendada: '#1f5fb4', vendida: '#0b2650', inactiva: '#9aa8ba' };
const Stat = ({ t, v, s }) => <div className="stat"><label>{t}</label><b>{v}</b>{s && <small>{s}</small>}</div>;
const seguro = p => p.catch(() => null);

export default function Resumen({ usuario, ir }) {
  const esAdmin = usuario.rol === 'Administrador';
  const r = usePeticion(() => Promise.all([api('/dashboard/resumen'), seguro(api('/atencion/analisis?dias=30')), seguro(api('/atencion/reportes')),
    seguro(api(`/atencion/calendario?desde=${hoy()}&hasta=${hoy()}`)), esAdmin ? seguro(api('/atencion/auditoria')) : Promise.resolve(null)]), []);
  if (r.cargando) return <Cargando/>;
  if (r.error) return <div className="aviso error">{r.error}</div>;
  const [d, an, rep, cal, aud] = r.datos;
  const disponibles = d.propiedades_por_estado.find(x => x.estado === 'disponible')?.total || 0;
  const citasHoy = (cal?.eventos || []).filter(e => e.tipo === 'cita' && ['programada', 'reprogramada', 'atendida'].includes(e.estado));
  const fecha = new Date();
  return <div>
    <Cab titulo={esAdmin ? 'Resumen general' : 'Resumen del día'} sub={`${fecha.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · ${usuario.rol === 'Agente' ? 'Asesor' : 'Administrador'}: ${usuario.nombre || usuario.usuario}`}>
      <button className="btn sec" onClick={() => ir('calendario')}><CalendarDays size={16}/> Abrir calendario</button></Cab>
    <div className="stats">
      <Stat t="Citas hoy" v={d.citas_hoy} s={d.citas_hoy ? 'programadas para hoy' : 'sin citas para hoy'}/>
      <Stat t="Próximos 7 días" v={d.citas_semana} s="citas por atender"/>
      <Stat t="Citas pendientes" v={d.citas_pendientes}/>
      {esAdmin ? <><Stat t="Inmuebles disponibles" v={disponibles} s={`de ${d.propiedades} registrados`}/><Stat t="Clientes interesados" v={d.interesados}/></>
        : <><Stat t="Atendidas" v={rep?.agentes?.[0]?.atendidas ?? 0} s="citas completadas"/><Stat t="Inmuebles disponibles" v={disponibles}/></>}
    </div>
    <div className="cols c21">
      <div className="apilar">
        <div className="cd"><div className="cd-h"><h3>{esAdmin ? 'Agenda de hoy' : 'Mi agenda de hoy'}</h3><span>{citasHoy.length} cita(s)</span></div>
          <div className="cd-b sin">{citasHoy.length === 0 ? <p style={{ padding: 22, color: 'var(--p-muted)' }}>No hay citas para hoy.</p> :
            citasHoy.map(e => <div key={e.id} className="agenda-it"><div className="hora-t">{horaDe(e.inicio)}<small>{horaDe(e.fin)}</small></div>
              <div style={{ minWidth: 0 }}><b>{e.cliente}</b><span className="sub" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.propiedad}{esAdmin && e.agente ? ` · ${e.agente}` : ''}</span></div><BadgeEstado estado={e.estado}/></div>)}</div></div>
        <div className="cd"><div className="cd-h"><h3>Próximas citas</h3><button className="btn ghost sm" onClick={() => ir('citas')}>Ver todas <ArrowRight size={14}/></button></div>
          <div className="cd-b sin">{d.proximas_citas.length === 0 ? <p style={{ padding: 22, color: 'var(--p-muted)' }}>Sin citas próximas.</p> :
            d.proximas_citas.map(c => <div key={c.id_solicitud} className="agenda-it" style={{ gridTemplateColumns: '90px 1fr auto' }}><div className="hora-t">{fechaCorta(c.fecha_contacto).slice(0, -5)}<small>{horaDe(c.fecha_contacto)}</small></div>
              <div style={{ minWidth: 0 }}><b>{c.cliente}</b><span className="sub" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.propiedad}{esAdmin && c.agente ? ` · ${c.agente}` : ''}</span></div><BadgeEstado estado={c.estado}/></div>)}</div></div>
        {an && <div className="cd"><div className="cd-h"><h3>Solicitudes de citas · últimos 30 días</h3><span>{an.embudo.citas} solicitudes{an.cumplimiento !== null ? ` · ${an.cumplimiento}% cumplimiento` : ''}</span></div>
          <div className="cd-b"><LineaTiempo datos={an.serie} series={[{ clave: 'solicitudes', nombre: 'Solicitudes', color: '#18488e' }, { clave: 'atendidas', nombre: 'Atendidas', color: '#1c8c5e' }, { clave: 'canceladas', nombre: 'Canceladas', color: '#c0392b' }]}/></div></div>}
      </div>
      <div className="apilar">
        <div className="cd"><div className="cd-h"><h3>Inventario por estado</h3><span>{d.propiedades} inmuebles</span></div><div className="cd-b">
          <Apilada segmentos={ESTADOS_INMUEBLE.map(e => ({ nombre: cap(e), valor: d.propiedades_por_estado.find(x => x.estado === e)?.total || 0, color: COLOR_ESTADO[e] }))}/>
          <h4 style={{ fontSize: 12, margin: '20px 0 4px', textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--p-muted)' }}>Por tipo</h4>
          <BarrasLista items={d.propiedades_por_tipo.map(t => ({ nombre: t.tipo, valor: t.total }))}/></div></div>
        {esAdmin && rep && <div className="cd"><div className="cd-h"><h3>Carga de asesores</h3></div><div className="cd-b"><BarrasLista items={rep.agentes.map(a => ({ nombre: a.nombre, valor: a.citas }))} vacio="Sin asesores registrados" formato={v => `${v} pend.`}/></div></div>}
        {aud && <div className="cd"><div className="cd-h"><h3>Actividad reciente</h3><button className="btn ghost sm" onClick={() => ir('auditoria')}>Ver todo</button></div>
          <div className="cd-b sin">{aud.slice(0, 6).map(a => <div key={a.id_auditoria} style={{ padding: '10px 18px', borderTop: '1px solid var(--p-borde2)', fontSize: 13 }}><b>{a.usuario || 'Sistema'}</b> · {a.accion} {a.entidad}<span className="sub">{fechaCorta(a.creada_en)} {horaDe(a.creada_en)}{a.detalle ? ' · ' + a.detalle.slice(0, 60) : ''}</span></div>)}
            {!aud.length && <p style={{ padding: 18, color: 'var(--p-muted)' }}>Sin actividad registrada.</p>}</div></div>}
      </div>
    </div>
  </div>;
}
