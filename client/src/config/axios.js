import axios from "axios";
import { refreshToken } from "../service/auth.service";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
    withCredentials: true, // Important: enables cookies to be sent with requests
    timeout: 30000, // Increased timeout for better reliability
    headers: {
        'Content-Type': 'application/json',
    }
});

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve();
        }
    });
    
    failedQueue = [];
};

// Response interceptor for automatic token refresh
api.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // If error is 401 and we haven't already tried to refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
            // If we're already refreshing, queue this request
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then(() => {
                        // Tokens are in cookies, no need to set headers
                        return api(originalRequest);
                    })
                    .catch(err => {
                        return Promise.reject(err);
                    });
            }

            // Don't retry refresh endpoint itself
            if (originalRequest.url?.includes('/api/auth/refresh')) {
                return Promise.reject(error);
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Attempt to refresh the token
                await refreshToken();
                
                // Process queued requests
                processQueue(null, null);
                isRefreshing = false;
                
                // Retry the original request
                return api(originalRequest);
            } catch (refreshError) {
                // Refresh failed - clear auth and reject
                processQueue(refreshError, null);
                isRefreshing = false;
                
                // Clear user data on refresh failure
                localStorage.removeItem("user");
                
                // Redirect to login if not already there
                if (!window.location.pathname.includes('/auth')) {
                    window.location.href = '/home/auth';
                }
                
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;