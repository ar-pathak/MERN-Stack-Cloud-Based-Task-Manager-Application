jest.mock("../../src/modules/auth/auth.validation", () => ({
    signupSchema: { parse: jest.fn((value) => value) },
    loginSchema: { parse: jest.fn((value) => value) },
    forgotPasswordSchema: { parse: jest.fn((value) => value) },
    resetPasswordSchema: { parse: jest.fn((value) => value) },
    verifyEmailSchema: { parse: jest.fn((value) => value) }
}));

jest.mock("../../src/modules/auth/auth.service", () => ({
    signUp: jest.fn(),
    logIn: jest.fn(),
    logOut: jest.fn(),
    refresh: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    sendVerificationEmail: jest.fn(),
    verifyEmail: jest.fn(),
    getOAuthAuthorizationUrl: jest.fn(),
    exchangeOAuthCodeForProfile: jest.fn(),
    logInWithOAuth: jest.fn()
}));

jest.mock("../../src/helpers/cookieHelper", () => ({
    setAccessTokenCookie: jest.fn(),
    setRefreshTokenCookie: jest.fn(),
    clearAuthCookies: jest.fn(),
    getCookieOptions: jest.fn(() => ({
        httpOnly: true,
        secure: false,
        sameSite: "lax"
    }))
}));

jest.mock("../../src/helpers/responseHelper", () => ({
    sendSuccess: jest.fn((res, data = null, message = "Success", statusCode = 200) => (
        res.status(statusCode).json({
            success: true,
            message,
            ...(data !== null ? { data } : {})
        })
    )),
    handleError: jest.fn((error, res) => (
        res.status(error?.statusCode || 500).json({
            success: false,
            message: error?.message || "Internal server error"
        })
    ))
}));

const {
    signupSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    verifyEmailSchema
} = require("../../src/modules/auth/auth.validation");
const AuthService = require("../../src/modules/auth/auth.service");
const {
    setAccessTokenCookie,
    setRefreshTokenCookie,
    clearAuthCookies
} = require("../../src/helpers/cookieHelper");
const { sendSuccess, handleError } = require("../../src/helpers/responseHelper");
const AuthController = require("../../src/modules/auth/auth.controller");

const createResponse = () => {
    const res = {
        statusCode: null,
        body: null,
        cookies: [],
        clearedCookies: [],
        redirectedTo: null
    };

    res.status = jest.fn((code) => {
        res.statusCode = code;
        return res;
    });
    res.json = jest.fn((payload) => {
        res.body = payload;
        return res;
    });
    res.cookie = jest.fn((name, value, options) => {
        res.cookies.push({ name, value, options });
        return res;
    });
    res.clearCookie = jest.fn((name, options) => {
        res.clearedCookies.push({ name, options });
        return res;
    });
    res.redirect = jest.fn((url) => {
        res.redirectedTo = url;
        return res;
    });

    return res;
};

const encodeOAuthState = (payload) => (
    Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")
);

beforeEach(() => {
    jest.clearAllMocks();
});

test("signUp sets auth cookies and returns 201 payload", async () => {
    signupSchema.parse.mockReturnValue({
        name: "Alice",
        email: "alice@example.com",
        password: "Str0ng@Pass1"
    });
    AuthService.signUp.mockResolvedValue({
        accessToken: "access-token",
        refreshToken: "refresh-token",
        user: {
            _id: "u1",
            name: "Alice",
            email: "alice@example.com",
            username: "alice"
        }
    });
    const req = { body: { name: "Alice", email: "alice@example.com", password: "Str0ng@Pass1" } };
    const res = createResponse();

    await AuthController.signUp(req, res);

    expect(signupSchema.parse).toHaveBeenCalledWith(req.body);
    expect(setAccessTokenCookie).toHaveBeenCalledWith(res, "access-token");
    expect(setRefreshTokenCookie).toHaveBeenCalledWith(res, "refresh-token");
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual(expect.objectContaining({
        success: true,
        message: "User registered successfully"
    }));
});

test("signUp delegates thrown errors to handleError", async () => {
    const error = new Error("Validation error");
    error.statusCode = 400;
    signupSchema.parse.mockImplementation(() => {
        throw error;
    });
    const req = { body: {} };
    const res = createResponse();

    await AuthController.signUp(req, res);

    expect(handleError).toHaveBeenCalledWith(error, res);
    expect(res.statusCode).toBe(400);
});

