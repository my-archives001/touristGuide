const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const config = require('./config/config');

// Validate critical environment variables at startup
if (!config.jwtSecret) {
  console.error('FATAL: JWT_SECRET is not set in environment variables.');
  process.exit(1);
}
if (!config.mongoURI) {
  console.error('FATAL: MONGO_URI is not set in environment variables.');
  process.exit(1);
}

const logger = require('./utils/logger');
const {
  requestIdMiddleware,
  requestLoggerMiddleware,
} = require('./middleware/loggingMiddleware');

// Import route modules
const userRoutes = require('./routes/userRoutes');
const profileRoutes = require('./routes/profileRoutes.js');
const placeRoutes = require('./routes/placeRoutes.js');
const {
  secureHeaders,
  apiLimiter,
  sanitizeMongoInputs,
  preventParamPollution,
  corsOptions,
} = require('./middleware/securityMiddleware');

const app = express();

// 0. Observability & Request ID Middleware
app.use(requestIdMiddleware);
app.use(requestLoggerMiddleware);

// 1. Set Security HTTP Headers (Helmet equivalent)
app.use(secureHeaders);

// 2. Hardened CORS configuration
app.use(cors(corsOptions));

// 3. Parse incoming JSON requests with body size limit to prevent payload DOS
app.use(express.json({ limit: '10kb' }));

// 4. Sanitize MongoDB inputs against NoSQL Injection
app.use(sanitizeMongoInputs);

// 5. Prevent HTTP Parameter Pollution (HPP)
app.use(preventParamPollution);

// 6. Serve static images with caching
app.use('/images', express.static(path.join(__dirname, 'public', 'images'), {
  maxAge: '7d',
}));

// 7. Apply API rate limiter to all API routes
app.use('/api', apiLimiter);

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/places', placeRoutes);

// Health check routes
app.get('/', (req, res) => res.json({ status: 'ok', service: 'thamizh-thadam-backend' }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'thamizh-thadam-backend' }));
app.get('/ping', (req, res) => res.json({ ok: true }));

// MongoDB connection and server start
const PORT = config.port;

mongoose.connect(config.mongoURI)
  .then(() => {
    logger.info('MongoDB connected successfully');
    app.listen(PORT, () => {
      logger.info(`Server running on http://localhost:${PORT}`, { port: PORT });
    });
  })
  .catch(err => {
    logger.error('MongoDB connection error', { error: err.message || err });
    process.exit(1);
  });