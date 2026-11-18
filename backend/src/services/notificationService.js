const pool = require('../config/db');
const env = require('../config/env');

const textoFecha = fecha => new Date(String(fecha).replace(' ', 'T').slice(0, 16) + ':00-05:00')
  .toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'full', timeStyle: 'short' });

/** Envía el correo (Resend) y deja siempre constancia en la tabla notificaciones (RF008, RF015). */
async function notificar(destino, asunto, contenido, agente = null) {
  let enviada = false;
  if (env.resend.apiKey && env.resend.from) {
    try {
      const respuesta = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.resend.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: env.resend.from, to: [destino], subject: asunto, text: contenido }),
        signal: AbortSignal.timeout(7000)
      });
      enviada = respuesta.ok;
    } catch { /* se registra como no enviada */ }
  }
  await pool.execute('INSERT INTO notificaciones (fk_agente, correo_destino, asunto, contenido, enviada) VALUES (?,?,?,?,?)', [agente, destino, asunto, contenido, enviada ? 1 : 0]);
  return enviada;
}

const mensajes = {
  datosRecibidos: nombre => `Hola ${nombre},\n\nRecibimos tus datos en EPRESEDI. Cuando elijas un horario te asignaremos un asesor para atenderte.\n\nEPRESEDI S.A.S.`,
  citaCliente: ({ nombre, propiedad, fecha, asesor, codigo }) =>
    `Hola ${nombre},\n\nTu cita quedó confirmada.\n\nInmueble: ${propiedad}\nFecha y hora: ${textoFecha(fecha)}\nAsesor: ${asesor}\n\nCódigo para cambiar o cancelar tu cita:\n${codigo}\n\nEPRESEDI S.A.S.`,
  citaAsesor: ({ cliente, correo, telefono, ocupacion, propiedad, fecha }) =>
    `Se te asignó una nueva cita.\n\nCliente: ${cliente}${ocupacion ? ` (${ocupacion})` : ''}\nCorreo: ${correo}${telefono ? `\nTeléfono: ${telefono}` : ''}\nInmueble: ${propiedad}\nFecha y hora: ${textoFecha(fecha)}`,
  cambioCita: ({ nombre, propiedad, accion, fecha }) =>
    `Hola ${nombre},\n\nTu cita para ${propiedad} fue ${accion}${fecha ? ` para el ${textoFecha(fecha)}` : ''}.\n\nEPRESEDI S.A.S.`
};

module.exports = { notificar, mensajes, textoFecha };
