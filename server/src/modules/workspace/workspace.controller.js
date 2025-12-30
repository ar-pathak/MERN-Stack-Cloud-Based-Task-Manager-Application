const mongoose = require('mongoose');
const workspaceService = require('./workspace.service')
const { createWorkspaceSchema, updateWorkspaceSchema } = require('./workspace.validation');

const workspaceController = {
    createWorkspace: async (req, res) => {
        try {
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
    getAllWorkspaces: async (req, res) => {
        try {
            const userId = req.user._id;
            const workspaces = await workspaceService.getAllWorkspaces(userId);

            res.status(201).json(workspaces);

        } catch (error) {
            res.status(400).json({ error: error.message })
        }
    },
    getWorkspaceById: async (req, res) => {
        try {
            const id = req.params.id;
            if (!mongoose.Types.ObjectId.isValid(id)) {
                throw new Error('Invalid workspace ID');
            }
            const workspace = await workspaceService.getWorkspaceById(id);
            res.status(201).json(workspace);
        } catch (error) {
            res.status(400).json({ error: error.message })
        }
    },
    updateWorkspace: async (req, res) => {
        try {
            const id = req.params.id;
            if (!mongoose.Types.ObjectId.isValid(id)) {
                throw new Error('Invalid workspace ID');
            }

            const data = updateWorkspaceSchema.parse(req.body);
            const updatedWorkspace = await workspaceService.updateWorkspace(id, data);
            res.status(200).json(updatedWorkspace);

        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },
    deleteWorkspace: async (req, res) => {
        try {
            const id = req.params.id;
            if (!mongoose.Types.ObjectId.isValid(id)) {
                throw new Error('Invalid workspace ID')
            }
            const result = await workspaceService.deleteWorkspace(id);
            res.status(200).json({ message: 'Workspace deleted successfully' })
            
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
}

module.exports = workspaceController;