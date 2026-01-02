const mongoose = require('mongoose');
const userService = require('./user.service')
const userController = {
    gerUserInfo: async (req, res) => {
        try {
            const userId = req.user._id;
            if (!mongoose.Types.ObjectId.isValid(userId)) {
                throw new Error('Invalid user ID')
            }
            const user = await userService.getUserInfo(userId);
            res.status(200).json(user);

        } catch (error) {
            res.status(400).json({ error: error.message })
        }
    }
}

module.exports = userController;