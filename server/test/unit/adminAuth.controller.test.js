jest.mock("../../src/modules/admin/adminAuth.validation", () => ({
    registerAdminSchema: { parse: jest.fn((value) => value) },
    loginAdminSchema: { parse: jest.fn((value) => value) },
    verifyAdminLoginOtpSchema: { parse: jest.fn((value) => value) },
    forgotAdminPasswordSchema: { parse: jest.fn((value) => value) },
    requestAdminVerificationSchema: { parse: jest.fn((value) => value) },
    resetAdminPasswordSchema: { parse: jest.fn((value) => value) },
    verifyAdminEmailSchema: { parse: jest.fn((value) => value) }
}));

jest.mock("../../src/modules/admin/adminAuth.service", () => ({
    register: jest.fn(),
    login: jest.fn(),
    verifyLoginOtp: jest.fn(),
    getMe: jest.fn(),
    forgotPassword: jest.fn(),
    requestVerificationByEmail: jest.fn(),
    resetPassword: jest.fn(),
    sendVerificationEmail: jest.fn(),
    verifyEmail: jest.fn()
}));

jest.mock("../../src/helpers/adminCookieHelper", () => ({
    setAdminAccessTokenCookie: jest.fn(),
    clearAdminAuthCookies: jest.fn()
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
    registerAdminSchema,
    loginAdminSchema,
    verifyAdminLoginOtpSchema,
    forgotAdminPasswordSchema,
    requestAdminVerificationSchema,
    resetAdminPasswordSchema,
    verifyAdminEmailSchema
} = require("../../src/modules/admin/adminAuth.validation");
const AdminAuthService = require("../../src/modules/admin/adminAuth.service");
const {
    setAdminAccessTokenCookie,
    clearAdminAuthCookies
} = require("../../src/helpers/adminCookieHelper");
const { sendSuccess, handleError } = require("../../src/helpers/responseHelper");
const AdminAuthController = require("../../src/modules/admin/adminAuth.controller");

const createResponse = () => {
    const res = {
        statusCode: null,
        body: null
    };

    res.status = jest.fn((code) => {
        res.statusCode = code;
        return res;
    });
    res.json = jest.fn((payload) => {
        res.body = payload;
        return res;
    });

    return res;
};

beforeEach(() => {
    jest.clearAllMocks();
});

test("register validates payload and returns created admin with 201", async () => {
    registerAdminSchema.parse.mockReturnValue({
        name: "Admin User",
        email: "admin@example.com",
        password: "Str0ng@Pass1"
    });
    AdminAuthService.register.mockResolvedValue({
        admin: { _id: "admin-1", email: "admin@example.com" },
        requiresEmailVerification: true
    });

    const req = { body: { name: "Admin User", email: "admin@example.com", password: "Str0ng@Pass1" } };
    const res = createResponse();

    await AdminAuthController.register(req, res);

    expect(registerAdminSchema.parse).toHaveBeenCalledWith(req.body);
    expect(AdminAuthService.register).toHaveBeenCalledWith({
        name: "Admin User",
        email: "admin@example.com",
        password: "Str0ng@Pass1"
    });
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual(expect.objectContaining({
        success: true,
        message: "Admin registered. Verify email before logging in."
    }));
});

test("login returns 202 OTP response when otpRequired is true", async () => {
    loginAdminSchema.parse.mockReturnValue({
        email: "admin@example.com",
        password: "Str0ng@Pass1"
    });
    AdminAuthService.login.mockResolvedValue({
        otpRequired: true,
        email: "admin@example.com",
        message: "OTP required"
    });

    const req = { body: { email: "admin@example.com", password: "Str0ng@Pass1" } };
    const res = createResponse();

    await AdminAuthController.login(req, res);

    expect(setAdminAccessTokenCookie).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(202);
    expect(res.body).toEqual({
        success: true,
        message: "OTP required",
        data: {
            otpRequired: true,
            email: "admin@example.com"
        }
    });
});

test("login sets admin cookie and returns success when token is returned", async () => {
    loginAdminSchema.parse.mockReturnValue({
        email: "admin@example.com",
        password: "Str0ng@Pass1"
    });
    AdminAuthService.login.mockResolvedValue({
        accessToken: "admin-access-token",
        admin: {
            _id: "admin-1",
            email: "admin@example.com"
        }
    });

    const req = { body: { email: "admin@example.com", password: "Str0ng@Pass1" } };
    const res = createResponse();

    await AdminAuthController.login(req, res);

    expect(setAdminAccessTokenCookie).toHaveBeenCalledWith(res, "admin-access-token");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({
        success: true,
        message: "Admin login successful"
    }));
});

test("verifyLoginOtp validates payload, sets cookie and returns admin data", async () => {
    verifyAdminLoginOtpSchema.parse.mockReturnValue({
        email: "admin@example.com",
        otp: "123456"
    });
    AdminAuthService.verifyLoginOtp.mockResolvedValue({
        accessToken: "otp-verified-token",
        admin: {
            _id: "admin-1",
            email: "admin@example.com"
        }
    });
    const req = { body: { email: "admin@example.com", otp: "123456" } };
    const res = createResponse();

    await AdminAuthController.verifyLoginOtp(req, res);

    expect(verifyAdminLoginOtpSchema.parse).toHaveBeenCalledWith(req.body);
    expect(setAdminAccessTokenCookie).toHaveBeenCalledWith(res, "otp-verified-token");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({
        success: true,
        message: "Admin login successful"
    }));
});

