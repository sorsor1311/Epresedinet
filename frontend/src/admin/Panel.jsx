import React from 'react';
import Shell, { seccionesDe, tituloDe } from './Shell.jsx';
import Resumen from './Resumen.jsx';
import Calendario from './Calendario.jsx';
import Citas from './Citas.jsx';
import Propiedades from './Propiedades.jsx';
import Asesores from './Asesores.jsx';
import Reportes from './Reportes.jsx';
import Personas from './Personas.jsx';
import Perfil from './Perfil.jsx';
import { RecursoCRUD, ListaSimple } from './Recursos.jsx';
import { PropietarioResumen, PropietarioInmuebles, PropietarioContratos } from './Portal.jsx';

/** Contenedor del panel interno: elige el menú y la pantalla según el rol del usuario. */
export default function Panel({ usuario, seccion, ir, onSalir, irSitio, onPerfil }) {
  const validas = seccionesDe(usuario.rol);
  const s = validas.includes(seccion) ? seccion : 'resumen';
  let vista;
  if (usuario.rol === 'Propietario') {
    vista = { resumen: <PropietarioResumen ir={ir}/>, inmuebles: <PropietarioInmuebles/>, contratos: <PropietarioContratos/>, perfil: <Perfil onActualizado={onPerfil}/> }[s];
  } else {
    vista = {
      resumen: <Resumen usuario={usuario} ir={ir}/>, calendario: <Calendario usuario={usuario}/>, citas: <Citas usuario={usuario}/>, propiedades: <Propiedades usuario={usuario}/>,
      asesores: <Asesores usuario={usuario}/>, reportes: <Reportes usuario={usuario}/>, propietarios: <Personas clave="propietarios"/>, clientes: <Personas clave="clientes"/>, perfil: <Perfil onActualizado={onPerfil}/>
    }[s] || (['contratos', 'pagos', 'remodelaciones', 'visitas'].includes(s) ? <RecursoCRUD clave={s} usuario={usuario}/> : <ListaSimple clave={s}/>);
  }
  return <Shell usuario={usuario} seccion={s} ir={ir} onSalir={onSalir} irSitio={irSitio}>{vista}</Shell>;
}
export { tituloDe };
