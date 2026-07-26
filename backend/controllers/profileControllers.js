const Profile = require('../models/profileModel');
const { HTTP_STATUS, VALIDATION_LIMITS, ALLOWED_GENDERS, REGEX, MESSAGES } = require('../config');

// @desc    Create or Update user profile
// @route   POST /api/profile
// @access  Private
const createOrUpdateProfile = async (req, res) => {
    const { phone, age, gender, hometown, interests } = req.body;
    const user = req.user.id; // User ID from the protect middleware

    // Input validation
    if (age && isNaN(Number(age))) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ msg: MESSAGES.AGE_NUMBER });
    }
    if (age && (Number(age) < VALIDATION_LIMITS.AGE_MIN || Number(age) > VALIDATION_LIMITS.AGE_MAX)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ msg: MESSAGES.INVALID_AGE });
    }
    if (phone && !REGEX.PHONE.test(phone)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ msg: MESSAGES.INVALID_PHONE });
    }
    if (gender && !ALLOWED_GENDERS.includes(gender)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ msg: MESSAGES.INVALID_GENDER });
    }

    const profileFields = {
        user,
        phone: phone || '',
        age: age || '',
        gender: gender || '',
        hometown: hometown || '',
        interests: interests || '',
    };

    try {
        let profile = await Profile.findOne({ user });

        if (profile) {
            // If profile exists, update it
            profile = await Profile.findOneAndUpdate(
                { user },
                { $set: profileFields },
                { new: true }
            );
            return res.json(profile);
        }

        // If no profile exists, create a new one
        profile = new Profile(profileFields);
        await profile.save();
        return res.status(HTTP_STATUS.CREATED).json(profile);

    } catch (error) {
        console.error(error.message);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send(MESSAGES.SERVER_ERROR);
    }
};

// @desc    Get user profile
// @route   GET /api/profile
// @access  Private
const getProfile = async (req, res) => {
    try {
        const profile = await Profile.findOne({ user: req.user.id }).populate('user', ['firstName', 'lastName', 'email']);
        
        if (!profile) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ msg: 'Profile not found' });
        }
        return res.json(profile);
    } catch (error) {
        console.error(error.message);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send(MESSAGES.SERVER_ERROR);
    }
};

module.exports = { createOrUpdateProfile, getProfile };