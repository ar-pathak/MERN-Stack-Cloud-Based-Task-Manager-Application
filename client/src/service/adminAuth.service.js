import adminApi from "../config/adminAxios";

const toError = (error, fallback) => ({
    message: error?.response?.data?.message || error?.message || fallback,
    errors: error?.response?.data?.errors || [],
    status: error?.response?.status,
    code: error?.response?.data?.code
});

export const registerAdmin = async (payload) => {
    try {
        const response = await adminApi.post("/api/admin/auth/register", payload);
        return response.data?.data || response.data || null;
    } catch (error) {
        throw toError(error, "Failed to register admin");
    }
};

export const loginAdmin = async (payload) => {
    try {
        const response = await adminApi.post("/api/admin/auth/login", payload);
        return response.data?.data || response.data || null;
    } catch (error) {
        throw toError(error, "Failed to log in as admin");
    }
};

export const verifyAdminLoginOtp = async (payload) => {
    try {
        const response = await adminApi.post("/api/admin/auth/verify-login-otp", payload);
        return response.data?.data || response.data || null;
    } catch (error) {
        throw toError(error, "Failed to verify admin login OTP");
    }
};

export const logoutAdmin = async () => {
    try {
        const response = await adminApi.post("/api/admin/auth/logout");
        return response.data?.data || response.data || null;
    } catch {
        return null;
    }
};

export const getAdminMe = async () => {
    try {
        const response = await adminApi.get("/api/admin/auth/me");
        return response.data?.data || response.data || null;
    } catch (error) {
        throw toError(error, "Failed to fetch admin profile");
    }
};

export const forgotAdminPassword = async (email) => {
    try {
        const response = await adminApi.post("/api/admin/auth/forgot-password", { email });
        return response.data?.data || response.data || null;
    } catch (error) {
        throw toError(error, "Failed to send admin reset email");
    }
};

export const requestAdminVerification = async (email) => {
    try {
        const response = await adminApi.post("/api/admin/auth/request-verification", { email });
        return response.data?.data || response.data || null;
    } catch (error) {
        throw toError(error, "Failed to send admin verification link");
    }
};

export const resetAdminPassword = async ({ token, password }) => {
    try {
        const response = await adminApi.post(`/api/admin/auth/reset-password/${token}`, { password });
        return response.data?.data || response.data || null;
    } catch (error) {
        throw toError(error, "Failed to reset admin password");
    }
};

export const sendAdminVerificationEmail = async () => {
    try {
        const response = await adminApi.post("/api/admin/auth/send-verification");
        return response.data?.data || response.data || null;
    } catch (error) {
        throw toError(error, "Failed to send admin verification email");
    }
};

export const verifyAdminEmail = async (token) => {
    try {
        const response = await adminApi.post("/api/admin/auth/verify-email", { token });
        return response.data?.data || response.data || null;
    } catch (error) {
        throw toError(error, "Admin email verification failed");
    }
};
