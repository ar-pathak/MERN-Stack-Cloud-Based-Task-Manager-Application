process.env.JWT_SECRET = process.env.JWT_SECRET || "unit-admin-jwt-secret";
process.env.ADMIN_ALLOWED_EMAIL = "admin.unit@example.com";
process.env.FRONTEND_URL = "http://frontend.local";

jest.mock("bcrypt", () => ({
    hash: jest.fn(),
    compare: jest.fn()
}));

jest.mock("../../src/helpers/sendEmail", () => jest.fn());

jest.mock("../../src/models/adminAccount", () => ({
    findOne: jest.fn(),
    findById: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn()
}));

jest.mock("../../src/helpers/adminTokenHelper", () => ({
    generateAdminAccessToken: jest.fn()
}));

const crypto = require("node:crypto");
const bcrypt = require("bcrypt");
const sendEmail = require("../../src/helpers/sendEmail");
const AdminAccount = require("../../src/models/adminAccount");
const { generateAdminAccessToken } = require("../../src/helpers/adminTokenHelper");
const AdminAuthService = require("../../src/modules/admin/adminAuth.service");

const ALLOWED_EMAIL = "admin.unit@example.com";

const mockSelectResolved = (value) => ({
    select: jest.fn().mockResolvedValue(value)
});

const sha256 = (value) => crypto.createHash("sha256").update(String(value || "")).digest("hex");

beforeEach(() => {
    jest.clearAllMocks();
});

test("register rejects disallowed admin email", async () => {
    await expect(AdminAuthService.register({
        name: "Admin User",
        email: "other@example.com",
        password: "Str0ng@Pass1"
    })).rejects.toMatchObject({
        statusCode: 403,
        code: "ADMIN_NOT_ALLOWED"
    });
});

test("register rejects duplicate admin email", async () => {
    AdminAccount.findOne.mockResolvedValue({ _id: "existing-admin" });

    await expect(AdminAuthService.register({
        name: "Admin User",
        email: ALLOWED_EMAIL.toUpperCase(),
        password: "Str0ng@Pass1"
    })).rejects.toMatchObject({
        statusCode: 409,
        code: "ADMIN_EMAIL_EXISTS"
    });

    expect(AdminAccount.create).not.toHaveBeenCalled();
});

test("register creates first admin as owner and sends verification email", async () => {
    AdminAccount.findOne.mockResolvedValue(null);
    AdminAccount.countDocuments.mockResolvedValue(0);
    bcrypt.hash.mockResolvedValue("hashed-password");

    const createdAdmin = {
        _id: "admin-1",
        name: "Admin User",
        email: ALLOWED_EMAIL,
        role: "owner",
        accountStatus: "active",
        emailVerified: false
    };
    const adminDoc = {
        ...createdAdmin,
        save: jest.fn().mockResolvedValue({})
    };

    AdminAccount.create.mockResolvedValue(createdAdmin);
    AdminAccount.findById.mockReturnValue(mockSelectResolved(adminDoc));
    sendEmail.mockResolvedValue({ accepted: [ALLOWED_EMAIL] });

    const result = await AdminAuthService.register({
        name: " Admin User ",
        email: ALLOWED_EMAIL.toUpperCase(),
        password: "Str0ng@Pass1"
    });

    expect(AdminAccount.create).toHaveBeenCalledWith(expect.objectContaining({
        name: "Admin User",
        email: ALLOWED_EMAIL,
        role: "owner",
        emailVerified: false
    }));
    expect(adminDoc.emailVerificationToken).toEqual(expect.any(String));
    expect(adminDoc.emailVerificationExpires).toBeTruthy();
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
        to: ALLOWED_EMAIL,
        type: "email-verification",
        actionUrl: expect.stringContaining("/admin/verify-email/")
    }));
    expect(result).toEqual({
        admin: expect.objectContaining({
            _id: "admin-1",
            email: ALLOWED_EMAIL,
            role: "owner"
        }),
        requiresEmailVerification: true
    });
});

test("login rejects invalid password", async () => {
    AdminAccount.findOne.mockReturnValue(mockSelectResolved({
        _id: "admin-1",
        email: ALLOWED_EMAIL,
        passwordHash: "stored-hash",
        accountStatus: "active",
        emailVerified: true
    }));
    bcrypt.compare.mockResolvedValue(false);

    await expect(AdminAuthService.login({
        email: ALLOWED_EMAIL,
        password: "Wrong@Pass1"
    })).rejects.toMatchObject({
        statusCode: 401,
        code: "ADMIN_INVALID_CREDENTIALS"
    });
});

