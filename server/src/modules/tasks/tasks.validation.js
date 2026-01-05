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



module.exports = { createTaskSchema };