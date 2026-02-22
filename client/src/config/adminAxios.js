import axios from "axios";

const normalizeBaseUrl = (value) =>
    String(value || "http://localhost:3000").replace(/\/+$/, "");

const adminApi = axios.create({
    baseURL: normalizeBaseUrl(import.meta.env.VITE_API_URL),
    withCredentials: true,
    timeout: 30000,
    headers: {
        "Content-Type": "application/json"
    }
});

export default adminApi;
