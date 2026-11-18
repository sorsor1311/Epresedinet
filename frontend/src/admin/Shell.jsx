import React, { useEffect, useRef, useState } from 'react';
import { LayoutDashboard, CalendarDays, Inbox, Users, Building2, UserCheck, BarChart3, Bell, History, FileText, Wallet, Hammer, MapPinned, UserRound, Home, ShieldCheck, Menu, ChevronDown, LogOut, UserCog, Globe, ClipboardList, KeyRound, Briefcase } from 'lucide-react';
import { api } from '../api.js';
import { usePeticion } from '../ui.jsx';

// Menú por rol. [clave, etiqueta, icono]
const MENUS = {
  Administrador: [
    ['Panel', [['resumen', 'Resumen', LayoutDashboard], ['calendario', 'Calendario', CalendarDays]]],
    ['Atención al cliente', [['citas', 'Solicitudes y citas', Inbox], ['interesados', 'Clientes interesados', Users], ['historial', 'Búsquedas de clientes', History]]],
    ['Inventario', [['propiedades', 'Propiedades', Building2], ['propietarios', 'Propietarios', Home]]],
    ['Equipo', [['asesores', 'Asesores y horarios', UserCheck]]],
    ['Operación', [['contratos', 'Contratos', FileText], ['pagos', 'Pagos', Wallet], ['remodelaciones', 'Remodelaciones', Hammer], ['visitas', 'Visitas', MapPinned], ['clientes', 'Clientes registrados', UserRound]]],
    ['Análisis y control', [['reportes', 'Reportes y análisis', BarChart3], ['notificaciones', 'Notificaciones', Bell], ['auditoria', 'Registro de actividad', ShieldCheck]]]
  ],
  Agente: [
    ['Mi trabajo', [['resumen', 'Resumen del día', LayoutDashboard], ['calendario', 'Mi calendario', CalendarDays], ['citas', 'Mis citas', Inbox], ['interesados', 'Mis clientes', Users], ['asesores', 'Mi disponibilidad', UserCheck]]],
    ['Inventario', [['propiedades', 'Propiedades', Building2]]],
    ['Operación', [['contratos', 'Contratos', FileText], ['visitas', 'Visitas', MapPinned], ['remodelaciones', 'Remodelaciones', Hammer]]],
    ['Seguimiento', [['reportes', 'Reportes y análisis', BarChart3], ['notificaciones', 'Notificaciones', Bell]]]
  ],
  Propietario: [
    ['Mi cuenta', [['resumen', 'Resumen', LayoutDashboard], ['inmuebles', 'Mis inmuebles', Building2], ['contratos', 'Contratos y pagos', FileText]]]
  ]
};
export const seccionesDe = rol => (MENUS[rol] || []).flatMap(([, items]) => items.map(i => i[0])).concat('perfil');
/** Título de una sección según el menú del rol (cada rol puede llamarla distinto: "Calendario" vs "Mi calendario"). */
export const tituloDe = (rol, clave) => {
  if (clave === 'perfil') return 'Mi perfil';
  for (const [, items] of MENUS[rol] || []) { const i = items.find(x => x[0] === clave); if (i) return i[1]; }
  return 'Panel';
};

export default function Shell({ usuario, seccion, ir, onSalir, irSitio, children }) {
  const [abierta, setAbierta] = useState(false);
  const [menuU, setMenuU] = useState(false);
  const ref = useRef();
  useEffect(() => { const f = e => { if (ref.current && !ref.current.contains(e.target)) setMenuU(false); }; document.addEventListener('mousedown', f); return () => document.removeEventListener('mousedown', f); }, []);
  useEffect(() => setAbierta(false), [seccion]);
  const personal = usuario.rol !== 'Propietario';
  const n = usePeticion(() => (personal ? api('/atencion/notificaciones').then(l => l.filter(x => Date.now() - new Date(x.creada_en.replace(' ', 'T')).getTime() < 864e5).length).catch(() => 0) : Promise.resolve(0)), [usuario.id_usuario]);
  const menu = MENUS[usuario.rol] || [];
  const nombre = usuario.nombre || usuario.usuario;
  return <div className="shell">
    <aside className={'side' + (abierta ? ' abierta' : '')}>
      <button className="side-marca" onClick={irSitio} aria-label="Ir al sitio público"><img src="/epresedi-logo.png" alt=""/><span><b>EPRESEDI</b><small>{usuario.rol === 'Propietario' ? 'PORTAL DEL PROPIETARIO' : 'PANEL DE GESTIÓN'}</small></span></button>
      <nav className="side-nav" aria-label="Menú principal">
        {menu.map(([grupo, items]) => <React.Fragment key={grupo}><div className="side-grupo">{grupo}</div>
          {items.map(([k, t, I]) => <button key={k} className={'side-item' + (seccion === k ? ' on' : '')} onClick={() => ir(k)}><I size={17}/> {tituloDe(usuario.rol, k)}
            {k === 'notificaciones' && n.datos > 0 && <span className="cuenta">{n.datos}</span>}</button>)}</React.Fragment>)}
      </nav>
      <div className="side-pie">EPRESEDI S.A.S. · v2</div>
    </aside>
    <div className="main">
      <header className="topbar">
        <button className="icon-btn burger" onClick={() => setAbierta(!abierta)} aria-label="Menú"><Menu size={20}/></button>
        <div className="migas"><span>{usuario.rol === 'Propietario' ? 'Portal' : 'Gestión'}</span><span>/</span><b>{tituloDe(usuario.rol, seccion)}</b></div>
        <div className="top-der">
          <button className="icon-btn" title="Ver el sitio público" onClick={irSitio}><Globe size={18}/></button>
          {personal && <button className="icon-btn" title="Notificaciones" onClick={() => ir('notificaciones')}><Bell size={18}/>{n.datos > 0 && <span className="punto-n">{n.datos}</span>}</button>}
          <div className="usuario-menu" ref={ref}>
            <button className="usuario-btn" onClick={() => setMenuU(!menuU)} aria-haspopup="menu" aria-expanded={menuU}>
              <span className="avatar-i">{String(nombre)[0]?.toUpperCase()}</span><div><b>{nombre}</b><small>{usuario.rol === 'Agente' ? 'Asesor' : usuario.rol}</small></div><ChevronDown size={15} color="#64768d"/></button>
            {menuU && <div className="menu-flot" role="menu">
              <button role="menuitem" onClick={() => { setMenuU(false); ir('perfil'); }}><UserCog size={16}/> Mi perfil y contraseña</button>
              <button role="menuitem" onClick={() => { setMenuU(false); irSitio(); }}><Globe size={16}/> Ver sitio público</button><hr/>
              <button role="menuitem" onClick={onSalir}><LogOut size={16}/> Cerrar sesión</button></div>}
          </div>
        </div>
      </header>
      <main className="pagina" key={seccion}>{children}</main>
    </div>
  </div>;
}
export const Cab = ({ titulo, sub, children }) => <div className="ph"><div><h1>{titulo}</h1>{sub && <p>{sub}</p>}</div>{children && <div className="ph-acc">{children}</div>}</div>;
