const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const env = require('./config/env');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();
if (env.trustProxy) app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: { directives: {
    defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'], imgSrc: ["'self'", 'data:', 'https:'], connectSrc: ["'self'"], objectSrc: ["'none'"], frameAncestors: ["'none'"]
  } },
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors(env.corsOrigenes.length ? { origin: env.corsOrigenes } : undefined));
if (!env.produccion) app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(env.uploadsDir, { maxAge: '7d', fallthrough: true }));
app.use('/api', require('./routes'));
app.use('/api', notFound);

if (fs.existsSync(path.join(env.frontendDist, 'index.html'))) {
  app.locals.sirveFrontend = true;
  app.use(express.static(env.frontendDist, { maxAge: '1h', index: false }));
  app.get(/^(?!\/api|\/uploads).*/, (_req, res) => res.sendFile(path.join(env.frontendDist, 'index.html')));
}
app.use(notFound);
app.use(errorHandler);
module.exports = app;
