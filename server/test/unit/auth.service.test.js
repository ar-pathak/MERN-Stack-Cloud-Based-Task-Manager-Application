process.env.JWT_SECRET = process.env.JWT_SECRET || "unit-jwt-secret";
process.env.REFRESH_SECRET = process.env.REFRESH_SECRET || "unit-refresh-secret";
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "google-client-id";
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "google-client-secret";
process.env.GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || "github-client-id";
process.env.GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || "github-client-secret";

jest.mock("bcrypt", () => ({
    hash: jest.fn(),
    compare: jest.fn()
}));

jest.mock("jsonwebtoken", () => ({
    verify: jest.fn()
}));

jest.mock("../../src/models/user", () => {
    const User = jest.fn(function User(doc = {}) {
        Object.assign(this, doc);
        if (!this._id) {
            this._id = "generated-user-id";
        }
        if (typeof this.save !== "function") {
            this.save = jest.fn().mockResolvedValue(this);
        }
    });

    User.findOne = jest.fn();
    User.findById = jest.fn();

    return User;
});

jest.mock("../../src/models/RefreshToken", () => ({
    create: jest.fn(),
    deleteMany: jest.fn(),
    findOne: jest.fn(),
    deleteOne: jest.fn()
}));

jest.mock("../../src/helpers/tokenHelper", () => ({
    generateAccessToken: jest.fn(),
    generateRefreshToken: jest.fn()
}));

jest.mock("../../src/helpers/sendEmail", () => jest.fn());
jest.mock("../../src/modules/utils/generateUniqueUsername", () => jest.fn());

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../../src/models/user");
const RefreshToken = require("../../src/models/RefreshToken");
const { generateAccessToken, generateRefreshToken } = require("../../src/helpers/tokenHelper");
const sendEmail = require("../../src/helpers/sendEmail");
const generateUniqueUsername = require("../../src/modules/utils/generateUniqueUsername");
const AuthService = require("../../src/modules/auth/auth.service");

const originalFetch = global.fetch;

const mockSelectResolved = (value) => ({
    select: jest.fn().mockResolvedValue(value)
});

const makeOAuthHttpResponse = (payload, ok = true) => ({
    ok,
    json: jest.fn().mockResolvedValue(payload)
});

beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = originalFetch;
});

afterAll(() => {
    global.fetch = originalFetch;
});

test("signUp creates user and issues auth tokens", async () => {
    User.findOne.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue("hashed-password");
    generateUniqueUsername.mockResolvedValue("alice_123");
    generateAccessToken.mockReturnValue("access-token");
    generateRefreshToken.mockReturnValue("refresh-token");
    RefreshToken.deleteMany.mockResolvedValue({ deletedCount: 0 });
    RefreshToken.create.mockResolvedValue({});

    const result = await AuthService.signUp({
        name: " Alice ",
        email: "ALICE@example.com",
        password: "Str0ng@Pass1"
    });

    expect(User.findOne).toHaveBeenCalledWith({ email: "alice@example.com" });
    expect(bcrypt.hash).toHaveBeenCalled();
    expect(generateUniqueUsername).toHaveBeenCalledWith("alice@example.com");
    expect(RefreshToken.deleteMany).toHaveBeenCalledWith({ user: "generated-user-id" });
    expect(RefreshToken.create).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
        accessToken: "access-token",
        refreshToken: "refresh-token",
        user: {
            _id: "generated-user-id",
            name: "Alice",
            email: "alice@example.com",
            username: "alice_123"
        }
    });
});

test("signUp rejects duplicate email", async () => {
    User.findOne.mockResolvedValue({ _id: "existing-user" });

    await expect(AuthService.signUp({
        name: "Alice",
        email: "alice@example.com",
        password: "Str0ng@Pass1"
    })).rejects.toMatchObject({
        message: "Email already registered",
        statusCode: 409
    });
});

test("logIn rejects unknown user", async () => {
    User.findOne.mockReturnValue(mockSelectResolved(null));

    await expect(AuthService.logIn({
        email: "unknown@example.com",
        password: "x"
    })).rejects.toMatchObject({
        message: "Invalid email or password",
        statusCode: 401
    });
});

test("logIn rejects social-login-only account in password auth", async () => {
    User.findOne.mockReturnValue(mockSelectResolved({
        accountStatus: "active",
        passwordHash: undefined
    }));

    await expect(AuthService.logIn({
        email: "social@example.com",
        password: "x"
    })).rejects.toMatchObject({
        message: "This account uses social login. Continue with Google or GitHub.",
        statusCode: 400
    });
});

