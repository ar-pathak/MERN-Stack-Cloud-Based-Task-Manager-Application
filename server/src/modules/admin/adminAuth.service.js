const bcrypt = require("bcrypt");
const crypto = require("crypto");

const sendEmail = require("../../helpers/sendEmail");
const AdminAccount = require("../../models/adminAccount");
const { generateAdminAccessToken } = require("../../helpers/adminTokenHelper");

const RESET_PASSWORD_TTL_MS = 60 * 60 * 1000;
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const LOGIN_OTP_TTL_MS = 10 * 60 * 1000;
const MAX_LOGIN_OTP_ATTEMPTS = 5;
const BCRYPT_SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
const ALLOWED_ADMIN_EMAIL = String(
    process.env.ADMIN_ALLOWED_EMAIL || "pathakarsan@gmail.com"
).trim().toLowerCase();
const NOT_ALLOWED_MESSAGE = "You do not have permission to access the admin panel.";

const createAdminAuthError = (message, statusCode = 400, code) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    if (code) {
        error.code = code;
    }
    return error;
};

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const ensureAllowedAdminEmail = (email) => {
    if (normalizeEmail(email) !== ALLOWED_ADMIN_EMAIL) {
        throw createAdminAuthError(NOT_ALLOWED_MESSAGE, 403, "ADMIN_NOT_ALLOWED");
    }
};

const hashToken = (value) =>
    crypto.createHash("sha256").update(String(value || "")).digest("hex");
const generateNumericOtp = (length = 6) =>
    String(crypto.randomInt(0, 10 ** length)).padStart(length, "0");
const clearLoginOtpState = (admin) => {
    admin.loginOtpHash = undefined;
    admin.loginOtpExpires = undefined;
    admin.loginOtpAttempts = 0;
};

const normalizeBaseUrl = (value) => String(value || "").trim().replace(/\/+$/, "");
const getFirstConfiguredValue = (value) => (
    String(value || "")
        .split(",")
        .map((entry) => entry.trim())
        .find(Boolean) || ""
);
const getFrontendBaseUrl = () =>
    normalizeBaseUrl(getFirstConfiguredValue(process.env.FRONTEND_URL))
    || "http://localhost:5173";

const buildAdminVerificationUrl = (token) =>
    `${getFrontendBaseUrl()}/admin/verify-email/${token}`;

const buildAdminResetUrl = (token) =>
    `${getFrontendBaseUrl()}/admin/auth/reset-password/${token}`;

const toAdminPayload = (admin) => ({
    _id: admin._id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    accountStatus: admin.accountStatus,
    emailVerified: admin.emailVerified,
    lastLoginAt: admin.lastLoginAt,
    lastSeenAt: admin.lastSeenAt
});

const ensureInviteCodeIfConfigured = (inviteCode) => {
    const configuredCode = String(process.env.ADMIN_INVITE_CODE || "").trim();
    if (!configuredCode) return;

    if (String(inviteCode || "").trim() !== configuredCode) {
        throw createAdminAuthError("Invalid admin invite code", 403, "ADMIN_INVITE_CODE_INVALID");
    }
};

