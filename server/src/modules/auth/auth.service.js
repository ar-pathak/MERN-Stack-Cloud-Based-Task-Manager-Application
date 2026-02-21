const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const User = require("../../models/user");
const RefreshToken = require('../../models/RefreshToken')
const { generateAccessToken, generateRefreshToken } = require('../../helpers/tokenHelper')
const sendEmail = require('../../helpers/sendEmail');
const generateUniqueUsername = require('../utils/generateUniqueUsername');

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RESET_PASSWORD_TTL_MS = 60 * 60 * 1000;
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const BCRYPT_SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;

const createAuthError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const normalizeBaseUrl = (value) => String(value || "").trim().replace(/\/+$/, "");
const getBackendBaseUrl = () => normalizeBaseUrl(process.env.BACKEND_URL)
  || `http://localhost:${process.env.PORT || 3000}`;

const OAUTH_PROVIDER_FIELDS = {
  google: "googleId",
  github: "githubId"
};

const OAUTH_PROVIDER_LABELS = {
  google: "Google",
  github: "GitHub"
};

const hashToken = (value) =>
  crypto.createHash('sha256').update(String(value || '')).digest('hex');

const refreshTokenLookupCandidates = (token) => [hashToken(token), token];

const persistRefreshToken = async (userId, rawToken) => {
  await RefreshToken.create({
    user: userId,
    token: hashToken(rawToken),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });
};

const deleteRefreshTokenByRawValue = async (token) => {
  if (!token) return;

  await RefreshToken.deleteMany({
    token: { $in: refreshTokenLookupCandidates(token) }
  });
};

const getOAuthProviderField = (provider) => OAUTH_PROVIDER_FIELDS[provider] || null;
const getOAuthProviderLabel = (provider) => OAUTH_PROVIDER_LABELS[provider] || "OAuth";

const getOAuthProviderConfig = (provider) => {
  if (provider === "google") {
    return {
      clientId: String(process.env.GOOGLE_CLIENT_ID || "").trim(),
      clientSecret: String(process.env.GOOGLE_CLIENT_SECRET || "").trim(),
      callbackUrl: normalizeBaseUrl(process.env.GOOGLE_CALLBACK_URL)
        || `${getBackendBaseUrl()}/api/auth/oauth/google/callback`,
      authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      userInfoUrl: "https://www.googleapis.com/oauth2/v3/userinfo"
    };
  }

  if (provider === "github") {
    return {
      clientId: String(process.env.GITHUB_CLIENT_ID || "").trim(),
      clientSecret: String(process.env.GITHUB_CLIENT_SECRET || "").trim(),
      callbackUrl: normalizeBaseUrl(process.env.GITHUB_CALLBACK_URL)
        || `${getBackendBaseUrl()}/api/auth/oauth/github/callback`,
      authorizationUrl: "https://github.com/login/oauth/authorize",
      tokenUrl: "https://github.com/login/oauth/access_token",
      userInfoUrl: "https://api.github.com/user",
      userEmailsUrl: "https://api.github.com/user/emails"
    };
  }

  throw createAuthError("Unsupported OAuth provider", 400);
};

const ensureOAuthConfig = (provider) => {
  const config = getOAuthProviderConfig(provider);
  if (!config.clientId || !config.clientSecret || !config.callbackUrl) {
    throw createAuthError(`${getOAuthProviderLabel(provider)} OAuth is not configured`, 500);
  }
  return config;
};

const ensureFetchAvailable = () => {
  if (typeof fetch !== "function") {
    throw createAuthError("Global fetch API is unavailable in this Node.js runtime", 500);
  }
};

const readJsonResponse = async (response) => {
  try {
    return await response.json();
  } catch (_error) {
    return {};
  }
};

const assertOAuthHttpResponse = async (response, provider) => {
  const payload = await readJsonResponse(response);

  if (!response.ok) {
    const providerMessage = payload?.error_description
      || payload?.error
      || payload?.message
      || payload?.error?.message;
    const fallbackMessage = `${getOAuthProviderLabel(provider)} OAuth request failed`;
    throw createAuthError(
      providerMessage ? `${fallbackMessage}: ${providerMessage}` : fallbackMessage,
      502
    );
  }

  return payload;
};

const toAuthUserPayload = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  username: user.username
});

const issueAuthTokensForUser = async (user) => {
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  await RefreshToken.deleteMany({ user: user._id });
  await persistRefreshToken(user._id, refreshToken);

  return {
    accessToken,
    refreshToken,
    user: toAuthUserPayload(user)
  };
};

const deriveNameFromEmail = (email) => {
  const [localPart] = String(email || "").split("@");
  const fallback = localPart || "Aurora User";
  return fallback.slice(0, 50);
};

