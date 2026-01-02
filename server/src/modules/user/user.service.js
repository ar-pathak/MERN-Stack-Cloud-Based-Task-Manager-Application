const User = require('../../models/user');

const userService = {
    getUserInfo: async (userId) => {
        const user = await User.findById(userId)
            .select("-password -refreshToken -__v");

        if (!user) {
            throw new Error("User not found");
        }

        return user;
    }
};

module.exports = userService;
