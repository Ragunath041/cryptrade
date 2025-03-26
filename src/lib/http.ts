import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const http = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to attach the auth token to every request
http.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle auth errors
http.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // If token is invalid, clear storage and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

// Auth service functions
export const authService = {
  register: async (username: string, email: string, password: string) => {
    const response = await http.post('/auth/register', { username, email, password });
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    // Dispatch custom event to notify components
    window.dispatchEvent(new Event('auth-change'));
    return response;
  },
  
  login: async (email: string, password: string) => {
    const response = await http.post('/auth/login', { email, password });
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    // Dispatch custom event to notify components
    window.dispatchEvent(new Event('auth-change'));
    return response;
  },
  
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Dispatch custom event to notify components
    window.dispatchEvent(new Event('auth-change'));
    window.location.href = '/';
  },
  
  getCurrentUser: () => {
    return JSON.parse(localStorage.getItem('user') || '{}');
  },
  
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },
  
  getProfile: () => {
    return http.get('/auth/me');
  }
};

// Export the HTTP client for other API calls
export default http; 