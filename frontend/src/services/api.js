import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Interceptor to automatically attach JWT authorization header on outgoing queries
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('stash_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
