const crypto = require('crypto')
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
    clearAuthCookies,
    getCookieOptions
} = require('../../helpers/cookieHelper')
const { sendSuccess, handleError } = require('../../helpers/responseHelper')

const OAUTH_STATE_COOKIE_NAME = "oauthState";
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const OAUTH_CALLBACK_PATH = "/home/auth/oauth/callback";

const normalizeBaseUrl = (value) => String(value || "").trim().replace(/\/+$/, "");
const getFirstConfiguredValue = (value) => (
    String(value || "")
        .split(",")
        .map((entry) => entry.trim())
        .find(Boolean) || ""
);
const getOAuthFrontendBaseUrl = () => (
    normalizeBaseUrl(process.env.OAUTH_FRONTEND_URL)
    || normalizeBaseUrl(getFirstConfiguredValue(process.env.FRONTEND_URL))
    || "http://localhost:5173"
);

const createControllerError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const sanitizeRedirectPath = (value) => {
    const candidate = String(value || "").trim();
    if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
        return "/main";
    }
    return candidate;
};

const encodeOAuthStatePayload = (payload) => {
    const serialized = JSON.stringify(payload);
    return Buffer.from(serialized, "utf8").toString("base64url");
};

const decodeOAuthStatePayload = (value) => {
    try {
        if (!value) return null;
        const decoded = Buffer.from(String(value), "base64url").toString("utf8");
        const parsed = JSON.parse(decoded);
        if (!parsed || typeof parsed !== "object") return null;
        return parsed;
    } catch (_error) {
        return null;
    }
};

const setOAuthStateCookie = (res, payload) => {
    const options = {
        ...getCookieOptions(),
        // OAuth callback arrives from a third-party domain and needs SameSite=Lax.
        sameSite: "lax",
        maxAge: OAUTH_STATE_TTL_MS
    };
    res.cookie(OAUTH_STATE_COOKIE_NAME, encodeOAuthStatePayload(payload), options);
};

const clearOAuthStateCookie = (res) => {
    const options = {
        ...getCookieOptions(),
        sameSite: "lax"
    };
    res.clearCookie(OAUTH_STATE_COOKIE_NAME, options);
};

const buildOAuthCallbackUrl = ({ status, provider, message, redirectPath }) => {
    const callbackUrl = new URL(`${getOAuthFrontendBaseUrl()}${OAUTH_CALLBACK_PATH}`);

    callbackUrl.searchParams.set("status", status === "success" ? "success" : "error");
    if (provider) {
        callbackUrl.searchParams.set("provider", String(provider));
    }
    if (message) {
        callbackUrl.searchParams.set("message", String(message));
    }
    const safeRedirectPath = sanitizeRedirectPath(redirectPath);
    callbackUrl.searchParams.set("redirect", safeRedirectPath);

    return callbackUrl.toString();
};

const redirectOAuthResult = (res, payload) => res.redirect(buildOAuthCallbackUrl(payload));

const parseOAuthStateCookie = (req) => decodeOAuthStatePayload(req?.cookies?.[OAUTH_STATE_COOKIE_NAME]);

const startOAuthFlow = (provider) => async (req, res) => {
    try {
        const redirectPath = sanitizeRedirectPath(req.query?.redirect);
        const statePayload = {
            value: crypto.randomBytes(24).toString("hex"),
            provider,
            redirectPath,
            createdAt: Date.now()
        };

        setOAuthStateCookie(res, statePayload);
        const authorizationUrl = AuthService.getOAuthAuthorizationUrl(provider, statePayload.value);
        return res.redirect(authorizationUrl);
    } catch (error) {
        clearOAuthStateCookie(res);
        clearAuthCookies(res);
        return redirectOAuthResult(res, {
            status: "error",
            provider,
            message: error?.message || "Unable to start OAuth flow",
            redirectPath: "/main"
        });
    }
};

const completeOAuthFlow = (provider) => async (req, res) => {
    const cookieState = parseOAuthStateCookie(req);
    const redirectPath = sanitizeRedirectPath(cookieState?.redirectPath);

    try {
        const queryState = String(req.query?.state || "").trim();
        const providerError = String(req.query?.error || "").trim();
        const providerErrorDescription = String(req.query?.error_description || "").trim();
        const code = String(req.query?.code || "").trim();

        if (!cookieState) {
            throw createControllerError("OAuth session expired. Please try again.", 400);
        }

        if (cookieState.provider !== provider) {
            throw createControllerError("OAuth provider mismatch. Please try again.", 400);
        }

        if (Date.now() - Number(cookieState.createdAt || 0) > OAUTH_STATE_TTL_MS) {
            throw createControllerError("OAuth session expired. Please try again.", 400);
        }

        if (!queryState || queryState !== cookieState.value) {
            throw createControllerError("OAuth state validation failed. Please try again.", 400);
        }

        if (providerError) {
            throw createControllerError(
                providerErrorDescription || `${provider} OAuth request was canceled`,
                400
            );
        }

        if (!code) {
            throw createControllerError("OAuth provider did not return an authorization code", 400);
        }

        const profile = await AuthService.exchangeOAuthCodeForProfile(provider, code);
        const result = await AuthService.logInWithOAuth({ provider, profile });

        setAccessTokenCookie(res, result.accessToken);
        setRefreshTokenCookie(res, result.refreshToken);
        clearOAuthStateCookie(res);

        return redirectOAuthResult(res, {
            status: "success",
            provider,
            redirectPath
        });
    } catch (error) {
        clearOAuthStateCookie(res);
        clearAuthCookies(res);
        return redirectOAuthResult(res, {
            status: "error",
            provider,
            message: error?.message || "OAuth sign-in failed",
            redirectPath
        });
    }
};

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
    },
    startGoogleOAuth: startOAuthFlow("google"),
    googleOAuthCallback: completeOAuthFlow("google"),
    startGitHubOAuth: startOAuthFlow("github"),
    githubOAuthCallback: completeOAuthFlow("github")
}


module.exports = AuthController;