test("logIn sets auth cookies and returns user payload", async () => {
    loginSchema.parse.mockReturnValue({
        email: "alice@example.com",
        password: "Str0ng@Pass1"
    });
    AuthService.logIn.mockResolvedValue({
        accessToken: "access-token",
        refreshToken: "refresh-token",
        user: {
            _id: "u1",
            name: "Alice",
            email: "alice@example.com",
            username: "alice"
        }
    });
    const req = { body: { email: "alice@example.com", password: "Str0ng@Pass1" } };
    const res = createResponse();

    await AuthController.logIn(req, res);

    expect(loginSchema.parse).toHaveBeenCalledWith(req.body);
    expect(setAccessTokenCookie).toHaveBeenCalledWith(res, "access-token");
    expect(setRefreshTokenCookie).toHaveBeenCalledWith(res, "refresh-token");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({
        success: true,
        message: "Login successful"
    }));
});

test("logOut always clears cookies and returns success even if service fails", async () => {
    AuthService.logOut.mockRejectedValue(new Error("db unavailable"));
    const req = {
        cookies: { refreshToken: "refresh-token" },
        user: { _id: "u1" }
    };
    const res = createResponse();

    await AuthController.logOut(req, res);

    expect(clearAuthCookies).toHaveBeenCalledWith(res);
    expect(AuthService.logOut).toHaveBeenCalledWith("refresh-token", "u1");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
        success: true,
        message: "Logged out successfully"
    });
});

test("refresh returns 401 when refresh cookie is missing", async () => {
    const req = { cookies: {} };
    const res = createResponse();

    await AuthController.refresh(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
        success: false,
        message: "No refresh token provided"
    });
});

test("refresh sets cookies and returns success on valid refresh", async () => {
    AuthService.refresh.mockResolvedValue({
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token"
    });
    const req = { cookies: { refreshToken: "old-refresh-token" } };
    const res = createResponse();

    await AuthController.refresh(req, res);

    expect(AuthService.refresh).toHaveBeenCalledWith("old-refresh-token");
    expect(setAccessTokenCookie).toHaveBeenCalledWith(res, "new-access-token");
    expect(setRefreshTokenCookie).toHaveBeenCalledWith(res, "new-refresh-token");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
        success: true,
        message: "Token refreshed successfully"
    });
});

test("refresh clears cookies and returns 403 when refresh fails", async () => {
    AuthService.refresh.mockRejectedValue(new Error("Invalid refresh token"));
    const req = { cookies: { refreshToken: "bad-token" } };
    const res = createResponse();

    await AuthController.refresh(req, res);

    expect(clearAuthCookies).toHaveBeenCalledWith(res);
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
        success: false,
        message: "Invalid refresh token"
    });
});

test("forgotPassword validates input and returns generic success", async () => {
    forgotPasswordSchema.parse.mockReturnValue({ email: "alice@example.com" });
    AuthService.forgotPassword.mockResolvedValue({
        message: "If that email exists, we've sent a password reset link."
    });
    const req = { body: { email: "alice@example.com" } };
    const res = createResponse();

    await AuthController.forgotPassword(req, res);

    expect(forgotPasswordSchema.parse).toHaveBeenCalledWith(req.body);
    expect(AuthService.forgotPassword).toHaveBeenCalledWith({ email: "alice@example.com" });
    expect(sendSuccess).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
});

test("resetPassword validates payload and delegates to auth service", async () => {
    resetPasswordSchema.parse.mockReturnValue({
        token: "a".repeat(64),
        password: "NewStr0ng@Pass1"
    });
    AuthService.resetPassword.mockResolvedValue({
        message: "Password has been reset successfully"
    });
    const req = {
        params: { token: "a".repeat(64) },
        body: { password: "NewStr0ng@Pass1" }
    };
    const res = createResponse();

    await AuthController.resetPassword(req, res);

    expect(resetPasswordSchema.parse).toHaveBeenCalledWith({
        password: "NewStr0ng@Pass1",
        token: "a".repeat(64)
    });
    expect(AuthService.resetPassword).toHaveBeenCalledWith({
        token: "a".repeat(64),
        password: "NewStr0ng@Pass1"
    });
    expect(res.statusCode).toBe(200);
});

test("verifyEmail accepts token from body and delegates to auth service", async () => {
    verifyEmailSchema.parse.mockReturnValue({ token: "b".repeat(64) });
    AuthService.verifyEmail.mockResolvedValue({
        message: "Email verified successfully."
    });
    const req = {
        params: {},
        body: { token: "b".repeat(64) }
    };
    const res = createResponse();

    await AuthController.verifyEmail(req, res);

    expect(verifyEmailSchema.parse).toHaveBeenCalledWith({ token: "b".repeat(64) });
    expect(AuthService.verifyEmail).toHaveBeenCalledWith("b".repeat(64));
    expect(res.statusCode).toBe(200);
});

