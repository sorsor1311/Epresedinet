const pool = require('../config/db');
async function auditar(usuario, accion, entidad, idEntidad = null, detalle = null) {
  try {
    await pool.execute('INSERT INTO auditoria (fk_usuario, usuario, accion, entidad, id_entidad, detalle) VALUES (?,?,?,?,?,?)',
      [usuario?.id_usuario ?? null, usuario?.correo ?? null, accion, entidad, idEntidad, detalle ? String(detalle).slice(0, 300) : null]);
  } catch (e) { console.error('[auditoría]', e.message); }
}
module.exports = { auditar };
