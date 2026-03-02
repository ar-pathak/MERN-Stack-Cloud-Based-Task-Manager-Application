const { sendSuccess, handleError } = require("../../helpers/responseHelper");

module.exports = {
    uploadFile: async (req, res) => {
        try {
            if (!req.file && (!Array.isArray(req.files) || req.files.length === 0)) {
                return res.status(400).json({ success: false, message: "No file uploaded" });
            }

            // Handle Single File
            if (req.file) {
                return sendSuccess(res, {
                    url: req.file.path,
                    name: req.file.originalname,
                    type: req.file.mimetype,
                    size: req.file.size
                });
            }

            // Handle Multiple Files
            if (req.files && req.files.length > 0) {
                const filesData = req.files.map(file => ({
                    url: file.path,
                    name: file.originalname,
                    type: file.mimetype,
                    size: file.size
                }));
                return sendSuccess(res, filesData);
            }

            return res.status(400).json({ success: false, message: "No file uploaded" });
        } catch (error) {
            return handleError(error, res);
        }
    }
};
