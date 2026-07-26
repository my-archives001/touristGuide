// Enterprise Axios Client with Centralized Config, Interceptors, and Toast Notifications
import axios from 'axios';
import { toast } from 'react-toastify';
import config, { STORAGE_KEYS, APP_CONSTANTS } from '../config/index';

// Helper to create an Axios client instance with standard interceptors
const createClient = (baseURL, timeout = APP_CONSTANTS.DEFAULT_TIMEOUT) => {
  const instance = axios.create({
    baseURL,
    timeout,
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true,
  });

  // Request Interceptor: Attach JWT token if present in storage
  instance.interceptors.request.use(
    (reqConfig) => {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      if (token && reqConfig.headers) {
        reqConfig.headers.Authorization = `Bearer ${token}`;
      }
      return reqConfig;
    },
    (error) => Promise.reject(error)
  );

  // Response Interceptor: Handle errors globally with Toast notifications
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (!error.response) {
        toast.error('Network error. Please check your internet connection.');
        return Promise.reject(error);
      }

      const { status, data } = error.response;
      const message = data?.message || data?.error || 'An unexpected error occurred.';

      switch (status) {
        case 401:
          // Unauthorized: automatically clear stored token if expired/invalid
          toast.error('Session expired or unauthorized. Please log in again.');
          localStorage.removeItem(STORAGE_KEYS.TOKEN);
          localStorage.removeItem(STORAGE_KEYS.USER_INFO);
          break;
        case 403:
          toast.error('Access forbidden.');
          break;
        case 429:
          toast.error('Rate limit exceeded. Please wait a moment and try again.');
          break;
        case 500:
          toast.error('Server error. Our team has been notified.');
          break;
        default:
          if (status >= 400 && status < 500) {
            toast.error(message);
          }
      }

      return Promise.reject(error);
    }
  );

  return instance;
};

// Create dedicated API clients for each backend service
export const apiClient = createClient(config.apiURL, 30000);
export const aiClient = createClient(config.aiURL, 60000);
export const routeClient = createClient(config.routeURL, 30000);

export default apiClient;
