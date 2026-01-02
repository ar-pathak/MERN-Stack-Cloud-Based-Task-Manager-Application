// services/auth.service.js
import api from "../config/axios";

/**
 * Authentication Service
 * Handles all authentication-related API calls
 */

// ==================== USER AUTHENTICATION ====================

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @param {string} userData.name - User's full name
 * @param {string} userData.email - User's email
 * @param {string} userData.password - User's password
 * @param {string} userData.confirmPassword - Password confirmation
 * @returns {Promise<Object>} Registration response
 */
export const register = async (userData) => {
    try {
        const response = await api.post("/api/auth/register", userData);

        // Store token if returned
        if (response.data.token) {
            localStorage.setItem("token", response.data.token);
        }

        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Registration failed",
            errors: error.response?.data?.errors || {},
            status: error.response?.status,
        };
    }
};

/**
 * Login user
 * @param {Object} credentials - Login credentials
 * @param {string} credentials.email - User's email
 * @param {string} credentials.password - User's password
 * @returns {Promise<Object>} Login response with user data and token
 */
export const login = async (credentials) => {
    try {
        const response = await api.post("/api/auth/login", credentials);

        // Store token
        if (response.data.token) {
            localStorage.setItem("token", response.data.token);
        }

        // Store user info if needed
        if (response.data.user) {
            localStorage.setItem("user", JSON.stringify(response.data.user));
        }

        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Login failed",
            errors: error.response?.data?.errors || {},
            status: error.response?.status,
        };
    }
};

/**
 * Logout user
 * @returns {Promise<Object>} Logout response
 */
export const logout = async () => {
    try {
        const response = await api.post("/api/auth/logout");

        // Clear local storage
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        return response.data;
    } catch (error) {
        // Clear local storage even if API call fails
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        throw {
            message: error.response?.data?.message || "Logout failed",
            status: error.response?.status,
        };
    }
};

// ==================== USER INFO ====================

/**
 * Get current user information
 * @returns {Promise<Object>} User data
 */
export const getUserInfo = async () => {
    try {
        const response = await api.get("/api/user/userInfo");
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to fetch user info",
            status: error.response?.status,
        };
    }
};

/**
 * Update user profile
 * @param {Object} userData - Updated user data
 * @returns {Promise<Object>} Updated user data
 */
export const updateProfile = async (userData) => {
    try {
        const response = await api.put("/api/user/profile", userData);

        // Update local storage if user data returned
        if (response.data.user) {
            localStorage.setItem("user", JSON.stringify(response.data.user));
        }

        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to update profile",
            errors: error.response?.data?.errors || {},
            status: error.response?.status,
        };
    }
};

// ==================== PASSWORD MANAGEMENT ====================

/**
 * Change user password
 * @param {Object} passwordData - Password change data
 * @param {string} passwordData.currentPassword - Current password
 * @param {string} passwordData.newPassword - New password
 * @param {string} passwordData.confirmPassword - Password confirmation
 * @returns {Promise<Object>} Password change response
 */
export const changePassword = async (passwordData) => {
    try {
        const response = await api.put("/api/user/change-password", passwordData);
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to change password",
            errors: error.response?.data?.errors || {},
            status: error.response?.status,
        };
    }
};

/**
 * Request password reset
 * @param {string} email - User's email
 * @returns {Promise<Object>} Password reset request response
 */
export const forgotPassword = async (email) => {
    try {
        const response = await api.post("/api/auth/forgot-password", { email });
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to send reset email",
            status: error.response?.status,
        };
    }
};

/**
 * Reset password with token
 * @param {Object} resetData - Password reset data
 * @param {string} resetData.token - Reset token from email
 * @param {string} resetData.password - New password
 * @param {string} resetData.confirmPassword - Password confirmation
 * @returns {Promise<Object>} Password reset response
 */
export const resetPassword = async (resetData) => {
    try {
        const response = await api.post("/api/auth/reset-password", resetData);
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to reset password",
            errors: error.response?.data?.errors || {},
            status: error.response?.status,
        };
    }
};

// ==================== EMAIL VERIFICATION ====================

/**
 * Send verification email
 * @returns {Promise<Object>} Email verification response
 */
export const sendVerificationEmail = async () => {
    try {
        const response = await api.post("/api/auth/send-verification");
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to send verification email",
            status: error.response?.status,
        };
    }
};

/**
 * Verify email with token
 * @param {string} token - Verification token from email
 * @returns {Promise<Object>} Email verification response
 */
export const verifyEmail = async (token) => {
    try {
        const response = await api.post("/api/auth/verify-email", { token });
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Email verification failed",
            status: error.response?.status,
        };
    }
};

// ==================== SESSION MANAGEMENT ====================

/**
 * Refresh authentication token
 * @returns {Promise<Object>} New token
 */
export const refreshToken = async () => {
    try {
        const response = await api.post("/api/auth/refresh-token");

        if (response.data.token) {
            localStorage.setItem("token", response.data.token);
        }

        return response.data;
    } catch (error) {
        // Clear token on refresh failure
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        throw {
            message: error.response?.data?.message || "Token refresh failed",
            status: error.response?.status,
        };
    }
};

