const { z } = require('zod');

const createWorkspaceSchema = z.object({
    name: z.string()
        .min(3, "Workspace name must be at least 3 characters")
        .max(50, "Workspace name cannot exceed 50 characters")
        .trim(),
    description: z.string()
        .max(200, "Description cannot exceed 200 characters")
        .trim()
        .optional()
});

const updateWorkspaceSchema = z.object({
    name: z.string()
        .min(3, "Workspace name must be at least 3 characters")
        .max(50, "Workspace name cannot exceed 50 characters")
        .trim()
        .optional(),
    description: z.string()
        .max(200, "Description cannot exceed 200 characters")
        .trim()
        .optional()
}).refine(data => data.name || data.description, {
    message: "At least one field (name or description) must be provided"
});

const updateMemberRoleSchema = z.object({
    role: z.enum(["owner", "admin", "member", "viewer"], {
        errorMap: () => ({ message: "Role must be one of: owner, admin, member, viewer" })
    })
});

const addMemberSchema = z.object({
    userId: z.string()
        .min(1, "User ID is required")
        .refine(val => /^[a-f\d]{24}$/i.test(val), {
            message: "Invalid user ID format"
        })
});

const sendInviteSchema = z.object({
    email: z.string()
        .email("Invalid email address")
        .toLowerCase()
        .trim(),
    role: z.enum(["admin", "member", "viewer"], {
        errorMap: () => ({ message: "Role must be one of: admin, member, viewer" })
    }).default("member")
});

const transferOwnershipSchema = z.object({
    newOwnerId: z.string()
        .min(1, "New owner ID is required")
        .refine(val => /^[a-f\d]{24}$/i.test(val), {
            message: "Invalid user ID format"
        })
});

module.exports = {
    createWorkspaceSchema,
    updateWorkspaceSchema,
    updateMemberRoleSchema,
    sendInviteSchema,
    addMemberSchema,
    transferOwnershipSchema
};