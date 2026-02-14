const jwt = require("jsonwebtoken");
const User = require("../models/user");

const optionalAuthMiddleware = async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken;
        if (!token) {
            return next();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id)
            .select("_id accountStatus")
            .lean();

        if (user && user.accountStatus === "active") {
            req.user = { _id: user._id };
        }
    } catch (_error) {
        // Optional auth should never block access.
    }

    return next();
};

module.exports = optionalAuthMiddleware;
