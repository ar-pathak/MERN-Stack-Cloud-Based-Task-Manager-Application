/**
 * Get cookie options based on environment
 * @returns {Object} Cookie options
 */
const getCookieOptions = () => {
    const isProduction = process.env.NODE_ENV === 'production'
    
    return {
        httpOnly: true,
        secure: isProduction, // Only use secure cookies in production (HTTPS)
        sameSite: isProduction ? 'strict' : 'lax', // More flexible in development
    }
}

/**
 * Set access token cookie
 * @param {Response} res - Express response object
 * @param {String} token - Access token
 */
const setAccessTokenCookie = (res, token) => {
    res.cookie('accessToken', token, {
        ...getCookieOptions(),
        maxAge: 15 * 60 * 1000, // 15 minutes
    })
}

/**
 * Set refresh token cookie
 * @param {Response} res - Express response object
 * @param {String} token - Refresh token
 */
const setRefreshTokenCookie = (res, token) => {
    res.cookie('refreshToken', token, {
        ...getCookieOptions(),
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })
}

/**
 * Clear authentication cookies
 * @param {Response} res - Express response object
 */
const clearAuthCookies = (res) => {
    const options = getCookieOptions()
    res.clearCookie('accessToken', options)
    res.clearCookie('refreshToken', options)
}

module.exports = {
    getCookieOptions,
    setAccessTokenCookie,
    setRefreshTokenCookie,
    clearAuthCookies,
}

