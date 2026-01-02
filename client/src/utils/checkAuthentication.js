import axios from "axios";

const isUserAuthenticated = async () => {
    try {
        const res = await axios.get(
            `${import.meta.env.VITE_API_URL}/user/userInfo`,
            {
                withCredentials: true,
            }
        );

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
