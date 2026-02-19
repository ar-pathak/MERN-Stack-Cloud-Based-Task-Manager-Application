const { z } = require("zod");

const objectId = z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format");

const assigneeInputSchema = z
    .union([
        objectId,
        z.array(objectId)
            .min(1, "At least one assignee is required")
            .refine(
                (arr) => new Set(arr).size === arr.length,
                { message: "Duplicate assignee IDs are not allowed" }
            )
    ])
    .optional()
    .nullable();

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

    assignedTo: assigneeInputSchema,

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
        isHighPriority: z.boolean().optional(),
        assignedTo: assigneeInputSchema,

        dueDate: z.coerce.date().optional(),
    })
    .refine(data => Object.keys(data).length > 0, {
        message: "At least one field is required for update"
    });

const manageAssigneesSchema = z.object({
    assignees: z.array(objectId).min(1, "At least one user ID is required")
});
const validateManageAssignees = (req, res, next) => {
    const result = manageAssigneesSchema.safeParse(req.body);
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
    validateUpdateSubtask,
    validateManageAssignees
};
