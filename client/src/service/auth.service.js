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
        const response = await api.post("/api/auth/signup", userData);

        // Store user info if returned (tokens are in httpOnly cookies)
        if (response.data.data?.user) {
            localStorage.setItem("user", JSON.stringify(response.data.data.user));
        }

        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || error.response?.data?.error || "Registration failed",
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

        // Tokens are stored in httpOnly cookies by the server
        // Store user info if returned
        if (response.data?.data?.user || response.data?.user) {
            const userData = response.data?.data?.user || response.data?.user;
            localStorage.setItem("user", JSON.stringify(userData));
        }

        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || error.response?.data?.error || "Login failed",
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
        // Always clear local storage first
        localStorage.removeItem("user");
        
        // Try to call logout endpoint (but don't fail if it errors)
        try {
            const response = await api.post("/api/auth/logout");
            return response.data;
        } catch (apiError) {
            // Even if API call fails, we've cleared local storage
            // This handles cases where token is already expired
            return {
                success: true,
                message: "Logged out successfully"
            };
        }
    } catch (error) {
        // Ensure local storage is cleared
        localStorage.removeItem("user");
        
        // Return success even on error to allow logout to complete
        return {
            success: true,
            message: "Logged out successfully"
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
        const { token, password } = resetData;
        const response = await api.post(`/api/auth/reset-password/${token}`, { password });
        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || error.response?.data?.error || "Failed to reset password",
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
        // Server endpoint is /api/auth/refresh (not refresh-token)
        const response = await api.post("/api/auth/refresh");

        // Tokens are automatically updated in httpOnly cookies by the server
        return response.data;
    } catch (error) {
        // Clear user data on refresh failure
        localStorage.removeItem("user");

        throw {
            message: error.response?.data?.message || error.response?.data?.error || "Token refresh failed",
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

        // Clear user data (cookies are cleared by server)
        localStorage.removeItem("user");

        return response.data;
    } catch (error) {
        // Clear user data even if API call fails
        localStorage.removeItem("user");

        throw {
            message: error.response?.data?.message || error.response?.data?.error || "Failed to logout from all devices",
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

        // Tokens are stored in httpOnly cookies by the server
        if (response.data.user) {
            localStorage.setItem("user", JSON.stringify(response.data.user));
        }

        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || error.response?.data?.error || "2FA login verification failed",
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

        // Clear user data (cookies are cleared by server)
        localStorage.removeItem("user");

        return response.data;
    } catch (error) {
        throw {
            message: error.response?.data?.message || error.response?.data?.error || "Failed to delete account",
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
 * Get stored user data
 * @returns {Object|null} User data
 */
export const getStoredUser = () => {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
};

// All functions are exported individually above
// No default export needed as all imports use named exports