import React, { useState } from 'react';
import { CalendarCheck, Copy, Check } from 'lucide-react';
import { api, fechaHora } from '../api.js';
import { Campo, useToast } from '../ui.jsx';
import SelectorHorario from './SelectorHorario.jsx';

/** RF005 + RF006 + RF007 + RF008: datos del interesado, horario y confirmación con asesor asignado. */
export default function FlujoCita({ propiedad, interesadoId, onInteresado, onListo }) {
  const toast = useToast();
  const [paso, setPaso] = useState(interesadoId ? 'horario' : 'datos');
  const [id, setId] = useState(interesadoId || null);
  const [hora, setHora] = useState({ fecha: '', hora: '' });
  const [tipoPersona, setTipoPersona] = useState('');
  const [modalidad, setModalidad] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');

  async function registrar(e) {
    e.preventDefault(); setOcupado(true); setError('');
    try {
      const d = Object.fromEntries(new FormData(e.currentTarget));
      const r = await api('/atencion/interesados', { metodo: 'POST', cuerpo: d });
      setId(r.id_interesado); onInteresado?.(r.id_interesado); setPaso('horario');
    } catch (err) { setError(err.message); } finally { setOcupado(false); }
  }
  async function agendar() {
    setOcupado(true); setError('');
    try { onListo(await api('/atencion/citas', { metodo: 'POST', cuerpo: { id_interesado: id, id_propiedad: propiedad.id_propiedad, ...hora, tipo_persona: tipoPersona, modalidad } })); }
    catch (err) { setError(err.message); toast(err.message, 'error'); } finally { setOcupado(false); }
  }
  if (paso === 'datos') return <form className="form-col" onSubmit={registrar}>
    <div className="rejilla-form">
      <Campo etiqueta="Nombre completo" className="completo"><input name="nombre" required autoComplete="name" autoFocus/></Campo>
      <Campo etiqueta="Edad"><input name="edad" type="number" min="18" max="110" required/></Campo>
      <Campo etiqueta="Ocupación"><input name="ocupacion" required/></Campo>
      <Campo etiqueta="Correo electrónico" ayuda="Aquí recibirás la confirmación"><input name="correo" type="email" required autoComplete="email"/></Campo>
      <Campo etiqueta="Teléfono (opcional)" ayuda="Para que el asesor te llame"><input name="telefono" inputMode="tel" autoComplete="tel"/></Campo>
    </div>
    {error && <p style={{ color: 'var(--danger)', fontSize: 14 }}>{error}</p>}
    <button className="btn block" disabled={ocupado}>{ocupado ? 'Guardando…' : 'Continuar'}</button>
  </form>;
  return <div className="form-col">
    <Campo etiqueta="Tipo de persona"><select required value={tipoPersona} onChange={e => setTipoPersona(e.target.value)}><option value="">Selecciona</option>{['Empleado', 'Independiente', 'Pensionado', 'Persona Jurídica'].map(t => <option key={t}>{t}</option>)}</select></Campo>
    <Campo etiqueta="Me interesa"><select required value={modalidad} onChange={e => setModalidad(e.target.value)}><option value="">Selecciona</option><option value="arriendo">Arrendar</option><option value="venta">Comprar</option></select></Campo>
    <SelectorHorario valor={hora} onCambio={setHora} autoFoco/>
    {error && <p style={{ color: 'var(--danger)', fontSize: 14 }}>{error}</p>}
    <button className="btn block" disabled={!hora.hora || ocupado || !tipoPersona || !modalidad} onClick={agendar}><CalendarCheck size={18}/> {ocupado ? 'Agendando…' : 'Confirmar cita'}</button>
    <p style={{ fontSize: 12.5, color: 'var(--muted)' }}>Te asignaremos automáticamente al asesor con la agenda más libre en ese horario.</p>
  </div>;
}