test("logIn rejects inactive user account", async () => {
    User.findOne.mockReturnValue(mockSelectResolved({
        accountStatus: "suspended",
        passwordHash: "hash"
    }));

    await expect(AuthService.logIn({
        email: "inactive@example.com",
        password: "x"
    })).rejects.toMatchObject({
        message: "Account is not active",
        statusCode: 403
    });
});

test("logIn rejects locked account with 423", async () => {
    User.findOne.mockReturnValue(mockSelectResolved({
        accountStatus: "active",
        passwordHash: "hash",
        isLocked: true,
        lockUntil: new Date(Date.now() + 2 * 60 * 1000)
    }));

    await expect(AuthService.logIn({
        email: "locked@example.com",
        password: "x"
    })).rejects.toMatchObject({
        statusCode: 423
    });
});

test("logIn increments attempts on wrong password", async () => {
    const userDoc = {
        _id: "u1",
        accountStatus: "active",
        passwordHash: "hash",
        loginAttempts: 0,
        isLocked: false,
        incLoginAttempts: jest.fn().mockResolvedValue({})
    };
    User.findOne.mockReturnValue(mockSelectResolved(userDoc));
    bcrypt.compare.mockResolvedValue(false);

    await expect(AuthService.logIn({
        email: "user@example.com",
        password: "wrong"
    })).rejects.toMatchObject({
        message: "Invalid email or password",
        statusCode: 401
    });

    expect(userDoc.incLoginAttempts).toHaveBeenCalledTimes(1);
});

test("logIn resets attempts and issues tokens on success", async () => {
    const userDoc = {
        _id: "u1",
        name: "Alice",
        email: "user@example.com",
        username: "alice",
        accountStatus: "active",
        passwordHash: "hash",
        loginAttempts: 3,
        isLocked: false,
        resetLoginAttempts: jest.fn().mockResolvedValue({})
    };
    User.findOne.mockReturnValue(mockSelectResolved(userDoc));
    bcrypt.compare.mockResolvedValue(true);
    generateAccessToken.mockReturnValue("access-token");
    generateRefreshToken.mockReturnValue("refresh-token");
    RefreshToken.deleteMany.mockResolvedValue({});
    RefreshToken.create.mockResolvedValue({});

    const result = await AuthService.logIn({
        email: "USER@example.com",
        password: "Str0ng@Pass1"
    });

    expect(bcrypt.compare).toHaveBeenCalledWith("Str0ng@Pass1", "hash");
    expect(userDoc.resetLoginAttempts).toHaveBeenCalledTimes(1);
    expect(result.user).toEqual({
        _id: "u1",
        name: "Alice",
        email: "user@example.com",
        username: "alice"
    });
});

test("getOAuthAuthorizationUrl builds Google auth URL", () => {
    const url = AuthService.getOAuthAuthorizationUrl("google", "state-123");
    const parsed = new URL(url);

    expect(parsed.origin).toBe("https://accounts.google.com");
    expect(parsed.pathname).toBe("/o/oauth2/v2/auth");
    expect(parsed.searchParams.get("client_id")).toBe(process.env.GOOGLE_CLIENT_ID);
    expect(parsed.searchParams.get("state")).toBe("state-123");
});

test("getOAuthAuthorizationUrl builds GitHub auth URL", () => {
    const url = AuthService.getOAuthAuthorizationUrl("github", "state-456");
    const parsed = new URL(url);

    expect(parsed.origin).toBe("https://github.com");
    expect(parsed.pathname).toBe("/login/oauth/authorize");
    expect(parsed.searchParams.get("client_id")).toBe(process.env.GITHUB_CLIENT_ID);
    expect(parsed.searchParams.get("state")).toBe("state-456");
});

test("getOAuthAuthorizationUrl rejects missing state", () => {
    expect(() => AuthService.getOAuthAuthorizationUrl("google", ""))
        .toThrow("Missing OAuth state");
});

test("getOAuthAuthorizationUrl rejects unsupported provider", () => {
    expect(() => AuthService.getOAuthAuthorizationUrl("discord", "state-1"))
        .toThrow("Unsupported OAuth provider");
});

test("exchangeOAuthCodeForProfile rejects missing code", async () => {
    await expect(AuthService.exchangeOAuthCodeForProfile("google", ""))
        .rejects
        .toMatchObject({
            message: "Missing OAuth authorization code",
            statusCode: 400
        });
});

