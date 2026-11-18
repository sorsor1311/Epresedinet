import React from 'react';
import { Building2, FileText } from 'lucide-react';
import { api, dinero, fechaCorta, cap, ESTADOS_INMUEBLE, precioInmueble } from '../api.js';
import { usePeticion, Cargando, Vacio, BadgeEstado, FotoInmueble } from '../ui.jsx';
import { Apilada } from '../charts.jsx';
import Tabla from './Tabla.jsx';
import { Cab } from './Shell.jsx';

const COLOR = { disponible: '#1c8c5e', reservada: '#d38a0a', arrendada: '#1f5fb4', vendida: '#0b2650', inactiva: '#9aa8ba' };
const Stat = ({ t, v, s }) => <div className="stat"><label>{t}</label><b>{v}</b>{s && <small>{s}</small>}</div>;

export function PropietarioResumen({ ir }) {
  const r = usePeticion(() => Promise.all([api('/portal/propietario/resumen'), api('/portal/propietario/propiedades')]), []);
  if (r.cargando) return <Cargando/>;
  if (r.error) return <div className="aviso error">{r.error}</div>;
  const [d, props] = r.datos;
  return <div>
    <Cab titulo={`Hola, ${d.propietario}`} sub="Así van tus inmuebles con EPRESEDI"/>
    <div className="stats"><Stat t="Mis inmuebles" v={d.inmuebles} s={`${d.disponibles} disponibles`}/><Stat t="Consultas (30 días)" v={d.consultas_30d} s="personas vieron tus inmuebles"/>
      <Stat t="Citas pendientes" v={d.citas_pendientes} s="visitas por realizarse"/><Stat t="Recaudado" v={dinero(d.recaudado)} s="pagos de tus contratos"/></div>
    <div className="cols c21">
      <div className="cd"><div className="cd-h"><h3>Mis inmuebles</h3><button className="btn ghost sm" onClick={() => ir('inmuebles')}>Ver detalle</button></div>
        <div className="cd-b sin">{props.length === 0 ? <Vacio icono={Building2} titulo="Aún no tienes inmuebles registrados" texto="Cuando EPRESEDI registre tus inmuebles aparecerán aquí."/> :
          props.slice(0, 4).map(p => <div className="agenda-it" key={p.id_propiedad} style={{ gridTemplateColumns: '1fr auto' }}><div><b>{p.direccion}</b><span className="sub">{p.tipo_nombre} · {p.zona || '—'}</span></div><BadgeEstado estado={p.estado}/></div>)}</div></div>
      <div className="cd"><div className="cd-h"><h3>Estado de mi portafolio</h3></div><div className="cd-b">
        <Apilada segmentos={ESTADOS_INMUEBLE.map(e => ({ nombre: cap(e), valor: d.por_estado.find(x => x.estado === e)?.total || 0, color: COLOR[e] }))}/></div></div>
    </div></div>;
}

export function PropietarioInmuebles() {
  const r = usePeticion(() => api('/portal/propietario/propiedades'), []);
  if (r.cargando) return <Cargando/>;
  return <div>
    <Cab titulo="Mis inmuebles" sub="Estado y visibilidad de cada inmueble"/>
    <div className="cd">{r.datos.length === 0 ? <Vacio icono={Building2} titulo="Aún no tienes inmuebles registrados"/> : r.datos.map(p => { const x = precioInmueble(p); return <div className="inm-prop" key={p.id_propiedad}>
      <div className="foto"><FotoInmueble propiedad={p} tipo={p.tipo_nombre}/></div>
      <div><div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}><b style={{ fontSize: 15 }}>{p.direccion}</b><BadgeEstado estado={p.estado}/></div>
        <span className="sub">{p.tipo_nombre} · {p.zona || '—'}{p.area_m2 ? ` · ${Number(p.area_m2)} m²` : ''}</span>
        <div className="mini-datos"><div><b>{p.consultas_30d}</b>consultas 30 días</div><div><b>{p.citas_pendientes}</b>citas pendientes</div><div><b>{p.solicitudes_total}</b>solicitudes totales</div></div></div>
      <div style={{ textAlign: 'right' }}>{x.venta && <div><b>{dinero(x.venta)}</b><span className="sub">venta</span></div>}{x.arriendo && <div><b>{dinero(x.arriendo)}</b><span className="sub">arriendo / mes</span></div>}</div></div>; })}</div></div>;
}

export function PropietarioContratos() {
  const r = usePeticion(() => api('/portal/propietario/contratos'), []);
  return <div>
    <Cab titulo="Contratos y pagos" sub="Contratos de tus inmuebles y lo recaudado en cada uno"/>
    <Tabla cargando={r.cargando} filas={r.datos} vacio="Aún no hay contratos registrados para tus inmuebles" buscable={false}
      columnas={[{ t: '#', f: c => c.id_contrato }, { t: 'Inmueble', f: c => c.propiedad }, { t: 'Cliente', f: c => c.cliente }, { t: 'Vigencia', f: c => `${fechaCorta(c.fecha_inicio)} → ${fechaCorta(c.fecha_final)}` },
        { t: 'Valor', f: c => dinero(c.valor_total) }, { t: 'Pagado', f: c => <>{dinero(c.pagado)}<span className="sub">{Math.min(100, Math.round((c.pagado / c.valor_total) * 100))}% del contrato</span></> }]}/>
  </div>;
}
