const jwt = require("jsonwebtoken");

const ADMIN_ACCESS_TOKEN_TTL = "12h";

const getAdminJwtSecret = () =>
    String(process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || "").trim();

const generateAdminAccessToken = (adminId) => {
    const secret = getAdminJwtSecret();
    if (!secret) {
        throw new Error("Missing ADMIN_JWT_SECRET (or JWT_SECRET) for admin auth");
    }

    return jwt.sign(
        { id: String(adminId), scope: "admin" },
        secret,
        { expiresIn: ADMIN_ACCESS_TOKEN_TTL }
    );
};

const verifyAdminAccessToken = (token) => {
    const secret = getAdminJwtSecret();
    if (!secret) {
        throw new Error("Missing ADMIN_JWT_SECRET (or JWT_SECRET) for admin auth");
    }
    return jwt.verify(token, secret);
};

module.exports = {
    generateAdminAccessToken,
    verifyAdminAccessToken
};
