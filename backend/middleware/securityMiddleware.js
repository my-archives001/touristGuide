// Enterprise Security Middleware for Express API
// Implements: Helmet (Secure Headers), Rate Limiting, NoSQL Injection Prevention, HPP (Param Pollution), and CORS options.

const { config, HTTP_STATUS } = require('../config');

// ==========================================
// 1. HELMET / SECURE HTTP HEADERS
// ==========================================
const secureHeaders = (req, res, next) => {
  // Prevent MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Prevent Clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  // Enable Cross-Site Scripting filter in browser
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Enforce HTTPS Transport Security (HSTS)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  // Restrict resource origins via Content Security Policy (CSP)
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
  );
  // Control Referrer header leakage
  res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
  // Restrict sensitive permissions
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  // Disable Powered-By header to obscure server software
  res.removeHeader('X-Powered-By');
  next();
};

// ==========================================
// 2. RATE LIMITER (Sliding Window In-Memory)
// ==========================================
class InMemoryRateLimiter {
  constructor({ windowMs = 15 * 60 * 1000, maxRequests = 100, message = 'Too many requests, please try again later.' }) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.message = message;
    this.hits = new Map();

    // Periodic cleanup of expired entries
    setInterval(() => this.cleanup(), 60000).unref();
  }

  cleanup() {
    const now = Date.now();
    for (const [key, data] of this.hits.entries()) {
      if (now > data.resetTime) {
        this.hits.delete(key);
      }
    }
  }

  middleware() {
    return (req, res, next) => {
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
      const now = Date.now();
      let record = this.hits.get(ip);

      if (!record || now > record.resetTime) {
        record = { count: 1, resetTime: now + this.windowMs };
      } else {
        record.count += 1;
      }
      this.hits.set(ip, record);

      // Set standard rate limit headers
      res.setHeader('X-RateLimit-Limit', this.maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, this.maxRequests - record.count));
      res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

      if (record.count > this.maxRequests) {
        res.setHeader('Retry-After', Math.ceil((record.resetTime - now) / 1000));
        return res.status(429).json({
          success: false,
          error: 'TOO_MANY_REQUESTS',
          message: this.message,
        });
      }
      next();
    };
  }
}

const apiLimiter = new InMemoryRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 150,
  message: 'Too many API requests from this IP, please try again after 15 minutes.',
}).middleware();

const authLimiter = new InMemoryRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 20, // Strict limit on login/signup to prevent brute force
  message: 'Too many authentication attempts from this IP, please try again after 15 minutes.',
}).middleware();

// ==========================================
// 3. SANITIZE MONGO INPUTS (NoSQL Injection Prevention)
// ==========================================
const sanitizeValue = (value) => {
  if (!value || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  const sanitized = {};
  for (const key of Object.keys(value)) {
    // Check if key starts with '$' or contains '.' (MongoDB operators)
    if (key.startsWith('$') || key.includes('.')) {
      // Neutralize operator key by stripping '$' and '.'
      const safeKey = key.replace(/^\$+/, '').replace(/\./g, '_');
      sanitized[safeKey] = sanitizeValue(value[key]);
    } else {
      sanitized[key] = sanitizeValue(value[key]);
    }
  }
  return sanitized;
};

const sanitizeMongoInputs = (req, res, next) => {
  if (req.body) req.body = sanitizeValue(req.body);
  if (req.query) req.query = sanitizeValue(req.query);
  if (req.params) req.params = sanitizeValue(req.params);
  next();
};

// ==========================================
// 4. PREVENT HTTP PARAMETER POLLUTION (HPP)
// ==========================================
const preventParamPollution = (req, res, next) => {
  if (req.query && typeof req.query === 'object') {
    for (const key of Object.keys(req.query)) {
      const val = req.query[key];
      // If parameter is an array, take the last supplied value
      if (Array.isArray(val)) {
        req.query[key] = val[val.length - 1];
      }
    }
  }
  next();
};

// ==========================================
// 5. HARDENED CORS CONFIGURATION
// ==========================================
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (server-to-server, curl, mobile apps)
    if (!origin) return callback(null, true);
    if (config.corsOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

module.exports = {
  secureHeaders,
  apiLimiter,
  authLimiter,
  sanitizeMongoInputs,
  preventParamPollution,
  corsOptions,
};
