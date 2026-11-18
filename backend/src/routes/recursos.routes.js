/** API REST de contratos, pagos, remodelaciones, visitas y personas (solo personal). */
const router = require('express').Router();
const r = require('../controllers/recursosController');
const { gestion, soloAdmin } = require('../middlewares/authMiddleware');

router.get('/dashboard/resumen', ...gestion, r.resumen);
router.post('/propietarios', ...soloAdmin, r.crearPropietario);
router.post('/clientes', ...soloAdmin, r.crearCliente);
router.get('/:recurso', ...gestion, r.listar);
router.get('/:recurso/:id', ...gestion, r.obtener);
router.post('/:recurso', ...gestion, r.crear);
router.put('/:recurso/:id', ...gestion, r.actualizar);
router.delete('/:recurso/:id', ...soloAdmin, r.eliminar);
module.exports = router;