const resolveOAuthUser = async ({ provider, providerId, email, name, avatar }) => {
  const providerField = getOAuthProviderField(provider);
  if (!providerField) {
    throw createAuthError("Unsupported OAuth provider", 400);
  }

  const normalizedProviderId = String(providerId || "").trim();
  if (!normalizedProviderId) {
    throw createAuthError(`${getOAuthProviderLabel(provider)} did not return a valid account ID`, 400);
  }

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw createAuthError(`${getOAuthProviderLabel(provider)} account did not return an email address`, 400);
  }

  const sanitizedName = String(name || "").trim();
  const sanitizedAvatar = String(avatar || "").trim();

  let user = await User.findOne({ [providerField]: normalizedProviderId });

  if (!user) {
    user = await User.findOne({ email: normalizedEmail });
    if (user) {
      user[providerField] = normalizedProviderId;
      if (!user.emailVerified) {
        user.emailVerified = true;
      }
      if (!user.name && sanitizedName) {
        user.name = sanitizedName.slice(0, 50);
      }
      if (!user.avatar && sanitizedAvatar) {
        user.avatar = sanitizedAvatar;
      }
      await user.save({ validateBeforeSave: false });
    } else {
      const username = await generateUniqueUsername(normalizedEmail);
      user = new User({
        name: sanitizedName ? sanitizedName.slice(0, 50) : deriveNameFromEmail(normalizedEmail),
        email: normalizedEmail,
        username,
        avatar: sanitizedAvatar,
        emailVerified: true,
        [providerField]: normalizedProviderId
      });
      await user.save({ validateBeforeSave: false });
    }
  }

  if (user.accountStatus !== "active") {
    throw createAuthError("Account is not active", 403);
  }

  return user;
};

