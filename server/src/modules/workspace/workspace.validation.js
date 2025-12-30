const { z } = require('zod');

const createWorkspaceSchema = z.object({
    name: z.string().min(3).max(50),
    description: z.string().max(200).optional()
})

const updateWorkspaceSchema = z.object({
    name: z.string().min(3).max(50).optional(),
    description: z.string().max(200).optional()
})

const updateMemberRoleSchema = z.object({
    role: z.enum(["owner", "admin", "member", "viewer"])
})

module.exports = { createWorkspaceSchema, updateWorkspaceSchema, updateMemberRoleSchema };