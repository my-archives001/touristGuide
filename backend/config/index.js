// Centralized Export for Backend Configuration & Application Constants
const config = require('./config');
const constants = require('./constants');

module.exports = {
  config,
  ...constants,
};
