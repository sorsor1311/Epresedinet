const multer = require('multer');
const { fallo } = require('../utils/errores');

const recibirFotoPerfil = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1
  },
  fileFilter: (req, file, callback) => {
    const permitidos = ['image/jpeg', 'image/png', 'image/webp'];

    if (!permitidos.includes(file.mimetype)) {
      return callback(fallo('Solo se permiten imágenes JPG, PNG o WebP'));
    }

    callback(null, true);
  }
}).single('foto');

const FIRMAS = [
  {
    mime: 'image/jpeg',
    ok: b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff
  },
  {
    mime: 'image/png',
    ok: b => b.slice(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    )
  },
  {
    mime: 'image/webp',
    ok: b => b.slice(0, 4).toString() === 'RIFF' &&
      b.slice(8, 12).toString() === 'WEBP'
  }
];

function validarFirmaFoto(req, res, next) {
  if (!req.file) {
    return next(fallo('Debes seleccionar una fotografía'));
  }

  const firma = FIRMAS.find(tipo =>
    tipo.mime === req.file.mimetype && tipo.ok(req.file.buffer)
  );

  if (!firma) {
    return next(fallo('El archivo no es una imagen válida JPG, PNG o WebP'));
  }

  next();
}

module.exports = {
  recibirFotoPerfil,
  validarFirmaFoto
};
