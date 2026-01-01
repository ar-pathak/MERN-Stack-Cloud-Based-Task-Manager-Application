const { z } = require('zod');

const createProjectSchema = z.object({
    name: z.string().min(1, "Project name is required"),
    description: z.string().optional(),
    color: z.string().optional(),
    teams: z.string().array().optional(),
    members: z.object({
        user: z.string(),
        role: z.enum(["admin", "editor", "viewer"]).optional()
    }).array().optional(),
    status: z.enum(["active", "archived", "completed"]).optional()

})

const updateProjectSchema = z.object({
    name: z.string().min(1, "Project name is required").optional(),
    description: z.string().optional(),
    color: z.string().optional(),
    teams: z.string().array().optional(),
    members: z.object({
        user: z.string(),
        role: z.enum(['admin', 'editor', 'viewer']).optional()
    }).array().optional(),
    status: z.enum(['active', 'archived', 'completed']).optional()
})

module.exports = { createProjectSchema, updateProjectSchema };