
const projectController = {
    createProject: async (req, res) => {
        try {
            const { workspaceId } = req.params;
            
        } catch (error) {
            res.status(400).json({ error: error.message })
        }
    },
    getProjectsByWorkspace: async (req, res) => {
        try {

        } catch (error) {
            res.status(400).json({ error: error.message })
        }
    },
    getProjectById: async (req, res) => {
        try {

        } catch (error) {
            res.status(400).json({ error: error.message })
        }
    },
    updateProject: async (req, res) => {
        try {

        } catch (error) {
            res.status(400).json({ error: error.message })
        }
    },
    deleteProject: async (req, res) => {
        try {

        } catch (error) {
            res.status(400).json({ error: error.message })
        }
    },
}

module.exports = projectController;