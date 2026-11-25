import React, { useState } from 'react';
import { Pencil, Archive, Plus, Upload, X } from 'lucide-react';
import { api, subir, dinero, ESTADOS_INMUEBLE, cap, precioInmueble, urlFoto } from '../api.js';
import { Modal, Campo, MapaInmueble, Badge, BadgeEstado, FotoInmueble, usePeticion, useToast } from '../ui.jsx';
import Tabla from './Tabla.jsx';
import { Cab } from './Shell.jsx';

function Fotos({ p, onCambio }) {
  const toast = useToast();
  const [subiendo, setSubiendo] = useState(false);
  const [url, setUrl] = useState('');
  async function enviar(archivos, urls = []) {
    if ((p.fotos?.length || 0) + archivos.length + urls.length > 10) { toast('Máximo diez fotografías por inmueble', 'error'); return; }
    const f = new FormData(); [...archivos].forEach(a => f.append('fotos', a)); urls.forEach(u => f.append('urls', u));
    setSubiendo(true);
    try { await subir(`/propiedades/${p.id_propiedad}/fotos`, f); toast('Fotos agregadas'); setUrl(''); onCambio(); } catch (e) { toast(e.message, 'error'); } finally { setSubiendo(false); }
  }
  return <div>
    <h4 style={{ fontSize: 13, margin: '0 0 10px' }}>Fotografías ({p.fotos?.length || 0}/10)</h4>
    <div className="fotos-grid">{(p.fotos || []).map(f => <div className="foto-it" key={f}><img src={urlFoto(f)} alt=""/>
      <button type="button" aria-label="Quitar foto" onClick={async () => { try { const fila = (p.fotos_ids || []).find(x => x.url === f); await api(`/propiedades/${p.id_propiedad}/fotos/${fila.id_foto}`, { metodo: 'DELETE' }); toast('Foto eliminada'); onCambio(); } catch (e) { toast(e.message, 'error'); } }}><X size={14}/></button></div>)}</div>
    <label className="zona-subida" style={{ display: 'block', marginTop: 12, cursor: 'pointer' }}><Upload size={18} style={{ verticalAlign: -4 }}/> {subiendo ? 'Subiendo…' : 'Arrastra o selecciona imágenes (JPG, PNG o WebP · máx. 5 MB)'}
      <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden disabled={subiendo || (p.fotos?.length || 0) >= 10} onChange={e => e.target.files.length && enviar(e.target.files)}/></label>
    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}><input className="input" type="url" placeholder="…o pega el enlace de una foto (https://)" value={url} onChange={e => setUrl(e.target.value)}/><button type="button" className="btn sec" disabled={!/^https?:\/\//.test(url) || subiendo || (p.fotos?.length || 0) >= 10} onClick={() => enviar([], [url])}>Agregar</button></div>
  </div>;
}

function Formulario({ inicial, tipos, propietarios, onCerrar, onGuardado }) {
  const toast = useToast();
  const [p, setP] = useState(inicial);
  const [direccion, setDireccion] = useState(inicial.direccion || '');
  const [zona, setZona] = useState(inicial.zona || '');
  const [mapa, setMapa] = useState(null);
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
      <Campo etiqueta="Dirección" className="completo"><input name="direccion" required value={direccion} onChange={e => { setDireccion(e.target.value); setMapa(null); }} maxLength={150}/></Campo>
      <Campo etiqueta="Zona / barrio / municipio"><input name="zona" value={zona} onChange={e => { setZona(e.target.value); setMapa(null); }}/></Campo>
      <div className="completo"><button type="button" className="btn sec" disabled={!direccion.trim()} onClick={() => setMapa({ direccion, zona })}>Consultar ubicación</button>{mapa && <MapaInmueble propiedad={mapa}/>}</div>
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
  const [form, setForm] = useState(null);
  const r = usePeticion(() => Promise.all([api('/propiedades'), api('/tipos-propiedad'), api('/config'), esAdmin ? api('/propietarios') : Promise.resolve([])]), []);
  const tipos = Object.fromEntries((r.datos?.[1] || []).map(t => [t.id_tipo_propiedad, t.nombre]));
  const filas = (r.datos?.[0] || []).filter(p => (!estado || p.estado === estado) && (!tipo || String(p.fk_tipo_propiedad) === tipo));
  async function cambiarEstado(p, nuevo) { try { await api('/propiedades/' + p.id_propiedad, { metodo: 'PUT', cuerpo: { estado: nuevo } }); toast(`Inmueble marcado como ${nuevo}`); r.recargar(); } catch (e) { toast(e.message, 'error'); } }
  async function abrirEdicion(p) {
    const d = await api('/propiedades/' + p.id_propiedad).catch(() => p);
    setForm({ ...p, ...d });
  }
  return <div>
    <Cab titulo="Inventario de propiedades" sub="Casas, apartamentos, lotes y locales">
      {esAdmin && !r.cargando && !r.error && <button className="btn" onClick={() => setForm({})}><Plus size={16}/> Nuevo inmueble</button>}</Cab>
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
      acciones={esAdmin ? p => <><button className="btn sm sec" onClick={() => abrirEdicion(p)}><Pencil size={13}/> Editar</button> {p.estado !== 'inactiva' && <button className="btn sm ghost" title="Dar de baja (inactiva)" onClick={() => window.confirm('¿Dar de baja este inmueble? Dejará de mostrarse a los clientes.') && cambiarEstado(p, 'inactiva')}><Archive size={14}/></button>}</> : null}/>
    {form && <Formulario inicial={form} tipos={tipos} propietarios={r.datos[3]} onCerrar={() => { setForm(null); r.recargar(); }} onGuardado={cerrar => { r.recargar(); if (cerrar) setForm(null); }}/>}
  </div>;
}
