import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

if (import.meta.env.PROD && API_BASE_URL.includes('localhost')) {
    console.warn('⚠️ Frontend is running in PRODUCTION but VITE_API_URL is missing! Falling back to localhost.');
} else {
    // console.log('🔗 API Base URL:', API_BASE_URL);
}

const api = axios.create({
    baseURL: API_BASE_URL,
});

// Add a request interceptor to include the token in headers
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['x-auth-token'] = token;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
