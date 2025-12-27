const { signupSchema } = require('./auth.validation')
const AuthService = require('./auth.service')

const AuthController = {
    signUp: async (req, res) => {
        try {
            const data = signupSchema.parse(req.body);
            const result = await AuthService.signUp(data);
            return res.json(result);
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }
}


module.exports = AuthController;