const AuthService = {
  signUp: async ({ name, email, password }) => {
    const normalizedEmail = normalizeEmail(email);

    //  Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw createAuthError("Email already registered", 409);
    }

    //  Hash password
    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    //GENERATE UNIQUE USERNAME
    const username = await generateUniqueUsername(normalizedEmail);
    //  Create user
    const user = new User({
      name: String(name || "").trim(),
      email: normalizedEmail,
      username,
      passwordHash: hashedPassword,
    });

    //  Save to DB
    await user.save();
    return issueAuthTokensForUser(user);
  },
  logIn: async ({ email, password }) => {
    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail }).select("+passwordHash +loginAttempts +lockUntil");

    if (!user) {
      throw createAuthError("Invalid email or password", 401);
    }

    if (user.accountStatus !== "active") {
      throw createAuthError("Account is not active", 403);
    }

    if (!user.passwordHash) {
      throw createAuthError("This account uses social login. Continue with Google or GitHub.", 400);
    }

    if (user.lockUntil && user.lockUntil < Date.now()) {
      await user.resetLoginAttempts();
      user.loginAttempts = 0;
      user.lockUntil = undefined;
    }

    if (user.isLocked) {
      const unlockInMs = user.lockUntil.getTime() - Date.now();
      const unlockInMinutes = Math.max(1, Math.ceil(unlockInMs / (60 * 1000)));
      throw createAuthError(
        `Account is temporarily locked. Try again in ${unlockInMinutes} minute${unlockInMinutes === 1 ? "" : "s"}.`,
        423
      );
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      await user.incLoginAttempts();
      throw createAuthError("Invalid email or password", 401);
    }

    if (user.loginAttempts > 0 || user.lockUntil) {
      await user.resetLoginAttempts();
    }

    return issueAuthTokensForUser(user);
  },
  getOAuthAuthorizationUrl: (provider, state) => {
    const normalizedProvider = String(provider || "").trim().toLowerCase();
    const normalizedState = String(state || "").trim();

    if (!normalizedState) {
      throw createAuthError("Missing OAuth state", 400);
    }

    const config = ensureOAuthConfig(normalizedProvider);
    const url = new URL(config.authorizationUrl);

    if (normalizedProvider === "google") {
      url.searchParams.set("client_id", config.clientId);
      url.searchParams.set("redirect_uri", config.callbackUrl);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("scope", "openid email profile");
      url.searchParams.set("state", normalizedState);
      url.searchParams.set("access_type", "online");
      url.searchParams.set("prompt", "select_account");
      return url.toString();
    }

    if (normalizedProvider === "github") {
      url.searchParams.set("client_id", config.clientId);
      url.searchParams.set("redirect_uri", config.callbackUrl);
      url.searchParams.set("scope", "read:user user:email");
      url.searchParams.set("state", normalizedState);
      url.searchParams.set("allow_signup", "true");
      return url.toString();
    }

    throw createAuthError("Unsupported OAuth provider", 400);
  },
  exchangeOAuthCodeForProfile: async (provider, code) => {
    ensureFetchAvailable();
    const normalizedProvider = String(provider || "").trim().toLowerCase();
    const normalizedCode = String(code || "").trim();

    if (!normalizedCode) {
      throw createAuthError("Missing OAuth authorization code", 400);
    }

    const config = ensureOAuthConfig(normalizedProvider);

    if (normalizedProvider === "google") {
      const tokenResponse = await fetch(config.tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          code: normalizedCode,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: config.callbackUrl,
          grant_type: "authorization_code"
        })
      });

      const tokenPayload = await assertOAuthHttpResponse(tokenResponse, normalizedProvider);
      const accessToken = String(tokenPayload?.access_token || "").trim();
      if (!accessToken) {
        throw createAuthError("Google OAuth token exchange failed", 502);
      }

      const profileResponse = await fetch(config.userInfoUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json"
        }
      });

      const profilePayload = await assertOAuthHttpResponse(profileResponse, normalizedProvider);
      if (!profilePayload?.sub) {
        throw createAuthError("Google account ID is missing in OAuth response", 502);
      }
      if (!profilePayload?.email) {
        throw createAuthError("Google account did not return an email address", 400);
      }
      if (profilePayload?.email_verified === false) {
        throw createAuthError("Google account email is not verified", 403);
      }

      return {
        providerId: String(profilePayload.sub),
        email: profilePayload.email,
        name: profilePayload.name || "",
        avatar: profilePayload.picture || ""
      };
    }

    if (normalizedProvider === "github") {
      const tokenResponse = await fetch(config.tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json"
        },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code: normalizedCode,
          redirect_uri: config.callbackUrl
        })
      });

      const tokenPayload = await assertOAuthHttpResponse(tokenResponse, normalizedProvider);
      if (tokenPayload?.error) {
        throw createAuthError(tokenPayload.error_description || "GitHub OAuth authorization failed", 400);
      }

      const accessToken = String(tokenPayload?.access_token || "").trim();
      if (!accessToken) {
        throw createAuthError("GitHub OAuth token exchange failed", 502);
      }

      const githubHeaders = {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "Aurora-App"
      };

      const [profileResponse, emailsResponse] = await Promise.all([
        fetch(config.userInfoUrl, { headers: githubHeaders }),
        fetch(config.userEmailsUrl, { headers: githubHeaders })
      ]);

      const profilePayload = await assertOAuthHttpResponse(profileResponse, normalizedProvider);
      const emailPayload = await assertOAuthHttpResponse(emailsResponse, normalizedProvider);
      const verifiedEmail = Array.isArray(emailPayload)
        ? (
          emailPayload.find((entry) => entry?.primary && entry?.verified)
          || emailPayload.find((entry) => entry?.verified)
        )
        : null;

      const fallbackEmail = String(profilePayload?.email || "").trim();
      const resolvedEmail = verifiedEmail?.email
        || (!Array.isArray(emailPayload) || emailPayload.length === 0 ? fallbackEmail : "");

      if (!resolvedEmail) {
        throw createAuthError("GitHub account did not return a usable email address", 400);
      }

      if (!profilePayload?.id) {
        throw createAuthError("GitHub account ID is missing in OAuth response", 502);
      }

      return {
        providerId: String(profilePayload.id),
        email: resolvedEmail,
        name: profilePayload.name || profilePayload.login || "",
        avatar: profilePayload.avatar_url || ""
      };
    }

    throw createAuthError("Unsupported OAuth provider", 400);
  },
  logInWithOAuth: async ({ provider, profile }) => {
    const normalizedProvider = String(provider || "").trim().toLowerCase();
    const user = await resolveOAuthUser({
      provider: normalizedProvider,
      providerId: profile?.providerId,
      email: profile?.email,
      name: profile?.name,
      avatar: profile?.avatar
    });

    return issueAuthTokensForUser(user);
  },
  logOut: async (token, userId) => {
    try {
      // Delete the specific refresh token if provided
      if (token) {
        await deleteRefreshTokenByRawValue(token);
      }

      // If userId is provided, delete all refresh tokens for that user (logout from all devices)
      // This is useful for security - if user wants to logout from all devices
      if (userId) {
        await RefreshToken.deleteMany({ user: userId });
      }

      return { message: "Logged out successfully" };
    } catch (error) {
      // Even if token deletion fails, return success to ensure cookies are cleared
      return { message: "Logged out successfully" };
    }
  },
  refresh: async (token) => {
    try {
      if (!token) {
        throw createAuthError("No refresh token provided", 401);
      }

      // Verify JWT signature
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.REFRESH_SECRET);
      } catch (jwtError) {
        if (jwtError.name === 'TokenExpiredError') {
          // Clean up expired token from DB
          await deleteRefreshTokenByRawValue(token);
          throw createAuthError("Refresh token expired. Please login again.", 403);
        }
        throw createAuthError("Invalid refresh token", 403);
      }

      // Check if token exists in DB and is not expired
      const storedToken = await RefreshToken.findOne({
        token: { $in: refreshTokenLookupCandidates(token) }
      });
      if (!storedToken) {
        throw createAuthError("Refresh token not found or already used", 403);
      }

      // Check if token is expired (additional check beyond JWT expiration)
      if (storedToken.expiresAt < new Date()) {
        await RefreshToken.deleteOne({ _id: storedToken._id });
        throw createAuthError("Refresh token expired. Please login again.", 403);
      }

      if (String(storedToken.user) !== String(decoded.id)) {
        await RefreshToken.deleteOne({ _id: storedToken._id });
        throw createAuthError("Invalid refresh token", 403);
      }

      // Verify user still exists
      const user = await User.findById(decoded.id).select("accountStatus");
      if (!user || user.accountStatus !== "active") {
        await RefreshToken.deleteMany({ user: decoded.id });
        throw createAuthError("User account is not active", 403);
      }

      // Rotate refresh token (delete old, create new)
      await RefreshToken.deleteOne({ _id: storedToken._id });

      // Generate new tokens
      const newAccessToken = generateAccessToken(decoded.id);
      const newRefreshToken = generateRefreshToken(decoded.id);

      // Store new refresh token hash
      await persistRefreshToken(decoded.id, newRefreshToken);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      // Re-throw with proper error message
      throw error instanceof Error ? error : createAuthError(error.message || "Token refresh failed", 403);
    }
  },
  forgotPassword: async ({ email }) => {
    const normalizedEmail = normalizeEmail(email);

    // 1. Find user by email
    const user = await User.findOne({ email: normalizedEmail });

    // Don't reveal if email exists or not (security best practice)
    if (!user || user.accountStatus !== "active") {
      // Still return success to prevent email enumeration
      return { message: "If that email exists, we've sent a password reset link." };
    }

    // 2. Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // 3. Save token and expiration (1 hour from now)
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + RESET_PASSWORD_TTL_MS;
    await user.save({ validateBeforeSave: false });

    // 4. Send email with reset link
    try {
      await sendEmail({
        to: user.email,
        subject: 'Reset Your Password - Task Manager',
        token: resetToken,
        type: 'reset-password'
      });

      return { message: "If that email exists, we've sent a password reset link." };
    } catch (error) {
      // If email fails, remove the token
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save({ validateBeforeSave: false });

      throw createAuthError("Email could not be sent. Please try again later.", 500);
    }
  },
  resetPassword: async ({ token, password }) => {
    // 1. Hash the token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // 2. Find user with valid token and not expired
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    }).select('+resetPasswordToken +resetPasswordExpires +loginAttempts +lockUntil');

    if (!user) {
      throw createAuthError("Invalid or expired reset token", 400);
    }

    // 3. Hash new password
    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // 4. Update password and clear reset token fields
    user.passwordHash = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    // 5. Invalidate all refresh tokens for security
    await RefreshToken.deleteMany({ user: user._id });

    return { message: "Password has been reset successfully" };
  },
  sendVerificationEmail: async (userId) => {
    const user = await User.findById(userId)
      .select("+emailVerificationToken +emailVerificationExpires email emailVerified accountStatus");

    if (!user) {
      throw createAuthError("User not found", 404);
    }

    if (user.accountStatus !== "active") {
      throw createAuthError("Account is not active", 403);
    }

    if (user.emailVerified) {
      return { message: "Email is already verified." };
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = hashToken(verificationToken);
    user.emailVerificationExpires = Date.now() + EMAIL_VERIFICATION_TTL_MS;

    await user.save({ validateBeforeSave: false });

    try {
      await sendEmail({
        to: user.email,
        subject: 'Verify Your Email - Task Manager',
        token: verificationToken,
        type: 'email-verification'
      });
    } catch (error) {
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      await user.save({ validateBeforeSave: false });
      throw createAuthError("Verification email could not be sent. Please try again later.", 500);
    }

    return { message: "Verification email sent successfully." };
  },
  verifyEmail: async (token) => {
    const hashedToken = hashToken(token);

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() }
    }).select("+emailVerificationToken +emailVerificationExpires emailVerified");

    if (!user) {
      throw createAuthError("Invalid or expired verification token", 400);
    }

    if (!user.emailVerified) {
      user.emailVerified = true;
    }
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return { message: "Email verified successfully." };
  }
};

module.exports = AuthService;
