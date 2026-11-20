const AuthService = require('../services/authService');
const { ejecutar } = require('../utils/errores');

exports.registrar = ejecutar(async (req, res) => res.status(201).json({ success: true, message: 'Usuario registrado correctamente', data: await AuthService.registrarUsuario(req.body) }));
exports.login = ejecutar(async (req, res) => res.json({ success: true, message: 'Inicio de sesiÃ³n exitoso', data: await AuthService.login(req.body) }));
exports.perfil = ejecutar(async (req, res) => res.json({ success: true, data: await AuthService.perfil(req.usuario) }));
exports.actualizarPerfil = ejecutar(async (req, res) => res.json({ success: true, data: await AuthService.actualizarPerfil(req.usuario, req.body) }));
exports.solicitarCambioCorreo = ejecutar(async (req, res) => {
  const data = await AuthService.solicitarCambioCorreo(req.usuario, req.body);
  res.json({ success: true, ...data });
});

exports.confirmarCambioCorreo = ejecutar(async (req, res) => {
  const data = await AuthService.confirmarCambioCorreo(req.query.token);
  res.json(data);
});
exports.cambiarPassword = ejecutar(async (req, res) => { await AuthService.cambiarPassword(req.usuario, req.body); res.json({ success: true, message: 'ContraseÃ±a actualizada' }); });


exports.subirFotoPerfil = ejecutar(async (req, res) => {
  const data = await AuthService.subirFotoPerfil(req.usuario, req.file.buffer);
  res.json({ success: true, message: 'Fotografía actualizada correctamente', data });
});

exports.eliminarFotoPerfil = ejecutar(async (req, res) => {
  const data = await AuthService.eliminarFotoPerfil(req.usuario);
  res.json({ success: true, message: 'Fotografía eliminada correctamente', data });
});
