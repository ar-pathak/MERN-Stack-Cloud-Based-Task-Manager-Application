const mongoose = require('mongoose');
const {createProjectSchema, updateProjectSchema } = require('./project.validation');
const projectController = {
    createProject: async (req, res) => {
        try {
            const { workspaceId } = req.params;
            const data = createProjectSchema.parse(req.body);
            const userId = req.user.id;

            const project = await projectService.createProject({ ...data, workspaceId, userId});
            res.status(201).json(project);
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