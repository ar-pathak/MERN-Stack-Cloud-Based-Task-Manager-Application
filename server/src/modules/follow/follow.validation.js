const { z } = require("zod");
const mongoose = require("mongoose");

/**
 * Custom ObjectId validator
 */
const objectIdSchema = z.string().refine(
    (val) => mongoose.Types.ObjectId.isValid(val),
    { message: "Invalid ID format" }
);

/**
 * Pagination schema for lists
 */
const listSchema = z.object({
    page: z.coerce
        .number()
        .int()
        .min(1, "Page must be at least 1")
        .default(1),
    limit: z.coerce
        .number()
        .int()
        .min(1, "Limit must be at least 1")
        .max(100, "Limit cannot exceed 100")
        .default(20)
});

/**
 * User ID parameter schema
 */
const idParamSchema = z.object({
    id: objectIdSchema
});

/**
 * Request ID parameter schema (for follow requests)
 */
const requestIdSchema = z.object({
    requestId: objectIdSchema
});

/**
 * Follow suggestion query schema
 */
const suggestionSchema = z.object({
    limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(50)
        .default(10)
});

module.exports = {
    objectIdSchema,
    listSchema,
    idParamSchema,
    requestIdSchema,
    suggestionSchema
};