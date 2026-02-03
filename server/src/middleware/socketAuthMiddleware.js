// middleware/socketAuthMiddleware.js
const jwt = require("jsonwebtoken");

/**
 * Socket.IO authentication middleware.
 * Runs once per connection attempt, BEFORE any event handlers are registered.
 * 
 * Extracts the JWT from the handshake.auth.token field, verifies it, and
 * stamps the decoded userId onto the socket object for use in event handlers.
 * 
 * On failure, the connection is rejected with a descriptive error.
 */
module.exports = (socket, next) => {
    try {
        // Extract token from handshake auth
        const token = socket.handshake.auth?.token;

        if (!token) {
            return next(new Error("Authentication token missing"));
        }

        // Verify and decode the JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded || !decoded.userId) {
            return next(new Error("Invalid token payload"));
        }

        // Stamp the userId onto the socket for use in event handlers
        socket.userId = decoded.userId;

        // Log successful authentication (optional, can be removed in production)
        console.log(`[socket auth] ✅ user ${decoded.userId} authenticated`);

        // Proceed to connection
        next();
    } catch (err) {
        // Handle specific JWT errors
        if (err.name === "TokenExpiredError") {
            return next(new Error("Token expired"));
        }
        if (err.name === "JsonWebTokenError") {
            return next(new Error("Invalid token"));
        }

        // Generic error
        console.error("[socket auth] ❌ error:", err);
        return next(new Error("Authentication failed"));
    }
};