// Centralized API Service for all backend endpoints
import { apiClient, aiClient, routeClient } from './apiClient';

// Authentication & User Service
export const authService = {
  login: async (credentials) => {
    const response = await apiClient.post('/api/users/login', credentials);
    return response.data;
  },
  signup: async (userData) => {
    const response = await apiClient.post('/api/users/signup', userData);
    return response.data;
  },
};

// Profile Service
export const profileService = {
  getProfile: async () => {
    const response = await apiClient.get('/api/profile');
    return response.data;
  },
  updateProfile: async (profileData) => {
    const response = await apiClient.post('/api/profile', profileData);
    return response.data;
  },
};

// Heritage Places Service
export const placesService = {
  getPlaces: async (page = 1, limit = 50) => {
    const response = await apiClient.get(`/api/places?page=${page}&limit=${limit}`);
    return response.data;
  },
  getPlaceImageUrl: (id) => `${apiClient.defaults.baseURL}/api/places/${id}/image`,
};

// Python AI Bot Service (Port 5001)
export const aiService = {
  sendChat: async (message, userId = 'default-user', conversationId = 'default-convo', location = null) => {
    const response = await aiClient.post('/api/chat', {
      message,
      userId,
      conversationId,
      location,
    });
    return response.data;
  },
  checkHealth: async () => {
    const response = await aiClient.get('/api/health');
    return response.data;
  },
  reindexPlaces: async () => {
    const response = await aiClient.post('/api/reindex');
    return response.data;
  },
};

// Python Route Planner Service (Port 8000)
export const routeService = {
  getDistricts: async () => {
    const response = await routeClient.get('/api/districts');
    return response.data;
  },
  getDistrictData: async (district) => {
    const response = await routeClient.get(`/api/district/${district}`);
    return response.data;
  },
  planRoute: async (district, start = null) => {
    const response = await routeClient.post('/api/plan-route', {
      district,
      start,
    });
    return response.data;
  },
  findPath: async (district, start, end) => {
    const response = await routeClient.post('/api/find-path', {
      district,
      start,
      end,
    });
    return response.data;
  },
};

const apiService = {
  authService,
  profileService,
  placesService,
  aiService,
  routeService,
};

export default apiService;
