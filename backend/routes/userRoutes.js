const express = require('express');
const router = express.Router();
const { signUpUser, loginUser, getUserProfile } = require('../controllers/userControllers');
const { protect } = require('../middleware/authMiddleware'); 
const { authLimiter } = require('../middleware/securityMiddleware');

// signup function, route (protected by auth rate limiter)
router.post('/signup', authLimiter, signUpUser);

// login function, route (protected by auth rate limiter)
router.post('/login', authLimiter, loginUser);

// Protected route
router.get('/profile', protect, getUserProfile);

module.exports = router;