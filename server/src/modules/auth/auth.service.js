const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const User = require("../../models/user");
const RefreshToken = require('../../models/RefreshToken')
const { generateAccessToken, generateRefreshToken } = require('../utils/Token')

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
      refreshToken
    };
  },
  logOut: async (token) => {
    if (token) {
      await RefreshToken.deleteOne({ token });
    }
    return ({ message: "Logged out successfully" });
  },
  refresh: async (token) => {
    try {

      if (!token) throw new Error("No refresh token");

      // Verify JWT signature
      const decoded = jwt.verify(token, process.env.REFRESH_SECRET);

      // Check DB
      const storedToken = await RefreshToken.findOne({ token });
      if (!storedToken) {
        throw new Error("Invalid refresh token");
      }

      // OPTIONAL: rotate refresh token
      await RefreshToken.deleteOne({ token });

      const newAccessToken = generateAccessToken(decoded.id);
      const newRefreshToken = generateRefreshToken(decoded.id);

      await RefreshToken.create({
        user: decoded.id,
        token: newRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      throw new Error(error)
    }
  }
};

module.exports = AuthService;