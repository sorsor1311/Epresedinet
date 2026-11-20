const pool = require('./src/config/db');

pool.execute(
  "SELECT u.id_usuario, u.usuario, u.correo, r.nombre AS rol FROM usuarios u JOIN roles r ON r.id_rol = u.fk_rol WHERE r.nombre = ?",
  ['Administrador']
)
.then(([filas]) => console.table(filas))
.catch(error => console.error(error.message))
.finally(() => pool.end());
