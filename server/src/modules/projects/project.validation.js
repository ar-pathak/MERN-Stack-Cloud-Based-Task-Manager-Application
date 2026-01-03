const { z } = require("zod");
const mongoose = require("mongoose");

const objectId = z.string().refine(
    (val) => mongoose.Types.ObjectId.isValid(val),
    { message: "Invalid ObjectId" }
);

const createProjectSchema = z.object({
    name: z.string().min(1, "Project name is required"),
    description: z.string().optional(),
    color: z.string().optional(),

    teams: z
        .array(objectId)
        .optional()
        .refine(
            (arr) => !arr || new Set(arr).size === arr.length,
            { message: "Duplicate team IDs not allowed" }
        ),

    members: z
        .array(
            z.object({
                user: objectId,
                role: z.enum(["admin", "editor", "viewer"]).default("viewer")
            })
        )
        .optional(),

    status: z.enum(["active", "archived", "completed"]).default("active")
});


const updateProjectSchema = z.object({
    name: z.string().min(1, "Project name is required").optional(),
    description: z.string().optional(),
    color: z.string().optional(),
    teams: z
        .array(objectId)
        .optional()
        .refine(
            (arr) => !arr || new Set(arr).size === arr.length,
            { message: "Duplicate team IDs not allowed" }
        ).optional(),
    members: z
        .array(
            z.object({
                user: objectId,
                role: z.enum(["admin", "editor", "viewer"]).default("viewer")
            })
        )
        .optional(),
    status: z.enum(['active', 'archived', 'completed']).optional()
})

const addProjectTeamsSchema = z.object({
    teams: z
        .array(objectId)
        .min(1, "At least one team is required")
        .optional()
        .refine(
            (arr) => !arr || new Set(arr).size === arr.length,
            { message: "Duplicate team IDs not allowed" }
        )
})
const removeProjectTeamsSchema = z.object({
    teams: z
        .array(objectId)
        .min(1, "At least one team is required")
});

module.exports = { createProjectSchema, updateProjectSchema, addProjectTeamsSchema, removeProjectTeamsSchema };