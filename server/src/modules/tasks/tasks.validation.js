const { z } = require('zod');
const mongoose = require('mongoose')

const objectId = z.string().refine(
    (val) => mongoose.Types.ObjectId.isValid(val),
    { message: "Invalid ObjectId" }
);
const createTaskSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    dueDate: z.coerce.date().optional(),
    isHighPriority: z.boolean().optional(),
    assigneesTeams: z
        .array(objectId)
        .optional()
        .refine(
            (arr) => !arr || new Set(arr).size === arr.length,
            { message: "Duplicate team IDs not allowed" }
        ).optional(),
    assignees: z.array(objectId)
        .optional()
        .refine(
            (arr) => !arr || new Set(arr).size === arr.length,
            { message: "Duplicate team IDs not allowed" }
        ).optional()
});

const addTaskAssigneesSchema = z.object({
    assigneesTeams: z
        .array(objectId)
        .optional()
        .refine(
            arr => !arr || new Set(arr).size === arr.length,
            { message: "Duplicate team IDs not allowed" }
        ),

    assignees: z
        .array(objectId)
        .optional()
        .refine(
            arr => !arr || new Set(arr).size === arr.length,
            { message: "Duplicate user IDs not allowed" }
        )
}).refine(
    data => data.assignees || data.assigneesTeams,
    { message: "At least one assignee or team must be provided" }
);

const removeTaskAssigneesSchema = z.object({
    assignees: z
        .array(objectId)
        .optional()
        .refine(
            arr => !arr || new Set(arr).size === arr.length,
            { message: "Duplicate user IDs not allowed" }
        ),

    assigneesTeams: z
        .array(objectId)
        .optional()
        .refine(
            arr => !arr || new Set(arr).size === arr.length,
            { message: "Duplicate team IDs not allowed" }
        )
}).refine(
    data => data.assignees || data.assigneesTeams,
    { message: "At least one assignee or team must be provided" }
);

const changeTaskStatusSchema = z.object({
    status: z.enum(["active", "archived", "completed"])
});


module.exports = { createTaskSchema, addTaskAssigneesSchema, removeTaskAssigneesSchema, changeTaskStatusSchema };