import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { X, CheckCircle2, AlertCircle, Info, Home, Building2, Trees, Store, Inbox, Eye, EyeOff, Sun, Moon } from 'lucide-react';
import { TONO_ESTADO, cap, urlFoto } from './api.js';

const ContextoToast = createContext(() => {});
export const useToast = () => useContext(ContextoToast);
export function ProveedorToast({ children }) {
  const [lista, setLista] = useState([]);
  const quitar = id => setLista(l => l.filter(t => t.id !== id));
  const mostrar = useCallback((texto, tipo = 'ok') => {
    const id = Math.random();
    setLista(l => [...l, { id, texto, tipo }]);
    setTimeout(() => quitar(id), tipo === 'error' ? 7000 : 4000);
  }, []);
  return <ContextoToast.Provider value={mostrar}>{children}
    <div className="toasts" role="status" aria-live="polite">{lista.map(t => <div key={t.id} className={'toast ' + t.tipo}>
      {t.tipo === 'ok' ? <CheckCircle2 size={18}/> : t.tipo === 'error' ? <AlertCircle size={18}/> : <Info size={18}/>}<span>{t.texto}</span>
      <button onClick={() => quitar(t.id)} aria-label="Cerrar"><X size={16}/></button></div>)}</div>
  </ContextoToast.Provider>;
}

function useCierre(cerrar) {
  useEffect(() => {
    const tecla = e => e.key === 'Escape' && cerrar();
    document.addEventListener('keydown', tecla);
    const previo = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', tecla); document.body.style.overflow = previo; };
  }, [cerrar]);
}
export function Modal({ titulo, subtitulo, onCerrar, ancho = 560, children, lateral = false }) {
  useCierre(onCerrar);
  const velo = useRef();
  return <div className={'velo' + (lateral ? ' drawer-velo' : '')} ref={velo} onMouseDown={e => e.target === velo.current && onCerrar()}>
    <div className={lateral ? 'drawer' : 'modal'} style={{ '--ancho': ancho + 'px' }} role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="modal-cab"><div><h2>{titulo}</h2>{subtitulo && <p>{subtitulo}</p>}</div>
        <button className="btn ghost icono" onClick={onCerrar} aria-label="Cerrar"><X size={20}/></button></div>
      <div className="modal-cuerpo">{children}</div>
    </div></div>;
}

export const Badge = ({ tono, children }) => <span className={'badge ' + (tono || '')}>{children}</span>;
export const BadgeEstado = ({ estado }) => <span className={'etq ' + (TONO_ESTADO[estado] || '')}>{cap(estado)}</span>;
export const Cargando = ({ texto = 'Cargando…' }) => <div className="cargando"><span className="giro"/> {texto}</div>;
export const Vacio = ({ icono: Icono = Inbox, titulo, texto, children }) => <div className="vacio"><Icono size={42}/><h3>{titulo}</h3>{texto && <p>{texto}</p>}{children}</div>;
export const Aviso = ({ tipo = '', children }) => <div className={'aviso ' + tipo} role={tipo === 'error' ? 'alert' : undefined}><Info size={18}/><div>{children}</div></div>;
function Clave({ campo }) {
  const [visible, setVisible] = useState(false);
  return <span className="clave-campo">{React.cloneElement(campo, { type: visible ? 'text' : 'password' })}<button type="button" className="btn ghost icono" aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={visible} onClick={() => setVisible(v => !v)}>{visible ? <EyeOff size={18}/> : <Eye size={18}/>}</button></span>;
}
export const Campo = ({ etiqueta, ayuda, children, className = '' }) => <label className={'campo ' + className}>{etiqueta}{React.Children.map(children, c => React.isValidElement(c) && c.type === 'input' && c.props.type === 'password' ? <Clave campo={c}/> : c)}{ayuda && <small>{ayuda}</small>}</label>;
export function Tema() {
  const [oscuro, setOscuro] = useState(() => localStorage.getItem('epresedi-tema') === 'oscuro');
  useEffect(() => { document.documentElement.dataset.tema = oscuro ? 'oscuro' : 'claro'; localStorage.setItem('epresedi-tema', oscuro ? 'oscuro' : 'claro'); }, [oscuro]);
  return <button type="button" className="btn ghost icono" title={oscuro ? 'Modo claro' : 'Modo oscuro'} aria-label={oscuro ? 'Activar modo claro' : 'Activar modo oscuro'} onClick={() => setOscuro(v => !v)}>{oscuro ? <Sun size={19}/> : <Moon size={19}/>}</button>;
}
export function MapaInmueble({ propiedad }) {
  const ubicacion = [propiedad.direccion, propiedad.barrio, propiedad.zona, propiedad.municipio, 'Colombia'].filter(Boolean).join(', ');
  const q = encodeURIComponent(ubicacion);
  return <section style={{ marginTop: 14 }}><h4>Ubicación aproximada</h4><iframe title="Mapa de ubicación aproximada" src={'https://maps.google.com/maps?q=' + q + '&output=embed'} loading="lazy" referrerPolicy="no-referrer-when-downgrade" style={{ width: '100%', height: 220, border: 0, borderRadius: 8 }}/><a href={'https://www.google.com/maps/search/?api=1&query=' + q} target="_blank" rel="noopener noreferrer">Consultar en Google Maps</a></section>;
}

export const iconoTipo = nombre => ({ casa: Home, apartamento: Building2, lote: Trees, local: Store }[String(nombre || '').toLowerCase()] || Building2);
export function FotoInmueble({ propiedad, tipo, alt }) {
  const [fallo, setFallo] = useState(false);
  const Icono = iconoTipo(tipo);
  const foto = urlFoto(propiedad.fotos?.[0] || propiedad.foto_url);
  return foto && !fallo
    ? <img src={foto} alt={alt || propiedad.direccion} loading="lazy" onError={() => setFallo(true)}/>
    : <div className="inm-ph" aria-hidden="true"><Icono size={48}/></div>;
}

export function usePeticion(funcion, dependencias) {
  const [estado, setEstado] = useState({ datos: null, cargando: true, error: '' });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let vigente = true;
    setEstado(e => ({ ...e, cargando: true, error: '' }));
    funcion().then(datos => vigente && setEstado({ datos, cargando: false, error: '' }))
      .catch(e => vigente && setEstado({ datos: null, cargando: false, error: e.message }));
    return () => { vigente = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencias, version]);
  return { ...estado, recargar: () => setVersion(v => v + 1) };
}