const sendAdminVerificationEmailById = async (adminId) => {
    const admin = await AdminAccount.findById(adminId)
        .select("+emailVerificationToken +emailVerificationExpires");

    if (!admin) {
        throw createAdminAuthError("Admin account not found", 404, "ADMIN_NOT_FOUND");
    }

    if (admin.accountStatus !== "active") {
        throw createAdminAuthError("Admin account is not active", 403, "ADMIN_INACTIVE");
    }

    if (admin.emailVerified) {
        return { message: "Admin email is already verified." };
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    admin.emailVerificationToken = hashToken(verificationToken);
    admin.emailVerificationExpires = Date.now() + EMAIL_VERIFICATION_TTL_MS;
    await admin.save({ validateBeforeSave: false });

    try {
        await sendEmail({
            to: admin.email,
            subject: "Verify Your Admin Email - Aurora",
            token: verificationToken,
            type: "email-verification",
            actionUrl: buildAdminVerificationUrl(verificationToken)
        });
    } catch (error) {
        admin.emailVerificationToken = undefined;
        admin.emailVerificationExpires = undefined;
        await admin.save({ validateBeforeSave: false });
        throw createAdminAuthError(
            "Verification email could not be sent. Please try again later.",
            500,
            "ADMIN_VERIFICATION_EMAIL_FAILED"
        );
    }

    return { message: "Verification email sent successfully." };
};

const sendAdminVerificationEmailByEmail = async (email) => {
    const normalizedEmail = normalizeEmail(email);
    const admin = await AdminAccount.findOne({ email: normalizedEmail });

    // Prevent account enumeration.
    if (!admin || admin.accountStatus !== "active") {
        return { message: "If that admin email exists, a verification link has been sent." };
    }

    await sendAdminVerificationEmailById(admin._id);
    return { message: "If that admin email exists, a verification link has been sent." };
};

const sendAdminLoginOtpEmail = async (adminEmail, otpCode) => {
    const otpTtlMinutes = Math.max(1, Math.ceil(LOGIN_OTP_TTL_MS / (60 * 1000)));
    const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.55; color: #0f172a;">
            <h2 style="margin: 0 0 12px;">Aurora Admin Login OTP</h2>
            <p style="margin: 0 0 12px;">
                Use this one-time code to complete your admin sign in:
            </p>
            <p style="margin: 0 0 16px; font-size: 28px; font-weight: 700; letter-spacing: 4px;">
                ${otpCode}
            </p>
            <p style="margin: 0 0 8px;">
                This code will expire in ${otpTtlMinutes} minute(s).
            </p>
            <p style="margin: 0; color: #475569;">
                If you did not request this login, ignore this email.
            </p>
        </div>
    `;

    await sendEmail({
        to: adminEmail,
        subject: "Your Admin Login OTP - Aurora",
        html
    });
};

const AdminAuthService = {
    register: async ({ name, email, password, inviteCode }) => {
        ensureInviteCodeIfConfigured(inviteCode);

        const normalizedEmail = normalizeEmail(email);
        ensureAllowedAdminEmail(normalizedEmail);
        const existing = await AdminAccount.findOne({ email: normalizedEmail });
        if (existing) {
            throw createAdminAuthError("Admin email already registered", 409, "ADMIN_EMAIL_EXISTS");
        }

        const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
        const isFirstAdmin = (await AdminAccount.countDocuments({})) === 0;

        const admin = await AdminAccount.create({
            name: String(name || "").trim(),
            email: normalizedEmail,
            passwordHash,
            role: isFirstAdmin ? "owner" : "support_agent",
            accountStatus: "active",
            emailVerified: false
        });

        await sendAdminVerificationEmailById(admin._id);

        return {
            admin: toAdminPayload(admin),
            requiresEmailVerification: true
        };
    },

    login: async ({ email, password }) => {
        const normalizedEmail = normalizeEmail(email);
        ensureAllowedAdminEmail(normalizedEmail);

        const admin = await AdminAccount.findOne({ email: normalizedEmail })
            .select(
                "+passwordHash +emailVerificationToken +emailVerificationExpires +loginOtpHash +loginOtpExpires +loginOtpAttempts"
            );

        if (!admin) {
            throw createAdminAuthError("Invalid admin email or password", 401, "ADMIN_INVALID_CREDENTIALS");
        }

        if (admin.accountStatus !== "active") {
            throw createAdminAuthError("Admin account is not active", 403, "ADMIN_INACTIVE");
        }

        const passwordMatches = await bcrypt.compare(password, admin.passwordHash);
        if (!passwordMatches) {
            throw createAdminAuthError("Invalid admin email or password", 401, "ADMIN_INVALID_CREDENTIALS");
        }

        if (!admin.emailVerified) {
            throw createAdminAuthError(
                "Admin email is not verified. Please verify before login.",
                403,
                "ADMIN_EMAIL_NOT_VERIFIED"
            );
        }

        const otpCode = generateNumericOtp(6);
        admin.loginOtpHash = hashToken(otpCode);
        admin.loginOtpExpires = new Date(Date.now() + LOGIN_OTP_TTL_MS);
        admin.loginOtpAttempts = 0;
        admin.lastSeenAt = new Date();
        await admin.save({ validateBeforeSave: false });

        try {
            await sendAdminLoginOtpEmail(admin.email, otpCode);
        } catch (error) {
            clearLoginOtpState(admin);
            await admin.save({ validateBeforeSave: false });
            throw createAdminAuthError(
                "Login OTP email could not be sent. Please try again later.",
                500,
                "ADMIN_LOGIN_OTP_EMAIL_FAILED"
            );
        }

        return {
            otpRequired: true,
            email: admin.email,
            message: "A login verification code has been sent to your email."
        };
    },

    verifyLoginOtp: async ({ email, otp }) => {
        const normalizedEmail = normalizeEmail(email);
        ensureAllowedAdminEmail(normalizedEmail);

        const admin = await AdminAccount.findOne({ email: normalizedEmail })
            .select("+loginOtpHash +loginOtpExpires +loginOtpAttempts");

        if (!admin) {
            throw createAdminAuthError("Admin account not found", 404, "ADMIN_NOT_FOUND");
        }

        if (admin.accountStatus !== "active") {
            throw createAdminAuthError("Admin account is not active", 403, "ADMIN_INACTIVE");
        }

        if (!admin.emailVerified) {
            throw createAdminAuthError(
                "Admin email is not verified. Please verify before login.",
                403,
                "ADMIN_EMAIL_NOT_VERIFIED"
            );
        }

        if (!admin.loginOtpHash || !admin.loginOtpExpires) {
            throw createAdminAuthError(
                "No active login verification request found. Please login again.",
                400,
                "ADMIN_LOGIN_OTP_NOT_REQUESTED"
            );
        }

        if (admin.loginOtpExpires.getTime() <= Date.now()) {
            clearLoginOtpState(admin);
            await admin.save({ validateBeforeSave: false });
            throw createAdminAuthError(
                "Login OTP has expired. Please login again.",
                400,
                "ADMIN_LOGIN_OTP_EXPIRED"
            );
        }

        const currentAttempts = Number(admin.loginOtpAttempts || 0);
        if (currentAttempts >= MAX_LOGIN_OTP_ATTEMPTS) {
            clearLoginOtpState(admin);
            await admin.save({ validateBeforeSave: false });
            throw createAdminAuthError(
                "OTP verification limit reached. Please login again.",
                429,
                "ADMIN_LOGIN_OTP_ATTEMPTS_EXCEEDED"
            );
        }

        if (hashToken(otp) !== admin.loginOtpHash) {
            const nextAttempts = currentAttempts + 1;
            admin.loginOtpAttempts = nextAttempts;

            if (nextAttempts >= MAX_LOGIN_OTP_ATTEMPTS) {
                clearLoginOtpState(admin);
                await admin.save({ validateBeforeSave: false });
                throw createAdminAuthError(
                    "OTP verification limit reached. Please login again.",
                    429,
                    "ADMIN_LOGIN_OTP_ATTEMPTS_EXCEEDED"
                );
            }

            await admin.save({ validateBeforeSave: false });
            throw createAdminAuthError(
                `Invalid OTP code. ${MAX_LOGIN_OTP_ATTEMPTS - nextAttempts} attempt(s) remaining.`,
                401,
                "ADMIN_LOGIN_OTP_INVALID"
            );
        }

        clearLoginOtpState(admin);
        admin.lastLoginAt = new Date();
        admin.lastSeenAt = new Date();
        await admin.save({ validateBeforeSave: false });

        const accessToken = generateAdminAccessToken(admin._id);

        return {
            accessToken,
            admin: toAdminPayload(admin)
        };
    },

    getMe: async (adminId) => {
        const admin = await AdminAccount.findById(adminId);
        if (!admin) {
            throw createAdminAuthError("Admin account not found", 404, "ADMIN_NOT_FOUND");
        }

        if (admin.accountStatus !== "active") {
            throw createAdminAuthError("Admin account is not active", 403, "ADMIN_INACTIVE");
        }

        admin.lastSeenAt = new Date();
        await admin.save({ validateBeforeSave: false });

        return {
            admin: toAdminPayload(admin)
        };
    },

    forgotPassword: async ({ email }) => {
        const normalizedEmail = normalizeEmail(email);
        const admin = await AdminAccount.findOne({ email: normalizedEmail })
            .select("+resetPasswordToken +resetPasswordExpires");

        if (!admin || admin.accountStatus !== "active") {
            return {
                message: "If that admin email exists, a reset link has been sent."
            };
        }

        const rawToken = crypto.randomBytes(32).toString("hex");
        admin.resetPasswordToken = hashToken(rawToken);
        admin.resetPasswordExpires = Date.now() + RESET_PASSWORD_TTL_MS;
        await admin.save({ validateBeforeSave: false });

        try {
            await sendEmail({
                to: admin.email,
                subject: "Reset Admin Password - Aurora",
                token: rawToken,
                type: "reset-password",
                actionUrl: buildAdminResetUrl(rawToken)
            });
        } catch (error) {
            admin.resetPasswordToken = undefined;
            admin.resetPasswordExpires = undefined;
            await admin.save({ validateBeforeSave: false });
            throw createAdminAuthError(
                "Reset email could not be sent. Please try again later.",
                500,
                "ADMIN_RESET_EMAIL_FAILED"
            );
        }

        return {
            message: "If that admin email exists, a reset link has been sent."
        };
    },

    requestVerificationByEmail: async ({ email }) =>
        sendAdminVerificationEmailByEmail(email),

    resetPassword: async ({ token, password }) => {
        const hashedToken = hashToken(token);

        const admin = await AdminAccount.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }
        }).select("+resetPasswordToken +resetPasswordExpires +passwordHash");

        if (!admin) {
            throw createAdminAuthError("Invalid or expired reset token", 400, "ADMIN_RESET_TOKEN_INVALID");
        }

        admin.passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
        admin.resetPasswordToken = undefined;
        admin.resetPasswordExpires = undefined;
        admin.lastSeenAt = new Date();
        await admin.save({ validateBeforeSave: false });

        return {
            message: "Admin password has been reset successfully."
        };
    },

    sendVerificationEmail: async (adminId) => sendAdminVerificationEmailById(adminId),

    verifyEmail: async (token) => {
        const hashedToken = hashToken(token);

        const admin = await AdminAccount.findOne({
            emailVerificationToken: hashedToken,
            emailVerificationExpires: { $gt: Date.now() }
        }).select("+emailVerificationToken +emailVerificationExpires");

        if (!admin) {
            throw createAdminAuthError(
                "Invalid or expired admin verification token",
                400,
                "ADMIN_VERIFY_TOKEN_INVALID"
            );
        }

        if (!admin.emailVerified) {
            admin.emailVerified = true;
        }
        admin.emailVerificationToken = undefined;
        admin.emailVerificationExpires = undefined;
        admin.lastSeenAt = new Date();
        await admin.save({ validateBeforeSave: false });

        return {
            message: "Admin email verified successfully."
        };
    }
};

module.exports = AdminAuthService;
