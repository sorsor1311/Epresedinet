import React, { useEffect, useMemo, useState } from 'react';
import { Search, MapPin, BedDouble, Bath, Ruler, Car, CalendarCheck, SearchX, ArrowLeft, Heart } from 'lucide-react';
import { useFavoritos } from '../favoritos.js';
import { api, dinero, precioInmueble, urlFoto } from '../api.js';
import { Modal, Badge, FotoInmueble, Vacio, Campo, iconoTipo, Cargando } from '../ui.jsx';
import FlujoCita, { ConfirmacionCita, GestionarCita } from './FlujoCita.jsx';

export function Especificaciones({ p }) {
  return <div className="inm-esp">
    {p.habitaciones != null && <span><BedDouble size={16}/> {p.habitaciones} hab.</span>}
    {p.banos != null && <span><Bath size={16}/> {p.banos} baños</span>}
    {p.area_m2 != null && <span><Ruler size={16}/> {Number(p.area_m2)} m²</span>}
    {p.parqueaderos != null && <span><Car size={16}/> {p.parqueaderos}</span>}
    {p.habitaciones == null && p.banos == null && p.area_m2 == null && <span>Consulta los detalles con un asesor</span>}
  </div>;
}

export function PrecioInmueble({ p, grande = false }) {
  const x = precioInmueble(p);
  return <div className="inm-precio">
    {x.venta && <b className={grande ? 'precio-grande' : ''}>{dinero(x.venta)}</b>}
    {x.venta && <small>Precio de venta</small>}
    {x.arriendo && <b className={grande && !x.venta ? 'precio-grande' : ''} style={x.venta ? { fontSize: grande ? 18 : 15 } : undefined}>{dinero(x.arriendo)} <span style={{ fontWeight: 500, fontSize: 13 }}>/ mes</span></b>}
    {x.arriendo && <small>Canon de arriendo</small>}
  </div>;
}

export function TarjetaInmueble({ p, tipo, onVer }) {
  const x = precioInmueble(p), fav = useFavoritos();
  return <article className="inm" style={{ position: 'relative' }}>
    <button className={'fav' + (fav.esFavorito(p.id_propiedad) ? ' on' : '')} onClick={() => fav.alternar(p.id_propiedad)} aria-label={fav.esFavorito(p.id_propiedad) ? 'Quitar de mi lista' : 'Guardar en mi lista'} aria-pressed={fav.esFavorito(p.id_propiedad)}><Heart size={18}/></button>
    <button className="inm-btn" onClick={() => onVer(p)} aria-label={'Ver ' + p.direccion}>
    <div className="inm-foto"><FotoInmueble propiedad={p} tipo={tipo}/><div className="inm-tags"><Badge tono="info">{x.etiqueta}</Badge></div></div>
    <div className="inm-info">
      <span className="inm-tipo">{tipo}</span><h3>{p.direccion}</h3>
      <div className="inm-zona"><MapPin size={14}/> {p.zona || 'Ubicación registrada'}</div>
      <Especificaciones p={p}/><PrecioInmueble p={p}/>
    </div></button></article>;
}

