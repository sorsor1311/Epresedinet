import React, { useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { api } from '../api.js';
import { Campo } from '../ui.jsx';

export default function Acceso({ onEntrar }) {
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  async function enviar(e) {
    e.preventDefault(); setError(''); setOcupado(true);
    try { onEntrar(await api('/auth/login', { metodo: 'POST', cuerpo: Object.fromEntries(new FormData(e.currentTarget)), token: '' })); }
    catch (err) { setError(err.message); } finally { setOcupado(false); }
  }
  return <div className="acceso">
    <div className="acceso-lado"><span className="ceja" style={{ color: '#f3cd7f' }}>Portal EPRESEDI</span><h2>Gestiona tu inmobiliaria desde un solo lugar.</h2>
      <p>Administradores y asesores acceden a su calendario, las solicitudes de clientes y el inventario.</p>
      <ul style={{ listStyle: 'none', padding: 0 }}>{['Calendario de citas por asesor', 'Asignación automática equilibrada', 'Historial y recomendaciones'].map(t => <li key={t}><CheckCircle2 size={16} style={{ verticalAlign: -3, marginRight: 8, color: '#64bbca' }}/>{t}</li>)}</ul></div>
    <div className="acceso-form"><div className="caja">
      <h1>Acceso del personal</h1>
      <p className="sub">Ingresa con tu correo y contraseña.</p>
      <form className="form-col" onSubmit={enviar}>
        <Campo etiqueta="Correo electrónico"><input type="email" name="correo" required autoComplete="email"/></Campo>
        <Campo etiqueta="Contraseña"><input type="password" name="password" required autoComplete="current-password"/></Campo>
        {error && <p role="alert" style={{ color: 'var(--danger)', fontSize: 14 }}>{error}</p>}
        <button className="btn lg block" disabled={ocupado}>{ocupado ? 'Procesando…' : 'Entrar'} <ArrowRight size={18}/></button>
      </form></div></div>
  </div>;
}
