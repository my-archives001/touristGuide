const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const { config, HTTP_STATUS } = require('../config');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Getting token from header
            token = req.headers.authorization.split(' ')[1];

            // Verifying token
            const decoded = jwt.verify(token, config.jwtSecret);

            // Getting user from the token
            req.user = await User.findById(decoded.id).select('-password');

            // Ensure user still exists in DB
            if (!req.user) {
                return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: 'Not authorized, user not found' });
            }

            next();
        } catch (error) {
            console.error(error);
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: 'Not authorized, token failed' });
        }
    } else {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: 'Not authorized, no token' });
    }
};

module.exports = { protect };