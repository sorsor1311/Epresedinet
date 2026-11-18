import React from 'react';
import { MESES, deYmd } from './api.js';

/** Gráfico de líneas con área (SVG propio, sin librerías). series: [{ clave, nombre, color }] */
export function LineaTiempo({ datos, series, alto = 220 }) {
  const W = 680, H = alto, m = { t: 12, r: 12, b: 26, l: 32 };
  const max = Math.max(4, ...datos.flatMap(d => series.map(s => d[s.clave] || 0)));
  const techo = Math.ceil(max / 4) * 4;
  const x = i => m.l + (i / Math.max(1, datos.length - 1)) * (W - m.l - m.r);
  const y = v => m.t + (1 - v / techo) * (H - m.t - m.b);
  const ruta = c => datos.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d[c] || 0).toFixed(1)}`).join(' ');
  const paso = Math.max(1, Math.ceil(datos.length / 8));
  return <div><svg viewBox={`0 0 ${W} ${H}`} className="grafico" role="img" aria-label="Evolución en el tiempo">
    {[0, 1, 2, 3, 4].map(i => { const v = (techo / 4) * i; return <g key={i}><line x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} stroke="#e6ebf2"/><text x={m.l - 6} y={y(v) + 4} textAnchor="end">{v}</text></g>; })}
    {datos.map((d, i) => i % paso === 0 && <text key={d.dia} x={x(i)} y={H - 8} textAnchor="middle">{deYmd(d.dia).getDate()} {MESES[deYmd(d.dia).getMonth()].slice(0, 3)}</text>)}
    {series.map((s, k) => <g key={s.clave}>
      {k === 0 && <path d={`${ruta(s.clave)} L${x(datos.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill={s.color} opacity=".09"/>}
      <path d={ruta(s.clave)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round"/>
      {datos.length <= 31 && datos.map((d, i) => (d[s.clave] ? <circle key={i} cx={x(i)} cy={y(d[s.clave])} r="3" fill="#fff" stroke={s.color} strokeWidth="2"><title>{`${d.dia}: ${d[s.clave]} ${s.nombre.toLowerCase()}`}</title></circle> : null))}
    </g>)}
  </svg><div className="leyenda">{series.map(s => <span key={s.clave}><i style={{ background: s.color }}/>{s.nombre}</span>)}</div></div>;
}

/** Barras verticales simples (p. ej. citas por día). */
export function Columnas({ datos, alto = 150, color = '#18488e' }) {
  const max = Math.max(1, ...datos.map(d => d.valor));
  return <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: alto }}>
    {datos.map(d => <div key={d.etiqueta} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, height: '100%', justifyContent: 'flex-end', fontSize: 11, color: '#64768d' }} title={`${d.etiqueta}: ${d.valor}`}>
      <b style={{ color: '#1a2b42', fontSize: 12 }}>{d.valor}</b><i style={{ width: '100%', maxWidth: 30, height: `${(d.valor / max) * 100}%`, minHeight: 3, background: color, borderRadius: '3px 3px 0 0' }}/><span>{d.etiqueta}</span></div>)}
  </div>;
}

/** Lista de barras horizontales. items: [{ nombre, valor, extra? }] */
export function BarrasLista({ items, color = '#18488e', formato = v => v, vacio = 'Sin datos en este periodo' }) {
  const max = Math.max(1, ...items.map(i => i.valor));
  if (!items.length) return <p style={{ color: '#64768d', fontSize: 13 }}>{vacio}</p>;
  return <div>{items.map(i => <div className="barra-l" key={i.nombre}><span title={i.nombre} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.nombre}</span>
    <div className="pista"><div className="rell" style={{ width: (i.valor / max) * 100 + '%', background: i.color || color }}/></div><b>{formato(i.valor)}</b></div>)}</div>;
}

/** Barra apilada con leyenda (p. ej. inmuebles por estado). */
export function Apilada({ segmentos }) {
  const total = segmentos.reduce((a, s) => a + s.valor, 0) || 1;
  return <div><div className="apilada">{segmentos.filter(s => s.valor).map(s => <i key={s.nombre} style={{ width: (s.valor / total) * 100 + '%', background: s.color }} title={`${s.nombre}: ${s.valor}`}/>)}</div>
    <div className="leyenda" style={{ marginTop: 12 }}>{segmentos.map(s => <span key={s.nombre}><i style={{ background: s.color }}/>{s.nombre} <b style={{ color: '#1a2b42' }}>{s.valor}</b></span>)}</div></div>;
}

/** Embudo comercial: búsquedas → interesados → citas → atendidas. */
export function Embudo({ pasos }) {
  const max = Math.max(1, pasos[0]?.valor || 1, ...pasos.map(p => p.valor));
  return <div className="embudo">{pasos.map((p, i) => <div className="emb-paso" key={p.nombre}><span>{p.nombre}</span>
    <div className="pista"><div className="rell" style={{ width: Math.max(4, (p.valor / max) * 100) + '%', background: ['#0b2650', '#18488e', '#1689a9', '#1c8c5e'][i % 4] }}>{p.valor}</div></div>
    <span style={{ color: '#64768d' }}>{i && pasos[i - 1].valor && p.valor <= pasos[i - 1].valor ? Math.round((p.valor / pasos[i - 1].valor) * 100) + '% del paso previo' : ''}</span></div>)}</div>;
}
