const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  port: parseInt(process.env.PORT, 10) || 5000,
  mongoURI: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10,
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5002,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:5002').split(',').map(o => o.trim())
};