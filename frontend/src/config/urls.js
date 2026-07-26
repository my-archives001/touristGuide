// Centralized Service URLs from environment configuration
const urls = {
  apiURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  aiURL: process.env.REACT_APP_AI_URL || 'http://localhost:5001',
  routeURL: process.env.REACT_APP_ROUTE_URL || 'http://localhost:8000',
};

export default urls;
