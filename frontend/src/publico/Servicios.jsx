import React, { useState } from 'react';
import { api } from '../api.js';
import { Modal, Campo } from '../ui.jsx';
export const SERVICIOS = [
  [
    "Servicios inmobiliarios",
    [
      "Administración de inmuebles",
      "Arriendo (requisitos del proceso)",
      "Compra y venta de inmuebles"
    ]
  ],
  [
    "Trámites",
    [
      "Presupuesto de obra",
      "Avalúos",
      "Desenglobe",
      "Escrituras",
      "Sucesión",
      "Certificado de libertad y tradición",
      "Compraventa (trámite)"
    ]
  ],
  [
    "Mantenimiento",
    [
      "Reparaciones locativas",
      "Plomería y reparaciones hidráulicas",
      "Instalaciones y reparaciones eléctricas",
      "Pintura y resanes",
      "Reparación de puertas, ventanas y cerraduras",
      "Adecuaciones y remodelaciones",
      "Mantenimiento de techos, pisos y paredes",
      "Reparaciones generales de infraestructura"
    ]
  ]
];


export function SolicitarServicio({ servicio, onCerrar }) {
  const [ocupado, setOcupado] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');
  async function enviar(e) {
    e.preventDefault(); setOcupado(true); setError('');
    try { setResultado(await api('/atencion/servicios', { metodo: 'POST', token: '', cuerpo: { ...Object.fromEntries(new FormData(e.currentTarget)), servicio } })); } catch (e) { setError(e.message); } finally { setOcupado(false); }
  }
  return <Modal titulo={servicio} onCerrar={onCerrar}>{resultado ? <div><h3>Solicitud recibida</h3><p>Guarda tu código: <b>{resultado.codigo}</b></p></div> : <form className="form-col" onSubmit={enviar}><Campo etiqueta="Nombre completo"><input name="nombre" required maxLength={120}/></Campo><Campo etiqueta="Correo"><input name="correo" type="email" required maxLength={150}/></Campo><Campo etiqueta="Teléfono"><input name="telefono" required pattern="[0-9]{10}"/></Campo><Campo etiqueta="Descripción de la solicitud"><textarea name="detalle" required maxLength={1000}/></Campo><label><input type="checkbox" required/> Autorizo el tratamiento de mis datos para responder esta solicitud.</label>{error && <p role="alert">{error}</p>}<button className="btn" disabled={ocupado}>{ocupado ? 'Enviando…' : 'Enviar solicitud'}</button></form>}</Modal>;
}
export default function Servicios() {
 const [servicio, elegir] = useState('');
  return <><div className="pagina-cab"><div className="contenedor"><span className="ceja">EPRESEDI S.A.S.</span><h1>Nuestros servicios</h1><p>Soluciones inmobiliarias, trámites y mantenimiento.</p></div></div><div className="contenedor" style={{ paddingBottom: 40 }}>{SERVICIOS.map(([categoria, servicios]) => <section className="seccion" key={categoria}><h2>{categoria}</h2><div className="rejilla-inm">{servicios.map(servicio => <article className="inm" key={servicio}><div className="inm-info"><h3>{servicio}</h3><button className="btn sec sm" onClick={() => { elegir(servicio); }}>Solicitar información</button></div></article>)}</div></section>)}</div>{servicio && <SolicitarServicio key={servicio} servicio={servicio} onCerrar={() => elegir('')}/>}</>;
}
