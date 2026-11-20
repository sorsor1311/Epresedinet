const cloudinary = require('cloudinary').v2;
const env = require('../config/env');

cloudinary.config({
  cloud_name: env.cloudinary.cloudName,
  api_key: env.cloudinary.apiKey,
  api_secret: env.cloudinary.apiSecret,
  secure: true
});

async function subirFotoPerfil(buffer, idUsuario) {
  if (!env.cloudinary.cloudName || !env.cloudinary.apiKey || !env.cloudinary.apiSecret) {
    throw new Error('Cloudinary no está configurado correctamente');
  }

  return new Promise((resolve, reject) => {
    const flujo = cloudinary.uploader.upload_stream(
      {
        folder: 'epresedi/perfiles',
        public_id: `usuario_${idUsuario}_${Date.now()}`,
        resource_type: 'image',
        overwrite: false,
        transformation: [
          { width: 800, height: 800, crop: 'limit' },
          { quality: 'auto', fetch_format: 'auto' }
        ]
      },
      (error, resultado) => {
        if (error) return reject(error);

        resolve({
          url: resultado.secure_url,
          publicId: resultado.public_id
        });
      }
    );

    flujo.end(buffer);
  });
}

async function eliminarFotoPerfil(publicId) {
  if (!publicId) return;

  const resultado = await cloudinary.uploader.destroy(publicId, {
    resource_type: 'image',
    invalidate: true
  });

  return resultado;
}

module.exports = {
  subirFotoPerfil,
  eliminarFotoPerfil
};
