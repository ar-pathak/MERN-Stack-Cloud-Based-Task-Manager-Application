const { z } = require(zod);

const createTaskSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    dueDate: z.string().optional(),
    priority: z.enum(["low", "medium", "high"]).optional()
});