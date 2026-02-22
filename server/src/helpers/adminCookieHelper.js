const { getCookieOptions } = require("./cookieHelper");

const ADMIN_ACCESS_COOKIE_NAME = "adminAccessToken";

const setAdminAccessTokenCookie = (res, token) => {
    // Session cookie: browser close forces re-auth for admin panel.
    res.cookie(ADMIN_ACCESS_COOKIE_NAME, token, {
        ...getCookieOptions()
    });
};

const clearAdminAuthCookies = (res) => {
    const options = getCookieOptions();
    res.clearCookie(ADMIN_ACCESS_COOKIE_NAME, options);
};

module.exports = {
    ADMIN_ACCESS_COOKIE_NAME,
    setAdminAccessTokenCookie,
    clearAdminAuthCookies
};
