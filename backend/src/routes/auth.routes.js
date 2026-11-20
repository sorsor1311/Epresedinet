const router = require('express').Router();
const c = require('../controllers/authController');
const { verificarToken, limitar } = require('../middlewares/authMiddleware');
const env = require('../config/env');
const { recibirFotoPerfil, validarFirmaFoto } = require('../middlewares/subidaPerfil');

router.post('/register', limitar(env.limiteAuth), c.registrar);
router.post('/login', limitar(env.limiteAuth), c.login);
router.get('/me', verificarToken, c.perfil);
router.put('/me', verificarToken, c.actualizarPerfil);
router.post('/me/photo', verificarToken, recibirFotoPerfil, validarFirmaFoto, c.subirFotoPerfil);
router.delete('/me/photo', verificarToken, c.eliminarFotoPerfil);
router.put('/email', verificarToken, limitar(env.limiteAuth), c.solicitarCambioCorreo);
router.get('/verify-email', limitar(env.limiteAuth), c.confirmarCambioCorreo);
router.put('/password', verificarToken, limitar(env.limiteAuth), c.cambiarPassword);
module.exports = router;


