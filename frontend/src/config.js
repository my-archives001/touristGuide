// Root config module re-exporting centralized /config directory
import config, { STORAGE_KEYS, APP_CONSTANTS, VIEWS } from './config/index';

export default config;
export { STORAGE_KEYS, APP_CONSTANTS, VIEWS };