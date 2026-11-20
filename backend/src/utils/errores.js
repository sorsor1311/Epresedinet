const fallo = (mensaje, codigo = 400) => Object.assign(new Error(mensaje), { statusCode: codigo });
/** Envuelve un handler async para que sus errores lleguen al manejador global. */
const ejecutar = accion => (req, res, next) => Promise.resolve(accion(req, res, next)).catch(next);
const correoValido = c => /^\S+@\S+\.\S+$/.test(String(c || ''));
const telefonoValido = t => /^\d{10}$/.test(String(t || ''));
module.exports = { fallo, ejecutar, correoValido, telefonoValido };
