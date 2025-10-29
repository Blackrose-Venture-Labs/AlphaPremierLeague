import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS } from '../config/api';

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for logging (optional)
apiClient.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// AI Models API service
export const modelsService = {
  /**
   * Fetch all AI models from the backend
   * @returns {Promise} Promise object representing the API response
   */
  getAllModels: async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.GET_ALL_MODELS);
      return response.data;
    } catch (error) {
      console.error('Error fetching AI models:', error);
      throw error;
    }
  },
};

export default apiClient;