test("exchangeOAuthCodeForProfile returns Google profile details", async () => {
    global.fetch = jest.fn()
        .mockResolvedValueOnce(makeOAuthHttpResponse({ access_token: "google-token" }, true))
        .mockResolvedValueOnce(makeOAuthHttpResponse({
            sub: "google-sub-1",
            email: "google@example.com",
            email_verified: true,
            name: "Google User",
            picture: "avatar.png"
        }, true));

    const profile = await AuthService.exchangeOAuthCodeForProfile("google", "auth-code");

    expect(profile).toEqual({
        providerId: "google-sub-1",
        email: "google@example.com",
        name: "Google User",
        avatar: "avatar.png"
    });
    expect(global.fetch).toHaveBeenCalledTimes(2);
});

test("exchangeOAuthCodeForProfile rejects unverified Google email", async () => {
    global.fetch = jest.fn()
        .mockResolvedValueOnce(makeOAuthHttpResponse({ access_token: "google-token" }, true))
        .mockResolvedValueOnce(makeOAuthHttpResponse({
            sub: "google-sub-2",
            email: "google@example.com",
            email_verified: false
        }, true));

    await expect(AuthService.exchangeOAuthCodeForProfile("google", "auth-code"))
        .rejects
        .toMatchObject({
            message: "Google account email is not verified",
            statusCode: 403
        });
});

test("exchangeOAuthCodeForProfile rejects GitHub response without usable email", async () => {
    global.fetch = jest.fn()
        .mockResolvedValueOnce(makeOAuthHttpResponse({ access_token: "github-token" }, true))
        .mockResolvedValueOnce(makeOAuthHttpResponse({ id: 1001, login: "octocat" }, true))
        .mockResolvedValueOnce(makeOAuthHttpResponse([], true));

    await expect(AuthService.exchangeOAuthCodeForProfile("github", "auth-code"))
        .rejects
        .toMatchObject({
            message: "GitHub account did not return a usable email address",
            statusCode: 400
        });
});

test("logInWithOAuth creates session tokens for active oauth user", async () => {
    const oauthUser = {
        _id: "oauth-user-id",
        name: "OAuth User",
        email: "oauth@example.com",
        username: "oauth_user",
        accountStatus: "active"
    };
    User.findOne.mockResolvedValueOnce(oauthUser);
    generateAccessToken.mockReturnValue("oauth-access");
    generateRefreshToken.mockReturnValue("oauth-refresh");
    RefreshToken.deleteMany.mockResolvedValue({});
    RefreshToken.create.mockResolvedValue({});

    const result = await AuthService.logInWithOAuth({
        provider: "google",
        profile: {
            providerId: "google-sub",
            email: "oauth@example.com",
            name: "OAuth User",
            avatar: ""
        }
    });

    expect(result).toEqual({
        accessToken: "oauth-access",
        refreshToken: "oauth-refresh",
        user: {
            _id: "oauth-user-id",
            name: "OAuth User",
            email: "oauth@example.com",
            username: "oauth_user"
        }
    });
});

test("logOut resolves successfully even if token deletion fails", async () => {
    RefreshToken.deleteMany.mockRejectedValueOnce(new Error("db down"));

    const result = await AuthService.logOut("refresh-token", "u1");

    expect(result).toEqual({ message: "Logged out successfully" });
});

test("refresh rejects when token is missing", async () => {
    await expect(AuthService.refresh(""))
        .rejects
        .toMatchObject({
            message: "No refresh token provided",
            statusCode: 401
        });
});

test("refresh rejects expired JWT and clears stored token", async () => {
    jwt.verify.mockImplementation(() => {
        const error = new Error("expired");
        error.name = "TokenExpiredError";
        throw error;
    });
    RefreshToken.deleteMany.mockResolvedValue({});

    await expect(AuthService.refresh("expired-token"))
        .rejects
        .toMatchObject({
            message: "Refresh token expired. Please login again.",
            statusCode: 403
        });

    expect(RefreshToken.deleteMany).toHaveBeenCalled();
});

test("refresh rejects when refresh token is not stored", async () => {
    jwt.verify.mockReturnValue({ id: "u1" });
    RefreshToken.findOne.mockResolvedValue(null);

    await expect(AuthService.refresh("raw-token"))
        .rejects
        .toMatchObject({
            message: "Refresh token not found or already used",
            statusCode: 403
        });
});

test("refresh rejects invalid JWT signatures", async () => {
    jwt.verify.mockImplementation(() => {
        throw new Error("jwt malformed");
    });

    await expect(AuthService.refresh("bad-token"))
        .rejects
        .toMatchObject({
            message: "Invalid refresh token",
            statusCode: 403
        });
});

