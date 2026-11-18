import React, { useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { api } from '../api.js';
import { Campo } from '../ui.jsx';

export default function Acceso({ onEntrar }) {
  const [modo, setModo] = useState('login');
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  async function enviar(e) {
    e.preventDefault(); setError(''); setOcupado(true);
    try { onEntrar(await api('/auth/' + (modo === 'login' ? 'login' : 'register'), { metodo: 'POST', cuerpo: Object.fromEntries(new FormData(e.currentTarget)), token: '' })); }
    catch (err) { setError(err.message); } finally { setOcupado(false); }
  }
  return <div className="acceso">
    <div className="acceso-lado"><span className="ceja" style={{ color: '#f3cd7f' }}>Portal EPRESEDI</span><h2>Gestiona tu inmobiliaria desde un solo lugar.</h2>
      <p>Administradores y asesores acceden a su calendario, las solicitudes de clientes y el inventario. Los clientes guardan su historial de búsqueda.</p>
      <ul style={{ listStyle: 'none', padding: 0 }}>{['Calendario de citas por asesor', 'Asignación automática equilibrada', 'Historial y recomendaciones'].map(t => <li key={t}><CheckCircle2 size={16} style={{ verticalAlign: -3, marginRight: 8, color: '#64bbca' }}/>{t}</li>)}</ul></div>
    <div className="acceso-form"><div className="caja">
      <h1>{modo === 'login' ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}</h1>
      <p className="sub">{modo === 'login' ? 'Ingresa con tu correo y contraseña.' : 'Como cliente podrás guardar tus búsquedas y recibir recomendaciones.'}</p>
      <div className="pestanas"><button className={modo === 'login' ? 'activo' : ''} onClick={() => { setModo('login'); setError(''); }}>Iniciar sesión</button><button className={modo === 'register' ? 'activo' : ''} onClick={() => { setModo('register'); setError(''); }}>Registrarme</button></div>
      <form className="form-col" onSubmit={enviar} key={modo}>
        {modo === 'register' && <><Campo etiqueta="Usuario"><input name="usuario" required autoComplete="username"/></Campo><Campo etiqueta="Nombre completo"><input name="nombre" required autoComplete="name"/></Campo>
          <div className="rejilla-form"><Campo etiqueta="Teléfono"><input name="telefono" required pattern="[0-9]{10}" placeholder="10 dígitos" inputMode="numeric"/></Campo><Campo etiqueta="Profesión"><input name="profesion" required/></Campo></div></>}
        <Campo etiqueta="Correo electrónico"><input type="email" name="correo" required autoComplete="email"/></Campo>
        <Campo etiqueta="Contraseña"><input type="password" name="password" required minLength={modo === 'register' ? 8 : 1} autoComplete={modo === 'login' ? 'current-password' : 'new-password'}/></Campo>
        {error && <p role="alert" style={{ color: 'var(--danger)', fontSize: 14 }}>{error}</p>}
        <button className="btn lg block" disabled={ocupado}>{ocupado ? 'Procesando…' : modo === 'login' ? 'Entrar' : 'Crear cuenta'} <ArrowRight size={18}/></button>
      </form></div></div>
  </div>;
}
