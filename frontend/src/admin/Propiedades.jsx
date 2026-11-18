import React, { useState } from 'react';
import { Database, Pencil, Archive, Plus, Trash2, Upload, X, Copy, Check, Info } from 'lucide-react';
import { api, subir, dinero, ESTADOS_INMUEBLE, cap, precioInmueble, urlFoto } from '../api.js';
import { Modal, Campo, Badge, BadgeEstado, FotoInmueble, usePeticion, useToast } from '../ui.jsx';
import Tabla from './Tabla.jsx';
import { Cab } from './Shell.jsx';

const EJEMPLO = `CALL sp_registrar_propiedad(
  'Apartamento',                 -- Casa | Apartamento | Lote | Local
  'propietario@correo.com',      -- correo del propietario
  'Calle 10 # 25-40, Medellín',  -- dirección
  'El Poblado',                  -- zona / barrio / municipio
  3, 2, 78.50,                   -- habitaciones, baños, área m²
  380000000, 0,                  -- precio venta, precio arriendo (0 si no aplica)
  'https://.../foto.jpg',        -- foto de portada (o NULL)
  'Descripción del inmueble.'
);
CALL sp_agregar_foto(ID_DEL_INMUEBLE, 'https://.../otra-foto.jpg', 2);`;

function GuiaBD({ onCerrar }) {
  const [ok, setOk] = useState(false);
  return <Modal titulo="Carga de inmuebles por base de datos" subtitulo="Procedimiento almacenado con validaciones" onCerrar={onCerrar} ancho={680}>
    <p style={{ fontSize: 14, lineHeight: 1.6, color: '#3d5775', marginBottom: 12 }}>Los inmuebles pueden registrarse con <code>sp_registrar_propiedad</code>. La base de datos valida precios, estado, área y enlaces de fotos. Plantilla completa: <code>database/02_catalogo_inicial.sql</code>.</p>
    <div style={{ position: 'relative' }}><pre style={{ background: '#0b2650', color: '#d9e8f8', padding: 16, borderRadius: 8, fontSize: 12.5, overflow: 'auto', margin: 0 }}>{EJEMPLO}</pre>
      <button className="btn sm sec" style={{ position: 'absolute', top: 10, right: 10 }} onClick={() => { navigator.clipboard?.writeText(EJEMPLO); setOk(true); setTimeout(() => setOk(false), 2000); }}>{ok ? <Check size={14}/> : <Copy size={14}/>} {ok ? 'Copiado' : 'Copiar'}</button></div>
  </Modal>;
}

function Fotos({ p, onCambio }) {
  const toast = useToast();
  const [subiendo, setSubiendo] = useState(false);
  const [url, setUrl] = useState('');
  async function enviar(archivos, urls = []) {
    const f = new FormData(); [...archivos].forEach(a => f.append('fotos', a)); urls.forEach(u => f.append('urls', u));
    setSubiendo(true);
    try { await subir(`/propiedades/${p.id_propiedad}/fotos`, f); toast('Fotos agregadas'); setUrl(''); onCambio(); } catch (e) { toast(e.message, 'error'); } finally { setSubiendo(false); }
  }
  return <div>
    <h4 style={{ fontSize: 13, margin: '0 0 10px' }}>Fotografías ({p.fotos?.length || 0})</h4>
    <div className="fotos-grid">{(p.fotos || []).map(f => <div className="foto-it" key={f}><img src={urlFoto(f)} alt=""/>
      <button type="button" aria-label="Quitar foto" onClick={async () => { try { const fila = (p.fotos_ids || []).find(x => x.url === f); await api(`/propiedades/${p.id_propiedad}/fotos/${fila.id_foto}`, { metodo: 'DELETE' }); toast('Foto eliminada'); onCambio(); } catch (e) { toast(e.message, 'error'); } }}><X size={14}/></button></div>)}</div>
    <label className="zona-subida" style={{ display: 'block', marginTop: 12, cursor: 'pointer' }}><Upload size={18} style={{ verticalAlign: -4 }}/> {subiendo ? 'Subiendo…' : 'Arrastra o selecciona imágenes (JPG, PNG o WebP · máx. 5 MB)'}
      <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden disabled={subiendo} onChange={e => e.target.files.length && enviar(e.target.files)}/></label>
    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}><input className="input" type="url" placeholder="…o pega el enlace de una foto (https://)" value={url} onChange={e => setUrl(e.target.value)}/><button type="button" className="btn sec" disabled={!/^https?:\/\//.test(url) || subiendo} onClick={() => enviar([], [url])}>Agregar</button></div>
  </div>;
}