test("refresh rejects expired stored token and removes it", async () => {
    jwt.verify.mockReturnValue({ id: "u1" });
    RefreshToken.findOne.mockResolvedValue({
        _id: "stored-expired",
        user: "u1",
        expiresAt: new Date(Date.now() - 1000)
    });
    RefreshToken.deleteOne.mockResolvedValue({});

    await expect(AuthService.refresh("raw-token"))
        .rejects
        .toMatchObject({
            message: "Refresh token expired. Please login again.",
            statusCode: 403
        });

    expect(RefreshToken.deleteOne).toHaveBeenCalledWith({ _id: "stored-expired" });
});

test("refresh rejects mismatched token owner and removes token", async () => {
    jwt.verify.mockReturnValue({ id: "u1" });
    RefreshToken.findOne.mockResolvedValue({
        _id: "stored-2",
        user: "u2",
        expiresAt: new Date(Date.now() + 1000)
    });
    RefreshToken.deleteOne.mockResolvedValue({});

    await expect(AuthService.refresh("raw-token"))
        .rejects
        .toMatchObject({
            message: "Invalid refresh token",
            statusCode: 403
        });

    expect(RefreshToken.deleteOne).toHaveBeenCalledWith({ _id: "stored-2" });
});

test("refresh rotates token when stored token is valid", async () => {
    jwt.verify.mockReturnValue({ id: "u1" });
    RefreshToken.findOne.mockResolvedValue({
        _id: "stored-1",
        user: "u1",
        expiresAt: new Date(Date.now() + 60_000)
    });
    User.findById.mockReturnValue(mockSelectResolved({
        _id: "u1",
        accountStatus: "active"
    }));
    RefreshToken.deleteOne.mockResolvedValue({});
    RefreshToken.create.mockResolvedValue({});
    generateAccessToken.mockReturnValue("new-access");
    generateRefreshToken.mockReturnValue("new-refresh");

    const result = await AuthService.refresh("raw-token");

    expect(RefreshToken.findOne).toHaveBeenCalledWith(expect.objectContaining({
        token: expect.objectContaining({
            $in: expect.arrayContaining(["raw-token"])
        })
    }));
    expect(RefreshToken.deleteOne).toHaveBeenCalledWith({ _id: "stored-1" });
    expect(result).toEqual({
        accessToken: "new-access",
        refreshToken: "new-refresh"
    });
});

test("forgotPassword returns generic success for missing user", async () => {
    User.findOne.mockResolvedValue(null);

    const result = await AuthService.forgotPassword({ email: "unknown@example.com" });

    expect(result).toEqual({
        message: "If that email exists, we've sent a password reset link."
    });
    expect(sendEmail).not.toHaveBeenCalled();
});

test("forgotPassword clears token fields when email sending fails", async () => {
    const userDoc = {
        _id: "u1",
        email: "user@example.com",
        accountStatus: "active",
        save: jest.fn().mockResolvedValue({})
    };
    User.findOne.mockResolvedValue(userDoc);
    sendEmail.mockRejectedValue(new Error("smtp failed"));

    await expect(AuthService.forgotPassword({ email: "user@example.com" }))
        .rejects
        .toMatchObject({
            message: "Email could not be sent. Please try again later.",
            statusCode: 500
        });

    expect(userDoc.save).toHaveBeenCalledTimes(2);
    expect(userDoc.resetPasswordToken).toBeUndefined();
    expect(userDoc.resetPasswordExpires).toBeUndefined();
});

test("resetPassword rejects invalid or expired token", async () => {
    User.findOne.mockReturnValue(mockSelectResolved(null));

    await expect(AuthService.resetPassword({
        token: "a".repeat(64),
        password: "Str0ng@Pass1"
    })).rejects.toMatchObject({
        message: "Invalid or expired reset token",
        statusCode: 400
    });
});

test("resetPassword updates password and invalidates refresh sessions", async () => {
    const userDoc = {
        _id: "u1",
        passwordHash: "old",
        resetPasswordToken: "old-token",
        resetPasswordExpires: Date.now() + 1000,
        loginAttempts: 4,
        lockUntil: Date.now() + 1000,
        save: jest.fn().mockResolvedValue({})
    };
    User.findOne.mockReturnValue(mockSelectResolved(userDoc));
    bcrypt.hash.mockResolvedValue("new-hash");
    RefreshToken.deleteMany.mockResolvedValue({ deletedCount: 2 });

    const result = await AuthService.resetPassword({
        token: "b".repeat(64),
        password: "NewStr0ng@Pass1"
    });

    expect(userDoc.passwordHash).toBe("new-hash");
    expect(userDoc.resetPasswordToken).toBeUndefined();
    expect(userDoc.resetPasswordExpires).toBeUndefined();
    expect(userDoc.loginAttempts).toBe(0);
    expect(userDoc.lockUntil).toBeUndefined();
    expect(RefreshToken.deleteMany).toHaveBeenCalledWith({ user: "u1" });
    expect(result).toEqual({ message: "Password has been reset successfully" });
});

