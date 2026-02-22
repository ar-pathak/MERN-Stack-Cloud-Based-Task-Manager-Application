const AdminAuthService = require("./adminAuth.service");
const {
    registerAdminSchema,
    loginAdminSchema,
    verifyAdminLoginOtpSchema,
    forgotAdminPasswordSchema,
    requestAdminVerificationSchema,
    resetAdminPasswordSchema,
    verifyAdminEmailSchema
} = require("./adminAuth.validation");
const {
    setAdminAccessTokenCookie,
    clearAdminAuthCookies
} = require("../../helpers/adminCookieHelper");
const { sendSuccess, handleError } = require("../../helpers/responseHelper");

const AdminAuthController = {
    register: async (req, res) => {
        try {
            const payload = registerAdminSchema.parse(req.body || {});
            const result = await AdminAuthService.register(payload);

            return sendSuccess(
                res,
                result,
                "Admin registered. Verify email before logging in.",
                201
            );
        } catch (error) {
            return handleError(error, res);
        }
    },

    login: async (req, res) => {
        try {
            const payload = loginAdminSchema.parse(req.body || {});
            const result = await AdminAuthService.login(payload);

            if (result?.otpRequired) {
                return sendSuccess(
                    res,
                    {
                        otpRequired: true,
                        email: result.email
                    },
                    result.message || "OTP verification is required.",
                    202
                );
            }

            setAdminAccessTokenCookie(res, result.accessToken);

            return sendSuccess(
                res,
                { admin: result.admin },
                "Admin login successful"
            );
        } catch (error) {
            return handleError(error, res);
        }
    },

    verifyLoginOtp: async (req, res) => {
        try {
            const payload = verifyAdminLoginOtpSchema.parse(req.body || {});
            const result = await AdminAuthService.verifyLoginOtp(payload);

            setAdminAccessTokenCookie(res, result.accessToken);

            return sendSuccess(
                res,
                { admin: result.admin },
                "Admin login successful"
            );
        } catch (error) {
            return handleError(error, res);
        }
    },

    logout: async (_req, res) => {
        clearAdminAuthCookies(res);
        return sendSuccess(res, null, "Admin logged out successfully");
    },

    me: async (req, res) => {
        try {
            const result = await AdminAuthService.getMe(req.admin._id);
            return sendSuccess(res, result);
        } catch (error) {
            return handleError(error, res);
        }
    },

    forgotPassword: async (req, res) => {
        try {
            const payload = forgotAdminPasswordSchema.parse(req.body || {});
            const result = await AdminAuthService.forgotPassword(payload);
            return sendSuccess(res, null, result.message);
        } catch (error) {
            return handleError(error, res);
        }
    },

    requestVerificationByEmail: async (req, res) => {
        try {
            const payload = requestAdminVerificationSchema.parse(req.body || {});
            const result = await AdminAuthService.requestVerificationByEmail(payload);
            return sendSuccess(res, null, result.message);
        } catch (error) {
            return handleError(error, res);
        }
    },

    resetPassword: async (req, res) => {
        try {
            const payload = resetAdminPasswordSchema.parse({
                ...(req.body || {}),
                token: req.params?.token
            });
            const result = await AdminAuthService.resetPassword(payload);
            return sendSuccess(res, null, result.message);
        } catch (error) {
            return handleError(error, res);
        }
    },

    sendVerificationEmail: async (req, res) => {
        try {
            const result = await AdminAuthService.sendVerificationEmail(req.admin._id);
            return sendSuccess(res, null, result.message);
        } catch (error) {
            return handleError(error, res);
        }
    },

    verifyEmail: async (req, res) => {
        try {
            const parsed = verifyAdminEmailSchema.parse({
                token: req.params?.token || req.body?.token
            });
            const result = await AdminAuthService.verifyEmail(parsed.token);
            return sendSuccess(res, null, result.message);
        } catch (error) {
            return handleError(error, res);
        }
    }
};

module.exports = AdminAuthController;
