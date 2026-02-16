const { z } = require("zod");

const listActivityQuerySchema = z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    level: z.enum(["all", "workspace", "project", "task", "subtask", "system"]).optional(),
    search: z.string().trim().max(120).optional(),
    action: z.string().trim().max(120).optional()
});

const dashboardQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(20).optional()
});

const advancedDashboardQuerySchema = z.object({
    days: z.coerce.number().int().min(7).max(30).optional()
});

module.exports = {
    listActivityQuerySchema,
    dashboardQuerySchema,
    advancedDashboardQuerySchema
};
