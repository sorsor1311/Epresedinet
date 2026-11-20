const { verificar } = require('../utils/jwt');
const pool = require('../config/db');

const verificarToken = async (req, res, next) => {
  const cabecera = req.headers.authorization || '';

  if (!cabecera.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Falta el token de acceso'
    });
  }

  try {
    const usuarioToken = verificar(cabecera.slice(7));

    if (!usuarioToken.id_usuario) {
      return res.status(401).json({
        success: false,
        message: 'Token inv?lido o expirado'
      });
    }

    const [[cuenta]] = await pool.execute(
      `SELECT u.id_usuario, r.nombre AS rol, a.activo
       FROM usuarios u
       INNER JOIN roles r ON r.id_rol = u.fk_rol
       LEFT JOIN agentes a ON a.fk_usuario = u.id_usuario
       WHERE u.id_usuario = ?
       LIMIT 1`,
      [usuarioToken.id_usuario]
    );

    if (!cuenta) {
      return res.status(401).json({
        success: false,
        message: 'La cuenta ya no existe o fue eliminada'
      });
    }

    if (cuenta.rol === 'Agente' && Number(cuenta.activo) !== 1) {
      return res.status(403).json({
        success: false,
        message: 'La cuenta del agente est? desactivada'
      });
    }

    req.usuario = {
      ...usuarioToken,
      rol: cuenta.rol
    };

    next();
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }

    if (error.name === 'JsonWebTokenError' ||
        error.name === 'TokenExpiredError' ||
        error.name === 'NotBeforeError') {
      return res.status(401).json({
        success: false,
        message: 'Token inv?lido o expirado'
      });
    }

    next(error);
  }
};

const autorizarRoles = (...permitidos) => (req, res, next) => {
  if (!req.usuario || !permitidos.includes(req.usuario.rol)) {
    return res.status(403).json({
      success: false,
      message: 'Acceso no autorizado para este rol'
    });
  }
  next();
};

const autenticacionOpcional = (req, _res, next) => {
  const cabecera = req.headers.authorization || '';

  if (cabecera.startsWith('Bearer ')) {
    try {
      req.usuario = verificar(cabecera.slice(7));
    } catch {
    }
  }

  next();
};

const limitar = (maximo, ventanaMs = 60_000) => {
  const registro = new Map();

  return (req, res, next) => {
    const ahora = Date.now();
    const entrada = registro.get(req.ip);

    if (!entrada || ahora > entrada.reinicio) {
      registro.set(req.ip, {
        cuenta: 1,
        reinicio: ahora + ventanaMs
      });
      return next();
    }

    if (++entrada.cuenta > maximo) {
      return res.status(429).json({
        success: false,
        message: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.'
      });
    }

    next();
  };
};

const gestion = [
  verificarToken,
  autorizarRoles('Administrador', 'Agente')
];

const soloAdmin = [
  verificarToken,
  autorizarRoles('Administrador')
];

module.exports = {
  verificarToken,
  autorizarRoles,
  autenticacionOpcional,
  limitar,
  gestion,
  soloAdmin
};
