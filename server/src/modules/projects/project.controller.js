const mongoose = require('mongoose');
const projectService = require('./project.service')
const { createProjectSchema, updateProjectSchema } = require('./project.validation');
const projectController = {
    createProject: async (req, res) => {
        try {
            const { workspaceId } = req.params;
            const data = createProjectSchema.parse(req.body);
            const userId = req.user.id;

            const project = await projectService.createProject({
                data,
                workspaceId,
                userId
            });

            res.status(201).json(project);
        } catch (error) {
            res.status(400).json({ error: error.message })
        }
    },
    getProjectsByWorkspace: async (req, res) => {
        try {
            const { workspaceId } = req.params
            if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
                throw new Error('Invalid workspace ID');
            }
            const project = await projectService.getProjectsByWorkspace(workspaceId);
            res.status(200).json(project);
        } catch (error) {
            res.status(400).json({ error: error.message })
        }
    },
    getProjectById: async (req, res) => {
        try {
            const { projectId } = req.params
            if (!mongoose.Types.ObjectId.isValid(projectId)) {
                throw new Error('Invalid Workspace ID')
            }
            const project = await projectService.getProjectById(projectId)
            res.status(200).json(project);

        } catch (error) {
            res.status(400).json({ error: error.message })
        }
    },
    updateProject: async (req, res) => {
        try {
            const { projectId } = req.params;
            if (!mongoose.Types.ObjectId.isValid(projectId)) {
                throw new Error('Invalid Project ID');
            }
            const updateData = updateProjectSchema.parse(req.body);

            await projectService.updateProject(projectId, updateData);
            res.status(201).json({ message: 'project updated successfully' })
        } catch (error) {
            res.status(400).json({ error: error.message })
        }
    },
    deleteProject: async (req, res) => {
        try {
            const { projectId } = req.params;
            if (!mongoose.Types.ObjectId.isValid(projectId)) {
                throw new Error('Invalid Project ID')
            }
            await projectService.deleteProject(projectId)
            res.status(200).json({ message: "Project deleted successfully" })

        } catch (error) {
            res.status(400).json({ error: error.message })
        }
    },
}

module.exports = projectController;