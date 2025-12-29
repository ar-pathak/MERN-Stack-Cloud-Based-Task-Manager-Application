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

            res.cookie("accessToken", result.accessToken, {
                httpOnly: true,
                secure: true,
                sameSite: "strict",
                maxAge: 15 * 60 * 1000
            });

            res.cookie("refreshToken", result.refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: "strict",
                maxAge: 7 * 24 * 60 * 60 * 1000
            });

            return res.json({ message: "Login successful" });

        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    },
    logOut: async (req, res) => {
        try {

            const token = req.cookies.refreshToken;
            const result = await AuthService.logOut(token);
            res.clearCookie("accessToken");
            res.clearCookie("refreshToken");
            return res.json(result)
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    },
    refresh: async (req, res) => {
        const token = req.cookies.refreshToken;
        if (!token) return res.status(401).json({ message: "No refresh token" });

        try {
            const result = await AuthService.refresh(token);
            res.cookie("accessToken", result.accessToken, {
                httpOnly: true,
                secure: true,
                sameSite: "strict",
                maxAge: 15 * 60 * 1000
            });

            res.cookie("refreshToken", result.refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: "strict",
                maxAge: 7 * 24 * 60 * 60 * 1000
            });
            res.json({ message: "refresh token successful" });

        } catch (error) {
            return res.status(403).json({ message: error.message });
        }

    }
}


module.exports = AuthController;