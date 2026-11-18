import React, { useMemo, useState } from 'react';
import { Search, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { Vacio, Cargando } from '../ui.jsx';

/** Tabla con búsqueda y paginación. columnas: [{ t: 'Título', f: fila => nodo, b: fila => texto buscable }] */
export default function Tabla({ columnas, filas, cargando, vacio = 'No hay registros todavía', porPagina = 12, acciones, herramientas, buscable = true }) {
  const [q, setQ] = useState('');
  const [pag, setPag] = useState(0);
  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? (filas || []).filter(f => JSON.stringify(Object.values(f)).toLowerCase().includes(t)) : (filas || []);
  }, [filas, q]);
  const paginas = Math.max(1, Math.ceil(lista.length / porPagina));
  const visibles = lista.slice(pag * porPagina, (pag + 1) * porPagina);
  return <div>
    <div className="herr">
      {buscable && <div style={{ position: 'relative' }}><Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--muted)' }}/><input className="input" style={{ paddingLeft: 36 }} placeholder="Buscar…" value={q} onChange={e => { setQ(e.target.value); setPag(0); }} aria-label="Buscar"/></div>}
      {herramientas}</div>
    <div className="tbl-caja">
      {cargando ? <Cargando/> : lista.length === 0 ? <Vacio icono={Inbox} titulo={q ? 'Sin coincidencias' : vacio}/> :
        <table><thead><tr>{columnas.map(c => <th key={c.t}>{c.t}</th>)}{acciones && <th/>}</tr></thead>
          <tbody>{visibles.map((f, i) => <tr key={i}>{columnas.map(c => <td key={c.t}>{c.f(f)}</td>)}{acciones && <td className="acc">{acciones(f)}</td>}</tr>)}</tbody></table>}
      {lista.length > porPagina && <div className="paginacion"><span>{pag * porPagina + 1}–{Math.min(lista.length, (pag + 1) * porPagina)} de {lista.length}</span>
        <div style={{ display: 'flex', gap: 6 }}><button className="btn sec sm icono" disabled={pag === 0} onClick={() => setPag(pag - 1)} aria-label="Página anterior"><ChevronLeft size={16}/></button><button className="btn sec sm icono" disabled={pag >= paginas - 1} onClick={() => setPag(pag + 1)} aria-label="Página siguiente"><ChevronRight size={16}/></button></div></div>}
    </div></div>;
}
