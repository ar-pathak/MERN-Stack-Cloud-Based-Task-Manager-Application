jest.mock("../../src/helpers/cookieHelper", () => ({
    getCookieOptions: jest.fn()
}));

const { getCookieOptions } = require("../../src/helpers/cookieHelper");
const {
    ADMIN_ACCESS_COOKIE_NAME,
    setAdminAccessTokenCookie,
    clearAdminAuthCookies
} = require("../../src/helpers/adminCookieHelper");

beforeEach(() => {
    jest.clearAllMocks();
});

test("setAdminAccessTokenCookie writes admin access token with shared cookie options", () => {
    getCookieOptions.mockReturnValue({
        httpOnly: true,
        secure: false,
        sameSite: "lax"
    });

    const res = {
        cookie: jest.fn()
    };

    setAdminAccessTokenCookie(res, "admin-token");

    expect(res.cookie).toHaveBeenCalledWith(
        ADMIN_ACCESS_COOKIE_NAME,
        "admin-token",
        {
            httpOnly: true,
            secure: false,
            sameSite: "lax"
        }
    );
});

test("clearAdminAuthCookies removes admin access token cookie", () => {
    getCookieOptions.mockReturnValue({
        httpOnly: true,
        secure: true,
        sameSite: "none"
    });

    const res = {
        clearCookie: jest.fn()
    };

    clearAdminAuthCookies(res);

    expect(res.clearCookie).toHaveBeenCalledWith(
        ADMIN_ACCESS_COOKIE_NAME,
        {
            httpOnly: true,
            secure: true,
            sameSite: "none"
        }
    );
});