test("login stores OTP state and returns otpRequired", async () => {
    const adminDoc = {
        _id: "admin-1",
        email: ALLOWED_EMAIL,
        passwordHash: "stored-hash",
        accountStatus: "active",
        emailVerified: true,
        save: jest.fn().mockResolvedValue({})
    };

    AdminAccount.findOne.mockReturnValue(mockSelectResolved(adminDoc));
    bcrypt.compare.mockResolvedValue(true);
    sendEmail.mockResolvedValue({ accepted: [ALLOWED_EMAIL] });

    const result = await AdminAuthService.login({
        email: ALLOWED_EMAIL,
        password: "Str0ng@Pass1"
    });

    expect(adminDoc.loginOtpHash).toEqual(expect.any(String));
    expect(adminDoc.loginOtpExpires).toEqual(expect.any(Date));
    expect(adminDoc.loginOtpAttempts).toBe(0);
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
        to: ALLOWED_EMAIL,
        subject: "Your Admin Login OTP - Aurora",
        html: expect.stringContaining("Aurora Admin Login OTP")
    }));
    expect(result).toEqual({
        otpRequired: true,
        email: ALLOWED_EMAIL,
        message: "A login verification code has been sent to your email."
    });
});

test("login clears OTP state when email delivery fails", async () => {
    const adminDoc = {
        _id: "admin-1",
        email: ALLOWED_EMAIL,
        passwordHash: "stored-hash",
        accountStatus: "active",
        emailVerified: true,
        save: jest.fn().mockResolvedValue({})
    };

    AdminAccount.findOne.mockReturnValue(mockSelectResolved(adminDoc));
    bcrypt.compare.mockResolvedValue(true);
    sendEmail.mockRejectedValue(new Error("smtp down"));

    await expect(AdminAuthService.login({
        email: ALLOWED_EMAIL,
        password: "Str0ng@Pass1"
    })).rejects.toMatchObject({
        statusCode: 500,
        code: "ADMIN_LOGIN_OTP_EMAIL_FAILED"
    });

    expect(adminDoc.loginOtpHash).toBeUndefined();
    expect(adminDoc.loginOtpExpires).toBeUndefined();
    expect(adminDoc.loginOtpAttempts).toBe(0);
    expect(adminDoc.save).toHaveBeenCalledTimes(2);
});

test("verifyLoginOtp rejects expired OTP and clears state", async () => {
    const adminDoc = {
        _id: "admin-1",
        email: ALLOWED_EMAIL,
        accountStatus: "active",
        emailVerified: true,
        loginOtpHash: sha256("123456"),
        loginOtpExpires: new Date(Date.now() - 1000),
        loginOtpAttempts: 0,
        save: jest.fn().mockResolvedValue({})
    };
    AdminAccount.findOne.mockReturnValue(mockSelectResolved(adminDoc));

    await expect(AdminAuthService.verifyLoginOtp({
        email: ALLOWED_EMAIL,
        otp: "123456"
    })).rejects.toMatchObject({
        statusCode: 400,
        code: "ADMIN_LOGIN_OTP_EXPIRED"
    });

    expect(adminDoc.loginOtpHash).toBeUndefined();
    expect(adminDoc.loginOtpExpires).toBeUndefined();
    expect(adminDoc.loginOtpAttempts).toBe(0);
});

test("verifyLoginOtp increments attempts on invalid OTP", async () => {
    const adminDoc = {
        _id: "admin-1",
        email: ALLOWED_EMAIL,
        accountStatus: "active",
        emailVerified: true,
        loginOtpHash: sha256("222222"),
        loginOtpExpires: new Date(Date.now() + 10 * 60 * 1000),
        loginOtpAttempts: 1,
        save: jest.fn().mockResolvedValue({})
    };
    AdminAccount.findOne.mockReturnValue(mockSelectResolved(adminDoc));

    await expect(AdminAuthService.verifyLoginOtp({
        email: ALLOWED_EMAIL,
        otp: "999999"
    })).rejects.toMatchObject({
        statusCode: 401,
        code: "ADMIN_LOGIN_OTP_INVALID"
    });

    expect(adminDoc.loginOtpAttempts).toBe(2);
    expect(adminDoc.save).toHaveBeenCalledTimes(1);
});

