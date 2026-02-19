const { z } = require('zod')
const mongoose = require("mongoose");

const objectId = z.string().refine(
    (value) => mongoose.Types.ObjectId.isValid(value),
    { message: "Invalid ObjectId" }
);

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
    memberId: objectId,
    role: z.enum(["lead", "member"], "Invalid role"),
})

const updateTeamMemberRoleSchema = z.object({
    role: z.enum(["lead", "member"], "Invalid role"),
})

module.exports= {createTeamSchema, updateTeamSchema, addTeamMemberSchema, updateTeamMemberRoleSchema};
