const mongoose = require('mongoose');
const userService = require('./user.service');
const { sendSuccess, handleError } = require('../../helpers/responseHelper');

const userController = {
    gerUserInfo: async (req, res) => {
        try {
            const userId = req.user._id;
            if (!mongoose.Types.ObjectId.isValid(userId)) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Invalid user ID' 
                });
            }
            const user = await userService.getUserInfo(userId);
            return sendSuccess(res, { user }, 'User information retrieved successfully');
        } catch (error) {
            return handleError(error, res);
        }
    }
}

module.exports = userController;