test("sendVerificationEmail returns already verified message", async () => {
    User.findById.mockReturnValue(mockSelectResolved({
        emailVerified: true,
        accountStatus: "active"
    }));

    const result = await AuthService.sendVerificationEmail("u1");

    expect(result).toEqual({ message: "Email is already verified." });
    expect(sendEmail).not.toHaveBeenCalled();
});

test("sendVerificationEmail rejects when user is not found", async () => {
    User.findById.mockReturnValue(mockSelectResolved(null));

    await expect(AuthService.sendVerificationEmail("missing-user"))
        .rejects
        .toMatchObject({
            message: "User not found",
            statusCode: 404
        });
});

test("sendVerificationEmail rejects when account is inactive", async () => {
    User.findById.mockReturnValue(mockSelectResolved({
        _id: "u1",
        emailVerified: false,
        accountStatus: "suspended"
    }));

    await expect(AuthService.sendVerificationEmail("u1"))
        .rejects
        .toMatchObject({
            message: "Account is not active",
            statusCode: 403
        });
});

test("sendVerificationEmail sends verification mail for active unverified user", async () => {
    const userDoc = {
        _id: "u1",
        email: "user@example.com",
        emailVerified: false,
        accountStatus: "active",
        save: jest.fn().mockResolvedValue({})
    };
    User.findById.mockReturnValue(mockSelectResolved(userDoc));
    sendEmail.mockResolvedValue({});

    const result = await AuthService.sendVerificationEmail("u1");

    expect(userDoc.save).toHaveBeenCalledWith({ validateBeforeSave: false });
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
        to: "user@example.com",
        type: "email-verification"
    }));
    expect(result).toEqual({
        message: "Verification email sent successfully."
    });
});

test("sendVerificationEmail clears fields when email send fails", async () => {
    const userDoc = {
        _id: "u1",
        email: "user@example.com",
        emailVerified: false,
        accountStatus: "active",
        save: jest.fn().mockResolvedValue({})
    };
    User.findById.mockReturnValue(mockSelectResolved(userDoc));
    sendEmail.mockRejectedValue(new Error("smtp down"));

    await expect(AuthService.sendVerificationEmail("u1"))
        .rejects
        .toMatchObject({
            message: "Verification email could not be sent. Please try again later.",
            statusCode: 500
        });

    expect(userDoc.save).toHaveBeenCalledTimes(2);
    expect(userDoc.emailVerificationToken).toBeUndefined();
    expect(userDoc.emailVerificationExpires).toBeUndefined();
});

test("verifyEmail rejects invalid token", async () => {
    User.findOne.mockReturnValue(mockSelectResolved(null));

    await expect(AuthService.verifyEmail("c".repeat(64)))
        .rejects
        .toMatchObject({
            message: "Invalid or expired verification token",
            statusCode: 400
        });
});

test("verifyEmail marks user as verified and clears token", async () => {
    const userDoc = {
        _id: "u1",
        emailVerified: false,
        emailVerificationToken: "token",
        emailVerificationExpires: Date.now() + 1000,
        save: jest.fn().mockResolvedValue({})
    };
    User.findOne.mockReturnValue(mockSelectResolved(userDoc));

    const result = await AuthService.verifyEmail("d".repeat(64));

    expect(userDoc.emailVerified).toBe(true);
    expect(userDoc.emailVerificationToken).toBeUndefined();
    expect(userDoc.emailVerificationExpires).toBeUndefined();
    expect(userDoc.save).toHaveBeenCalledWith({ validateBeforeSave: false });
    expect(result).toEqual({ message: "Email verified successfully." });
});

test("getOAuthAuthorizationUrl rejects when provider config is incomplete", () => {
    const previousSecret = process.env.GOOGLE_CLIENT_SECRET;
    process.env.GOOGLE_CLIENT_SECRET = "   ";

    try {
        expect(() => AuthService.getOAuthAuthorizationUrl("google", "state-1"))
            .toThrow("Google OAuth is not configured");
    } finally {
        process.env.GOOGLE_CLIENT_SECRET = previousSecret;
    }
});

test("exchangeOAuthCodeForProfile rejects when fetch API is unavailable", async () => {
    const previousFetch = global.fetch;
    global.fetch = undefined;

    try {
        await expect(AuthService.exchangeOAuthCodeForProfile("google", "code-1"))
            .rejects
            .toMatchObject({
                message: "Global fetch API is unavailable in this Node.js runtime",
                statusCode: 500
            });
    } finally {
        global.fetch = previousFetch;
    }
});

