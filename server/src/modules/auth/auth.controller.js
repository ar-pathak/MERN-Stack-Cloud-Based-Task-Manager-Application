const {
    signupSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    verifyEmailSchema
} = require('./auth.validation')
const AuthService = require('./auth.service')
const {
    setAccessTokenCookie,
    setRefreshTokenCookie,
    clearAuthCookies
} = require('../../helpers/cookieHelper')
const { sendSuccess, handleError } = require('../../helpers/responseHelper')

const AuthController = {
    signUp: async (req, res) => {
        try {
            const data = signupSchema.parse(req.body);
            const result = await AuthService.signUp(data);
            setAccessTokenCookie(res, result.accessToken);
            setRefreshTokenCookie(res, result.refreshToken);

            return sendSuccess(
                res,
                {
                    user: {
                        id: result.user._id,
                        username: result.user.username,
                        name: result.user.name,
                        email: result.user.email
                    }
                },
                'User registered successfully',
                201
            );
        } catch (error) {
            return handleError(error, res);
        }
    },
    logIn: async (req, res) => {
        try {
            const data = loginSchema.parse(req.body);
            const result = await AuthService.logIn(data);

            setAccessTokenCookie(res, result.accessToken);
            setRefreshTokenCookie(res, result.refreshToken);

            return sendSuccess(
                res,
                {
                    user: {
                        id: result.user._id,
                        name: result.user.name,
                        email: result.user.email,
                        username: result.user.username
                    }
                },
                "Login successful"
            );

        } catch (error) {
            return handleError(error, res);
        }
    },
    logOut: async (req, res) => {
        try {
            const token = req.cookies?.refreshToken;
            const userId = req.user?._id; // Get user from auth middleware if available

            // Always clear cookies first
            clearAuthCookies(res);

            // Then try to delete refresh token (non-blocking)
            try {
                await AuthService.logOut(token, userId);
            } catch (tokenError) {
                // Log error but don't fail the logout
                console.error("Error deleting refresh token:", tokenError.message);
            }

            return res.status(200).json({
                success: true,
                message: "Logged out successfully"
            });
        } catch (error) {
            // Always clear cookies even on error
            clearAuthCookies(res);
            return res.status(200).json({
                success: true,
                message: "Logged out successfully"
            });
        }
    },
    refresh: async (req, res) => {
        const token = req.cookies.refreshToken;
        if (!token) {
            return res.status(401).json({
                success: false,
                message: "No refresh token provided"
            });
        }

        try {
            const result = await AuthService.refresh(token);
            setAccessTokenCookie(res, result.accessToken);
            setRefreshTokenCookie(res, result.refreshToken);

            return res.status(200).json({
                success: true,
                message: "Token refreshed successfully"
            });

        } catch (error) {
            clearAuthCookies(res); // Clear invalid tokens
            return res.status(403).json({
                success: false,
                message: error.message
            });
        }
    },
    forgotPassword: async (req, res) => {
        try {
            const data = forgotPasswordSchema.parse(req.body);
            const result = await AuthService.forgotPassword(data);

            // Always return success message (security: don't reveal if email exists)
            return sendSuccess(res, null, result.message || "If that email exists, we've sent a password reset link.");
        } catch (error) {
            return handleError(error, res);
        }
    },
    resetPassword: async (req, res) => {
        try {
            const { token } = req.params;
            const { password } = resetPasswordSchema.parse({ ...req.body, token });

            const result = await AuthService.resetPassword({ token, password });

            return sendSuccess(res, null, result.message || "Password has been reset successfully");
        } catch (error) {
            return handleError(error, res);
        }
    },
    sendVerificationEmail: async (req, res) => {
        try {
            const result = await AuthService.sendVerificationEmail(req.user._id);
            return sendSuccess(res, null, result.message || "Verification email sent successfully.");
        } catch (error) {
            return handleError(error, res);
        }
    },
    verifyEmail: async (req, res) => {
        try {
            const token = req.params?.token || req.body?.token;
            const parsed = verifyEmailSchema.parse({ token });
            const result = await AuthService.verifyEmail(parsed.token);
            return sendSuccess(res, null, result.message || "Email verified successfully.");
        } catch (error) {
            return handleError(error, res);
        }
    }
}


module.exports = AuthController;
