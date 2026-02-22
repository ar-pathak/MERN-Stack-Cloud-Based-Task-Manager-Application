const { z } = require("zod");

const normalizedEmailSchema = z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email address");

const passwordStrengthSchema = z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password cannot exceed 72 characters")
    .regex(/[a-z]/, "Password must include at least one lowercase letter")
    .regex(/[A-Z]/, "Password must include at least one uppercase letter")
    .regex(/[0-9]/, "Password must include at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must include at least one special character");

const registerAdminSchema = z.object({
    name: z.string().trim().min(2).max(120),
    email: normalizedEmailSchema,
    password: passwordStrengthSchema,
    inviteCode: z.string().trim().max(120).optional()
});

const loginAdminSchema = z.object({
    email: normalizedEmailSchema,
    password: z.string().min(1, "Password is required")
});

const verifyAdminLoginOtpSchema = z.object({
    email: normalizedEmailSchema,
    otp: z
        .string()
        .trim()
        .regex(/^\d{6}$/, "OTP must be a 6-digit code")
});

const forgotAdminPasswordSchema = z.object({
    email: normalizedEmailSchema
});

const requestAdminVerificationSchema = z.object({
    email: normalizedEmailSchema
});

const resetAdminPasswordSchema = z.object({
    token: z.string().regex(/^[a-f0-9]{64}$/i, "Invalid reset token"),
    password: passwordStrengthSchema
});

const verifyAdminEmailSchema = z.object({
    token: z.string().regex(/^[a-f0-9]{64}$/i, "Invalid verification token")
});

module.exports = {
    registerAdminSchema,
    loginAdminSchema,
    verifyAdminLoginOtpSchema,
    forgotAdminPasswordSchema,
    requestAdminVerificationSchema,
    resetAdminPasswordSchema,
    verifyAdminEmailSchema
};
