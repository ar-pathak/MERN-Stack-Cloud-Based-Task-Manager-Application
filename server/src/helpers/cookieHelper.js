/**
 * Get cookie options based on environment
 * @returns {Object} Cookie options
 */
const parseBoolean = (value) => {
    if (typeof value !== "string") return null;
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
    return null;
};

const normalizeSameSite = (value) => {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized === "strict") return "strict";
    if (normalized === "none") return "none";
    return "lax";
};

const getCookieOptions = () => {
    const isProduction = process.env.NODE_ENV === "production";
    const envSecure = parseBoolean(process.env.COOKIE_SECURE);
    const cookieDomain = String(process.env.COOKIE_DOMAIN || "").trim();

    const options = {
        httpOnly: true,
        secure: envSecure ?? isProduction,
        sameSite: normalizeSameSite(process.env.COOKIE_SAME_SITE)
    };

    // Browsers require "Secure" when SameSite=None.
    if (options.sameSite === "none") {
        options.secure = true;
    }

    if (cookieDomain) {
        options.domain = cookieDomain;
    }

    return options;
};

/**
 * Set access token cookie
 * @param {Response} res - Express response object
 * @param {String} token - Access token
 */
const setAccessTokenCookie = (res, token) => {
    res.cookie("accessToken", token, {
        ...getCookieOptions(),
        maxAge: 15 * 60 * 1000, // 15 minutes
    });
};

/**
 * Set refresh token cookie
 * @param {Response} res - Express response object
 * @param {String} token - Refresh token
 */
const setRefreshTokenCookie = (res, token) => {
    res.cookie("refreshToken", token, {
        ...getCookieOptions(),
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
};

/**
 * Clear authentication cookies
 * @param {Response} res - Express response object
 */
const clearAuthCookies = (res) => {
    const options = getCookieOptions();
    res.clearCookie("accessToken", options);
    res.clearCookie("refreshToken", options);
};

module.exports = {
    getCookieOptions,
    setAccessTokenCookie,
    setRefreshTokenCookie,
    clearAuthCookies,
};