test("verifyLoginOtp returns access token on success", async () => {
    const adminDoc = {
        _id: "admin-1",
        name: "Admin User",
        email: ALLOWED_EMAIL,
        role: "owner",
        accountStatus: "active",
        emailVerified: true,
        loginOtpHash: sha256("222222"),
        loginOtpExpires: new Date(Date.now() + 10 * 60 * 1000),
        loginOtpAttempts: 0,
        save: jest.fn().mockResolvedValue({})
    };
    AdminAccount.findOne.mockReturnValue(mockSelectResolved(adminDoc));
    generateAdminAccessToken.mockReturnValue("admin-access-token");

    const result = await AdminAuthService.verifyLoginOtp({
        email: ALLOWED_EMAIL,
        otp: "222222"
    });

    expect(generateAdminAccessToken).toHaveBeenCalledWith("admin-1");
    expect(adminDoc.loginOtpHash).toBeUndefined();
    expect(adminDoc.loginOtpExpires).toBeUndefined();
    expect(adminDoc.loginOtpAttempts).toBe(0);
    expect(result).toEqual({
        accessToken: "admin-access-token",
        admin: expect.objectContaining({
            _id: "admin-1",
            email: ALLOWED_EMAIL
        })
    });
});

test("forgotPassword returns generic success for unknown account", async () => {
    AdminAccount.findOne.mockReturnValue(mockSelectResolved(null));

    const result = await AdminAuthService.forgotPassword({
        email: "missing@example.com"
    });

    expect(result).toEqual({
        message: "If that admin email exists, a reset link has been sent."
    });
    expect(sendEmail).not.toHaveBeenCalled();
});

test("forgotPassword clears reset fields when email send fails", async () => {
    const adminDoc = {
        _id: "admin-1",
        email: ALLOWED_EMAIL,
        accountStatus: "active",
        save: jest.fn().mockResolvedValue({})
    };

    AdminAccount.findOne.mockReturnValue(mockSelectResolved(adminDoc));
    sendEmail.mockRejectedValue(new Error("smtp down"));

    await expect(AdminAuthService.forgotPassword({
        email: ALLOWED_EMAIL
    })).rejects.toMatchObject({
        statusCode: 500,
        code: "ADMIN_RESET_EMAIL_FAILED"
    });

    expect(adminDoc.resetPasswordToken).toBeUndefined();
    expect(adminDoc.resetPasswordExpires).toBeUndefined();
    expect(adminDoc.save).toHaveBeenCalledTimes(2);
});

test("resetPassword rejects invalid token", async () => {
    AdminAccount.findOne.mockReturnValue(mockSelectResolved(null));

    await expect(AdminAuthService.resetPassword({
        token: "a".repeat(64),
        password: "Str0ng@Pass1"
    })).rejects.toMatchObject({
        statusCode: 400,
        code: "ADMIN_RESET_TOKEN_INVALID"
    });
});

test("resetPassword updates password hash and clears reset fields", async () => {
    const adminDoc = {
        _id: "admin-1",
        passwordHash: "old",
        resetPasswordToken: "token",
        resetPasswordExpires: new Date(Date.now() + 10 * 60 * 1000),
        save: jest.fn().mockResolvedValue({})
    };
    AdminAccount.findOne.mockReturnValue(mockSelectResolved(adminDoc));
    bcrypt.hash.mockResolvedValue("new-hash");

    const result = await AdminAuthService.resetPassword({
        token: "b".repeat(64),
        password: "New@Str0ng1"
    });

    expect(adminDoc.passwordHash).toBe("new-hash");
    expect(adminDoc.resetPasswordToken).toBeUndefined();
    expect(adminDoc.resetPasswordExpires).toBeUndefined();
    expect(result).toEqual({
        message: "Admin password has been reset successfully."
    });
});

test("verifyEmail rejects invalid token", async () => {
    AdminAccount.findOne.mockReturnValue(mockSelectResolved(null));

    await expect(AdminAuthService.verifyEmail("c".repeat(64)))
        .rejects
        .toMatchObject({
            statusCode: 400,
            code: "ADMIN_VERIFY_TOKEN_INVALID"
        });
});

test("verifyEmail marks admin verified and clears verification fields", async () => {
    const adminDoc = {
        _id: "admin-1",
        emailVerified: false,
        emailVerificationToken: "token",
        emailVerificationExpires: new Date(Date.now() + 10 * 60 * 1000),
        save: jest.fn().mockResolvedValue({})
    };
    AdminAccount.findOne.mockReturnValue(mockSelectResolved(adminDoc));

    const result = await AdminAuthService.verifyEmail("d".repeat(64));

    expect(adminDoc.emailVerified).toBe(true);
    expect(adminDoc.emailVerificationToken).toBeUndefined();
    expect(adminDoc.emailVerificationExpires).toBeUndefined();
    expect(adminDoc.save).toHaveBeenCalledWith({ validateBeforeSave: false });
    expect(result).toEqual({
        message: "Admin email verified successfully."
    });
});