test("exchangeOAuthCodeForProfile handles non-json OAuth error responses", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockRejectedValue(new Error("invalid json"))
    });

    await expect(AuthService.exchangeOAuthCodeForProfile("google", "auth-code"))
        .rejects
        .toMatchObject({
            message: "Google OAuth request failed",
            statusCode: 502
        });
});

test("exchangeOAuthCodeForProfile includes provider error_description in failure", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(
        makeOAuthHttpResponse({ error_description: "invalid_grant" }, false)
    );

    await expect(AuthService.exchangeOAuthCodeForProfile("google", "auth-code"))
        .rejects
        .toMatchObject({
            message: "Google OAuth request failed: invalid_grant",
            statusCode: 502
        });
});

test("exchangeOAuthCodeForProfile rejects Google token payload without access token", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(makeOAuthHttpResponse({}, true));

    await expect(AuthService.exchangeOAuthCodeForProfile("google", "auth-code"))
        .rejects
        .toMatchObject({
            message: "Google OAuth token exchange failed",
            statusCode: 502
        });
});

test("exchangeOAuthCodeForProfile rejects Google profile without provider id", async () => {
    global.fetch = jest.fn()
        .mockResolvedValueOnce(makeOAuthHttpResponse({ access_token: "google-token" }, true))
        .mockResolvedValueOnce(makeOAuthHttpResponse({
            email: "google@example.com",
            email_verified: true
        }, true));

    await expect(AuthService.exchangeOAuthCodeForProfile("google", "auth-code"))
        .rejects
        .toMatchObject({
            message: "Google account ID is missing in OAuth response",
            statusCode: 502
        });
});

test("exchangeOAuthCodeForProfile rejects Google profile without email", async () => {
    global.fetch = jest.fn()
        .mockResolvedValueOnce(makeOAuthHttpResponse({ access_token: "google-token" }, true))
        .mockResolvedValueOnce(makeOAuthHttpResponse({
            sub: "google-sub-3",
            email_verified: true
        }, true));

    await expect(AuthService.exchangeOAuthCodeForProfile("google", "auth-code"))
        .rejects
        .toMatchObject({
            message: "Google account did not return an email address",
            statusCode: 400
        });
});

test("exchangeOAuthCodeForProfile rejects GitHub payload with oauth error", async () => {
    global.fetch = jest.fn()
        .mockResolvedValueOnce(makeOAuthHttpResponse({ error: "bad_verification_code" }, true));

    await expect(AuthService.exchangeOAuthCodeForProfile("github", "auth-code"))
        .rejects
        .toMatchObject({
            message: "GitHub OAuth authorization failed",
            statusCode: 400
        });
});

test("exchangeOAuthCodeForProfile rejects GitHub token payload without access token", async () => {
    global.fetch = jest.fn()
        .mockResolvedValueOnce(makeOAuthHttpResponse({}, true));

    await expect(AuthService.exchangeOAuthCodeForProfile("github", "auth-code"))
        .rejects
        .toMatchObject({
            message: "GitHub OAuth token exchange failed",
            statusCode: 502
        });
});

test("exchangeOAuthCodeForProfile rejects GitHub profile without id", async () => {
    global.fetch = jest.fn()
        .mockResolvedValueOnce(makeOAuthHttpResponse({ access_token: "github-token" }, true))
        .mockResolvedValueOnce(makeOAuthHttpResponse({
            login: "octocat",
            email: "fallback@example.com"
        }, true))
        .mockResolvedValueOnce(makeOAuthHttpResponse([], true));

    await expect(AuthService.exchangeOAuthCodeForProfile("github", "auth-code"))
        .rejects
        .toMatchObject({
            message: "GitHub account ID is missing in OAuth response",
            statusCode: 502
        });
});

test("exchangeOAuthCodeForProfile returns GitHub profile using verified email fallback", async () => {
    global.fetch = jest.fn()
        .mockResolvedValueOnce(makeOAuthHttpResponse({ access_token: "github-token" }, true))
        .mockResolvedValueOnce(makeOAuthHttpResponse({
            id: 55,
            login: "octocat",
            avatar_url: ""
        }, true))
        .mockResolvedValueOnce(makeOAuthHttpResponse([
            { email: "nope@example.com", primary: false, verified: false },
            { email: "verified@example.com", primary: false, verified: true }
        ], true));

    const profile = await AuthService.exchangeOAuthCodeForProfile("github", "auth-code");

    expect(profile).toEqual({
        providerId: "55",
        email: "verified@example.com",
        name: "octocat",
        avatar: ""
    });
});

