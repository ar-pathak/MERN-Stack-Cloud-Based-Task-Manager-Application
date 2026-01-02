const { signupSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } = require('./auth.validation')
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
            return res.status(201).json({
                success: true,
                message: 'User registered successfully',
                data: {
                    user: {
                        id: result._id,
                        name: result.name,
                        email: result.email
                    }
                }
            });
        } catch (error) {
            return res.status(400).json({ 
                success: false,
                message: error.message 
            });
        }
    },
    logIn: async (req, res) => {
        try {
            const data = loginSchema.parse(req.body);
            const result = await AuthService.logIn(data);

            setAccessTokenCookie(res, result.accessToken);
            setRefreshTokenCookie(res, result.refreshToken);

            return res.status(200).json({ 
                success: true,
                message: "Login successful" 
            });

        } catch (error) {
            return res.status(400).json({ 
                success: false,
                message: error.message 
            });
        }
    },
    logOut: async (req, res) => {
        try {
            const token = req.cookies.refreshToken;
            await AuthService.logOut(token);
            clearAuthCookies(res);
            
            return res.status(200).json({ 
                success: true,
                message: "Logged out successfully" 
            });
        } catch (error) {
            clearAuthCookies(res); // Clear cookies even on error
            return res.status(400).json({ 
                success: false,
                message: error.message 
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
    }
}


module.exports = AuthController;