/**
 * Check if user is authenticated
 * @returns {Promise<Object>} Authentication status
 */
export const checkAuth = async () => {
    try {
        const response = await api.get("/api/auth/check");
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Authentication check failed",
            status: error.response?.status,
        };
    }
};

/**
 * Get all active sessions
 * @returns {Promise<Object>} List of active sessions
 */
export const getActiveSessions = async () => {
    try {
        const response = await api.get("/api/user/sessions");
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to fetch sessions",
            status: error.response?.status,
        };
    }
};

/**
 * Revoke a specific session
 * @param {string} sessionId - Session ID to revoke
 * @returns {Promise<Object>} Revoke response
 */
export const revokeSession = async (sessionId) => {
    try {
        const response = await api.delete(`/api/user/sessions/${sessionId}`);
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to revoke session",
            status: error.response?.status,
        };
    }
};

/**
 * Logout from all devices
 * @returns {Promise<Object>} Logout response
 */
export const logoutAllDevices = async () => {
    try {
        const response = await api.post("/api/auth/logout-all");

        // Clear local storage
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        return response.data;
    } catch (error) {
        // Clear local storage even if API call fails
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        throw {
            message: error.response?.data?.message || "Failed to logout from all devices",
            status: error.response?.status,
        };
    }
};

// ==================== TWO-FACTOR AUTHENTICATION ====================

/**
 * Enable 2FA for user
 * @returns {Promise<Object>} 2FA setup data (QR code, secret, etc.)
 */
export const enable2FA = async () => {
    try {
        const response = await api.post("/api/auth/2fa/enable");
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to enable 2FA",
            status: error.response?.status,
        };
    }
};

/**
 * Verify and confirm 2FA setup
 * @param {string} code - 2FA verification code
 * @returns {Promise<Object>} Verification response
 */
export const verify2FA = async (code) => {
    try {
        const response = await api.post("/api/auth/2fa/verify", { code });
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "2FA verification failed",
            status: error.response?.status,
        };
    }
};

/**
 * Disable 2FA for user
 * @param {string} password - User's password for confirmation
 * @returns {Promise<Object>} Disable 2FA response
 */
export const disable2FA = async (password) => {
    try {
        const response = await api.post("/api/auth/2fa/disable", { password });
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to disable 2FA",
            status: error.response?.status,
        };
    }
};

/**
 * Verify 2FA code during login
 * @param {string} code - 2FA code
 * @param {string} loginToken - Temporary login token
 * @returns {Promise<Object>} Login completion response
 */
export const verify2FALogin = async (code, loginToken) => {
    try {
        const response = await api.post("/api/auth/2fa/verify-login", {
            code,
            loginToken,
        });

        if (response.data.token) {
            localStorage.setItem("token", response.data.token);
        }

        if (response.data.user) {
            localStorage.setItem("user", JSON.stringify(response.data.user));
        }

        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "2FA login verification failed",
            status: error.response?.status,
        };
    }
};

// ==================== ACCOUNT MANAGEMENT ====================

/**
 * Delete user account
 * @param {string} password - User's password for confirmation
 * @returns {Promise<Object>} Account deletion response
 */
export const deleteAccount = async (password) => {
    try {
        const response = await api.delete("/api/user/account", {
            data: { password },
        });

        // Clear all local data
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to delete account",
            status: error.response?.status,
        };
    }
};

/**
 * Get user preferences
 * @returns {Promise<Object>} User preferences
 */
export const getUserPreferences = async () => {
    try {
        const response = await api.get("/api/user/preferences");
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to fetch preferences",
            status: error.response?.status,
        };
    }
};

/**
 * Update user preferences
 * @param {Object} preferences - User preferences
 * @returns {Promise<Object>} Updated preferences
 */
export const updateUserPreferences = async (preferences) => {
    try {
        const response = await api.put("/api/user/preferences", preferences);
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || "Failed to update preferences",
            status: error.response?.status,
        };
    }
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Get stored auth token
 * @returns {string|null} Auth token
 */
export const getToken = () => {
    return localStorage.getItem("token");
};

/**
 * Get stored user data
 * @returns {Object|null} User data
 */
export const getStoredUser = () => {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
};

/**
 * Check if user is logged in (has valid token)
 * @returns {boolean} Login status
 */
export const isLoggedIn = () => {
    return !!getToken();
};

/**
 * Clear all auth data from storage
 */
export const clearAuthData = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
};

// Default export with all functions
export default {
    // Authentication
    register,
    login,
    logout,

    // User Info
    getUserInfo,
    updateProfile,

    // Password Management
    changePassword,
    forgotPassword,
    resetPassword,

    // Email Verification
    sendVerificationEmail,
    verifyEmail,

    // Session Management
    refreshToken,
    checkAuth,
    getActiveSessions,
    revokeSession,
    logoutAllDevices,

    // 2FA
    enable2FA,
    verify2FA,
    disable2FA,
    verify2FALogin,

    // Account Management
    deleteAccount,
    getUserPreferences,
    updateUserPreferences,

    // Utilities
    getToken,
    getStoredUser,
    isLoggedIn,
    clearAuthData,
};