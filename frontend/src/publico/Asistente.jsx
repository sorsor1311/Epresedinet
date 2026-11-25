import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, Send, RotateCcw, MapPin, CalendarCheck, Sparkles, KeyRound } from 'lucide-react';
import { api, dinero, precioInmueble, sesion } from '../api.js';
import { Modal, FotoInmueble, useToast } from '../ui.jsx';
import FlujoCita, { ConfirmacionCita, GestionarCita } from './FlujoCita.jsx';
import { SERVICIOS, SolicitarServicio } from './Servicios.jsx';
import { DetalleInmueble } from './Catalogo.jsx';

const idSesion = (() => {
  let s = sessionStorage.getItem('sesionBusqueda');
  if (!s) { s = crypto.randomUUID(); sessionStorage.setItem('sesionBusqueda', s); }
  return s;
})();
const espera = ms => new Promise(r => setTimeout(r, ms));
const PRESUPUESTOS = { compra: [150e6, 300e6, 500e6, 800e6], arriendo: [1e6, 2e6, 3.5e6, 5e6] };
const abreviar = n => n >= 1e6 ? `$${(n / 1e6).toString().replace('.', ',')} M` : dinero(n);

function leerPresupuesto(texto) {
  const t = String(texto).toLowerCase().replace(/\s/g, '');
  const m = t.match(/[\d.,]+/);
  if (!m) return NaN;
  let n = Number(m[0].replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));
  if (/mill|\dm$/.test(t)) n *= 1e6; else if (/mil$|\dk$/.test(t)) n *= 1e3;
  return n;
}

function Resultado({ p, tipo, onDetalle, onContacto }) {
  const x = precioInmueble(p);
  const precio = p.precio_mostrado ?? x.venta ?? x.arriendo;
  return <article className="res">
    <div className="inm-foto"><FotoInmueble propiedad={p} tipo={tipo}/></div>
    <div>
      <span className={'compat' + (p.compatibilidad < 80 ? ' media' : '')}><Sparkles size={12}/> {p.compatibilidad}% de coincidencia</span>
      <h4 style={{ marginTop: 6 }}>{tipo} · {p.direccion}</h4>
      <p><MapPin size={12} style={{ verticalAlign: -1 }}/> {p.zona || 'Zona no indicada'}{p.habitaciones != null ? ` · ${p.habitaciones} hab.` : ''}{p.area_m2 != null ? ` · ${Number(p.area_m2)} m²` : ''}</p>
      <div className="precio">{dinero(precio)}{p.modalidad === 'arriendo' ? ' / mes' : ''} {p.dentro_presupuesto === false && <span className="badge warn" style={{ marginLeft: 6 }}>Sobre tu presupuesto</span>}</div>
      <div className="res-acc"><button className="btn sm" onClick={() => onContacto(p)}><CalendarCheck size={15}/> Quiero que me contacten</button><button className="btn sm sec" onClick={() => onDetalle(p)}>Ver detalle</button></div>
    </div>
  </article>;
}

