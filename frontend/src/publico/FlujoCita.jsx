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
    <Campo etiqueta="Me interesa"><select required value={modalidad} onChange={e => setModalidad(e.target.value)}><option value="">Selecciona</option>{Number(propiedad.precio_arrendamiento) > 0 && <option value="arriendo">Arrendar</option>}{Number(propiedad.precio_venta) > 0 && <option value="venta">Comprar</option>}</select></Campo>
    <SelectorHorario valor={hora} onCambio={setHora} autoFoco/>
    {error && <p style={{ color: 'var(--danger)', fontSize: 14 }}>{error}</p>}
    <button className="btn block" disabled={!hora.hora || ocupado || !tipoPersona || !modalidad} onClick={agendar}><CalendarCheck size={18}/> {ocupado ? 'Agendando…' : 'Confirmar cita'}</button>
    <p style={{ fontSize: 12.5, color: 'var(--muted)' }}>Te asignaremos automáticamente al asesor con la agenda más libre en ese horario.</p>
  </div>;
}

const REQUISITOS = {
  "Empleado": [
    "Fotocopia de cédula y RUT actualizado del arrendatario y deudor solidario.",
    "Carta laboral de ambos con sueldo, cargo, tipo de contrato (no inferior a un año) y tiempo de servicio.",
    "Dos últimas colillas de pago de ambos."
  ],
  "Independiente": [
    "Fotocopia de cédula y RUT del inquilino y codeudor.",
    "Certificado de ingresos expedido por contador y declaración de renta de ambos.",
    "Certificado de cámara de comercio o copias de contratos laborales de ambos.",
    "Extractos bancarios de los últimos tres meses de ambos."
  ],
  "Pensionado": [
    "Tres últimas colillas de pago y/o extractos bancarios del inquilino y codeudor.",
    "Copia de cédula y RUT de ambos.",
    "Certificado de pensión de ambos."
  ],
  "Persona Jurídica": [
    "Certificado de existencia y representación legal de cámara de comercio y acta de junta directiva si se requiere. Confirmar vigencia con el asesor.",
    "Fotocopia de cédula del representante legal y copia del RUT.",
    "Estados financieros del último periodo contable y declaración de renta.",
    "Extractos bancarios de los últimos tres meses."
  ]
};
function RequisitosCita({ cita }) {
  if (cita.modalidad === 'venta') return <section style={{ marginTop: 20 }}><h4>¡Espera! Antes de que te vayas…</h4><p>El asesor te informará los requisitos de compra y acreditación de solvencia.</p></section>;
  const lista = REQUISITOS[cita.tipo_persona];
  if (!lista) return null;
  const natural = cita.tipo_persona !== 'Persona Jurídica';
  return <section style={{ marginTop: 20 }}><h4>¡Espera! Antes de que te vayas…</h4><p>Debes tener en cuenta estos requisitos para continuar con tu proceso de arrendamiento.</p><h4>Solicitud de arrendamiento · {cita.tipo_persona}</h4><p>Resumen de la documentación inicial de EPRESEDI.</p><ul>{lista.map(t => <li key={t}>{t}</li>)}{natural && <li>Dos referencias personales y dos familiares, con número de cédula, dirección y dos teléfonos.</li>}</ul><p>Consulta con el asesor las condiciones de contratación, garantías, depósitos y trámites aplicables antes de entregar dinero o firmar documentos.</p><button className="btn sec sm" onClick={() => { const texto = ['EPRESEDI S.A.S.', 'Requisitos de arrendamiento: ' + cita.tipo_persona, 'Código: ' + cita.codigo_gestion, ...lista, ...(natural ? ['Dos referencias personales y dos familiares, con número de cédula, dirección y dos teléfonos.'] : []), 'Consulta con el asesor las condiciones de contratación, garantías, depósitos y trámites aplicables.'].join('\n\n'); const url = URL.createObjectURL(new Blob([texto], {type:'text/plain;charset=utf-8'})); const a = document.createElement('a'); a.href = url; a.download = 'requisitos-arrendamiento.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }}>Descargar lista de requisitos</button></section>;
}

export function ConfirmacionCita({ cita, onGestionar }) {
  const [copiado, setCopiado] = useState(false);
  return <div className="confirmacion">
    <h4><CalendarCheck size={20}/> ¡Tu cita está confirmada!</h4>
    <dl><dt>Inmueble</dt><dd>{cita.propiedad}</dd><dt>Fecha</dt><dd>{fechaHora(cita.fecha_contacto)}</dd><dt>Asesor</dt><dd>{cita.asesor}</dd></dl>
    <p style={{ fontSize: 13, marginBottom: 8 }}>Guarda este código para cambiar o cancelar tu cita :</p>
    <div className="codigo"><span style={{ flex: 1 }}>{cita.codigo_gestion}</span>
      <button className="btn sm sec" onClick={() => { navigator.clipboard?.writeText(cita.codigo_gestion); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }}>{copiado ? <Check size={14}/> : <Copy size={14}/>} {copiado ? 'Copiado' : 'Copiar'}</button></div>
    <RequisitosCita cita={cita}/>
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
