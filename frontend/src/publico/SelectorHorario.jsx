import React, { useEffect, useState } from 'react';
import { api, hoy, ymd, sumar, etiquetaHora } from '../api.js';
import { Campo } from '../ui.jsx';

/** Elige fecha y hora entre los horarios REALMENTE disponibles (según el calendario de los asesores). */
export default function SelectorHorario({ valor, onCambio, autoFoco = false }) {
  const [fecha, setFecha] = useState(valor?.fecha || '');
  const [horas, setHoras] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!fecha) { setHoras(null); return; }
    let vigente = true; setHoras(null); setError('');
    api('/atencion/disponibilidad?fecha=' + fecha).then(d => vigente && setHoras(d.horas)).catch(e => vigente && setError(e.message));
    return () => { vigente = false; };
  }, [fecha]);
  return <div>
    <Campo etiqueta="Fecha de la cita">
      <input type="date" autoFocus={autoFoco} min={hoy()} max={ymd(sumar(new Date(), 90))} value={fecha}
        onChange={e => { setFecha(e.target.value); onCambio({ fecha: e.target.value, hora: '' }); }}/>
    </Campo>
    {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 8 }}>{error}</p>}
    {fecha && horas === null && !error && <div className="cargando"><span className="giro"/> Buscando horarios…</div>}
    {horas && horas.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 10 }}>No hay asesores disponibles ese día. Prueba con otra fecha.</p>}
    {horas && horas.length > 0 && <>
      <p style={{ fontSize: 13, fontWeight: 600, margin: '14px 0 0', color: '#2c4a6b' }}>Horarios disponibles (duración 1 hora)</p>
      <div className="horas">{horas.map(h => <button type="button" key={h} className={'hora' + (valor?.hora === h && valor?.fecha === fecha ? ' activo' : '')} onClick={() => onCambio({ fecha, hora: h })}>{etiquetaHora(h)}</button>)}</div></>}
  </div>;
}
