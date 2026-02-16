import axios from "axios";
import { refreshToken } from "../service/auth.service";

const normalizeBaseUrl = (value) =>
    String(value || "http://localhost:3000").replace(/\/+$/, "");

const api = axios.create({
    baseURL: normalizeBaseUrl(import.meta.env.VITE_API_URL),
    withCredentials: true, // Important: enables cookies to be sent with requests
    timeout: 30000, // Increased timeout for better reliability
    headers: {
        'Content-Type': 'application/json',
    }
});

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let failedQueue = [];

const shouldSkipTokenRefresh = (requestUrl = "") => {
    const url = String(requestUrl || "");
    const authEndpoints = [
        "/api/auth/login",
        "/api/auth/signup",
        "/api/auth/refresh",
        "/api/auth/forgot-password",
        "/api/auth/reset-password",
    ];

    return authEndpoints.some((endpoint) => url.includes(endpoint));
};

const processQueue = (error = null) => {
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
        if (!originalRequest) {
            return Promise.reject(error);
        }

        // If error is 401 and we haven't already tried to refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
            if (shouldSkipTokenRefresh(originalRequest.url)) {
                return Promise.reject(error);
            }

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

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Attempt to refresh the token
                await refreshToken();
                
                // Process queued requests
                processQueue(null);
                isRefreshing = false;
                
                // Retry the original request
                return api(originalRequest);
            } catch (refreshError) {
                // Refresh failed - clear auth and reject
                processQueue(refreshError);
                isRefreshing = false;
                
                // Clear user data on refresh failure
                localStorage.removeItem("user");

                // Notify app shell to navigate without hard page reload
                if (!window.location.pathname.includes('/auth')) {
                    window.dispatchEvent(new CustomEvent("auth:session-expired"));
                }
                
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
