const notFound = (req, res, next) => {
  const error = new Error(`No encontrado - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

// Traduce los errores de MySQL/MariaDB a respuestas comprensibles para el usuario.
function traducirErrorBD(err) {
  switch (err.code) {
    case 'ER_SIGNAL_EXCEPTION':          // validaciones definidas en triggers y procedimientos
      return { statusCode: 400, message: err.sqlMessage || err.message };
    case 'ER_DUP_ENTRY':
      return { statusCode: 409, message: 'Ya existe un registro con esos datos' };
    case 'ER_ROW_IS_REFERENCED_2':
      return { statusCode: 409, message: 'No se puede eliminar: tiene registros asociados (contratos, citas, etc.). Márcalo como inactivo.' };
    case 'ER_NO_REFERENCED_ROW_2':
      return { statusCode: 400, message: 'Uno de los datos relacionados no existe' };
    case 'ER_TRUNCATED_WRONG_VALUE':
    case 'ER_WRONG_VALUE':
    case 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD':
      return { statusCode: 400, message: 'Formato de dato inválido (revisa fechas y números)' };
    default:
      return null;
  }
}

const errorHandler = (err, req, res, next) => {
  const traducido = traducirErrorBD(err);
  const statusCode = err.statusCode || traducido?.statusCode || 500;
  if (statusCode >= 500) console.error('[Error]', err);
  const mensaje = traducido?.message || (statusCode >= 500 && process.env.NODE_ENV !== 'development' ? 'Error interno del servidor' : err.message) || 'Error interno del servidor';
  res.status(statusCode).json({
    success: false,
    message: mensaje,
    error: { message: mensaje, stack: process.env.NODE_ENV === 'development' && statusCode >= 500 ? err.stack : null }
  });
};

module.exports = { notFound, errorHandler };
