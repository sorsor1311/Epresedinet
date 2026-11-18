const AuthService = require('../services/authService');
const { ejecutar } = require('../utils/errores');

exports.registrar = ejecutar(async (req, res) => res.status(201).json({ success: true, message: 'Usuario registrado correctamente', data: await AuthService.registrarUsuario(req.body) }));
exports.login = ejecutar(async (req, res) => res.json({ success: true, message: 'Inicio de sesión exitoso', data: await AuthService.login(req.body) }));
exports.perfil = ejecutar(async (req, res) => res.json({ success: true, data: await AuthService.perfil(req.usuario) }));
exports.actualizarPerfil = ejecutar(async (req, res) => res.json({ success: true, data: await AuthService.actualizarPerfil(req.usuario, req.body) }));
exports.cambiarPassword = ejecutar(async (req, res) => { await AuthService.cambiarPassword(req.usuario, req.body); res.json({ success: true, message: 'Contraseña actualizada' }); });
