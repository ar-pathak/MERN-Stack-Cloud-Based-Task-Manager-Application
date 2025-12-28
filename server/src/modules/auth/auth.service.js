const bcrypt = require('bcrypt')
const User = require("../../models/user");

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

    return {
      message: "Login successful",
      userId: user._id,
    };
  }

};

module.exports = AuthService;