test("logIn resets stale lock fields before successful authentication", async () => {
    const userDoc = {
        _id: "u-lock-expired",
        name: "User",
        email: "user@example.com",
        username: "user_name",
        accountStatus: "active",
        passwordHash: "hash",
        loginAttempts: 4,
        lockUntil: new Date(Date.now() - 60_000),
        isLocked: false,
        resetLoginAttempts: jest.fn().mockResolvedValue({})
    };

    User.findOne.mockReturnValue(mockSelectResolved(userDoc));
    bcrypt.compare.mockResolvedValue(true);
    generateAccessToken.mockReturnValue("access-token");
    generateRefreshToken.mockReturnValue("refresh-token");
    RefreshToken.deleteMany.mockResolvedValue({});
    RefreshToken.create.mockResolvedValue({});

    const result = await AuthService.logIn({
        email: "user@example.com",
        password: "Str0ng@Pass1"
    });

    expect(userDoc.resetLoginAttempts).toHaveBeenCalledTimes(1);
    expect(userDoc.loginAttempts).toBe(0);
    expect(userDoc.lockUntil).toBeUndefined();
    expect(result.accessToken).toBe("access-token");
});

test("logIn locked account message uses singular minute label", async () => {
    User.findOne.mockReturnValue(mockSelectResolved({
        accountStatus: "active",
        passwordHash: "hash",
        isLocked: true,
        lockUntil: new Date(Date.now() + 15_000)
    }));

    await expect(AuthService.logIn({
        email: "locked@example.com",
        password: "x"
    })).rejects.toMatchObject({
        message: "Account is temporarily locked. Try again in 1 minute.",
        statusCode: 423
    });
});

test("logInWithOAuth links existing email account with provider details", async () => {
    const existingUser = {
        _id: "u-link",
        name: "",
        email: "link@example.com",
        username: "linked_user",
        avatar: "",
        emailVerified: false,
        accountStatus: "active",
        save: jest.fn().mockResolvedValue({})
    };

    User.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existingUser);
    generateAccessToken.mockReturnValue("linked-access");
    generateRefreshToken.mockReturnValue("linked-refresh");
    RefreshToken.deleteMany.mockResolvedValue({});
    RefreshToken.create.mockResolvedValue({});

    const result = await AuthService.logInWithOAuth({
        provider: "google",
        profile: {
            providerId: "google-sub-99",
            email: "link@example.com",
            name: " Linked Name ",
            avatar: "https://cdn.example.com/avatar.png"
        }
    });

    expect(existingUser.googleId).toBe("google-sub-99");
    expect(existingUser.emailVerified).toBe(true);
    expect(existingUser.name).toBe("Linked Name");
    expect(existingUser.avatar).toBe("https://cdn.example.com/avatar.png");
    expect(existingUser.save).toHaveBeenCalledWith({ validateBeforeSave: false });
    expect(result.user).toEqual({
        _id: "u-link",
        name: "Linked Name",
        email: "link@example.com",
        username: "linked_user"
    });
});

test("logInWithOAuth creates a new user and derives fallback name from email", async () => {
    const previousImplementation = User.getMockImplementation();
    User.mockImplementation(function UserCtor(doc = {}) {
        Object.assign(this, { accountStatus: "active" }, doc);
        if (!this._id) {
            this._id = "new-oauth-user";
        }
        if (typeof this.save !== "function") {
            this.save = jest.fn().mockResolvedValue(this);
        }
    });

    try {
        User.findOne
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null);
        generateUniqueUsername.mockResolvedValue("new_oauth_user");
        generateAccessToken.mockReturnValue("oauth-access");
        generateRefreshToken.mockReturnValue("oauth-refresh");
        RefreshToken.deleteMany.mockResolvedValue({});
        RefreshToken.create.mockResolvedValue({});

        const result = await AuthService.logInWithOAuth({
            provider: "github",
            profile: {
                providerId: "gh-123",
                email: "new.user@example.com",
                name: " ",
                avatar: " "
            }
        });

        expect(generateUniqueUsername).toHaveBeenCalledWith("new.user@example.com");
        expect(result.user).toEqual({
            _id: "new-oauth-user",
            name: "new.user",
            email: "new.user@example.com",
            username: "new_oauth_user"
        });
    } finally {
        User.mockImplementation(previousImplementation);
    }
});

