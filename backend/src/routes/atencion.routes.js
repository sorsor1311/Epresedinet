/** /api/atencion: chat-bot, citas, calendario, asesores y reportes. */
const router = require('express').Router();
const servicios = require('../controllers/serviciosController');
const cat = require('../controllers/catalogoController');
const cit = require('../controllers/citasController');
const ase = require('../controllers/asesoresController');
const rep = require('../controllers/reportesController');
const { autenticacionOpcional, limitar, gestion, soloAdmin } = require('../middlewares/authMiddleware');
const env = require('../config/env');
const publico = limitar(env.limitePublico);

// Públicas (cliente)
router.post('/servicios', publico, servicios.crear);
router.get('/servicios', ...soloAdmin, servicios.listar);
router.patch('/servicios/:id', ...soloAdmin, servicios.estado);
router.get('/zonas', cat.zonas);
router.post('/buscar', publico, autenticacionOpcional, cat.buscar);
router.get('/similares', publico, autenticacionOpcional, cat.similares);
router.post('/chat', limitar(12), cat.chat);
router.post('/propiedad/:id/consulta', publico, cat.consulta);
router.post('/interesados', publico, autenticacionOpcional, cit.registrarInteresado);
router.get('/disponibilidad', publico, cit.disponibilidad);
router.post('/citas', publico, cit.solicitar);
router.get('/citas/consulta', publico, cit.consultarPorCodigo);
router.patch('/citas/gestionar', publico, cit.gestionarPorCodigo);

// Personal
router.get('/yo', ...gestion, cit.yo);
router.get('/calendario', ...gestion, cit.calendario);
router.get('/citas', ...gestion, cit.listar);
router.post('/citas/interna', ...gestion, cit.crearInterna);
router.patch('/citas/:id/estado', ...gestion, cit.cambiarEstado);
router.patch('/citas/:id/reprogramar', ...gestion, cit.reprogramarPersonal);
router.get('/interesados', ...gestion, cit.interesados);
router.get('/historial', ...gestion, cat.historial);

// Asesores (RF013, RF014)
router.post('/agentes', ...soloAdmin, ase.crear);
router.get('/agentes/detalle', ...gestion, ase.detalle);
router.get('/agentes/horarios', ...gestion, ase.horarios);
router.post('/agentes/horarios', ...soloAdmin, ase.agregarHorario);
router.delete('/agentes/horarios/:id', ...soloAdmin, ase.quitarHorario);
router.put('/agentes/:id', ...soloAdmin, ase.actualizar);
router.patch('/agentes/:id/activo', ...soloAdmin, ase.cambiarActivo);

// Reportes (RF018), notificaciones (RF015) y auditoría
router.get('/notificaciones', ...gestion, rep.notificaciones);
router.get('/reportes', ...gestion, rep.reportes);
router.get('/reportes/citas.csv', ...soloAdmin, rep.csvCitas);
router.get('/analisis', ...gestion, rep.analisis);
router.get('/auditoria', ...soloAdmin, rep.auditoria);
module.exports = router;
