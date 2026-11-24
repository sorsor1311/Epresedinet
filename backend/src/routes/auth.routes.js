const router = require('express').Router();
const c = require('../controllers/authController');
const { verificarToken, limitar } = require('../middlewares/authMiddleware');
const env = require('../config/env');

router.post('/login', limitar(env.limiteAuth), c.login);
router.get('/me', verificarToken, c.perfil);
router.put('/me', verificarToken, c.actualizarPerfil);
router.put('/password', verificarToken, limitar(env.limiteAuth), c.cambiarPassword);
module.exports = router;
