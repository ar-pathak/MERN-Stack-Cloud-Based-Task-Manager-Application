import api from "../config/axios";

const isUserAuthenticated = async () => {
    try {
        const res = await api.get('/api/user/userInfo'); // Added await & leading slash
        return res.data;
    } catch (error) {
        console.error("Auth check failed:", error?.response?.data || error.message);
        return {
            success: false,
            error: error?.response?.data?.message || "Authentication failed",
        };
    }
};

export default isUserAuthenticated;