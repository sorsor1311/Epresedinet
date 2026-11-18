import React, { useState } from 'react';
import { api } from '../api.js';
import { Campo, Cargando, usePeticion, useToast } from '../ui.jsx';
import { Cab } from './Shell.jsx';

/** Perfil y cambio de contraseña (todos los roles). */
export default function Perfil({ onActualizado, embebido = false }) {
  const toast = useToast();
  const r = usePeticion(() => api('/auth/me'), []);
  const [ocupado, setOcupado] = useState(false);
  if (r.cargando) return <Cargando/>;
  const p = r.datos, tienePerfil = p.rol !== 'Administrador';
  async function guardar(e) {
    e.preventDefault(); setOcupado(true);
    try { const d = await api('/auth/me', { metodo: 'PUT', cuerpo: Object.fromEntries(new FormData(e.currentTarget)) }); toast('Perfil actualizado'); onActualizado?.(d); r.recargar(); } catch (err) { toast(err.message, 'error'); } finally { setOcupado(false); }
  }
  async function clave(e) {
    e.preventDefault(); const f = e.currentTarget; const d = Object.fromEntries(new FormData(f));
    if (d.nueva !== d.repetir) return toast('Las contraseñas nuevas no coinciden', 'error');
    try { await api('/auth/password', { metodo: 'PUT', cuerpo: { actual: d.actual, nueva: d.nueva } }); toast('Contraseña actualizada'); f.reset(); } catch (err) { toast(err.message, 'error'); }
  }
  return <div>
    {!embebido && <Cab titulo="Mi perfil" sub={`${p.correo} · ${p.rol === 'Agente' ? 'Asesor' : p.rol}`}/>}
    <div className="cols c11" style={embebido ? { gridTemplateColumns: '1fr 1fr' } : undefined}>
      <div className="cd"><div className="cd-h"><h3>Datos personales</h3></div><form className="cd-b form-col" onSubmit={guardar}>
        <Campo etiqueta="Usuario"><input value={p.usuario} disabled/></Campo><Campo etiqueta="Correo electrónico"><input value={p.correo} disabled/></Campo>
        {tienePerfil && <><Campo etiqueta="Nombre completo"><input name="nombre" required defaultValue={p.nombre}/></Campo>
          <Campo etiqueta="Teléfono"><input name="telefono" required pattern="[0-9]{10}" defaultValue={p.telefono}/></Campo>
          {p.rol === 'Cliente' && <Campo etiqueta="Profesión"><input name="profesion" required defaultValue={p.profesion}/></Campo>}
          <div><button className="btn" disabled={ocupado}>Guardar cambios</button></div></>}
        {!tienePerfil && <p style={{ color: 'var(--muted)', fontSize: 13.5 }}>Las cuentas de administrador no tienen datos de perfil adicionales.</p>}</form></div>
      <div className="cd"><div className="cd-h"><h3>Cambiar contraseña</h3></div><form className="cd-b form-col" onSubmit={clave}>
        <Campo etiqueta="Contraseña actual"><input name="actual" type="password" required autoComplete="current-password"/></Campo>
        <Campo etiqueta="Nueva contraseña" ayuda="Mínimo 8 caracteres"><input name="nueva" type="password" minLength={8} required autoComplete="new-password"/></Campo>
        <Campo etiqueta="Repite la nueva contraseña"><input name="repetir" type="password" minLength={8} required autoComplete="new-password"/></Campo>
        <div><button className="btn">Actualizar contraseña</button></div></form></div>
    </div></div>;
}
