const jwt = require('jsonwebtoken');
const env = require('../config/env');
const generarToken = usuario => jwt.sign({ id_usuario: usuario.id_usuario, correo: usuario.correo, rol: usuario.rol }, env.jwtSecret, { expiresIn: env.jwtExpira });
const verificar = token => jwt.verify(token, env.jwtSecret);
module.exports = { generarToken, verificar };
