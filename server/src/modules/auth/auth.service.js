const User = require("../../models/user");

const AuthService = {
  signUp: async ({ name, email, password }) => {
    // 1. Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error("Email already registered");
    }

    // 2. Hash password
    // const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Create user
    const user = new User({
      name,
      email,
      password,
    });

    // 4. Save to DB
    await user.save();

    return user;
  },
};

module.exports = AuthService;