export default function Asistente({ tipos }) {
  const toast = useToast();
  const [mensajes, setMensajes] = useState([]);
  const [servicio, setServicio] = useState('');
  const [paso, setPaso] = useState('inicio');
  const [escribiendo, setEscribiendo] = useState(false);
  const [filtros, setFiltros] = useState({ tipo: '', modalidad: '', zona: '', presupuesto: 0 });
  const [zonas, setZonas] = useState([]);
  const [texto, setTexto] = useState('');
  const [detalle, setDetalle] = useState(null);
  const [gestionar, setGestionar] = useState(false);
  const [interesado, setInteresado] = useState(null);
  const [vistos, setVistos] = useState([]);
  const hilo = useRef(), ciclo = useRef(0), corrida = useRef(0);

  const agregar = useCallback(m => setMensajes(l => [...l, { id: ++ciclo.current, ...m }]), []);
  const decir = useCallback(async (t, ms = 650) => { setEscribiendo(true); await espera(ms); setEscribiendo(false); agregar({ de: 'bot', tipo: 'texto', texto: t }); }, [agregar]);
  const yo = t => agregar({ de: 'yo', tipo: 'texto', texto: t });

  const empezar = useCallback(async () => {
    const mia = ++corrida.current;
    setMensajes([]); setFiltros({ tipo: '', modalidad: '', zona: '', presupuesto: 0 }); setVistos([]); setPaso('inicio');
    await decir('¡Hola! Soy el asistente de EPRESEDI. ¿En qué podemos ayudarte?', 500);
    if (mia !== corrida.current) return;
    if (mia === corrida.current) setPaso('menu');
  }, [decir]);
  useEffect(() => { empezar(); api('/atencion/zonas').then(setZonas).catch(() => {}); }, [empezar]);
  useEffect(() => { hilo.current?.scrollTo({ top: hilo.current.scrollHeight, behavior: 'smooth' }); }, [mensajes, escribiendo]);

  const nombreTipo = id => tipos[id] || 'Inmueble';
  const tipoDe = p => p.tipo_nombre || nombreTipo(p.fk_tipo_propiedad);

  async function elegirTipo(nombre) {
    yo(nombre || 'Cualquier tipo'); setPaso('espera'); setFiltros(f => ({ ...f, tipo: nombre }));
    await decir(nombre ? `Perfecto, ${nombre.toLowerCase()}. ¿Quieres comprarlo o arrendarlo?` : '¡Entendido! ¿Quieres comprar o arrendar?'); setPaso('modalidad');
  }
  async function elegirModalidad(m) {
    yo(m === 'compra' ? 'Comprar' : 'Arrendar'); setPaso('espera'); setFiltros(f => ({ ...f, modalidad: m }));
    await decir('¿En qué zona o municipio te gustaría? Puedes elegir una de la lista o escribir otra.'); setPaso('zona');
  }
  async function elegirZona(z) {
    yo(z || 'Cualquier zona'); setPaso('espera'); setFiltros(f => ({ ...f, zona: z }));
    await decir(`¿Cuál es tu presupuesto máximo${filtros.modalidad === 'arriendo' ? ' mensual' : ''}? Elige un valor o escríbelo (por ejemplo: 350 millones).`); setPaso('presupuesto');
  }
  async function elegirPresupuesto(n) {
    if (!(n > 0)) { toast('Escribe un presupuesto válido, por ejemplo 350000000 o 350 millones', 'error'); return; }
    yo(dinero(n) + (filtros.modalidad === 'arriendo' ? ' al mes' : '')); setPaso('espera');
    const f = { ...filtros, presupuesto: n }; setFiltros(f);
    await buscar(f);
  }
  async function buscar(f) {
    setEscribiendo(true);
    try {
      const lista = await api('/atencion/buscar', { metodo: 'POST', cuerpo: { ...f, sesion: idSesion } });
      setEscribiendo(false);
      if (lista.length) {
        await decir(`¡Encontré ${lista.length} ${lista.length === 1 ? 'opción' : 'opciones'} para ti! Están ordenadas de la que mejor coincide a la menos.`, 400);
        agregar({ de: 'bot', tipo: 'resultados', lista }); setVistos(v => [...v, ...lista.map(p => p.id_propiedad)]);
      } else {
        await decir('No encontré inmuebles que coincidan exactamente con tu búsqueda. Revisando tu historial para sugerirte alternativas parecidas…', 500);
        const similares = await api(`/atencion/similares?sesion=${idSesion}`);
        if (similares.length) { agregar({ de: 'bot', tipo: 'resultados', lista: similares }); setVistos(v => [...v, ...similares.map(p => p.id_propiedad)]); }
        else await decir('Por ahora no tenemos algo parecido. Puedes cambiar el presupuesto o la zona, o dejarnos tus datos para avisarte cuando llegue algo.');
      }
      await decir('¿Qué quieres hacer ahora?', 400); setPaso('resultados');
    } catch (e) { setEscribiendo(false); await decir('Tuve un problema al buscar: ' + e.message, 300); setPaso('resultados'); }
  }
  async function verSimilares() {
    yo('Ver opciones similares'); setPaso('espera'); setEscribiendo(true);
    try {
      const l = await api(`/atencion/similares?sesion=${idSesion}&excluir=${vistos.join(',')}`); setEscribiendo(false);
      if (l.length) { await decir('Basándome en tu historial de búsqueda, estas también podrían gustarte:', 400); agregar({ de: 'bot', tipo: 'resultados', lista: l }); setVistos(v => [...v, ...l.map(p => p.id_propiedad)]); }
      else await decir('No tengo más opciones parecidas por ahora. Prueba cambiando tu búsqueda.', 400);
    } catch (e) { setEscribiendo(false); await decir(e.message, 300); }
    setPaso('resultados');
  }
  async function finalizar() {
    yo('Finalizar'); setPaso('espera');
    await decir('¡Gracias por visitar EPRESEDI! Si más adelante quieres retomar tu búsqueda, aquí estaré. 👋'); setPaso('fin');
  }
  async function contacto(p) {
    yo(`Quiero que me contacten por: ${p.direccion}`); setPaso('espera');
    await decir(interesado ? '¡Genial! Ya tengo tus datos. Elige el día y la hora para que te contacte un asesor:' : '¡Genial! Para coordinar con un asesor necesito unos datos tuyos.');
    agregar({ de: 'bot', tipo: 'cita', propiedad: p }); setPaso('cita');
  }
  async function citaLista(c) {
    agregar({ de: 'bot', tipo: 'confirmacion', cita: c });
    await decir('Guarda tu código de gestión y revisa los requisitos de tu cita. ¿Quieres seguir viendo opciones?', 500); setPaso('resultados');
  }
  async function enviar(e) {
    e.preventDefault(); const t = texto.trim(); if (!t) return; setTexto('');
    if (paso === 'zona') return elegirZona(t);
    if (paso === 'presupuesto') return elegirPresupuesto(leerPresupuesto(t));
    if (['tipo', 'modalidad', 'espera', 'inicio'].includes(paso)) { toast('Elige una de las opciones para continuar', 'info'); return; }
    yo(t); setEscribiendo(true);
    try {
      const r = await api('/atencion/chat', { metodo: 'POST', cuerpo: { mensaje: t, ...filtros, presupuesto: filtros.presupuesto || undefined } });
      setEscribiendo(false); agregar({ de: 'bot', tipo: 'texto', texto: r.mensaje });
    } catch (err) { setEscribiendo(false); agregar({ de: 'bot', tipo: 'texto', texto: err.message }); }
  }

  const activo = ['zona', 'presupuesto'].includes(paso);
  const placeholder = paso === 'zona' ? 'Escribe un barrio o municipio…' : paso === 'presupuesto' ? 'Ej: 350 millones' : ['resultados', 'cita', 'fin'].includes(paso) ? 'Escribe una pregunta sobre los inmuebles…' : 'Elige una opción de arriba';
  return <div className="contenedor"><div className="asist">
    <div className="tarjeta chat">
      <div className="chat-cab"><div className="avatar"><Bot size={22}/></div><div><b>Asistente EPRESEDI</b><small>En línea</small></div>
        <button className="btn sm" onClick={empezar}><RotateCcw size={14}/> Nueva búsqueda</button></div>
      <div className="chat-hilo" ref={hilo} aria-live="polite">
        {mensajes.map(m => m.tipo === 'texto'
          ? <div key={m.id} className={'msg ' + m.de}>{m.de === 'bot' && <div className="avatar"><Bot size={16}/></div>}<div className="burbuja">{m.texto}</div></div>
          : m.tipo === 'resultados'
            ? <div key={m.id} className="resultados">{m.lista.map(p => <Resultado key={p.id_propiedad} p={p} tipo={tipoDe(p)} onDetalle={setDetalle} onContacto={contacto}/>)}</div>
            : m.tipo === 'cita'
              ? <div key={m.id} className="tarjeta-form"><h4>Cita para {m.propiedad.direccion}</h4><p>{interesado ? 'Elige fecha y hora.' : 'Tus datos solo se usan para contactarte sobre este inmueble.'}</p>
                  <FlujoCita propiedad={m.propiedad} interesadoId={interesado} onInteresado={setInteresado} onListo={citaLista}/></div>
              : <ConfirmacionCita key={m.id} cita={m.cita} onGestionar={() => setGestionar(true)}/>)}
        {escribiendo && <div className="msg"><div className="avatar"><Bot size={16}/></div><div className="burbuja escribiendo"><i/><i/><i/></div></div>}
      </div>
      <div className="chat-pie">
        {paso === 'menu' && <div className="chips"><button className="chip" onClick={() => { yo('Buscar inmueble'); setPaso('tipo'); }}>Buscar inmueble para comprar o arrendar</button><button className="chip" onClick={() => setPaso('servicios')}>Consultar o solicitar servicios</button><button className="chip" onClick={() => setGestionar(true)}>Gestionar cita</button></div>}
        {paso === 'servicios' && <div>{SERVICIOS.map(([grupo, lista]) => <div key={grupo}><b>{grupo}</b><div className="chips">{lista.map(x => <button key={x} className="chip" onClick={() => setServicio(x)}>{x}</button>)}</div></div>)}<button className="chip" onClick={empezar}>Volver al inicio</button></div>}
        {paso === 'tipo' && <div className="chips">{Object.values(tipos).map(t => <button key={t} className="chip" onClick={() => elegirTipo(t)}>{t}</button>)}<button className="chip" onClick={() => elegirTipo('')}>Cualquiera</button></div>}
        {paso === 'modalidad' && <div className="chips"><button className="chip" onClick={() => elegirModalidad('compra')}>Comprar</button><button className="chip" onClick={() => elegirModalidad('arriendo')}>Arrendar</button></div>}
        {paso === 'zona' && <div className="chips">{zonas.map(z => <button key={z} className="chip" onClick={() => elegirZona(z)}>{z}</button>)}<button className="chip" onClick={() => elegirZona('')}>Cualquier zona</button></div>}
        {paso === 'presupuesto' && <div className="chips">{PRESUPUESTOS[filtros.modalidad || 'compra'].map(n => <button key={n} className="chip" onClick={() => elegirPresupuesto(n)}>Hasta {abreviar(n)}</button>)}</div>}
        {(paso === 'resultados' || paso === 'fin') && <div className="chips"><button className="chip" onClick={verSimilares} disabled={paso === 'fin'}>Ver opciones similares</button><button className="chip" onClick={empezar}>Cambiar mi búsqueda</button>{paso !== 'fin' && <button className="chip" onClick={finalizar}>Finalizar</button>}</div>}
        {activo && <form onSubmit={enviar}><input className="input" value={texto} onChange={e => setTexto(e.target.value)} placeholder={placeholder} disabled={!activo} aria-label="Mensaje"/>
          <button className="btn" disabled={!activo || !texto.trim()} aria-label="Enviar"><Send size={17}/></button></form>}
      </div>
    </div>
    <aside className="lateral-asist">
      <div className="tarjeta tarjeta-pad"><h3>Tu búsqueda</h3><div className="resumen-b">
        <div><span>Tipo</span><b>{filtros.tipo || '—'}</b></div><div><span>Negociación</span><b>{filtros.modalidad ? (filtros.modalidad === 'compra' ? 'Compra' : 'Arriendo') : '—'}</b></div>
        <div><span>Zona</span><b>{filtros.zona || (paso === 'presupuesto' || filtros.presupuesto ? 'Cualquiera' : '—')}</b></div><div><span>Presupuesto</span><b>{filtros.presupuesto ? dinero(filtros.presupuesto) : '—'}</b></div></div></div>
      <div className="tarjeta tarjeta-pad"><h3>¿Ya tienes una cita?</h3><p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.55, marginBottom: 12 }}>Cámbiala o cancélala con el código que recibiste al confirmar tu cita.</p>
        <button className="btn sec block" onClick={() => setGestionar(true)}><KeyRound size={16}/> Gestionar mi cita</button></div>
    </aside>
    {servicio && <SolicitarServicio key={servicio} servicio={servicio} onCerrar={() => setServicio('')}/>}
    {detalle && <DetalleInmueble p={detalle} tipo={tipoDe(detalle)} onCerrar={() => setDetalle(null)}/>}
    {gestionar && <Modal titulo="Gestiona tu cita" subtitulo="Reprograma o cancela con tu código" onCerrar={() => setGestionar(false)}><GestionarCita/></Modal>}
  </div></div>;
}
