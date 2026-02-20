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
const updateTaskSchema = z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    dueDate: z.coerce.date().optional(),
    isHighPriority: z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update"
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
        ),
    usernames: z
        .array(z.string().trim().min(1))
        .optional()
        .refine(
            arr => !arr || new Set(arr).size === arr.length,
            { message: "Duplicate usernames not allowed" }
        )
}).refine(
    data => (data.assignees && data.assignees.length > 0) ||
        (data.assigneesTeams && data.assigneesTeams.length > 0) ||
        (data.usernames && data.usernames.length > 0),
    { message: "At least one assignee (ID or username) or team must be provided" }
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

const respondTaskAssigneeRequestSchema = z.object({
    action: z.enum(["approve", "reject"], {
        errorMap: () => ({ message: "Action must be approve or reject" })
    })
});

module.exports = {
    createTaskSchema,
    updateTaskSchema,
    addTaskAssigneesSchema,
    removeTaskAssigneesSchema,
    changeTaskStatusSchema,
    respondTaskAssigneeRequestSchema
};
