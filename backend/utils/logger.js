// Centralized Structured JSON Logger (Winston) for Node.js Backend
const winston = require('winston');
const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logDir = path.resolve('logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Custom JSON formatter matching the centralized enterprise log schema
const centralizedJsonFormat = winston.format.printf((info) => {
  const logObject = {
    timestamp: new Date().toISOString(),
    level: info.level,
    service: 'node-backend',
    requestId: info.requestId || 'system',
    message: info.message,
    method: info.method || undefined,
    path: info.path || undefined,
    status: info.status || undefined,
    durationMs: info.durationMs !== undefined ? Number(info.durationMs) : undefined,
    error: info.error ? (info.error.stack || info.error.message || info.error) : undefined,
  };

  // Strip undefined keys for clean JSON output
  Object.keys(logObject).forEach((key) => {
    if (logObject[key] === undefined) {
      delete logObject[key];
    }
  });

  return JSON.stringify(logObject);
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    centralizedJsonFormat
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(logDir, 'combined.log') }),
  ],
});

module.exports = logger;
