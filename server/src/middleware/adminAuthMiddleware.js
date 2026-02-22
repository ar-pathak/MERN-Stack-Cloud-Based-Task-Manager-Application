const AdminAccount = require("../models/adminAccount");
const { verifyAdminAccessToken } = require("../helpers/adminTokenHelper");
const { ADMIN_ACCESS_COOKIE_NAME } = require("../helpers/adminCookieHelper");

const adminAuthMiddleware = async (req, res, next) => {
    try {
        const token = req.cookies?.[ADMIN_ACCESS_COOKIE_NAME];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Admin authentication required",
                code: "ADMIN_AUTH_REQUIRED"
            });
        }

        let decoded;
        try {
            decoded = verifyAdminAccessToken(token);
        } catch (error) {
            if (error?.name === "TokenExpiredError") {
                return res.status(401).json({
                    success: false,
                    message: "Admin session expired",
                    code: "ADMIN_SESSION_EXPIRED"
                });
            }

            return res.status(401).json({
                success: false,
                message: "Invalid admin session token",
                code: "ADMIN_TOKEN_INVALID"
            });
        }

        if (!decoded?.id || decoded?.scope !== "admin") {
            return res.status(401).json({
                success: false,
                message: "Invalid admin token payload",
                code: "ADMIN_TOKEN_PAYLOAD_INVALID"
            });
        }

        const admin = await AdminAccount.findById(decoded.id);
        if (!admin) {
            return res.status(401).json({
                success: false,
                message: "Admin account not found",
                code: "ADMIN_NOT_FOUND"
            });
        }

        if (admin.accountStatus !== "active") {
            return res.status(403).json({
                success: false,
                message: "Admin account is not active",
                code: "ADMIN_INACTIVE"
            });
        }

        if (!admin.emailVerified) {
            return res.status(403).json({
                success: false,
                message: "Admin email is not verified",
                code: "ADMIN_EMAIL_NOT_VERIFIED"
            });
        }

        req.admin = admin;
        return next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Admin authentication failed",
            code: "ADMIN_AUTH_FAILED",
            error: error?.message
        });
    }
};

module.exports = adminAuthMiddleware;
