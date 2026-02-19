const mongoose = require('mongoose');
const projectService = require('./project.service');
const {
    createProjectSchema,
    updateProjectSchema,
    addProjectTeamsSchema,
    removeProjectTeamsSchema,
    addProjectMembersSchema,
    removeProjectMembersSchema,
    updateProjectMemberRoleSchema,
    requestProjectStatusChangeSchema,
    respondProjectStatusChangeRequestSchema
} = require('./project.validation');
const { sendSuccess, handleError } = require('../../helpers/responseHelper');

const projectController = {
    createProject: async (req, res) => {
        try {
            const { workspaceId } = req.params;
            const userId = req.user._id;

            if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
                throw new Error('Invalid workspace ID');
            }

            const data = createProjectSchema.parse(req.body);
            const project = await projectService.createProject({ data, workspaceId, userId });
            return sendSuccess(res, project, 'Project created successfully', 201);
        } catch (error) {
            return handleError(error, res);
        }
    },

    getProjectsByWorkspace: async (req, res) => {
        try {
            const { workspaceId } = req.params;
            const userId = req.user._id;

            if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
                throw new Error('Invalid workspace ID');
            }

            const projects = await projectService.getProjectsByWorkspace(workspaceId, userId);
            return sendSuccess(res, projects, 'Projects retrieved successfully');
        } catch (error) {
            return handleError(error, res);
        }
    },

    getProjectById: async (req, res) => {
        try {
            const { projectId } = req.params;
            const userId = req.user._id;

            if (!mongoose.Types.ObjectId.isValid(projectId)) {
                throw new Error('Invalid project ID');
            }

            const project = await projectService.getProjectById(projectId, userId);
            return sendSuccess(res, project, 'Project retrieved successfully');
        } catch (error) {
            return handleError(error, res);
        }
    },

    updateProject: async (req, res) => {
        try {
            const { workspaceId, projectId } = req.params;
            const userId = req.user._id;

            if (!mongoose.Types.ObjectId.isValid(projectId)) {
                throw new Error('Invalid project ID');
            }

            const updateData = updateProjectSchema.parse(req.body);
            const project = await projectService.updateProject({
                projectId,
                workspaceId,
                updateData,
                userId
            });
            return sendSuccess(res, project, 'Project updated successfully');
        } catch (error) {
            return handleError(error, res);
        }
    },

    deleteProject: async (req, res) => {
        try {
            const { projectId } = req.params;
            const userId = req.user._id;

            if (!mongoose.Types.ObjectId.isValid(projectId)) {
                throw new Error('Invalid project ID');
            }

            const result = await projectService.deleteProject(projectId, userId);
            return sendSuccess(res, null, result.message);
        } catch (error) {
            return handleError(error, res);
        }
    },

    getProjectTeams: async (req, res) => {
        try {
            const { projectId } = req.params;
            const userId = req.user._id;

            if (!mongoose.Types.ObjectId.isValid(projectId)) {
                throw new Error('Invalid project ID');
            }

            const teams = await projectService.getProjectTeams(projectId, userId);
            return sendSuccess(res, teams, 'Teams retrieved successfully');
        } catch (error) {
            return handleError(error, res);
        }
    },

    addProjectTeams: async (req, res) => {
        try {
            const { projectId } = req.params;
            const userId = req.user._id;

            if (!mongoose.Types.ObjectId.isValid(projectId)) {
                throw new Error('Invalid project ID');
            }

            const data = addProjectTeamsSchema.parse(req.body);
            const result = await projectService.addProjectTeams(projectId, data, userId);
            return sendSuccess(res, null, result.message);
        } catch (error) {
            return handleError(error, res);
        }
    },

    removeProjectTeams: async (req, res) => {
        try {
            const { projectId } = req.params;
            const userId = req.user._id;

            if (!mongoose.Types.ObjectId.isValid(projectId)) {
                throw new Error('Invalid project ID');
            }

            const data = removeProjectTeamsSchema.parse(req.body);
            const result = await projectService.removeProjectTeams(projectId, data, userId);
            return sendSuccess(res, null, result.message);
        } catch (error) {
            return handleError(error, res);
        }
    },

    getProjectMembers: async (req, res) => {
        try {
            const { projectId } = req.params;
            const userId = req.user._id;

            if (!mongoose.Types.ObjectId.isValid(projectId)) {
                throw new Error('Invalid project ID');
            }

            const members = await projectService.getProjectMembers(projectId, userId);
            return sendSuccess(res, members, 'Members retrieved successfully');
        } catch (error) {
            return handleError(error, res);
        }
    },

    addProjectMembers: async (req, res) => {
        try {
            const { projectId } = req.params;
            const userId = req.user._id;

            if (!mongoose.Types.ObjectId.isValid(projectId)) {
                throw new Error('Invalid project ID');
            }

            const data = addProjectMembersSchema.parse(req.body);
            const result = await projectService.addProjectMembers(projectId, data, userId);
            return sendSuccess(res, null, result.message);
        } catch (error) {
            return handleError(error, res);
        }
    },

    removeProjectMembers: async (req, res) => {
        try {
            const { projectId } = req.params;
            const userId = req.user._id;

            if (!mongoose.Types.ObjectId.isValid(projectId)) {
                throw new Error('Invalid project ID');
            }

            const data = removeProjectMembersSchema.parse(req.body);
            const result = await projectService.removeProjectMembers(projectId, data, userId);
            return sendSuccess(res, null, result.message);
        } catch (error) {
            return handleError(error, res);
        }
    },

    updateProjectMemberRole: async (req, res) => {
        try {
            const { projectId, memberId } = req.params;
            const userId = req.user._id;

            if (!mongoose.Types.ObjectId.isValid(projectId) || !mongoose.Types.ObjectId.isValid(memberId)) {
                throw new Error('Invalid project ID or member ID');
            }

            const { role } = updateProjectMemberRoleSchema.parse(req.body);
            const result = await projectService.updateProjectMemberRole(projectId, memberId, role, userId);
            return sendSuccess(res, null, result.message);
        } catch (error) {
            return handleError(error, res);
        }
    },

    requestProjectStatusChange: async (req, res) => {
        try {
            const { workspaceId, projectId } = req.params;
            const userId = req.user._id;

            if (!mongoose.Types.ObjectId.isValid(workspaceId) || !mongoose.Types.ObjectId.isValid(projectId)) {
                throw new Error('Invalid workspace ID or project ID');
            }

            const data = requestProjectStatusChangeSchema.parse(req.body || {});
            const request = await projectService.requestProjectStatusChange({
                workspaceId,
                projectId,
                requestedStatus: data.status,
                note: data.note,
                userId
            });

            return sendSuccess(
                res,
                request,
                'Status change request sent to project admins',
                201
            );
        } catch (error) {
            return handleError(error, res);
        }
    },

    respondProjectStatusChangeRequest: async (req, res) => {
        try {
            const { workspaceId, projectId, requestId } = req.params;
            const userId = req.user._id;

            if (
                !mongoose.Types.ObjectId.isValid(workspaceId)
                || !mongoose.Types.ObjectId.isValid(projectId)
                || !mongoose.Types.ObjectId.isValid(requestId)
            ) {
                throw new Error('Invalid workspace ID, project ID, or request ID');
            }

            const { action } = respondProjectStatusChangeRequestSchema.parse(req.body || {});
            const result = await projectService.respondProjectStatusChangeRequest({
                workspaceId,
                projectId,
                requestId,
                action,
                userId
            });

            const message = action === "approve"
                ? "Status change request approved"
                : "Status change request rejected";

            return sendSuccess(res, result, message);
        } catch (error) {
            return handleError(error, res);
        }
    },

    leaveProject: async (req, res) => {
        try {
            const { projectId } = req.params;
            const userId = req.user._id;

            if (!mongoose.Types.ObjectId.isValid(projectId)) {
                throw new Error('Invalid project ID');
            }

            const result = await projectService.leaveProject(projectId, userId);
            return sendSuccess(res, null, result.message);
        } catch (error) {
            return handleError(error, res);
        }
    }
};

module.exports = projectController;
