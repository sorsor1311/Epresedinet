const router = require('express').Router();
const c = require('../controllers/propiedadesController');
const { autenticacionOpcional, soloAdmin, gestion } = require('../middlewares/authMiddleware');

router.get('/config', c.configPublica);
router.get('/tipos-propiedad', c.tipos);
router.get('/recomendaciones', c.recomendaciones);
router.get('/propiedades', autenticacionOpcional, c.listar);
router.get('/propiedades/:id', autenticacionOpcional, c.obtener);
router.post('/propiedades', ...soloAdmin, c.crear);
router.put('/propiedades/:id', ...soloAdmin, c.actualizar);
router.delete('/propiedades/:id', ...soloAdmin, c.eliminar);
router.post('/propiedades/:id/fotos', ...soloAdmin, c.subirFotos);
router.delete('/propiedades/:id/fotos/:idFoto', ...soloAdmin, c.eliminarFoto);
module.exports = router;
