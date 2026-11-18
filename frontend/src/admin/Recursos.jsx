import React, { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api, dinero, fechaCorta, horaDe, cap } from '../api.js';
import { Modal, Campo, Badge, usePeticion, useToast } from '../ui.jsx';
import Tabla from './Tabla.jsx';
import { Cab } from './Shell.jsx';

const LOOK = {
  propiedad: { ruta: '/propiedades', id: 'id_propiedad', texto: p => `#${p.id_propiedad} · ${p.direccion}` },
  cliente: { ruta: '/clientes', id: 'id_cliente', texto: c => c.nombre },
  agente: { ruta: '/agentes', id: 'id_agente', texto: a => a.nombre },
  propietario: { ruta: '/propietarios', id: 'id_propietario', texto: p => p.nombre },
  contrato: { ruta: '/contratos', id: 'id_contrato', texto: c => `Contrato #${c.id_contrato}` }
};
const fk = (clave, etiqueta, look) => ({ clave, etiqueta, tipo: 'lookup', look });

const CONFIG = {
  contratos: { titulo: 'Contratos', desc: 'Acuerdos de venta y arriendo', id: 'id_contrato', nuevo: 'Nuevo contrato',
    campos: [fk('fk_propiedad', 'Inmueble', 'propiedad'), fk('fk_cliente', 'Cliente', 'cliente'), fk('fk_agente', 'Asesor', 'agente'), fk('fk_propietario', 'Propietario', 'propietario'),
      { clave: 'fecha_inicio', etiqueta: 'Fecha de inicio', tipo: 'fecha' }, { clave: 'fecha_final', etiqueta: 'Fecha final', tipo: 'fecha' }, { clave: 'valor_total', etiqueta: 'Valor total (COP)', tipo: 'dinero' }],
    columnas: (f, L) => [{ t: '#', f: c => c.id_contrato }, { t: 'Inmueble', f: c => L.propiedad(c.fk_propiedad) }, { t: 'Cliente', f: c => L.cliente(c.fk_cliente) }, { t: 'Asesor', f: c => L.agente(c.fk_agente) },
      { t: 'Vigencia', f: c => `${fechaCorta(c.fecha_inicio)} → ${fechaCorta(c.fecha_final)}` }, { t: 'Valor', f: c => dinero(c.valor_total) }] },
  pagos: { titulo: 'Pagos', desc: 'Pagos asociados a contratos', id: 'id_pago', nuevo: 'Registrar pago',
    campos: [fk('fk_contrato', 'Contrato', 'contrato'), { clave: 'pago_total', etiqueta: 'Monto (COP)', tipo: 'dinero' }],
    columnas: (f, L) => [{ t: '#', f: p => p.id_pago }, { t: 'Contrato', f: p => L.contrato(p.fk_contrato) }, { t: 'Monto', f: p => dinero(p.pago_total) }, { t: 'Fecha', f: p => fechaCorta(p.fecha_pago) }] },
  remodelaciones: { titulo: 'Remodelaciones', desc: 'Obras, presupuestos y seguimiento', id: 'id_remodelacion', nuevo: 'Nueva remodelación',
    campos: [fk('fk_propiedad', 'Inmueble', 'propiedad'), fk('fk_cliente', 'Cliente', 'cliente'), fk('fk_agente', 'Asesor', 'agente'),
      { clave: 'estado', etiqueta: 'Estado', tipo: 'select', opciones: ['Cotización', 'En proceso', 'Finalizada', 'Cancelada'], opcional: true },
      { clave: 'presupuesto_estimado', etiqueta: 'Presupuesto estimado (COP)', tipo: 'dinero' }, { clave: 'fecha_inicio', etiqueta: 'Inicio', tipo: 'fecha', opcional: true }, { clave: 'fecha_fin_estimada', etiqueta: 'Fin estimado', tipo: 'fecha', opcional: true },
      { clave: 'descripcion_obra', etiqueta: 'Descripción de la obra', tipo: 'texto', completo: true }],
    columnas: (f, L) => [{ t: '#', f: r => r.id_remodelacion }, { t: 'Inmueble', f: r => L.propiedad(r.fk_propiedad) }, { t: 'Cliente', f: r => L.cliente(r.fk_cliente) }, { t: 'Obra', f: r => <span title={r.descripcion_obra}>{String(r.descripcion_obra).slice(0, 40)}</span> },
      { t: 'Presupuesto', f: r => dinero(r.presupuesto_estimado) }, { t: 'Estado', f: r => <Badge tono={{ 'En proceso': 'info', Finalizada: 'ok', Cancelada: 'muted' }[r.estado] || 'warn'}>{r.estado}</Badge> }] },
  visitas: { titulo: 'Visitas', desc: 'Recorridos de clientes registrados con un asesor (también aparecen en el calendario)', id: 'id_visita', nuevo: 'Nueva visita',
    campos: [fk('fk_cliente', 'Cliente', 'cliente'), fk('fk_propiedad', 'Inmueble', 'propiedad'), fk('fk_agente', 'Asesor', 'agente'), { clave: 'fecha', etiqueta: 'Fecha y hora', tipo: 'fecha' }],
    columnas: (f, L) => [{ t: '#', f: v => v.id_visita }, { t: 'Fecha', f: v => <>{fechaCorta(v.fecha)}<span className="sub">{horaDe(v.fecha)}</span></> }, { t: 'Cliente', f: v => L.cliente(v.fk_cliente) }, { t: 'Inmueble', f: v => L.propiedad(v.fk_propiedad) }, { t: 'Asesor', f: v => L.agente(v.fk_agente) }] }
};