export function DetalleInmueble({ p, tipo, onCerrar }) {
  const [vista, setVista] = useState('detalle');
  const [foto, setFoto] = useState(0);
  const [cita, setCita] = useState(null);
  const [interesado, setInteresado] = useState(null);
  const fav = useFavoritos();
  const fotos = (p.fotos?.length ? p.fotos : []).slice(0, 10).map(urlFoto);
  useEffect(() => { api('/atencion/propiedad/' + p.id_propiedad + '/consulta', { metodo: 'POST' }).catch(() => {}); }, [p.id_propiedad]);
  const titulo = vista === 'detalle' ? p.direccion : vista === 'cita' ? 'Agenda tu cita' : vista === 'listo' ? 'Cita confirmada' : 'Gestiona tu cita';
  return <Modal titulo={titulo} subtitulo={vista === 'detalle' ? `${tipo} · ${p.zona || ''}` : p.direccion} onCerrar={onCerrar} ancho={vista === 'detalle' ? 920 : 560}>
    {vista === 'detalle' && <div className="detalle-grid">
      <div className="galeria">
        <div className="principal">{fotos.length ? <img src={fotos[foto]} alt={p.direccion}/> : <div className="inm-ph" style={{ minHeight: 260 }}>{React.createElement(iconoTipo(tipo), { size: 64 })}</div>}</div>
        {fotos.length > 1 && <div className="miniaturas">{fotos.map((f, i) => <button key={f} className={i === foto ? 'activo' : ''} onClick={() => setFoto(i)} aria-label={'Foto ' + (i + 1)}><img src={f} alt=""/></button>)}</div>}
      </div>
      <div>
        <PrecioInmueble p={p} grande/>
        <div className="datos">
          <div className="dato"><small>Tipo</small><b>{tipo}</b></div>
          <div className="dato"><small>Ubicación</small><b>{p.zona || '—'}</b></div>
          <div className="dato"><small>Área</small><b>{p.area_m2 != null ? Number(p.area_m2) + ' m²' : '—'}</b></div>
          <div className="dato"><small>Habitaciones</small><b>{p.habitaciones ?? '—'}</b></div>
          {p.banos != null && <div className="dato"><small>Baños</small><b>{p.banos}</b></div>}
          {p.parqueaderos != null && <div className="dato"><small>Parqueaderos</small><b>{p.parqueaderos}</b></div>}
        </div>
        {p.descripcion && <p style={{ color: '#3d5775', lineHeight: 1.65, fontSize: 14.5, marginBottom: 18 }}>{p.descripcion}</p>}
        <button className="btn lg block" onClick={() => setVista('cita')}><CalendarCheck size={19}/> Quiero que me contacte un asesor</button>
        <button className="btn sec block" style={{ marginTop: 10 }} onClick={() => fav.alternar(p.id_propiedad)}><Heart size={17} fill={fav.esFavorito(p.id_propiedad) ? 'currentColor' : 'none'}/> {fav.esFavorito(p.id_propiedad) ? 'Guardado en mi lista' : 'Guardar en mi lista'}</button>
      </div></div>}
    {vista === 'cita' && <><button className="btn ghost sm" style={{ marginBottom: 12 }} onClick={() => setVista('detalle')}><ArrowLeft size={16}/> Volver al inmueble</button>
      <FlujoCita propiedad={p} interesadoId={interesado} onInteresado={setInteresado} onListo={c => { setCita(c); setVista('listo'); }}/></>}
    {vista === 'listo' && <ConfirmacionCita cita={cita} onGestionar={() => setVista('gestion')}/>}
    {vista === 'gestion' && <GestionarCita codigoInicial={cita?.codigo_gestion}/>}
  </Modal>;
}

