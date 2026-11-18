/** /api/portal: áreas personales por rol (Cliente y Propietario). */
const router = require('express').Router();
const p = require('../controllers/portalController');
const { verificarToken, autorizarRoles } = require('../middlewares/authMiddleware');
const cliente = [verificarToken, autorizarRoles('Cliente')], propietario = [verificarToken, autorizarRoles('Propietario')];

router.get('/cliente/citas', ...cliente, p.misCitas);
router.patch('/cliente/citas/:id', ...cliente, p.gestionarMiCita);
router.get('/cliente/historial', ...cliente, p.miHistorial);
router.get('/cliente/recomendaciones', ...cliente, p.misRecomendaciones);
router.get('/propietario/resumen', ...propietario, p.propietarioResumen);
router.get('/propietario/propiedades', ...propietario, p.propietarioPropiedades);
router.get('/propietario/contratos', ...propietario, p.propietarioContratos);
module.exports = router;
