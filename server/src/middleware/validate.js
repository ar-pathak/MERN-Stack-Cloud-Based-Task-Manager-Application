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
        const errors = result.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
        }));

        return res.status(400).json({
            success: false,
            message: "Validation Error",
            errors
        });
    }

    // Replace with parsed & validated data
    req[source] = result.data;
    next();
};

module.exports = { validate };