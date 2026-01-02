const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const User = require("../../models/user");
const RefreshToken = require('../../models/RefreshToken')
const { generateAccessToken, generateRefreshToken } = require('../../helpers/tokenHelper')
const sendEmail = require('../../helpers/sendEmail')

const AuthService = {
  signUp: async ({ name, email, password }) => {
    // 1. Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error("Email already registered");
    }

    // 2. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Create user
    const user = new User({
      name,
      email,
      passwordHash: hashedPassword,
    });

    // 4. Save to DB
    await user.save();

    return user;
  },
  logIn: async ({ email, password }) => {
    const user = await User.findOne({ email }).select("+passwordHash");

    if (!user) {
      throw new Error("Invalid email or password");
    }
    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      throw new Error("Invalid email or password");
    }
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    //Invalidate old tokens on login
    await RefreshToken.deleteMany({ user: user._id });

    // Store refresh token in DB
    await RefreshToken.create({
      user: user._id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return {
      accessToken,
      refreshToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email
      }
    };
  },
  logOut: async (token, userId) => {
    try {
      // Delete the specific refresh token if provided
      if (token) {
        await RefreshToken.deleteOne({ token });
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
        throw new Error("No refresh token provided");
      }

      // Verify JWT signature
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.REFRESH_SECRET);
      } catch (jwtError) {
        if (jwtError.name === 'TokenExpiredError') {
          // Clean up expired token from DB
          await RefreshToken.deleteOne({ token });
          throw new Error("Refresh token expired. Please login again.");
        }
        throw new Error("Invalid refresh token");
      }

      // Check if token exists in DB and is not expired
      const storedToken = await RefreshToken.findOne({ token });
      if (!storedToken) {
        throw new Error("Refresh token not found or already used");
      }

      // Check if token is expired (additional check beyond JWT expiration)
      if (storedToken.expiresAt < new Date()) {
        await RefreshToken.deleteOne({ token });
        throw new Error("Refresh token expired. Please login again.");
      }

      // Verify user still exists
      const user = await User.findById(decoded.id);
      if (!user) {
        await RefreshToken.deleteOne({ token });
        throw new Error("User not found");
      }

      // Rotate refresh token (delete old, create new)
      await RefreshToken.deleteOne({ token });

      // Generate new tokens
      const newAccessToken = generateAccessToken(decoded.id);
      const newRefreshToken = generateRefreshToken(decoded.id);

      // Store new refresh token
      await RefreshToken.create({
        user: decoded.id,
        token: newRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      // Re-throw with proper error message
      throw error instanceof Error ? error : new Error(error.message || "Token refresh failed");
    }
  },
  forgotPassword: async ({ email }) => {
    // 1. Find user by email
    const user = await User.findOne({ email });
    
    // Don't reveal if email exists or not (security best practice)
    if (!user) {
      // Still return success to prevent email enumeration
      return { message: "If that email exists, we've sent a password reset link." };
    }

    // 2. Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // 3. Save token and expiration (1 hour from now)
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save({ validateBeforeSave: false });

    // 4. Send email with reset link
    try {
      const resetURL = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/home/auth/reset-password/${resetToken}`;
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

      throw new Error("Email could not be sent. Please try again later.");
    }
  },
  resetPassword: async ({ token, password }) => {
    // 1. Hash the token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // 2. Find user with valid token and not expired
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    }).select('+resetPasswordToken +resetPasswordExpires');

    if (!user) {
      throw new Error("Invalid or expired reset token");
    }

    // 3. Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Update password and clear reset token fields
    user.passwordHash = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // 5. Invalidate all refresh tokens for security
    await RefreshToken.deleteMany({ user: user._id });

    return { message: "Password has been reset successfully" };
  }
};

module.exports = AuthService;