export default function Catalogo({ propiedades, tipos, cargando, filtroInicial = {} }) {
  const [f, setF] = useState({ q: '', tipo: '', modalidad: '', zona: '', max: '', hab: '', orden: 'reciente', ...filtroInicial });
  const [abierto, setAbierto] = useState(null);
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const zonas = useMemo(() => [...new Set(propiedades.map(p => p.zona).filter(Boolean))].sort(), [propiedades]);
  const lista = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    const r = propiedades.filter(p => {
      const x = precioInmueble(p);
      if (f.tipo && String(p.fk_tipo_propiedad) !== f.tipo) return false;
      if (f.modalidad === 'venta' && !x.venta) return false;
      if (f.modalidad === 'arriendo' && !x.arriendo) return false;
      if (f.zona && p.zona !== f.zona) return false;
      if (f.hab && (p.habitaciones ?? -1) < Number(f.hab)) return false;
      if (f.max) { const ref = f.modalidad === 'arriendo' ? x.arriendo : f.modalidad === 'venta' ? x.venta : (x.venta ?? x.arriendo); if (ref == null || ref > Number(f.max)) return false; }
      return !q || `${p.direccion} ${p.barrio || ''} ${p.zona || ''} ${p.descripcion || ''}`.toLowerCase().includes(q);
    });
    const precio = p => precioInmueble(p).venta ?? precioInmueble(p).arriendo ?? 0;
    if (f.orden === 'menor') r.sort((a, b) => precio(a) - precio(b)); if (f.orden === 'mayor') r.sort((a, b) => precio(b) - precio(a));
    return r;
  }, [propiedades, f]);
  const hayFiltros = f.q || f.tipo || f.modalidad || f.zona || f.max || f.hab;
  return <>
    <div className="pagina-cab"><div className="contenedor">
      <span className="ceja">Inventario disponible</span><h1>Casas, apartamentos, lotes y locales</h1>
      <p>Filtra por lo que necesitas y agenda una cita con un asesor en minutos.</p>
      <div className="filtros">
        <Campo etiqueta="Buscar" className="buscar"><Search size={17}/><input value={f.q} onChange={e => set('q', e.target.value)} placeholder="Dirección, barrio o palabra clave"/></Campo>
        <Campo etiqueta="Tipo"><select value={f.tipo} onChange={e => set('tipo', e.target.value)}><option value="">Todos</option>{Object.entries(tipos).map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select></Campo>
        <Campo etiqueta="Negociación"><select value={f.modalidad} onChange={e => set('modalidad', e.target.value)}><option value="">Venta o arriendo</option><option value="venta">Venta</option><option value="arriendo">Arriendo</option></select></Campo>
        <Campo etiqueta="Zona"><select value={f.zona} onChange={e => set('zona', e.target.value)}><option value="">Todas</option>{zonas.map(z => <option key={z}>{z}</option>)}</select></Campo>
        <Campo etiqueta="Habitaciones"><select value={f.hab} onChange={e => set('hab', e.target.value)}><option value="">Cualquiera</option>{[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}+</option>)}</select></Campo>
      </div>
    </div></div>
    <div className="contenedor">
      <div className="cat-barra"><span><b style={{ color: 'var(--texto)' }}>{lista.length}</b> {lista.length === 1 ? 'inmueble' : 'inmuebles'}</span>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <label className="campo" style={{ flexDirection: 'row', alignItems: 'center' }}>Precio máx.<input className="input" style={{ width: 150 }} type="number" min="0" step="1000000" value={f.max} onChange={e => set('max', e.target.value)} placeholder="COP"/></label>
          <select className="input" style={{ width: 'auto' }} value={f.orden} onChange={e => set('orden', e.target.value)} aria-label="Ordenar"><option value="reciente">Más recientes</option><option value="menor">Menor precio</option><option value="mayor">Mayor precio</option></select>
          {hayFiltros && <button className="btn ghost sm" onClick={() => setF({ q: '', tipo: '', modalidad: '', zona: '', max: '', hab: '', orden: f.orden })}>Limpiar filtros</button>}</div></div>
      {cargando ? <Cargando texto="Cargando inmuebles…"/> : lista.length === 0
        ? <Vacio icono={SearchX} titulo="No encontramos inmuebles con esos filtros" texto="Prueba ampliando el presupuesto o quitando algún filtro. También puedes contarle al asistente lo que buscas.">{hayFiltros && <button className="btn sec" onClick={() => setF({ q: '', tipo: '', modalidad: '', zona: '', max: '', hab: '', orden: 'reciente' })}>Quitar filtros</button>}</Vacio>
        : <div className="rejilla-inm">{lista.map(p => <TarjetaInmueble key={p.id_propiedad} p={p} tipo={tipos[p.fk_tipo_propiedad] || 'Inmueble'} onVer={setAbierto}/>)}</div>}
    </div>
    {abierto && <DetalleInmueble p={abierto} tipo={tipos[abierto.fk_tipo_propiedad] || 'Inmueble'} onCerrar={() => setAbierto(null)}/>}
  </>;
}
