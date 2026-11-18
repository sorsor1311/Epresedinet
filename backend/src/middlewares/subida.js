const multer = require('multer');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const env = require('../config/env');
const { fallo } = require('../utils/errores');

const FIRMAS = [
  { ext: '.jpg', ok: b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: '.png', ok: b => b.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: '.webp', ok: b => b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP' }
];
const recibir = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 8 } }).array('fotos', 8);

/** Guarda las imágenes validando su contenido real (no solo la extensión). Devuelve las rutas públicas. */
function guardarImagenes(archivos = []) {
  const carpeta = path.join(env.uploadsDir, 'propiedades');
  fs.mkdirSync(carpeta, { recursive: true });
  return archivos.map(a => {
    const tipo = FIRMAS.find(f => f.ok(a.buffer));
    if (!tipo) throw fallo(`"${a.originalname}" no es una imagen válida (usa JPG, PNG o WebP de máximo 5 MB)`);
    const nombre = crypto.randomBytes(16).toString('hex') + tipo.ext;
    fs.writeFileSync(path.join(carpeta, nombre), a.buffer);
    return '/uploads/propiedades/' + nombre;
  });
}
function borrarImagen(url) {
  if (!url?.startsWith('/uploads/propiedades/')) return;
  const archivo = path.join(env.uploadsDir, 'propiedades', path.basename(url));
  fs.rm(archivo, { force: true }, () => {});
}
module.exports = { recibir, guardarImagenes, borrarImagen };
