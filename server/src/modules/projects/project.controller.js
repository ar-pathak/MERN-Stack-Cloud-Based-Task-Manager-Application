const mongoose = require('mongoose');
const projectService = require('./project.service')
const { createProjectSchema, updateProjectSchema, addProjectTeamsSchema, removeProjectTeamsSchema, addProjectMembersSchema, removeProjectMembersSchema, updateProjectMemberRoleSchema } = require('./project.validation');
const { sendSuccess, handleError } = require('../../helpers/responseHelper');

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
            return handleError(error, res)
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
            return handleError(error, res)
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
            return handleError(error, res)
        }
    },
    updateProject: async (req, res) => {
        try {
            const { projectId } = req.params;
            const userId = req.user._id;
            if (!mongoose.Types.ObjectId.isValid(projectId)) {
                throw new Error('Invalid Project ID');
            }
            const updateData = updateProjectSchema.parse(req.body);

            await projectService.updateProject(projectId, updateData, userId);
            res.status(201).json({ message: 'project updated successfully' })
        } catch (error) {
            return handleError(error, res)
        }
    }, updateProjectMemberRole: async (req, res) => {
        try {
            const { projectId, memberId } = req.params;
            const userId = req.user._id;

            if (!mongoose.Types.ObjectId.isValid(projectId) || !mongoose.Types.ObjectId.isValid(memberId)) {
                throw new Error("Invalid Project ID or Member ID");
            }

            const { role } = updateProjectMemberRoleSchema.parse(req.body);

            const result = await projectService.updateProjectMemberRole(projectId, memberId, role, userId);

            sendSuccess(res, null, result.message);
        } catch (error) {
            return handleError(error, res);
        }
    },
    deleteProject: async (req, res) => {
        try {
            const { projectId } = req.params;
            const userId = req.user._id;
            if (!mongoose.Types.ObjectId.isValid(projectId)) {
                throw new Error('Invalid Project ID')
            }
            await projectService.deleteProject(projectId, userId)
            res.status(200).json({ message: "Project deleted successfully" })

        } catch (error) {
            return handleError(error, res)
        }
    },
    getProjectTeams: async (req, res) => {
        try {
            const { projectId } = req.params
            if (!mongoose.Types.ObjectId.isValid(projectId)) {
                throw new Error('Invalid Project ID')
            }
            const teams = await projectService.getProjectTeams(projectId);
            sendSuccess(res, teams)
        } catch (error) {
            return handleError(error, res)
        }
    },
    addProjectTeams: async (req, res) => {
        try {
            const { projectId } = req.params;
            const userId = req.user._id;

            if (!mongoose.Types.ObjectId.isValid(projectId)) {
                throw new Error("Invalid Project ID");
            }

            const data = addProjectTeamsSchema.parse(req.body);

            const result = await projectService.addProjectTeams(projectId, data, userId);

            sendSuccess(res, null, result.message);
        } catch (error) {
            return handleError(error, res);
        }
    },
    removeProjectTeams: async (req, res) => {
        try {
            const { projectId } = req.params;
            const userId = req.user._id;

            if (!mongoose.Types.ObjectId.isValid(projectId)) {
                throw new Error("Invalid Project ID");
            }

            const data = removeProjectTeamsSchema.parse(req.body);

            const result = await projectService.removeProjectTeams(
                projectId,
                data,
                userId
            );

            sendSuccess(res, null, result.message);
        } catch (error) {
            return handleError(error, res);
        }
    },
    getProjectMembers: async (req, res) => {
        try {
            const { projectId } = req.params;

            if (!mongoose.Types.ObjectId.isValid(projectId)) {
                throw new Error("Invalid Project ID");
            }

            const members = await projectService.getProjectMembers(projectId);
            sendSuccess(res, members);
        } catch (error) {
            return handleError(error, res);
        }
    },

    addProjectMembers: async (req, res) => {
        try {
            const { projectId } = req.params;
            const userId = req.user._id;

            if (!mongoose.Types.ObjectId.isValid(projectId)) {
                throw new Error("Invalid Project ID");
            }

            const data = addProjectMembersSchema.parse(req.body);

            const result = await projectService.addProjectMembers(projectId, data, userId);
            sendSuccess(res, null, result.message);
        } catch (error) {
            return handleError(error, res);
        }
    },

    removeProjectMembers: async (req, res) => {
        try {
            const { projectId } = req.params;
            const userId = req.user._id;

            if (!mongoose.Types.ObjectId.isValid(projectId)) {
                throw new Error("Invalid Project ID");
            }

            const data = removeProjectMembersSchema.parse(req.body);

            const result = await projectService.removeProjectMembers(projectId, data, userId);
            sendSuccess(res, null, result.message);
        } catch (error) {
            return handleError(error, res);
        }
    },
    leaveProject: async (req, res) => {
        try {
            const { projectId } = req.params;
            const userId = req.user._id;

            if (!mongoose.Types.ObjectId.isValid(projectId)) {
                throw new Error("Invalid Project ID");
            }

            const result = await projectService.leaveProject(projectId, userId);
            sendSuccess(res, null, result.message);
        } catch (error) {
            return handleError(error, res);
        }
    }
}

module.exports = projectController;
