const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { config, HTTP_STATUS, VALIDATION_LIMITS, REGEX, MESSAGES } = require('../config');

// Helper function to create a token
const generateToken = (id) => {
    return jwt.sign({ id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
};

// Simple email regex for validation
const isValidEmail = (email) => REGEX.EMAIL.test(email);

// Sign Up a New User
const signUpUser = async (req, res) => {
    const { firstName, lastName, email, securityPin } = req.body;

    // Input validation
    if (!firstName || !lastName || !email || !securityPin) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: MESSAGES.ALL_FIELDS_REQUIRED });
    }
    if (firstName.trim().length < VALIDATION_LIMITS.NAME_MIN_LENGTH || lastName.trim().length < VALIDATION_LIMITS.NAME_MIN_LENGTH) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: MESSAGES.NAME_EMPTY });
    }
    if (!isValidEmail(email)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: MESSAGES.INVALID_EMAIL });
    }
    if (securityPin.length < VALIDATION_LIMITS.PIN_MIN_LENGTH) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: MESSAGES.PIN_TOO_SHORT });
    }

    try {
        // Checking if user already exists
        const userExists = await User.findOne({ email: email.toLowerCase().trim() });
        if (userExists) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: MESSAGES.USER_EXISTS });
        }

        // Creating a new user (password will be hashed by the model)
        const newUser = await User.create({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.toLowerCase().trim(),
            password: securityPin,
        });

        // User is Created successfully
        return res.status(HTTP_STATUS.CREATED).json({
            success: true,
            message: MESSAGES.USER_REGISTERED,
            user: {
                id: newUser._id,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                email: newUser.email,
            },
        });
    } catch (error) {
        console.error("Signup error:", error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.SERVER_ERROR });
    }
};

// Login an Existing user
const loginUser = async (req, res) => {
    const { email, securityPin } = req.body;

    // Input validation
    if (!email || !securityPin) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: MESSAGES.ALL_FIELDS_REQUIRED });
    }

    try {
        // 1. Checking if user with that email exists
        const user = await User.findOne({ email: email.toLowerCase().trim() });

        // 2. If user exists, compare the provided security pin with hashed pin
        if (user && (await bcrypt.compare(securityPin, user.password))) {
            // 3. If they match, send back user data and a new token
            return res.status(HTTP_STATUS.OK).json({
                _id: user._id,
                name: `${user.firstName} ${user.lastName}`,
                email: user.email,
                token: generateToken(user._id),
            });
        } else {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: MESSAGES.INVALID_CREDENTIALS });
        }
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: MESSAGES.SERVER_ERROR, error: error.message });
    }
};

// Get user Profile (Protected)
const getUserProfile = async (req, res) => {
    if (req.user) {
        return res.json({
            _id: req.user._id,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            email: req.user.email,
        });
    } else {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: MESSAGES.USER_NOT_FOUND });
    }
};

module.exports = { signUpUser, loginUser, getUserProfile };