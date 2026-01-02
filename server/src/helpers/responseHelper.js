/**
 * Send success response
 * @param {Response} res - Express response object
 * @param {*} data - Response data
 * @param {String} message - Success message
 * @param {Number} statusCode - HTTP status code (default: 200)
 */
const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
    const response = {
        success: true,
        message,
    };

    if (data !== null) {
        response.data = data;
    }

    return res.status(statusCode).json(response);
};

/**
 * Send error response
 * @param {Response} res - Express response object
 * @param {String} message - Error message
 * @param {Number} statusCode - HTTP status code (default: 400)
 * @param {*} errors - Additional error details
 */
const sendError = (res, message = 'An error occurred', statusCode = 400, errors = null) => {
    const response = {
        success: false,
        message,
    };

    if (errors) {
        response.errors = errors;
    }

    return res.status(statusCode).json(response);
};

/**
 * Handle controller errors consistently
 * @param {Error} error - Error object
 * @param {Response} res - Express response object
 */
const handleError = (error, res) => {
    console.error('Controller error:', error);

    // Handle validation errors (Zod)
    if (error.name === 'ZodError') {
        return sendError(res, 'Validation error', 400, error.errors);
    }

    // Handle MongoDB errors
    if (error.name === 'MongoServerError') {
        if (error.code === 11000) {
            // Duplicate key error
            const field = Object.keys(error.keyPattern)[0];
            return sendError(res, `${field} already exists`, 409);
        }
        return sendError(res, 'Database error', 500);
    }

    // Handle Mongoose errors
    if (error.name === 'CastError') {
        return sendError(res, 'Invalid ID format', 400);
    }

    // Handle custom errors with status codes
    if (error.statusCode) {
        return sendError(res, error.message, error.statusCode);
    }

    // Default error response
    return sendError(res, error.message || 'Internal server error', 500);
};

module.exports = {
    sendSuccess,
    sendError,
    handleError,
};