test("startGoogleOAuth sets oauth state cookie and redirects to provider", async () => {
    AuthService.getOAuthAuthorizationUrl.mockReturnValue("https://accounts.google.com/o/oauth2/v2/auth?state=state");
    const req = {
        query: {
            redirect: "/workspace/home"
        }
    };
    const res = createResponse();

    await AuthController.startGoogleOAuth(req, res);

    const oauthCookie = res.cookies.find((cookie) => cookie.name === "oauthState");
    expect(oauthCookie).toBeDefined();
    const decoded = JSON.parse(Buffer.from(oauthCookie.value, "base64url").toString("utf8"));
    expect(decoded).toEqual(expect.objectContaining({
        provider: "google",
        redirectPath: "/workspace/home"
    }));
    expect(AuthService.getOAuthAuthorizationUrl).toHaveBeenCalledWith("google", expect.any(String));
    expect(res.redirectedTo).toContain("https://accounts.google.com");
});

test("startGitHubOAuth uses github provider when requesting auth url", async () => {
    AuthService.getOAuthAuthorizationUrl.mockReturnValue("https://github.com/login/oauth/authorize?state=state");
    const req = { query: {} };
    const res = createResponse();

    await AuthController.startGitHubOAuth(req, res);

    expect(AuthService.getOAuthAuthorizationUrl).toHaveBeenCalledWith("github", expect.any(String));
    expect(res.redirectedTo).toContain("https://github.com");
});

test("startGoogleOAuth sanitizes unsafe redirect path to /main", async () => {
    AuthService.getOAuthAuthorizationUrl.mockReturnValue("https://accounts.google.com/o/oauth2/v2/auth?state=state");
    const req = {
        query: {
            redirect: "https://malicious.example.com"
        }
    };
    const res = createResponse();

    await AuthController.startGoogleOAuth(req, res);

    const oauthCookie = res.cookies.find((cookie) => cookie.name === "oauthState");
    const decoded = JSON.parse(Buffer.from(oauthCookie.value, "base64url").toString("utf8"));
    expect(decoded.redirectPath).toBe("/main");
});

test("startOAuthFlow redirects to callback with error when auth url generation fails", async () => {
    AuthService.getOAuthAuthorizationUrl.mockImplementation(() => {
        throw new Error("Google OAuth is not configured");
    });
    const req = { query: {} };
    const res = createResponse();

    await AuthController.startGoogleOAuth(req, res);

    expect(clearAuthCookies).toHaveBeenCalledWith(res);
    expect(res.clearedCookies.some((entry) => entry.name === "oauthState")).toBe(true);
    expect(res.redirectedTo).toContain("status=error");
    expect(res.redirectedTo).toContain("provider=google");
});

test("googleOAuthCallback logs in user and redirects success when state is valid", async () => {
    const stateCookie = encodeOAuthState({
        value: "state-123",
        provider: "google",
        redirectPath: "/after-login",
        createdAt: Date.now()
    });
    AuthService.exchangeOAuthCodeForProfile.mockResolvedValue({
        providerId: "google-id",
        email: "google@example.com",
        name: "Google User",
        avatar: "avatar.png"
    });
    AuthService.logInWithOAuth.mockResolvedValue({
        accessToken: "oauth-access",
        refreshToken: "oauth-refresh"
    });
    const req = {
        query: {
            state: "state-123",
            code: "auth-code"
        },
        cookies: {
            oauthState: stateCookie
        }
    };
    const res = createResponse();

    await AuthController.googleOAuthCallback(req, res);

    expect(AuthService.exchangeOAuthCodeForProfile).toHaveBeenCalledWith("google", "auth-code");
    expect(AuthService.logInWithOAuth).toHaveBeenCalledWith({
        provider: "google",
        profile: expect.objectContaining({ providerId: "google-id" })
    });
    expect(setAccessTokenCookie).toHaveBeenCalledWith(res, "oauth-access");
    expect(setRefreshTokenCookie).toHaveBeenCalledWith(res, "oauth-refresh");
    expect(res.clearedCookies.some((entry) => entry.name === "oauthState")).toBe(true);
    expect(res.redirectedTo).toContain("status=success");
    expect(res.redirectedTo).toContain("provider=google");
});

