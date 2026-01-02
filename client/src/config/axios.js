import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
    withCredentials: true, // Important: enables cookies to be sent with requests
    timeout: 30000, // Increased timeout for better reliability
    headers: {
        'Content-Type': 'application/json',
    }
});

export default api;