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
