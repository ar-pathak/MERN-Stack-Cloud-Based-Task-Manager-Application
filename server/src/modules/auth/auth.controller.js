const { signupSchema, loginSchema } = require('./auth.validation')
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
    },
    logIn: async (req, res) => {
        try {
            const data = loginSchema.parse(req.body);
            const result = await AuthService.logIn(data);
            return res.json({ "msg": result })
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }
}


module.exports = AuthController;