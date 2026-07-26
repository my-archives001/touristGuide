const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config/config');

// UserSchema Definition
const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
}, {
    timestamps: true // Automatically adds 'createdAt' and 'updatedAt' fields (for record purpose)
});

// This function runs BEFORE a user is saved to the database
// This function hashes the password automatically for maximum security(10 Salts)
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(config.bcryptSaltRounds);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

module.exports = mongoose.model('User', userSchema);