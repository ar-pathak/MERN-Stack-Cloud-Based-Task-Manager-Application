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

const signupSchema = z.object({
    name: z.string().trim().min(3, "Name must be at least 3 characters").max(50, "Name cannot exceed 50 characters"),
    email: normalizedEmailSchema,
    password: passwordStrengthSchema
})

const loginSchema = z.object({
    email: normalizedEmailSchema,
    password: z.string().min(1, "Password is required")
})

const forgotPasswordSchema = z.object({
    email: normalizedEmailSchema
})

const resetPasswordSchema = z.object({
    token: z.string().regex(/^[a-f0-9]{64}$/i, "Invalid reset token"),
    password: passwordStrengthSchema
})

const verifyEmailSchema = z.object({
    token: z.string().regex(/^[a-f0-9]{64}$/i, "Invalid verification token")
});

module.exports = {
    signupSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    verifyEmailSchema
};
