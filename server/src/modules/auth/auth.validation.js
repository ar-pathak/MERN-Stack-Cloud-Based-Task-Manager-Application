const { z } = require("zod");

const signupSchema = z.object({
    name: z.string().min(3),
    email: z.string().email(),
    password: z.string().min(6)
})

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6)
})

const forgotPasswordSchema = z.object({
    email: z.string().email("Invalid email address")
})

const resetPasswordSchema = z.object({
    token: z.string().min(1, "Reset token is required"),
    password: z.string().min(6, "Password must be at least 6 characters")
})

module.exports = { signupSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema };
