import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { api, descargar, dinero, cap } from '../api.js';
import { Cargando, usePeticion, useToast } from '../ui.jsx';
import { LineaTiempo, BarrasLista, Embudo, Apilada } from '../charts.jsx';
import { Cab } from './Shell.jsx';

const Stat = ({ t, v, s }) => <div className="stat"><label>{t}</label><b>{v}</b>{s && <small>{s}</small>}</div>;

function Analisis() {
  const [dias, setDias] = useState(30);
  const r = usePeticion(() => api('/atencion/analisis?dias=' + dias), [dias]);
  const d = r.datos;
  return <div>
    <div className="herr"><label className="campo" style={{ flexDirection: 'row', alignItems: 'center' }}>Periodo<select className="input" style={{ width: 'auto' }} value={dias} onChange={e => setDias(Number(e.target.value))}>{[[7, 'Últimos 7 días'], [30, 'Últimos 30 días'], [90, 'Últimos 90 días'], [365, 'Último año']].map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label></div>
    {r.cargando || !d ? <Cargando/> : <>
      <div className="stats">
        <Stat t="Búsquedas" v={d.embudo.busquedas} s="realizadas en el asistente"/><Stat t="Interesados" v={d.embudo.interesados} s="dejaron sus datos"/>
        <Stat t="Citas solicitadas" v={d.embudo.citas}/><Stat t="Cumplimiento" v={d.cumplimiento === null ? '—' : d.cumplimiento + '%'} s="atendidas / (atendidas + canceladas)"/></div>
      <div className="cols c21">
        <div className="apilar">
          <div className="cd"><div className="cd-h"><h3>Solicitudes de citas por día</h3></div><div className="cd-b"><LineaTiempo datos={d.serie} series={[{ clave: 'solicitudes', nombre: 'Solicitudes', color: '#18488e' }, { clave: 'atendidas', nombre: 'Atendidas', color: '#1c8c5e' }, { clave: 'canceladas', nombre: 'Canceladas', color: '#c0392b' }]}/></div></div>
          <div className="cd"><div className="cd-h"><h3>Embudo comercial</h3><span>De la búsqueda a la cita atendida</span></div><div className="cd-b">
            <Embudo pasos={[{ nombre: 'Búsquedas', valor: d.embudo.busquedas }, { nombre: 'Interesados', valor: d.embudo.interesados }, { nombre: 'Citas solicitadas', valor: d.embudo.citas }, { nombre: 'Citas atendidas', valor: Number(d.embudo.atendidas) }]}/></div></div>
        </div>
        <div className="apilar">
          <div className="cd"><div className="cd-h"><h3>Demanda por tipo de inmueble</h3></div><div className="cd-b"><BarrasLista items={d.porTipo.map(t => ({ nombre: t.nombre, valor: t.total }))}/></div></div>
          <div className="cd"><div className="cd-h"><h3>Zonas más buscadas</h3></div><div className="cd-b"><BarrasLista items={d.porZona.map(t => ({ nombre: t.nombre, valor: t.total }))} color="#1689a9"/></div></div>
          <div className="cd"><div className="cd-h"><h3>Compra vs. arriendo</h3></div><div className="cd-b">
            {d.porModalidad.length ? d.porModalidad.map(m => <div key={m.nombre} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--p-borde2)' }}><span>{cap(m.nombre)} <span className="sub" style={{ display: 'inline' }}>· {m.total} búsquedas</span></span><b>{dinero(m.presupuesto_promedio)} <span style={{ fontWeight: 400, color: 'var(--p-muted)', fontSize: 12 }}>prom.</span></b></div>) : <p style={{ color: 'var(--p-muted)' }}>Sin búsquedas en el periodo.</p>}</div></div>
          <div className="cd"><div className="cd-h"><h3>Inventario por tipo</h3></div><div className="cd-b"><BarrasLista items={d.inventario.map(i => ({ nombre: i.nombre, valor: i.disponibles }))} color="#0b2650" formato={v => v + ' disp.'}/></div></div>
        </div></div></>}
  </div>;
}

function Atencion({ usuario }) {
  const toast = useToast();
  const [rango, setRango] = useState({ desde: '', hasta: '' });
  const q = rango.desde && rango.hasta ? `?desde=${rango.desde}&hasta=${rango.hasta}` : '';
  const r = usePeticion(() => api('/atencion/reportes' + q), [q]);
  const d = r.datos;
  return <div>
    <div className="herr"><label className="campo" style={{ flexDirection: 'row', alignItems: 'center' }}>Desde<input className="input" style={{ width: 'auto' }} type="date" value={rango.desde} onChange={e => setRango({ ...rango, desde: e.target.value })}/></label>
      <label className="campo" style={{ flexDirection: 'row', alignItems: 'center' }}>Hasta<input className="input" style={{ width: 'auto' }} type="date" value={rango.hasta} onChange={e => setRango({ ...rango, hasta: e.target.value })}/></label>
      {q && <button className="btn ghost sm" onClick={() => setRango({ desde: '', hasta: '' })}>Quitar rango</button>}<span className="grow"/>
      {usuario.rol === 'Administrador' && <button className="btn sec" onClick={() => descargar('/atencion/reportes/citas.csv', 'citas-epresedi.csv').catch(e => toast(e.message, 'error'))}><Download size={15}/> Exportar citas (CSV)</button>}</div>
    {r.cargando || !d ? <Cargando/> : <>
      <div className="stats"><Stat t="Citas en el periodo" v={d.total.citas}/><Stat t="Pendientes" v={d.total.pendientes}/><Stat t="Clientes atendidos" v={d.total.clientes_atendidos}/><Stat t="Interesados registrados" v={d.total.interesados}/></div>
      <div className="cols c11">
        <div className="cd"><div className="cd-h"><h3>Carga por asesor</h3></div><div className="cd-b"><BarrasLista items={d.agentes.map(a => ({ nombre: a.nombre, valor: a.citas + a.atendidas }))} formato={v => v + ' citas'}/></div></div>
        <div className="cd"><div className="cd-h"><h3>Inmuebles más consultados</h3></div><div className="cd-b"><BarrasLista items={d.propiedades.filter(p => p.consultas > 0).map(p => ({ nombre: p.direccion, valor: p.consultas }))} color="#1689a9" vacio="Aún no hay consultas registradas"/></div></div>
      </div>
      <div className="cd" style={{ marginTop: 18 }}><div className="cd-h"><h3>Citas por estado</h3></div><div className="cd-b">
        <Apilada segmentos={['programada', 'reprogramada', 'atendida', 'cancelada'].map(e => ({ nombre: cap(e), valor: d.porEstado.find(x => x.estado === e)?.total || 0, color: { programada: '#1f5fb4', reprogramada: '#d38a0a', atendida: '#1c8c5e', cancelada: '#9aa8ba' }[e] }))}/></div></div></>}
  </div>;
}

export default function Reportes({ usuario }) {
  const [tab, setTab] = useState('analisis');
  return <div>
    <Cab titulo="Reportes y análisis" sub="Clientes atendidos, citas, demanda de inmuebles y carga de los asesores"/>
    <div className="tabs"><button className={tab === 'analisis' ? 'on' : ''} onClick={() => setTab('analisis')}>Análisis de demanda</button><button className={tab === 'atencion' ? 'on' : ''} onClick={() => setTab('atencion')}>Reporte de atención</button></div>
    {tab === 'analisis' ? <Analisis/> : <Atencion usuario={usuario}/>}
  </div>;
}
