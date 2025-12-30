const { z } = require('zod');

const createWorkspaceSchema = z.object({
    name: z.string().min(3).max(50),
    description: z.string().max(200).optional(),
    members: z.array(z.object({
        userId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid user ID"),
        role: z.enum(["admin", "member", "viewer"])
    })).optional()
})

const updateWorkspaceSchema = z.object({
    name: z.string().min(3).max(50).optional(),
    description: z.string().max(200).optional(),
    members: z.array(z.object({
        userId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid user ID"),
        role: z.enum(["admin", "member", "viewer"])
    })).optional()
})

module.exports = { createWorkspaceSchema, updateWorkspaceSchema };