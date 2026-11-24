import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { Vacio } from '../ui.jsx';
import { useFavoritos } from '../favoritos.js';
import { TarjetaInmueble, DetalleInmueble } from './Catalogo.jsx';

function MiLista({ propiedades, tipos, ir }) {
  const fav = useFavoritos(); const [abierto, setAbierto] = useState(null);
  const lista = propiedades.filter(p => fav.ids.includes(p.id_propiedad));
  return lista.length ? <><p style={{ color: 'var(--muted)', marginBottom: 14 }}>Guarda los inmuebles que te interesan y pide cita para el que prefieras.</p>
    <div className="rejilla-inm" style={{ paddingBottom: 0 }}>{lista.map(p => <TarjetaInmueble key={p.id_propiedad} p={p} tipo={tipos[p.fk_tipo_propiedad]} onVer={setAbierto}/>)}</div>
    {abierto && <DetalleInmueble p={abierto} tipo={tipos[abierto.fk_tipo_propiedad]} onCerrar={() => setAbierto(null)}/>}</>
    : <Vacio icono={Heart} titulo="Tu lista está vacía" texto="Toca el corazón en cualquier inmueble para guardarlo aquí y compararlo después."><button className="btn" onClick={() => ir('propiedades')}>Explorar inmuebles</button></Vacio>;
}

export default function Cuenta({ ir, propiedades, tipos }) {
  return <><div className="cuenta-cab"><div className="contenedor"><span className="ceja">Lista de interés</span><h1>Tu lista de interés</h1><p>Los inmuebles que guardaste en este navegador.</p></div></div><div className="contenedor" style={{ padding: '26px 0 70px' }}><MiLista propiedades={propiedades} tipos={tipos} ir={ir}/></div></>;
}
