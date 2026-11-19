import React, { useState } from 'react';
import { Plus, X, Mail, Phone, Power, Pencil } from 'lucide-react';
import { api, DIAS, cap } from '../api.js';
import { Modal, Campo, Badge, Cargando, Vacio, usePeticion, useToast } from '../ui.jsx';

const ORDEN = [1, 2, 3, 4, 5, 6, 0];

function Nuevo({ onCerrar, onCreado }) {
  const toast = useToast();
  const [ocupado, setOcupado] = useState(false);
  async function enviar(e) {
    e.preventDefault(); setOcupado(true);
    try { await api('/atencion/agentes', { metodo: 'POST', cuerpo: Object.fromEntries(new FormData(e.currentTarget)) }); toast('Asesor registrado con horario base lunes a viernes'); onCreado(); }
    catch (err) { toast(err.message, 'error'); } finally { setOcupado(false); }
  }
  return <Modal titulo="Registrar asesor" subtitulo="Se crea su cuenta de acceso y un horario base (L-V, 8-12 y 14-18)" onCerrar={onCerrar}>
    <form onSubmit={enviar}><div className="rejilla-form">
      <Campo etiqueta="Nombre completo" className="completo"><input name="nombre" required/></Campo>
      <Campo etiqueta="Correo (para ingresar)"><input name="correo" type="email" required/></Campo><Campo etiqueta="Teléfono"><input name="telefono" required pattern="[0-9]{10}" placeholder="10 dígitos"/></Campo>
      <Campo etiqueta="Usuario"><input name="usuario" required/></Campo><Campo etiqueta="Contraseña inicial" ayuda="Mínimo 8 caracteres"><input name="password" type="password" minLength={8} required autoComplete="new-password"/></Campo></div>
      <div className="acciones-form"><button type="button" className="btn ghost" onClick={onCerrar}>Cancelar</button><button className="btn" disabled={ocupado}>Crear asesor</button></div></form></Modal>;
}

