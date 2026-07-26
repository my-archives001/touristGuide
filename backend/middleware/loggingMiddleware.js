// Request ID and Response Time Observability Middleware for Node.js Backend
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// Middleware to assign or propagate X-Request-ID
const requestIdMiddleware = (req, res, next) => {
  const existingId = req.headers['x-request-id'];
  const requestId = existingId || uuidv4();

  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

// Middleware to log API request durations and statuses in structured JSON
const requestLoggerMiddleware = (req, res, next) => {
  const startHrTime = process.hrtime.bigint();

  // Log incoming request
  logger.info('Incoming HTTP Request', {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl || req.url,
  });

  res.on('finish', () => {
    const endHrTime = process.hrtime.bigint();
    const durationMs = Number((endHrTime - startHrTime) / 1000000n);

    const logPayload = {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      status: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
    };

    if (res.statusCode >= 500) {
      logger.error('HTTP Server Error Response', logPayload);
    } else if (res.statusCode >= 400) {
      logger.warn('HTTP Client Error Response', logPayload);
    } else {
      logger.info('HTTP Success Response', logPayload);
    }
  });

  next();
};

module.exports = {
  requestIdMiddleware,
  requestLoggerMiddleware,
};
