import api from "../config/axios";

const isUserAuthenticated = async () => {
    try {
        const res = await api.get('/api/user/userInfo');
        
        // Handle different response formats
        if (res.data?.success === true || res.data?.data?.user || res.data?.user) {
            return {
                success: true,
                user: res.data?.data?.user || res.data?.user || res.data?.data,
            };
        }
        
        return {
            success: false,
            error: "Invalid response format",
        };
    } catch (error) {
        // Don't log 401 errors as they're expected for unauthenticated users
        if (error.response?.status !== 401) {
            console.error("Auth check failed:", error?.response?.data || error.message);
        }
        
        return {
            success: false,
            error: error?.response?.data?.message || error?.response?.data?.error || "Authentication failed",
        };
    }
};

export default isUserAuthenticated;