const aInput = v => (v ? String(v).replace(' ', 'T').slice(0, 16) : '');
const aServidor = v => (v ? v.replace('T', ' ') + (v.length === 16 ? ':00' : '') : v);

function Formulario({ cfg, clave, fila, listas, onCerrar, onGuardado }) {
  const toast = useToast();
  const [ocupado, setOcupado] = useState(false);
  async function enviar(e) {
    e.preventDefault(); setOcupado(true);
    const datos = Object.fromEntries([...new FormData(e.currentTarget)].filter(([, v]) => String(v).trim() !== ''));
    for (const c of cfg.campos) if (c.tipo === 'fecha' && datos[c.clave]) datos[c.clave] = aServidor(datos[c.clave]);
    try { await api(`/${clave}${fila ? '/' + fila[cfg.id] : ''}`, { metodo: fila ? 'PUT' : 'POST', cuerpo: datos }); toast(fila ? 'Registro actualizado' : 'Registro creado'); onGuardado(); }
    catch (err) { toast(err.message, 'error'); } finally { setOcupado(false); }
  }
  return <Modal titulo={fila ? 'Editar registro' : cfg.nuevo} onCerrar={onCerrar} ancho={640}>
    <form onSubmit={enviar}><div className="rejilla-form">{cfg.campos.map(c => <Campo key={c.clave} etiqueta={c.etiqueta + (c.opcional ? ' (opcional)' : '')} className={c.completo ? 'completo' : ''}>
      {c.tipo === 'lookup' ? <select name={c.clave} required defaultValue={fila?.[c.clave] ?? ''}><option value="">Selecciona…</option>{(listas[c.look] || []).map(x => <option key={x[LOOK[c.look].id]} value={x[LOOK[c.look].id]}>{LOOK[c.look].texto(x)}</option>)}</select>
        : c.tipo === 'select' ? <select name={c.clave} defaultValue={fila?.[c.clave] ?? c.opciones[0]}>{c.opciones.map(o => <option key={o}>{o}</option>)}</select>
        : c.tipo === 'texto' ? <textarea name={c.clave} required={!c.opcional} defaultValue={fila?.[c.clave] ?? ''}/>
        : c.tipo === 'fecha' ? <input type="datetime-local" name={c.clave} required={!c.opcional} defaultValue={aInput(fila?.[c.clave])}/>
        : <input type="number" min="0" step="any" name={c.clave} required defaultValue={fila?.[c.clave] ?? ''}/>}</Campo>)}</div>
      <div className="acciones-form"><button type="button" className="btn ghost" onClick={onCerrar}>Cancelar</button><button className="btn" disabled={ocupado}>{ocupado ? 'Guardando…' : 'Guardar'}</button></div></form></Modal>;
}