test("logInWithOAuth rejects unsupported provider", async () => {
    await expect(AuthService.logInWithOAuth({
        provider: "discord",
        profile: {
            providerId: "provider-id",
            email: "user@example.com"
        }
    })).rejects.toMatchObject({
        message: "Unsupported OAuth provider",
        statusCode: 400
    });
});

test("logInWithOAuth rejects missing provider account id", async () => {
    await expect(AuthService.logInWithOAuth({
        provider: "google",
        profile: {
            providerId: " ",
            email: "user@example.com"
        }
    })).rejects.toMatchObject({
        message: "Google did not return a valid account ID",
        statusCode: 400
    });
});

test("logInWithOAuth rejects missing email in profile", async () => {
    await expect(AuthService.logInWithOAuth({
        provider: "github",
        profile: {
            providerId: "gh-1",
            email: " "
        }
    })).rejects.toMatchObject({
        message: "GitHub account did not return an email address",
        statusCode: 400
    });
});

test("logInWithOAuth rejects inactive resolved user account", async () => {
    User.findOne.mockResolvedValueOnce({
        _id: "inactive-oauth",
        accountStatus: "suspended"
    });

    await expect(AuthService.logInWithOAuth({
        provider: "google",
        profile: {
            providerId: "google-sub-1",
            email: "user@example.com"
        }
    })).rejects.toMatchObject({
        message: "Account is not active",
        statusCode: 403
    });
});

test("logOut deletes all user refresh tokens when userId is provided", async () => {
    RefreshToken.deleteMany.mockResolvedValue({});

    const result = await AuthService.logOut("", "logout-user");

    expect(RefreshToken.deleteMany).toHaveBeenCalledWith({ user: "logout-user" });
    expect(result).toEqual({ message: "Logged out successfully" });
});

test("logOut deletes specific refresh token hash when token is provided", async () => {
    RefreshToken.deleteMany.mockResolvedValue({});

    const result = await AuthService.logOut("raw-refresh-token", "");

    expect(RefreshToken.deleteMany).toHaveBeenCalledWith({
        token: {
            $in: expect.arrayContaining([
                "raw-refresh-token",
                expect.any(String)
            ])
        }
    });
    expect(result).toEqual({ message: "Logged out successfully" });
});

test("refresh rejects inactive or missing user and clears all sessions", async () => {
    jwt.verify.mockReturnValue({ id: "u-refresh" });
    RefreshToken.findOne.mockResolvedValue({
        _id: "stored-valid",
        user: "u-refresh",
        expiresAt: new Date(Date.now() + 30_000)
    });
    User.findById.mockReturnValue(mockSelectResolved(null));
    RefreshToken.deleteMany.mockResolvedValue({});

    await expect(AuthService.refresh("refresh-token"))
        .rejects
        .toMatchObject({
            message: "User account is not active",
            statusCode: 403
        });

    expect(RefreshToken.deleteMany).toHaveBeenCalledWith({ user: "u-refresh" });
});

test("refresh wraps non-error failures in a standard auth error", async () => {
    jwt.verify.mockReturnValue({ id: "u-refresh" });
    RefreshToken.findOne.mockRejectedValue("db offline");

    await expect(AuthService.refresh("refresh-token"))
        .rejects
        .toMatchObject({
            message: "Token refresh failed",
            statusCode: 403
        });
});

test("refresh preserves custom message from non-Error failures", async () => {
    jwt.verify.mockReturnValue({ id: "u-refresh" });
    RefreshToken.findOne.mockRejectedValue({ message: "read failed" });

    await expect(AuthService.refresh("refresh-token"))
        .rejects
        .toMatchObject({
            message: "read failed",
            statusCode: 403
        });
});

test("forgotPassword returns generic success for inactive account", async () => {
    User.findOne.mockResolvedValue({
        _id: "u1",
        accountStatus: "suspended"
    });

    const result = await AuthService.forgotPassword({ email: "inactive@example.com" });

    expect(result).toEqual({
        message: "If that email exists, we've sent a password reset link."
    });
    expect(sendEmail).not.toHaveBeenCalled();
});

test("verifyEmail succeeds even when user is already verified", async () => {
    const userDoc = {
        _id: "u1",
        emailVerified: true,
        emailVerificationToken: "token",
        emailVerificationExpires: Date.now() + 1000,
        save: jest.fn().mockResolvedValue({})
    };
    User.findOne.mockReturnValue(mockSelectResolved(userDoc));

    const result = await AuthService.verifyEmail("e".repeat(64));

    expect(userDoc.emailVerified).toBe(true);
    expect(userDoc.emailVerificationToken).toBeUndefined();
    expect(userDoc.emailVerificationExpires).toBeUndefined();
    expect(result).toEqual({ message: "Email verified successfully." });
});
