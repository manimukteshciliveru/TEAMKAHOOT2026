import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

if (import.meta.env.PROD && API_BASE_URL.includes('localhost')) {
    console.warn('⚠️ Frontend is running in PRODUCTION but VITE_API_URL is missing! Falling back to localhost.');
} else {
    // console.log('🔗 API Base URL:', API_BASE_URL);
}

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    withCredentials: true
});

// Add a request interceptor to include the token in headers
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['x-auth-token'] = token;
        }
        // Add CSRF protection header
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        return config;
    },
    (error) => Promise.reject(error)
);

// Add a response interceptor to handle 401 Unauthorized errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            console.error('🔓 Unauthorized access - Logging out...');
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