export function ConfirmacionCita({ cita, onGestionar }) {
  const [copiado, setCopiado] = useState(false);
  return <div className="confirmacion">
    <h4><CalendarCheck size={20}/> ¡Tu cita está confirmada!</h4>
    <dl><dt>Inmueble</dt><dd>{cita.propiedad}</dd><dt>Fecha</dt><dd>{fechaHora(cita.fecha_contacto)}</dd><dt>Asesor</dt><dd>{cita.asesor}</dd></dl>
    <p style={{ fontSize: 13, marginBottom: 8 }}>Guarda este código para cambiar o cancelar tu cita (también lo enviamos a tu correo):</p>
    <div className="codigo"><span style={{ flex: 1 }}>{cita.codigo_gestion}</span>
      <button className="btn sm sec" onClick={() => { navigator.clipboard?.writeText(cita.codigo_gestion); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }}>{copiado ? <Check size={14}/> : <Copy size={14}/>} {copiado ? 'Copiado' : 'Copiar'}</button></div>
    {onGestionar && <button className="btn sec sm" style={{ marginTop: 12 }} onClick={onGestionar}>Cambiar o cancelar mi cita</button>}
  </div>;
}

/** RF016: el cliente cambia o cancela su cita con el código de gestión. */
export function GestionarCita({ codigoInicial = '', onFin }) {
  const toast = useToast();
  const [codigo, setCodigo] = useState(codigoInicial);
  const [cita, setCita] = useState(null);
  const [modo, setModo] = useState('');
  const [hora, setHora] = useState({ fecha: '', hora: '' });
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  async function consultar(e) {
    e?.preventDefault(); setError(''); setOcupado(true);
    try { setCita(await api('/atencion/citas/consulta?codigo=' + encodeURIComponent(codigo.trim()))); } catch (err) { setError(err.message); setCita(null); } finally { setOcupado(false); }
  }
  async function ejecutar(accion) {
    setOcupado(true); setError('');
    try {
      const r = await api('/atencion/citas/gestionar', { metodo: 'PATCH', cuerpo: { codigo: codigo.trim(), accion, ...(accion === 'reprogramar' ? hora : {}) } });
      toast(accion === 'cancelar' ? 'Tu cita fue cancelada' : 'Tu cita fue reprogramada'); setModo('');
      setCita(c => ({ ...c, estado: accion === 'cancelar' ? 'cancelada' : 'reprogramada', fecha_contacto: r.fecha_contacto || c.fecha_contacto }));
      onFin?.(accion);
    } catch (err) { setError(err.message); } finally { setOcupado(false); }
  }
  const cerrada = cita && ['cancelada', 'atendida'].includes(cita.estado);
  return <div className="form-col">
    <form className="form-col" onSubmit={consultar}>
      <Campo etiqueta="Código de gestión" ayuda="Lo recibiste al confirmar tu cita"><input value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase())} required placeholder="EPR-XXXX-XXXX" spellCheck="false"/></Campo>
      <button className="btn sec" disabled={ocupado || !codigo.trim()}>Buscar mi cita</button>
    </form>
    {error && <p style={{ color: 'var(--danger)', fontSize: 14 }}>{error}</p>}
    {cita && <div className="tarjeta tarjeta-pad" style={{ boxShadow: 'none' }}>
      <b>{cita.propiedad}</b><p style={{ color: 'var(--muted)', fontSize: 14, margin: '4px 0 10px' }}>{fechaHora(cita.fecha_contacto)}{cita.asesor ? ` · Asesor ${cita.asesor}` : ''}</p>
      <span className={'badge ' + ({ cancelada: 'muted', atendida: 'ok' }[cita.estado] || 'info')}>{cita.estado}</span>
      {!cerrada && !modo && <div className="res-acc" style={{ marginTop: 14 }}><button className="btn suave sm" onClick={() => setModo('reprogramar')}>Reprogramar</button><button className="btn peligro sm" disabled={ocupado} onClick={() => window.confirm('¿Cancelar tu cita?') && ejecutar('cancelar')}>Cancelar cita</button></div>}
      {modo === 'reprogramar' && <div style={{ marginTop: 14 }}><SelectorHorario valor={hora} onCambio={setHora}/>
        <div className="res-acc"><button className="btn sm" disabled={!hora.hora || ocupado} onClick={() => ejecutar('reprogramar')}>Confirmar nuevo horario</button><button className="btn ghost sm" onClick={() => setModo('')}>Volver</button></div></div>}
    </div>}
  </div>;
}