test("googleOAuthCallback rejects mismatched state and redirects with error", async () => {
    const stateCookie = encodeOAuthState({
        value: "expected-state",
        provider: "google",
        redirectPath: "/main",
        createdAt: Date.now()
    });
    const req = {
        query: {
            state: "wrong-state",
            code: "auth-code"
        },
        cookies: {
            oauthState: stateCookie
        }
    };
    const res = createResponse();

    await AuthController.googleOAuthCallback(req, res);

    expect(AuthService.exchangeOAuthCodeForProfile).not.toHaveBeenCalled();
    expect(clearAuthCookies).toHaveBeenCalledWith(res);
    expect(res.redirectedTo).toContain("status=error");
    expect(res.redirectedTo).toContain("provider=google");
});

test("googleOAuthCallback rejects when state cookie is missing", async () => {
    const req = {
        query: {
            state: "state-123",
            code: "auth-code"
        },
        cookies: {}
    };
    const res = createResponse();

    await AuthController.googleOAuthCallback(req, res);

    expect(AuthService.exchangeOAuthCodeForProfile).not.toHaveBeenCalled();
    expect(clearAuthCookies).toHaveBeenCalledWith(res);
    expect(res.redirectedTo).toContain("status=error");
    expect(res.redirectedTo).toContain("OAuth+session+expired");
});

test("googleOAuthCallback rejects provider mismatch from oauth state", async () => {
    const stateCookie = encodeOAuthState({
        value: "state-123",
        provider: "github",
        redirectPath: "/after-login",
        createdAt: Date.now()
    });
    const req = {
        query: {
            state: "state-123",
            code: "auth-code"
        },
        cookies: {
            oauthState: stateCookie
        }
    };
    const res = createResponse();

    await AuthController.googleOAuthCallback(req, res);

    expect(AuthService.exchangeOAuthCodeForProfile).not.toHaveBeenCalled();
    expect(res.redirectedTo).toContain("status=error");
    expect(res.redirectedTo).toContain("provider=google");
    expect(res.redirectedTo).toContain("OAuth+provider+mismatch");
});

test("googleOAuthCallback rejects expired oauth session state", async () => {
    const stateCookie = encodeOAuthState({
        value: "state-123",
        provider: "google",
        redirectPath: "/after-login",
        createdAt: Date.now() - (11 * 60 * 1000)
    });
    const req = {
        query: {
            state: "state-123",
            code: "auth-code"
        },
        cookies: {
            oauthState: stateCookie
        }
    };
    const res = createResponse();

    await AuthController.googleOAuthCallback(req, res);

    expect(AuthService.exchangeOAuthCodeForProfile).not.toHaveBeenCalled();
    expect(res.redirectedTo).toContain("status=error");
    expect(res.redirectedTo).toContain("OAuth+session+expired");
});

test("googleOAuthCallback rejects when provider does not return code", async () => {
    const stateCookie = encodeOAuthState({
        value: "state-123",
        provider: "google",
        redirectPath: "/after-login",
        createdAt: Date.now()
    });
    const req = {
        query: {
            state: "state-123"
        },
        cookies: {
            oauthState: stateCookie
        }
    };
    const res = createResponse();

    await AuthController.googleOAuthCallback(req, res);

    expect(AuthService.exchangeOAuthCodeForProfile).not.toHaveBeenCalled();
    expect(res.redirectedTo).toContain("status=error");
    expect(res.redirectedTo).toContain("authorization+code");
});

test("githubOAuthCallback handles provider-side error response and redirects failure", async () => {
    const stateCookie = encodeOAuthState({
        value: "github-state",
        provider: "github",
        redirectPath: "/main",
        createdAt: Date.now()
    });
    const req = {
        query: {
            state: "github-state",
            error: "access_denied",
            error_description: "User denied access"
        },
        cookies: {
            oauthState: stateCookie
        }
    };
    const res = createResponse();

    await AuthController.githubOAuthCallback(req, res);

    expect(AuthService.exchangeOAuthCodeForProfile).not.toHaveBeenCalled();
    expect(clearAuthCookies).toHaveBeenCalledWith(res);
    expect(res.redirectedTo).toContain("status=error");
    expect(res.redirectedTo).toContain("provider=github");
});

test("verifyEmail accepts token from route params", async () => {
    verifyEmailSchema.parse.mockReturnValue({ token: "c".repeat(64) });
    AuthService.verifyEmail.mockResolvedValue({
        message: "Email verified successfully."
    });
    const req = {
        params: { token: "c".repeat(64) },
        body: {}
    };
    const res = createResponse();

    await AuthController.verifyEmail(req, res);

    expect(verifyEmailSchema.parse).toHaveBeenCalledWith({ token: "c".repeat(64) });
    expect(AuthService.verifyEmail).toHaveBeenCalledWith("c".repeat(64));
    expect(res.statusCode).toBe(200);
});
