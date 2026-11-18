import React, { useState } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { api, fechaCorta } from '../api.js';
import { Modal, Campo, usePeticion, useToast } from '../ui.jsx';
import Tabla from './Tabla.jsx';
import { Cab } from './Shell.jsx';

const CFG = {
  propietarios: { titulo: 'Propietarios', sub: 'Dueños de los inmuebles. Cada propietario accede a su portal con su cuenta.', nuevo: 'Nuevo propietario', rol: 'propietarios', extra: false },
  clientes: { titulo: 'Clientes registrados', sub: 'Personas con cuenta en el sistema', nuevo: 'Nuevo cliente', rol: 'clientes', extra: true }
};

function Nuevo({ cfg, onCerrar, onCreado }) {
  const toast = useToast();
  const [ocupado, setOcupado] = useState(false);
  async function enviar(e) {
    e.preventDefault(); setOcupado(true);
    try { const r = await api('/' + cfg.rol, { metodo: 'POST', cuerpo: Object.fromEntries(new FormData(e.currentTarget)) }); toast(r.vinculado ? 'Cuenta vinculada a un registro existente' : 'Registro creado con su cuenta de acceso'); onCreado(); }
    catch (err) { toast(err.message, 'error'); } finally { setOcupado(false); }
  }
  return <Modal titulo={cfg.nuevo} subtitulo="Se crea el perfil junto con su cuenta de acceso" onCerrar={onCerrar}>
    <form onSubmit={enviar}><div className="rejilla-form">
      <Campo etiqueta="Nombre completo" className="completo"><input name="nombre" required/></Campo>
      <Campo etiqueta="Correo (para ingresar)"><input name="correo" type="email" required/></Campo><Campo etiqueta="Teléfono"><input name="telefono" required pattern="[0-9]{10}" placeholder="10 dígitos"/></Campo>
      {cfg.extra && <Campo etiqueta="Profesión" className="completo"><input name="profesion" required/></Campo>}
      <Campo etiqueta="Usuario"><input name="usuario" required/></Campo><Campo etiqueta="Contraseña inicial" ayuda="Mínimo 8 caracteres"><input name="password" type="password" minLength={8} required autoComplete="new-password"/></Campo></div>
      <div className="acciones-form"><button type="button" className="btn ghost" onClick={onCerrar}>Cancelar</button><button className="btn" disabled={ocupado}>Crear</button></div></form></Modal>;
}
function Editar({ cfg, fila, onCerrar, onGuardado }) {
  const toast = useToast();
  const id = fila.id_propietario || fila.id_cliente;
  async function enviar(e) {
    e.preventDefault();
    try { await api(`/${cfg.rol}/${id}`, { metodo: 'PUT', cuerpo: Object.fromEntries(new FormData(e.currentTarget)) }); toast('Datos actualizados'); onGuardado(); } catch (err) { toast(err.message, 'error'); }
  }
  return <Modal titulo="Editar datos" subtitulo={fila.correo} onCerrar={onCerrar}><form onSubmit={enviar}><div className="rejilla-form">
    <Campo etiqueta="Nombre" className="completo"><input name="nombre" required defaultValue={fila.nombre}/></Campo><Campo etiqueta="Teléfono"><input name="telefono" required pattern="[0-9]{10}" defaultValue={fila.telefono}/></Campo>
    {cfg.extra && <Campo etiqueta="Profesión"><input name="profesion" required defaultValue={fila.profesion}/></Campo>}</div>
    <div className="acciones-form"><button type="button" className="btn ghost" onClick={onCerrar}>Cancelar</button><button className="btn">Guardar</button></div></form></Modal>;
}

export default function Personas({ clave }) {
  const cfg = CFG[clave];
  const [nuevo, setNuevo] = useState(false), [edit, setEdit] = useState(null);
  const r = usePeticion(() => api('/' + cfg.rol), [clave]);
  return <div>
    <Cab titulo={cfg.titulo} sub={cfg.sub}><button className="btn" onClick={() => setNuevo(true)}><Plus size={16}/> {cfg.nuevo}</button></Cab>
    <Tabla cargando={r.cargando} filas={r.datos} vacio="Todavía no hay registros"
      columnas={[{ t: 'Nombre', f: p => <b>{p.nombre}</b> }, { t: 'Correo', f: p => p.correo || '—' }, { t: 'Teléfono', f: p => p.telefono }, ...(cfg.extra ? [{ t: 'Profesión', f: p => p.profesion }] : []), { t: 'Cuenta', f: p => (p.fk_usuario ? <span className="etq ok">Con acceso</span> : <span className="etq muted">Sin cuenta</span>) }]}
      acciones={p => <button className="btn sm sec" onClick={() => setEdit(p)}><Pencil size={13}/> Editar</button>}/>
    {nuevo && <Nuevo cfg={cfg} onCerrar={() => setNuevo(false)} onCreado={() => { setNuevo(false); r.recargar(); }}/>}
    {edit && <Editar cfg={cfg} fila={edit} onCerrar={() => setEdit(null)} onGuardado={() => { setEdit(null); r.recargar(); }}/>}
  </div>;
}
