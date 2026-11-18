const router = require('express').Router();

router.get('/health', (_req, res) => res.json({ success: true, message: 'Servidor de inmobiliaria operando correctamente', timestamp: new Date().toISOString() }));
router.use('/auth', require('./auth.routes'));
router.use('/atencion', require('./atencion.routes'));
router.use('/portal', require('./portal.routes'));
router.use('/', require('./propiedades.routes'));
router.use('/', require('./recursos.routes'));   // debe ir al final: contiene rutas genéricas /:recurso
module.exports = router;