test("logout clears admin auth cookies and returns success", async () => {
    const req = {};
    const res = createResponse();

    await AdminAuthController.logout(req, res);

    expect(clearAdminAuthCookies).toHaveBeenCalledWith(res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
        success: true,
        message: "Admin logged out successfully"
    });
});

test("forgotPassword validates input and returns generic success message", async () => {
    forgotAdminPasswordSchema.parse.mockReturnValue({ email: "admin@example.com" });
    AdminAuthService.forgotPassword.mockResolvedValue({
        message: "If that admin email exists, a reset link has been sent."
    });
    const req = { body: { email: "admin@example.com" } };
    const res = createResponse();

    await AdminAuthController.forgotPassword(req, res);

    expect(forgotAdminPasswordSchema.parse).toHaveBeenCalledWith(req.body);
    expect(AdminAuthService.forgotPassword).toHaveBeenCalledWith({ email: "admin@example.com" });
    expect(res.statusCode).toBe(200);
});

test("requestVerificationByEmail validates payload and delegates to service", async () => {
    requestAdminVerificationSchema.parse.mockReturnValue({ email: "admin@example.com" });
    AdminAuthService.requestVerificationByEmail.mockResolvedValue({
        message: "If that admin email exists, a verification link has been sent."
    });
    const req = { body: { email: "admin@example.com" } };
    const res = createResponse();

    await AdminAuthController.requestVerificationByEmail(req, res);

    expect(requestAdminVerificationSchema.parse).toHaveBeenCalledWith(req.body);
    expect(AdminAuthService.requestVerificationByEmail).toHaveBeenCalledWith({ email: "admin@example.com" });
    expect(res.statusCode).toBe(200);
});

test("resetPassword merges token from params with body payload", async () => {
    resetAdminPasswordSchema.parse.mockReturnValue({
        token: "a".repeat(64),
        password: "N3w@Pass123"
    });
    AdminAuthService.resetPassword.mockResolvedValue({
        message: "Admin password has been reset successfully."
    });
    const req = {
        params: { token: "a".repeat(64) },
        body: { password: "N3w@Pass123" }
    };
    const res = createResponse();

    await AdminAuthController.resetPassword(req, res);

    expect(resetAdminPasswordSchema.parse).toHaveBeenCalledWith({
        password: "N3w@Pass123",
        token: "a".repeat(64)
    });
    expect(AdminAuthService.resetPassword).toHaveBeenCalledWith({
        token: "a".repeat(64),
        password: "N3w@Pass123"
    });
    expect(res.statusCode).toBe(200);
});

test("verifyEmail prefers route token and delegates to service", async () => {
    verifyAdminEmailSchema.parse.mockReturnValue({ token: "b".repeat(64) });
    AdminAuthService.verifyEmail.mockResolvedValue({
        message: "Admin email verified successfully."
    });
    const req = {
        params: { token: "b".repeat(64) },
        body: { token: "c".repeat(64) }
    };
    const res = createResponse();

    await AdminAuthController.verifyEmail(req, res);

    expect(verifyAdminEmailSchema.parse).toHaveBeenCalledWith({
        token: "b".repeat(64)
    });
    expect(AdminAuthService.verifyEmail).toHaveBeenCalledWith("b".repeat(64));
    expect(res.statusCode).toBe(200);
});

test("controller delegates thrown errors to handleError", async () => {
    const error = new Error("admin login failed");
    error.statusCode = 401;
    loginAdminSchema.parse.mockImplementation(() => {
        throw error;
    });

    const req = { body: {} };
    const res = createResponse();

    await AdminAuthController.login(req, res);

    expect(handleError).toHaveBeenCalledWith(error, res);
    expect(res.statusCode).toBe(401);
});

test("me delegates admin id to service", async () => {
    AdminAuthService.getMe.mockResolvedValue({
        admin: {
            _id: "admin-1",
            email: "admin@example.com"
        }
    });
    const req = { admin: { _id: "admin-1" } };
    const res = createResponse();

    await AdminAuthController.me(req, res);

    expect(AdminAuthService.getMe).toHaveBeenCalledWith("admin-1");
    expect(sendSuccess).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
});

test("sendVerificationEmail uses authenticated admin id", async () => {
    AdminAuthService.sendVerificationEmail.mockResolvedValue({
        message: "Verification email sent successfully."
    });

    const req = { admin: { _id: "admin-1" } };
    const res = createResponse();

    await AdminAuthController.sendVerificationEmail(req, res);

    expect(AdminAuthService.sendVerificationEmail).toHaveBeenCalledWith("admin-1");
    expect(res.statusCode).toBe(200);
});
