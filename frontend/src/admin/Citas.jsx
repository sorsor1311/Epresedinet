import React, { useState } from 'react';
import { api, fechaCorta, horaDe } from '../api.js';
import { BadgeEstado, usePeticion, useToast } from '../ui.jsx';
import Tabla from './Tabla.jsx';

export default function Citas({ usuario }) {
  const toast = useToast();
  const [estado, setEstado] = useState('');
  const r = usePeticion(() => api('/atencion/citas' + (estado ? '?estado=' + estado : '')), [estado]);
  async function cambiar(c, e) {
    if (e === 'cancelada' && !window.confirm('¿Cancelar esta cita? Se notificará al cliente.')) return;
    try { await api(`/atencion/citas/${c.id_solicitud}/estado`, { metodo: 'PATCH', cuerpo: { estado: e } }); toast('Estado actualizado'); r.recargar(); } catch (err) { toast(err.message, 'error'); }
  }
  return <div>
    <div className="ph"><div><h1>Solicitudes y citas</h1><p>{usuario.rol === 'Administrador' ? 'Todas las solicitudes de contacto registradas' : 'Las citas asignadas a ti'}</p></div></div>
    <Tabla cargando={r.cargando} filas={r.datos} vacio="Aún no hay solicitudes de clientes"
      herramientas={<select className="input" value={estado} onChange={e => setEstado(e.target.value)} aria-label="Filtrar por estado"><option value="">Todos los estados</option>{['programada', 'reprogramada', 'atendida', 'cancelada'].map(s => <option key={s} value={s}>{s}</option>)}</select>}
      columnas={[
        { t: 'Fecha', f: c => <>{fechaCorta(c.fecha_contacto)}<span className="sub">{horaDe(c.fecha_contacto)}</span></> },
        { t: 'Cliente', f: c => <><b>{c.cliente}</b><span className="sub">{c.correo}{c.telefono ? ' · ' + c.telefono : ''}</span></> },
        { t: 'Ocupación', f: c => c.ocupacion },
        { t: 'Inmueble', f: c => <>{c.propiedad}<span className="sub">{c.tipo}</span></> },
        { t: 'Asesor', f: c => c.agente || '—' },
        { t: 'Estado', f: c => <BadgeEstado estado={c.estado}/> }]}
      acciones={c => ['programada', 'reprogramada'].includes(c.estado) && <><button className="btn sm suave" onClick={() => cambiar(c, 'atendida')}>Atendida</button> <button className="btn sm peligro" onClick={() => cambiar(c, 'cancelada')}>Cancelar</button></>}/>
  </div>;
}
