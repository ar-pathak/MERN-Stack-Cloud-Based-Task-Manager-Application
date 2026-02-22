/**
 * Validation Middleware Factory
 */
const validate = (schema, source = "body") => (req, res, next) => {
    const data = source === "params"
        ? req.params
        : source === "query"
            ? req.query
            : req.body;

    const result = schema.safeParse(data);

    if (!result.success) {
        const rawIssues = Array.isArray(result.error?.issues)
            ? result.error.issues
            : Array.isArray(result.error?.errors)
                ? result.error.errors
                : [];

        const errors = rawIssues.map((issue) => ({
            field: Array.isArray(issue.path) && issue.path.length
                ? issue.path.join(".")
                : source,
            message: issue.message
        }));

        return res.status(400).json({
            success: false,
            message: "Validation Error",
            errors: errors.length > 0
                ? errors
                : [{ field: source, message: "Invalid request data" }]
        });
    }

    // Replace with parsed & validated data
    req[source] = result.data;
    next();
};

module.exports = { validate };
