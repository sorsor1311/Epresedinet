import React, { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LogIn, LogOut, Menu, X, ShieldAlert, Heart, UserRound, LayoutDashboard } from 'lucide-react';
import './styles.css';
import './panel.css';
import { api, sesion } from './api.js';
import { ProveedorToast, useToast, Vacio, Modal, Campo, Tema } from './ui.jsx';
import { useFavoritos } from './favoritos.js';
import Inicio from './publico/Inicio.jsx';
import Catalogo from './publico/Catalogo.jsx';
import Asistente from './publico/Asistente.jsx';
import Acceso from './publico/Acceso.jsx';
import Cuenta from './publico/Cuenta.jsx';
import Panel from './admin/Panel.jsx';

const TIPOS_BASE = { 1: 'Casa', 2: 'Apartamento', 3: 'Lote', 4: 'Local' };
const usaPanel = u => !!u && ['Administrador', 'Agente'].includes(u.rol);
const rutaActual = () => location.hash.replace(/^#\/?/, '') || 'inicio';

const SERVICIOS = [
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

function Servicios() {
  const [servicio, elegir] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');
  async function enviar(e) {
    e.preventDefault(); setOcupado(true); setError('');
    try { setResultado(await api('/atencion/servicios', { metodo: 'POST', token: '', cuerpo: { ...Object.fromEntries(new FormData(e.currentTarget)), servicio } })); } catch (e) { setError(e.message); } finally { setOcupado(false); }
  }
  return <><div className="pagina-cab"><div className="contenedor"><span className="ceja">EPRESEDI S.A.S.</span><h1>Nuestros servicios</h1><p>Soluciones inmobiliarias, trámites y mantenimiento.</p></div></div><div className="contenedor" style={{ paddingBottom: 40 }}>{SERVICIOS.map(([categoria, servicios]) => <section className="seccion" key={categoria}><h2>{categoria}</h2><div className="rejilla-inm">{servicios.map(servicio => <article className="inm" key={servicio}><div className="inm-info"><h3>{servicio}</h3><button className="btn sec sm" onClick={() => { elegir(servicio); setResultado(null); setError(''); }}>Solicitar información</button></div></article>)}</div></section>)}</div>{servicio && <Modal titulo={servicio} onCerrar={() => elegir('')}>{resultado ? <div><h3>Solicitud recibida</h3><p>Guarda tu código: <b>{resultado.codigo}</b></p></div> : <form className="form-col" onSubmit={enviar}><Campo etiqueta="Nombre completo"><input name="nombre" required maxLength={120}/></Campo><Campo etiqueta="Correo"><input name="correo" type="email" required maxLength={150}/></Campo><Campo etiqueta="Teléfono"><input name="telefono" required pattern="[0-9]{10}"/></Campo><Campo etiqueta="Descripción de la solicitud"><textarea name="detalle" required maxLength={1000}/></Campo><label><input type="checkbox" required/> Autorizo el tratamiento de mis datos para responder esta solicitud.</label>{error && <p role="alert">{error}</p>}<button className="btn" disabled={ocupado}>{ocupado ? 'Enviando…' : 'Enviar solicitud'}</button></form>}</Modal>}</>;
}

function App() {
  const toast = useToast();
  const fav = useFavoritos();
  const [ruta, setRuta] = useState(rutaActual);
  const [usuario, setUsuario] = useState(() => { const guardado = sesion.usuario(); if (guardado && !usaPanel(guardado)) { sesion.cerrar(); return null; } return guardado; });
  const [propiedades, setPropiedades] = useState([]);
  const [tipos, setTipos] = useState(TIPOS_BASE);
  const [cargando, setCargando] = useState(true);
  const [menu, setMenu] = useState(false);
  const [filtros, setFiltros] = useState({});

  useEffect(() => { const f = () => { setRuta(rutaActual()); setMenu(false); window.scrollTo(0, 0); }; window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, []);
  useEffect(() => {
    Promise.all([api('/propiedades', { token: '' }), api('/tipos-propiedad', { token: '' })])
      .then(([p, t]) => { setPropiedades(p); setTipos(Object.fromEntries(t.map(x => [x.id_tipo_propiedad, x.nombre]))); })
      .catch(e => toast(e.message, 'error')).finally(() => setCargando(false));
  }, [toast]);
  useEffect(() => { if (usuario && !usuario.nombre) api('/auth/me').then(p => actualizarPerfil(p)).catch(() => {}); /* eslint-disable-next-line */ }, []);

  const salir = useCallback((aviso = 'Sesión cerrada') => { sesion.cerrar(); setUsuario(null); location.hash = '/inicio'; if (aviso) toast(aviso, 'info'); }, [toast]);
  useEffect(() => { const f = () => salir('Tu sesión expiró. Inicia sesión de nuevo.'); window.addEventListener('sesion-expirada', f); return () => window.removeEventListener('sesion-expirada', f); }, [salir]);

  const actualizarPerfil = p => setUsuario(u => { const nuevo = { ...(u || {}), nombre: p.nombre }; sessionStorage.setItem('usuario', JSON.stringify(nuevo)); return nuevo; });
  const ir = (destino, f = {}) => { setFiltros(f); location.hash = '/' + destino; };
  const irPanel = s => { location.hash = '/panel/' + s; };
  const entrar = async ({ token, usuario: u }) => {
    sesion.guardar(token, u);
    let completo = u;
    try { const p = await api('/auth/me', { token }); completo = { ...u, nombre: p.nombre }; sesion.guardar(token, completo); } catch { /* usa los datos básicos */ }
    setUsuario(completo); toast(`Bienvenido/a, ${completo.nombre || completo.usuario}`);
    location.hash = '/panel/resumen';
  };

  const [raiz, sub] = ruta.split('/');
  const enPanel = raiz === 'panel' || raiz === 'admin';
  useEffect(() => { if (usaPanel(usuario) && !enPanel) location.hash = '/panel/resumen'; }, [usuario, enPanel]);
  if (enPanel || usaPanel(usuario)) {
    return usaPanel(usuario)
      ? <Panel usuario={usuario} seccion={enPanel ? sub : 'resumen'} ir={irPanel} onSalir={() => salir()} irSitio={() => irPanel('resumen')} onPerfil={actualizarPerfil}/>
      : <div className="contenedor" style={{ paddingTop: 80 }}><Vacio icono={ShieldAlert} titulo="Acceso restringido" texto="Esta sección es solo para el personal de EPRESEDI."><button className="btn" onClick={() => ir('acceso')}>Iniciar sesión</button></Vacio></div>;
  }
  const enlaces = [['inicio', 'Inicio'], ['propiedades', 'Propiedades'], ['servicios', 'Servicios'], ['asistente', 'Asistente']];
  return <div className="app">
    <header className="cab"><div className="contenedor cab-in">
      <button className="marca" onClick={() => ir('inicio')} aria-label="Ir al inicio"><img src="/epresedi-logo.png" alt="Logo EPRESEDI"/><span><b>EPRESEDI</b><small>GESTIÓN INMOBILIARIA</small></span></button>
      <nav className={'nav' + (menu ? ' abierto' : '')} aria-label="Principal">
        {enlaces.map(([k, t]) => <a key={k} href={'#/' + k} className={raiz === k ? 'activo' : ''}>{t}</a>)}
        {usaPanel(usuario) && <a href="#/panel/resumen"><LayoutDashboard size={15}/> Mi panel</a>}
      </nav>
      <div className="cab-acc"><Tema/>
        <a className="btn ghost sm" href="#/cuenta/lista" title="Mi lista de interés" aria-label="Mi lista de interés" style={{ position: 'relative' }}><Heart size={18}/>{fav.ids.length > 0 && <span style={{ position: 'absolute', top: -2, right: -2, background: '#c0392b', color: '#fff', borderRadius: 9, fontSize: 10, fontWeight: 700, padding: '0 5px' }}>{fav.ids.length}</span>}</a>
        {usuario ? <button className="btn sec sm" onClick={() => salir()}><LogOut size={16}/> Salir</button> : <button className="btn sm" onClick={() => ir('acceso')}><LogIn size={16}/> Ingresar</button>}</div>
      <button className="btn ghost icono menu-mov" onClick={() => setMenu(!menu)} aria-label="Menú">{menu ? <X size={22}/> : <Menu size={22}/>}</button>
    </div></header>
    <main>
      {raiz === 'inicio' && <Inicio propiedades={propiedades} tipos={tipos} ir={ir}/>}
      {raiz === 'propiedades' && <Catalogo key={JSON.stringify(filtros)} propiedades={propiedades} tipos={tipos} cargando={cargando} filtroInicial={filtros}/>}
      {raiz === 'servicios' && <Servicios/>}
      {raiz === 'asistente' && <Asistente tipos={tipos}/>}
      {raiz === 'acceso' && <Acceso onEntrar={entrar}/>}
      {raiz === 'cuenta' && <Cuenta usuario={usuario} tab={sub} ir={ir} propiedades={propiedades} tipos={tipos} onPerfil={actualizarPerfil}/>}
      {!['inicio', 'propiedades', 'asistente', 'acceso', 'cuenta', 'servicios'].includes(raiz) && <div className="contenedor"><Vacio titulo="Página no encontrada"><button className="btn" onClick={() => ir('inicio')}>Volver al inicio</button></Vacio></div>}
    </main>
    <footer className="pie"><div className="contenedor pie-in">
      <div className="marca"><img src="/epresedi-logo.png" alt="" style={{ width: 40, height: 40 }}/><span><b>EPRESEDI S.A.S.</b><small>EMPRESA PRESTADORA DE SERVICIOS DIVERSOS</small></span></div>
      <p>© {new Date().getFullYear()} EPRESEDI S.A.S. Todos los derechos reservados.</p></div></footer>
  </div>;
}

createRoot(document.getElementById('root')).render(<ProveedorToast><App/></ProveedorToast>);
