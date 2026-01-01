const { z } = require('zod')

// Validation schema for creating a team
const createTeamSchema = z.object({
    name: z.string().min(1, "Team name is required").max(100, "Team name is too long"),
    description: z.string().max(500, "Description is too long").optional(),
})

const updateTeamSchema = z.object({
    name: z.string().min(1, "Team name is required").max(100, "Team name is too long").optional(),
    description: z.string().max(500, "Description is too long").optional(),
})

const addTeamMemberSchema = z.object({
    memberId: z.string(),
    role: z.enum(["lead", "member"], "Invalid role"),
})

const updateTeamMemberRoleSchema = z.object({
    role: z.enum(["lead", "member"], "Invalid role"),
})

module.exports= {createTeamSchema, updateTeamSchema, addTeamMemberSchema, updateTeamMemberRoleSchema};