function Formulario({ inicial, tipos, propietarios, onCerrar, onGuardado }) {
  const toast = useToast();
  const [p, setP] = useState(inicial);
  const [ocupado, setOcupado] = useState(false);
  const refrescar = async () => { const [x, fs] = await Promise.all([api('/propiedades/' + p.id_propiedad), api('/propiedades')]); const fila = fs.find(y => y.id_propiedad === p.id_propiedad); setP({ ...fila, ...x }); onGuardado(false); };
  async function guardar(e) {
    e.preventDefault(); setOcupado(true);
    const f = Object.fromEntries(new FormData(e.currentTarget));
    const num = k => f[k] === '' ? null : Number(f[k]);
    const cuerpo = { direccion: f.direccion, zona: f.zona || null, habitaciones: num('habitaciones'), banos: num('banos'), parqueaderos: num('parqueaderos'), area_m2: num('area_m2'),
      precio_venta: Number(f.precio_venta || 0), precio_arrendamiento: Number(f.precio_arrendamiento || 0), descripcion: f.descripcion || null, estado: f.estado || 'disponible',
      fk_tipo_propiedad: Number(f.fk_tipo_propiedad), fk_propietario: Number(f.fk_propietario) };
    try {
      if (p.id_propiedad) { await api('/propiedades/' + p.id_propiedad, { metodo: 'PUT', cuerpo }); toast('Inmueble actualizado'); onGuardado(true); }
      else { const r = await api('/propiedades', { metodo: 'POST', cuerpo }); toast('Inmueble creado. Ahora puedes agregar sus fotos.'); const nuevo = { ...cuerpo, id_propiedad: r.id_propiedad, fotos: [] }; setP(nuevo); onGuardado(false); }
    } catch (err) { toast(err.message, 'error'); } finally { setOcupado(false); }
  }
  const v = k => p[k] ?? '';
  return <Modal titulo={p.id_propiedad ? `Inmueble #${p.id_propiedad}` : 'Nuevo inmueble'} subtitulo={p.direccion || 'Completa los datos principales'} onCerrar={onCerrar} ancho={760}>
    <form onSubmit={guardar}><div className="rejilla-form">
      <Campo etiqueta="Tipo de inmueble"><select name="fk_tipo_propiedad" required defaultValue={v('fk_tipo_propiedad')}><option value="">Selecciona…</option>{Object.entries(tipos).map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select></Campo>
      <Campo etiqueta="Propietario"><select name="fk_propietario" required defaultValue={v('fk_propietario')}><option value="">Selecciona…</option>{propietarios.map(x => <option key={x.id_propietario} value={x.id_propietario}>{x.nombre}</option>)}</select></Campo>
      <Campo etiqueta="Dirección" className="completo"><input name="direccion" required defaultValue={v('direccion')} maxLength={150}/></Campo>
      <Campo etiqueta="Zona / barrio / municipio"><input name="zona" defaultValue={v('zona')}/></Campo>
      <Campo etiqueta="Estado"><select name="estado" defaultValue={v('estado') || 'disponible'}>{ESTADOS_INMUEBLE.map(e => <option key={e} value={e}>{cap(e)}</option>)}</select></Campo>
      <Campo etiqueta="Precio de venta (COP)" ayuda="0 si no está en venta"><input name="precio_venta" type="number" min="0" step="any" defaultValue={v('precio_venta')}/></Campo>
      <Campo etiqueta="Canon de arriendo (COP)" ayuda="0 si no está en arriendo"><input name="precio_arrendamiento" type="number" min="0" step="any" defaultValue={v('precio_arrendamiento')}/></Campo>
      <Campo etiqueta="Habitaciones"><input name="habitaciones" type="number" min="0" defaultValue={v('habitaciones')}/></Campo>
      <Campo etiqueta="Baños"><input name="banos" type="number" min="0" defaultValue={v('banos')}/></Campo>
      <Campo etiqueta="Parqueaderos"><input name="parqueaderos" type="number" min="0" defaultValue={v('parqueaderos')}/></Campo>
      <Campo etiqueta="Área (m²)"><input name="area_m2" type="number" min="0" step="any" defaultValue={v('area_m2')}/></Campo>
      <Campo etiqueta="Descripción" className="completo"><textarea name="descripcion" defaultValue={v('descripcion')}/></Campo></div>
      <div className="acciones-form"><button type="button" className="btn ghost" onClick={onCerrar}>{p.id_propiedad ? 'Cerrar' : 'Cancelar'}</button><button className="btn" disabled={ocupado}>{ocupado ? 'Guardando…' : p.id_propiedad ? 'Guardar cambios' : 'Crear inmueble'}</button></div></form>
    {p.id_propiedad && <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--p-borde)' }}><Fotos p={p} onCambio={refrescar}/></div>}
  </Modal>;
}

export default function Propiedades({ usuario }) {
  const toast = useToast();
  const esAdmin = usuario.rol === 'Administrador';
  const [estado, setEstado] = useState('');
  const [tipo, setTipo] = useState('');
  const [guia, setGuia] = useState(false);
  const [form, setForm] = useState(null);
  const r = usePeticion(() => Promise.all([api('/propiedades'), api('/tipos-propiedad'), api('/config'), esAdmin ? api('/propietarios') : Promise.resolve([])]), []);
  const tipos = Object.fromEntries((r.datos?.[1] || []).map(t => [t.id_tipo_propiedad, t.nombre]));
  const alta = r.datos?.[2]?.alta_inmuebles_admin;
  const filas = (r.datos?.[0] || []).filter(p => (!estado || p.estado === estado) && (!tipo || String(p.fk_tipo_propiedad) === tipo));
  async function cambiarEstado(p, nuevo) { try { await api('/propiedades/' + p.id_propiedad, { metodo: 'PUT', cuerpo: { estado: nuevo } }); toast(`Inmueble marcado como ${nuevo}`); r.recargar(); } catch (e) { toast(e.message, 'error'); } }
  async function eliminar(p) {
    if (!window.confirm(`¿Eliminar definitivamente "${p.direccion}"? Si tiene contratos o citas no se podrá; en ese caso márcalo como inactivo.`)) return;
    try { await api('/propiedades/' + p.id_propiedad, { metodo: 'DELETE' }); toast('Inmueble eliminado'); r.recargar(); } catch (e) { toast(e.message, 'error'); }
  }
  async function abrirEdicion(p) {
    // trae los ids de foto para poder quitarlas
    const d = await api('/propiedades/' + p.id_propiedad).catch(() => p);
    setForm({ ...p, ...d });
  }
  return <div>
    <Cab titulo="Inventario de propiedades" sub="Casas, apartamentos, lotes y locales">
      {esAdmin && <button className="btn sec" onClick={() => setGuia(true)}><Database size={16}/> Carga por base de datos</button>}
      {esAdmin && alta && <button className="btn" onClick={() => setForm({})}><Plus size={16}/> Nuevo inmueble</button>}</Cab>
    {esAdmin && !alta && <div className="aviso" style={{ marginBottom: 16 }}><Info size={18}/><div>Los inmuebles se registran <b>directamente en la base de datos</b>. Desde aquí puedes actualizar su estado, precios y datos. Para habilitar el alta desde este panel (con fotos) define <code>PERMITIR_ALTA_INMUEBLES_ADMIN=true</code> en <code>backend/.env</code>.</div></div>}
    <Tabla cargando={r.cargando} filas={filas} vacio="No hay inmuebles registrados."
      herramientas={<><select className="input" style={{ width: 'auto' }} value={tipo} onChange={e => setTipo(e.target.value)} aria-label="Tipo"><option value="">Todos los tipos</option>{Object.entries(tipos).map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select>
        <select className="input" style={{ width: 'auto' }} value={estado} onChange={e => setEstado(e.target.value)} aria-label="Estado"><option value="">Todos los estados</option>{ESTADOS_INMUEBLE.map(e => <option key={e} value={e}>{cap(e)}</option>)}</select></>}
      columnas={[
        { t: '#', f: p => p.id_propiedad },
        { t: 'Inmueble', f: p => <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><div className="inm-foto" style={{ width: 54, height: 40, borderRadius: 5, flex: 'none', aspectRatio: 'auto' }}><FotoInmueble propiedad={p} tipo={tipos[p.fk_tipo_propiedad]}/></div><div><b>{p.direccion}</b><span className="sub">{p.zona || '—'}{p.area_m2 ? ` · ${Number(p.area_m2)} m²` : ''}</span></div></div> },
        { t: 'Tipo', f: p => <Badge>{tipos[p.fk_tipo_propiedad]}</Badge> },
        ...(usuario.rol !== 'Propietario' ? [{ t: 'Propietario', f: p => p.propietario_nombre || '—' }] : []),
        { t: 'Precio', f: p => { const x = precioInmueble(p); return <>{x.venta && <div>{dinero(x.venta)} <span className="sub" style={{ display: 'inline' }}>venta</span></div>}{x.arriendo && <div>{dinero(x.arriendo)} <span className="sub" style={{ display: 'inline' }}>/ mes</span></div>}</>; } },
        { t: 'Estado', f: p => esAdmin ? <select className="sel-estado" value={p.estado} onChange={e => cambiarEstado(p, e.target.value)} aria-label={'Estado de ' + p.direccion}>{ESTADOS_INMUEBLE.map(e => <option key={e} value={e}>{cap(e)}</option>)}</select> : <BadgeEstado estado={p.estado}/> }]}
      acciones={esAdmin ? p => <><button className="btn sm sec" onClick={() => abrirEdicion(p)}><Pencil size={13}/> Editar</button> {p.estado !== 'inactiva' && <button className="btn sm ghost" title="Dar de baja (inactiva)" onClick={() => window.confirm('¿Dar de baja este inmueble? Dejará de mostrarse a los clientes.') && cambiarEstado(p, 'inactiva')}><Archive size={14}/></button>} <button className="btn sm ghost" title="Eliminar" onClick={() => eliminar(p)}><Trash2 size={14}/></button></> : null}/>
    {guia && <GuiaBD onCerrar={() => setGuia(false)}/>}
    {form && <Formulario inicial={form} tipos={tipos} propietarios={r.datos[3]} onCerrar={() => { setForm(null); r.recargar(); }} onGuardado={cerrar => { r.recargar(); if (cerrar) setForm(null); }}/>}
  </div>;
}
