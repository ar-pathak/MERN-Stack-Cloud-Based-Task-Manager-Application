const { z } = require("zod");

const objectId = z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format");

const createSubtaskSchema = z.object({
    taskId: objectId,
    title: z
        .string()
        .trim()
        .min(1, "Subtask title must be at least 1 character")
        .max(200, "Subtask title cannot exceed 200 characters"),

    description: z
        .string()
        .trim()
        .max(1000, "Description cannot exceed 1000 characters")
        .optional()
        .nullable()
        .or(z.literal("")),

    assignedTo: objectId.optional().nullable(),

    dueDate: z
        .string()
        .datetime({ message: "Invalid date format. Use ISO 8601 format" })
        .optional()
        .nullable()
});

const updateSubtaskSchema = z
    .object({
        title: z
            .string()
            .trim()
            .min(1, "Subtask title must be at least 1 character")
            .max(200, "Subtask title cannot exceed 200 characters")
            .optional(),

        description: z
            .string()
            .trim()
            .max(1000, "Description cannot exceed 1000 characters")
            .optional()
            .nullable()
            .or(z.literal("")),

        completed: z.boolean().optional(),

        assignedTo: objectId.optional().nullable(),

        dueDate: z
            .string()
            .datetime({ message: "Invalid date format. Use ISO 8601 format" })
            .optional()
            .nullable()
    })
    .refine(data => Object.keys(data).length > 0, {
        message: "At least one field is required for update"
    });
    
const validateCreateSubtask = (req, res, next) => {
    const result = createSubtaskSchema.safeParse(req.body);

    if (!result.success) {
        return res.status(400).json({
            message: "Validation failed",
            errors: result.error.issues.map(issue => ({
                field: issue.path.join("."),
                message: issue.message
            }))
        });
    }

    req.body = result.data; // sanitized data
    next();
};

const validateUpdateSubtask = (req, res, next) => {
    const result = updateSubtaskSchema.safeParse(req.body);

    if (!result.success) {
        return res.status(400).json({
            message: "Validation failed",
            errors: result.error.issues.map(issue => ({
                field: issue.path.join("."),
                message: issue.message
            }))
        });
    }

    req.body = result.data;
    next();
};

module.exports = {
    validateCreateSubtask,
    validateUpdateSubtask
};
