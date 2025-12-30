const workspaceService = require('./workspace.service')
const { createWorkspaceSchema, updateWorkspaceSchema } = require('./workspace.validation');

const workspaceController = {
    createWorkspace: async (req, res) => {
        try {
            console.log(req.user._id);

            const userId = req.user._id;

            const data = createWorkspaceSchema.parse(req.body);

            const workspace = await workspaceService.createWorkspace({
                ...data,
                ownerId: userId
            });

            res.status(201).json(workspace);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },
    getAllWorkspaces: (req, res) => {
        res.send("get all workspaces")
    },
    getWorkspaceById: (req, res) => {
        res.send("get workspace by id")
    },
    updateWorkspace: (req, res) => {
        res.send("update workspace")
    },
    deleteWorkspace: (req, res) => {
        res.send("delete workspace")
    }
}

module.exports = workspaceController;