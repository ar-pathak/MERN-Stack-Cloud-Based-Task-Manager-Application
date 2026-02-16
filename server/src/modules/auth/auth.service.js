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

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    await persistRefreshToken(user._id, refreshToken);

    return {
      accessToken,
      refreshToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        username: user.username
      }
    };
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

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    //Invalidate old tokens on login
    await RefreshToken.deleteMany({ user: user._id });

    // Store refresh token hash in DB
    await persistRefreshToken(user._id, refreshToken);

    return {
      accessToken,
      refreshToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        username: user.username
      }
    };
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
