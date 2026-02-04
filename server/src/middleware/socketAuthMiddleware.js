const jwt = require("jsonwebtoken");
const cookie = require("cookie"); // ✅ Import cookie parser

module.exports = (socket, next) => {
    try {
        let token = null;

        // -----------------------------------------------------------
        // METHOD 1: Direct Cookie Access (Best for Web)
        // -----------------------------------------------------------
        if (socket.request.headers.cookie) {
            const parsedCookies = cookie.parse(socket.request.headers.cookie);
            token = parsedCookies.accessToken; // Aapke cookie ka naam 'accessToken' hai
        }

        // -----------------------------------------------------------
        // METHOD 2: Fallback (Postman / Mobile Apps ke liye)
        // -----------------------------------------------------------
        if (!token && socket.handshake.auth?.token) {
            token = socket.handshake.auth.token;
        }

        // -----------------------------------------------------------
        // Validation
        // -----------------------------------------------------------
        if (!token) {
            return next(new Error("Authentication error: Token not found in Cookie or Auth Handshake"));
        }

        // Verify Token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (!decoded || (!decoded.userId && !decoded.id)) {
            return next(new Error("Invalid token payload"));
        }

        // Attach User ID
        socket.userId = decoded.userId || decoded.id;
        console.log(`[Socket Auth] ✅ User ${socket.userId} connected via Cookie/Token`);
        
        next();

    } catch (err) {
        console.error("[Socket Auth Error]", err.message);
        return next(new Error("Unauthorized: " + err.message));
    }
};