import React from 'react';
import { api } from '../api.js';
import { usePeticion, useToast } from '../ui.jsx';
import { Cab } from './Shell.jsx';
export default function SolicitudesServicios() {
  const r = usePeticion(() => api('/atencion/servicios'), []);
  const toast = useToast();
  async function cambiar(id, estado) {
    try { await api('/atencion/servicios/' + id, {metodo:'PATCH', cuerpo:{estado}}); r.recargar(); } catch(e) { toast(e.message,'error'); }
  }
  return <div><Cab titulo="Solicitudes de servicios" sub="Atención y seguimiento de clientes"/>{r.cargando && <p>Cargando…</p>}{r.error && <p>No se pudieron consultar las solicitudes. Verifica la instalación del módulo.</p>}{(r.datos || []).map(s => <article className="tarjeta tarjeta-pad" key={s.id} style={{marginBottom:12}}><h3>{s.servicio}</h3><p>{s.codigo} · {s.nombre}</p><p>{s.correo} · {s.telefono}</p><p>{s.detalle}</p><select className="input" value={s.estado} onChange={e => cambiar(s.id,e.target.value)}>{['pendiente','en atención','cerrada'].map(x => <option key={x}>{x}</option>)}</select></article>)}{!r.cargando && r.datos?.length === 0 && <p>No hay solicitudes.</p>}</div>;
}
