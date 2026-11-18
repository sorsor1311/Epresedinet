import React, { useMemo, useState } from 'react';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { iconoTipo, Campo } from '../ui.jsx';
import { TarjetaInmueble, DetalleInmueble } from './Catalogo.jsx';

function Ilustracion() {
  return <svg viewBox="0 0 480 400" role="img" aria-label="Ilustración de edificios y casa">
    <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff"/><stop offset="1" stopColor="#cfe3f5"/></linearGradient>
      <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#64bbca"/><stop offset="1" stopColor="#1689a9"/></linearGradient></defs>
    <ellipse cx="240" cy="365" rx="215" ry="22" fill="#0b2650" opacity=".35"/>
    <rect x="40" y="130" width="120" height="235" rx="8" fill="url(#g1)"/><rect x="190" y="60" width="130" height="305" rx="8" fill="url(#g2)"/>
    <rect x="345" y="170" width="105" height="195" rx="8" fill="url(#g1)"/>
    {[0, 1, 2, 3, 4].map(r => [0, 1, 2].map(c => <rect key={'a' + r + c} x={56 + c * 34} y={150 + r * 40} width="20" height="24" rx="3" fill="#18488e" opacity={(r + c) % 4 === 0 ? 1 : .35}/>))}
    {[0, 1, 2, 3, 4, 5, 6].map(r => [0, 1, 2].map(c => <rect key={'b' + r + c} x={208 + c * 36} y={80 + r * 38} width="22" height="22" rx="3" fill="#fff" opacity={(r * 3 + c) % 5 === 0 ? 1 : .5}/>))}
    {[0, 1, 2, 3].map(r => [0, 1].map(c => <rect key={'c' + r + c} x={365 + c * 40} y={190 + r * 40} width="22" height="24" rx="3" fill="#18488e" opacity={(r + c) % 3 === 0 ? 1 : .35}/>))}
    <path d="M60 365 L60 300 L110 262 L160 300 L160 365Z" fill="#e6b34c"/><path d="M48 304 L110 252 L172 304" fill="none" stroke="#b78329" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="95" y="326" width="30" height="39" rx="4" fill="#0b2650"/>
  </svg>;
}

export default function Inicio({ propiedades, tipos, ir }) {
  const [abierto, setAbierto] = useState(null);
  const [busca, setBusca] = useState({ tipo: '', modalidad: 'venta' });
  const conteo = useMemo(() => Object.fromEntries(Object.keys(tipos).map(id => [id, propiedades.filter(p => String(p.fk_tipo_propiedad) === id).length])), [propiedades, tipos]);
  return <>
    <section className="hero"><div className="contenedor hero-in">
      <div>
        <span className="ceja">Inmobiliaria · EPRESEDI S.A.S.</span>
        <h1>Encuentra el lugar <em>ideal</em> sin esperar a que alguien te atienda.</h1>
        <p className="lead">Cuéntale a nuestro asistente qué buscas y te mostramos los inmuebles que mejor encajan. Si te interesa uno, agendas tu cita con un asesor en el horario que prefieras.</p>
        <form className="buscador-hero" onSubmit={e => { e.preventDefault(); ir('propiedades', { tipo: busca.tipo, modalidad: busca.modalidad }); }}>
          <Campo etiqueta="Tipo de inmueble"><select value={busca.tipo} onChange={e => setBusca({ ...busca, tipo: e.target.value })}><option value="">Todos</option>{Object.entries(tipos).map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select></Campo>
          <Campo etiqueta="Quiero"><select value={busca.modalidad} onChange={e => setBusca({ ...busca, modalidad: e.target.value })}><option value="venta">Comprar</option><option value="arriendo">Arrendar</option></select></Campo>
          <button className="btn lg">Buscar</button>
        </form>
        <div style={{ display: 'flex', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
          <button className="btn oro lg" onClick={() => ir('asistente')}><MessageCircle size={19}/> Hablar con el asistente</button></div>
        <div className="cifras"><div><b>{propiedades.length}</b><span>inmuebles disponibles</span></div><div><b>{Object.keys(tipos).length}</b><span>tipos de inmueble</span></div><div><b>1 h</b><span>por cita con asesor</span></div></div>
      </div>
      <div className="hero-visual"><Ilustracion/></div>
    </div></section>

    <section className="seccion"><div className="contenedor">
      <div className="sec-cab"><div><span className="ceja">Explora por categoría</span><h2>¿Qué estás buscando?</h2></div></div>
      <div className="tipos">{Object.entries(tipos).map(([id, nombre]) => { const I = iconoTipo(nombre); return <button key={id} className="tipo-card" onClick={() => ir('propiedades', { tipo: id })}>
        <span className="ic"><I size={24}/></span><b>{nombre === 'Local' ? 'Locales' : nombre === 'Lote' ? 'Lotes' : nombre + 's'}</b><span>{conteo[id]} {conteo[id] === 1 ? 'disponible' : 'disponibles'}</span></button>; })}</div>
    </div></section>

    <section className="seccion alt"><div className="contenedor">
      <div className="sec-cab"><div><span className="ceja">Selección</span><h2>Inmuebles recientes</h2></div><button className="btn sec" onClick={() => ir('propiedades')}>Ver todos <ArrowRight size={16}/></button></div>
      <div className="rejilla-inm" style={{ paddingBottom: 0 }}>{propiedades.slice(0, 3).map(p => <TarjetaInmueble key={p.id_propiedad} p={p} tipo={tipos[p.fk_tipo_propiedad] || 'Inmueble'} onVer={setAbierto}/>)}</div>
    </div></section>

    <section className="seccion"><div className="contenedor">
      <div className="sec-cab"><div><span className="ceja">Así de fácil</span><h2>De la búsqueda a la visita en 3 pasos</h2></div></div>
      <div className="pasos">
        <div className="paso"><div className="n">01</div><h3>Cuéntanos qué buscas</h3><p>El asistente te pregunta tipo de inmueble, zona, presupuesto y si quieres comprar o arrendar.</p></div>
        <div className="paso"><div className="n">02</div><h3>Revisa las mejores opciones</h3><p>Te mostramos los inmuebles que más se ajustan, con fotos, precio, área y ubicación.</p></div>
        <div className="paso"><div className="n">03</div><h3>Agenda con un asesor</h3><p>Eliges día y hora; asignamos al asesor con la agenda más libre y te confirmamos por correo.</p></div>
      </div>
      <div className="banda" style={{ marginTop: 40 }}><div><h2>¿Prefieres que te guiemos?</h2><p>Nuestro asistente está disponible 24/7 y te conecta con un asesor cuando lo necesites.</p></div>
        <button className="btn oro lg" onClick={() => ir('asistente')}><MessageCircle size={19}/> Iniciar conversación</button></div>
    </div></section>
    {abierto && <DetalleInmueble p={abierto} tipo={tipos[abierto.fk_tipo_propiedad] || 'Inmueble'} onCerrar={() => setAbierto(null)}/>}
  </>;
}
