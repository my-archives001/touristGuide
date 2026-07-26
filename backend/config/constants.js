// Centralized Application Constants, Status Codes, and Messages
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
};

const VALIDATION_LIMITS = {
  PIN_MIN_LENGTH: 8,
  NAME_MIN_LENGTH: 1,
  AGE_MIN: 1,
  AGE_MAX: 150,
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 50,
};

const ALLOWED_GENDERS = ['Male', 'Female', 'Other'];

const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[0-9+\-\s()]{7,15}$/,
};

const MESSAGES = {
  ALL_FIELDS_REQUIRED: 'All fields are required',
  NAME_EMPTY: 'Name fields cannot be empty',
  INVALID_EMAIL: 'Please provide a valid email address',
  PIN_TOO_SHORT: 'Security PIN must be at least 8 characters',
  USER_EXISTS: 'User already exists',
  USER_REGISTERED: 'User registered successfully',
  INVALID_CREDENTIALS: 'Invalid email or PIN',
  LOGIN_SUCCESS: 'Login successful',
  USER_NOT_FOUND: 'User not found',
  PROFILE_UPDATED: 'Profile updated successfully',
  AGE_NUMBER: 'Age must be a number',
  INVALID_AGE: 'Please provide a valid age',
  INVALID_PHONE: 'Please provide a valid phone number',
  INVALID_GENDER: 'Gender must be Male, Female, or Other',
  SERVER_ERROR: 'Server error',
};

module.exports = {
  HTTP_STATUS,
  VALIDATION_LIMITS,
  ALLOWED_GENDERS,
  REGEX,
  MESSAGES,
};