function Editar({ a, onCerrar, onGuardado }) {
  const toast = useToast();
  const [ocupado, setOcupado] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setOcupado(true);
    try {
      const datos = Object.fromEntries(new FormData(e.currentTarget));
      await api(`/atencion/agentes/${a.id_agente}`, { metodo: 'PUT', cuerpo: datos });
      toast('Datos del asesor actualizados');
      onGuardado();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setOcupado(false);
    }
  }

  return <Modal titulo="Editar asesor" subtitulo="Actualiza los datos básicos del asesor" onCerrar={onCerrar}>
    <form onSubmit={enviar}>
      <div className="rejilla-form">
        <Campo etiqueta="Nombre completo" className="completo">
          <input name="nombre" defaultValue={a.nombre} required maxLength={150}/>
        </Campo>
        <Campo etiqueta="Teléfono">
          <input name="telefono" defaultValue={a.telefono} required pattern="[0-9]{10}" maxLength={10}/>
        </Campo>
        <Campo etiqueta="Correo">
          <input value={a.correo || ''} disabled/>
        </Campo>
      </div>
      <div className="acciones-form">
        <button type="button" className="btn ghost" onClick={onCerrar}>Cancelar</button>
        <button className="btn" disabled={ocupado}>Guardar cambios</button>
      </div>
    </form>
  </Modal>;
}
function Tarjeta({ a, horarios, esAdmin, onCambio }) {
  const toast = useToast();
  const [f, setF] = useState({ dia_semana: 1, hora_inicio: '08:00', hora_fin: '12:00' });
  const [agregando, setAgregando] = useState(false);
  const [editando, setEditando] = useState(false);
  const accion = async (fn, ok) => { try { await fn(); if (ok) toast(ok); onCambio(); } catch (e) { toast(e.message, 'error'); } };
  return <div className="tarjeta tarjeta-pad" style={{ opacity: a.activo ? 1 : .7 }}>
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div className="avatar" style={{ background: 'var(--azul-50)', width: 48, height: 48, fontWeight: 700, fontSize: 18 }}>{a.nombre[0]}</div>
      <div style={{ flex: 1, minWidth: 200 }}><h3 style={{ fontSize: 17 }}>{a.nombre} {a.activo ? <Badge tono="ok">Activo</Badge> : <Badge tono="muted">Inactivo</Badge>}</h3>
        <p style={{ color: 'var(--muted)', fontSize: 13.5, marginTop: 6, display: 'flex', gap: 16, flexWrap: 'wrap' }}><span><Mail size={13} style={{ verticalAlign: -2 }}/> {a.correo}</span><span><Phone size={13} style={{ verticalAlign: -2 }}/> {a.telefono}</span><span>{a.citas_pendientes} citas pendientes</span></p></div>
      {esAdmin && <button className="btn sm sec" onClick={() => setEditando(true)}><Pencil size={14}/> Editar</button>}
      {esAdmin && <button className="btn sm sec" onClick={() => accion(() => api(`/atencion/agentes/${a.id_agente}/activo`, { metodo: 'PATCH', cuerpo: { activo: !a.activo } }), a.activo ? 'Asesor desactivado: no recibirá nuevas citas' : 'Asesor activado')}><Power size={14}/> {a.activo ? 'Desactivar' : 'Activar'}</button>}
    </div>
    <h4 style={{ fontSize: 13, margin: '18px 0 10px', color: '#41607f', textTransform: 'uppercase', letterSpacing: '.06em' }}>Disponibilidad semanal</h4>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10 }}>
      {ORDEN.map(d => { const fr = horarios.filter(h => h.dia_semana === d); return <div key={d} style={{ background: 'var(--bg)', borderRadius: 10, padding: 10, minHeight: 66 }}>
        <b style={{ fontSize: 13 }}>{cap(DIAS[d])}</b>
        {fr.length === 0 ? <div style={{ color: '#9ab', fontSize: 12.5, marginTop: 6 }}>No atiende</div> : fr.map(h => <div key={h.id_horario} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, marginTop: 5 }}>
          <span>{h.hora_inicio}–{h.hora_fin}</span>{esAdmin && <button className="btn ghost icono" style={{ padding: 2 }} aria-label="Quitar franja" onClick={() => accion(() => api('/atencion/agentes/horarios/' + h.id_horario, { metodo: 'DELETE' }), 'Franja eliminada')}><X size={14}/></button>}</div>)}</div>; })}
    </div>
    {esAdmin && (agregando
      ? <form className="rejilla-form" style={{ gridTemplateColumns: 'repeat(4,1fr) auto', alignItems: 'end', marginTop: 14 }} onSubmit={e => { e.preventDefault(); accion(() => api('/atencion/agentes/horarios', { metodo: 'POST', cuerpo: { fk_agente: a.id_agente, ...f } }), 'Franja agregada').then(() => setAgregando(false)); }}>
          <Campo etiqueta="Día"><select value={f.dia_semana} onChange={e => setF({ ...f, dia_semana: Number(e.target.value) })}>{ORDEN.map(d => <option key={d} value={d}>{cap(DIAS[d])}</option>)}</select></Campo>
          <Campo etiqueta="Desde"><input type="time" required value={f.hora_inicio} onChange={e => setF({ ...f, hora_inicio: e.target.value })}/></Campo>
          <Campo etiqueta="Hasta"><input type="time" required value={f.hora_fin} onChange={e => setF({ ...f, hora_fin: e.target.value })}/></Campo>
          <div/><div style={{ display: 'flex', gap: 8 }}><button className="btn">Guardar</button><button type="button" className="btn ghost" onClick={() => setAgregando(false)}>Cancelar</button></div></form>
      : <button className="btn sm suave" style={{ marginTop: 14 }} onClick={() => setAgregando(true)}><Plus size={14}/> Agregar franja</button>)}
    {editando && <Editar a={a} onCerrar={() => setEditando(false)} onGuardado={() => { setEditando(false); onCambio(); }}/ >}
  </div>;
}

export default function Asesores({ usuario }) {
  const esAdmin = usuario.rol === 'Administrador';
  const [nuevo, setNuevo] = useState(false);
  const r = usePeticion(() => Promise.all([api('/atencion/agentes/detalle'), api('/atencion/agentes/horarios')]), []);
  return <div>
    <div className="ph"><div><h1>{esAdmin ? 'Asesores y disponibilidad' : 'Mi disponibilidad'}</h1><p>La asignación automática de citas solo usa estas franjas. Cada cita dura 1 hora.</p></div>
      {esAdmin && <button className="btn" onClick={() => setNuevo(true)}><Plus size={17}/> Registrar asesor</button>}</div>
    {r.cargando ? <Cargando/> : r.error ? <div className="aviso error">{r.error}</div> : r.datos[0].length === 0 ? <Vacio titulo="Todavía no hay asesores" texto="Registra al primero para empezar a recibir citas."/> :
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>{r.datos[0].map(a => <Tarjeta key={a.id_agente} a={a} horarios={r.datos[1].filter(h => h.fk_agente === a.id_agente)} esAdmin={esAdmin} onCambio={r.recargar}/>)}</div>}
    {nuevo && <Nuevo onCerrar={() => setNuevo(false)} onCreado={() => { setNuevo(false); r.recargar(); }}/>}
  </div>;
}




