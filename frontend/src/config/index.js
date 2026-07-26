// Centralized Configuration Index for React Frontend
import urls from './urls';
import { STORAGE_KEYS, APP_CONSTANTS, VIEWS } from './constants';

const config = {
  ...urls,
  STORAGE_KEYS,
  APP_CONSTANTS,
  VIEWS,
};

export default config;
export { STORAGE_KEYS, APP_CONSTANTS, VIEWS };