export function RecursoCRUD({ clave, usuario }) {
  const toast = useToast();
  const cfg = CONFIG[clave];
  const [form, setForm] = useState(null);
  const necesarios = [...new Set(cfg.campos.filter(c => c.tipo === 'lookup').map(c => c.look))];
  const r = usePeticion(async () => {
    const [filas, ...ls] = await Promise.all([api('/' + clave), ...necesarios.map(n => api(LOOK[n].ruta))]);
    return { filas, listas: Object.fromEntries(necesarios.map((n, i) => [n, ls[i]])) };
  }, [clave]);
  const nombre = look => id => { const x = r.datos?.listas[look]?.find(y => y[LOOK[look].id] === id); return x ? LOOK[look].texto(x) : '#' + id; };
  const L = { propiedad: nombre('propiedad'), cliente: nombre('cliente'), agente: nombre('agente'), contrato: nombre('contrato'), propietario: nombre('propietario') };
  async function eliminar(f) {
    if (!window.confirm('¿Eliminar este registro? Esta acción no se puede deshacer.')) return;
    try { await api(`/${clave}/${f[cfg.id]}`, { metodo: 'DELETE' }); toast('Registro eliminado'); r.recargar(); } catch (e) { toast(e.message, 'error'); }
  }
  return <div>
    <div className="ph"><div><h1>{cfg.titulo}</h1><p>{cfg.desc}</p></div><button className="btn" onClick={() => setForm({})}><Plus size={17}/> {cfg.nuevo}</button></div>
    <Tabla cargando={r.cargando} filas={r.datos?.filas} columnas={cfg.columnas(null, L)} vacio={`Aún no hay ${cfg.titulo.toLowerCase()} registrados`}
      acciones={f => <><button className="btn sm sec" onClick={() => setForm({ fila: f })}><Pencil size={14}/> Editar</button>{usuario.rol === 'Administrador' && <> <button className="btn sm peligro icono" aria-label="Eliminar" onClick={() => eliminar(f)}><Trash2 size={14}/></button></>}</>}/>
    {form && r.datos && <Formulario cfg={cfg} clave={clave} fila={form.fila} listas={r.datos.listas} onCerrar={() => setForm(null)} onGuardado={() => { setForm(null); r.recargar(); }}/>}
  </div>;
}

const LISTAS = {
  clientes: { titulo: 'Clientes', desc: 'Clientes con cuenta en el sistema', ruta: '/clientes', cols: [{ t: 'Nombre', f: c => <b>{c.nombre}</b> }, { t: 'Teléfono', f: c => c.telefono }, { t: 'Profesión', f: c => c.profesion }] },
  propietarios: { titulo: 'Propietarios', desc: 'Dueños de los inmuebles', ruta: '/propietarios', cols: [{ t: 'Nombre', f: c => <b>{c.nombre}</b> }, { t: 'Teléfono', f: c => c.telefono }] },
  interesados: { titulo: 'Clientes interesados', desc: 'Personas que dejaron sus datos desde el asistente o por atención directa', ruta: '/atencion/interesados',
    cols: [{ t: 'Nombre', f: i => <><b>{i.nombre}</b><span className="sub">{i.edad} años · {i.ocupacion}</span></> }, { t: 'Contacto', f: i => <>{i.correo}<span className="sub">{i.telefono || ''}</span></> }, { t: 'Citas', f: i => i.citas }, { t: 'Última cita', f: i => i.ultima_cita ? fechaCorta(i.ultima_cita) : '—' }, { t: 'Registrado', f: i => fechaCorta(i.creado_en) }] },
  auditoria: { titulo: 'Registro de actividad', desc: 'Quién hizo qué en el sistema (cambios de inventario, citas, asesores y operación)', ruta: '/atencion/auditoria',
    cols: [{ t: 'Fecha', f: a => <>{fechaCorta(a.creada_en)}<span className="sub">{horaDe(a.creada_en)}</span></> }, { t: 'Usuario', f: a => a.usuario || 'Sistema' }, { t: 'Acción', f: a => cap(a.accion) }, { t: 'Entidad', f: a => `${cap(a.entidad)}${a.id_entidad ? ' #' + a.id_entidad : ''}` }, { t: 'Detalle', f: a => a.detalle || '—' }] },
  notificaciones: { titulo: 'Notificaciones', desc: 'Correos de confirmación y avisos de citas', ruta: '/atencion/notificaciones',
    cols: [{ t: 'Fecha', f: n => <>{fechaCorta(n.creada_en)}<span className="sub">{horaDe(n.creada_en)}</span></> }, { t: 'Destino', f: n => n.correo_destino }, { t: 'Asunto', f: n => n.asunto }, { t: 'Envío', f: n => n.enviada ? <Badge tono="ok">Enviada</Badge> : <Badge tono="warn" >Solo registrada</Badge> }] },
  historial: { titulo: 'Historial de búsquedas', desc: 'Lo que buscan los clientes (base de las recomendaciones)', ruta: '/atencion/historial',
    cols: [{ t: 'Fecha', f: b => fechaCorta(b.creada_en) }, { t: 'Tipo', f: b => b.tipo || 'Cualquiera' }, { t: 'Negociación', f: b => cap(b.modalidad) }, { t: 'Zona', f: b => b.zona || 'Cualquiera' }, { t: 'Presupuesto', f: b => dinero(b.presupuesto) }, { t: 'Cliente', f: b => b.usuario || 'Visitante' }] }
};
export function ListaSimple({ clave }) {
  const c = LISTAS[clave];
  const r = usePeticion(() => api(c.ruta), [clave]);
  return <div><Cab titulo={c.titulo} sub={c.desc}/><Tabla cargando={r.cargando} filas={r.datos} columnas={c.cols} vacio="Sin registros por ahora"/></div>;
}
