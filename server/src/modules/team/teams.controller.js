const mongoose = require('mongoose');
const teamsService = require('./teams.service');
const {
    createTeamSchema,
    updateTeamSchema,
    addTeamMemberSchema,
    updateTeamMemberRoleSchema
} = require('./teams.validation');
const { sendSuccess, handleError } = require('../../helpers/responseHelper');
const { parsePaginationQuery } = require('../../helpers/paginationHelper');

const teamController = {
    createTeam: async (req, res) => {
        try {
            const { workspaceId } = req.params;

            if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid workspace ID"
                });
            }

            const { name, description } = createTeamSchema.parse(req.body);
            const team = await teamsService.createTeam({
                name,
                description,
                workspaceId,
                userId: req.user._id
            });

            return sendSuccess(res, team, 'Team created successfully', 201);
        } catch (error) {
            return handleError(error, res);
        }
    },

    getTeamsByWorkspace: async (req, res) => {
        try {
            const { workspaceId } = req.params;

            if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid workspace ID"
                });
            }

            const pagination = parsePaginationQuery(req.query, {
                defaultLimit: 20,
                maxLimit: 100
            });
            const teams = await teamsService.getTeamsByWorkspace(workspaceId, pagination);
            return sendSuccess(res, teams, 'Teams retrieved successfully');
        } catch (error) {
            return handleError(error, res);
        }
    },

    getTeamById: async (req, res) => {
        try {
            const { workspaceId, teamId } = req.params;

            if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid workspace ID"
                });
            }

            if (!mongoose.Types.ObjectId.isValid(teamId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid team ID"
                });
            }

            const team = await teamsService.getTeamById(teamId, workspaceId);
            return sendSuccess(res, team, 'Team retrieved successfully');
        } catch (error) {
            return handleError(error, res);
        }
    },

    updateTeam: async (req, res) => {
        try {
            const { workspaceId, teamId } = req.params;

            if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid workspace ID"
                });
            }

            if (!mongoose.Types.ObjectId.isValid(teamId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid team ID"
                });
            }

            const data = updateTeamSchema.parse(req.body);
            const updatedTeam = await teamsService.updateTeam(teamId, workspaceId, data);

            return sendSuccess(res, updatedTeam, 'Team updated successfully');
        } catch (error) {
            return handleError(error, res);
        }
    },

    deleteTeam: async (req, res) => {
        try {
            const { workspaceId, teamId } = req.params;

            if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid workspace ID"
                });
            }

            if (!mongoose.Types.ObjectId.isValid(teamId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid team ID"
                });
            }

            await teamsService.deleteTeam(teamId, workspaceId);
            return sendSuccess(res, null, 'Team deleted successfully');
        } catch (error) {
            return handleError(error, res);
        }
    },

    addTeamMember: async (req, res) => {
        try {
            const { workspaceId, teamId } = req.params;

            if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid workspace ID"
                });
            }

            if (!mongoose.Types.ObjectId.isValid(teamId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid team ID"
                });
            }

            const data = addTeamMemberSchema.parse(req.body);
            const team = await teamsService.addTeamMember(teamId, workspaceId, data, req.user._id);

            return sendSuccess(res, team, 'Member added to team successfully', 201);
        } catch (error) {
            return handleError(error, res);
        }
    },

    getTeamMembers: async (req, res) => {
        try {
            const { workspaceId, teamId } = req.params;

            if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid workspace ID"
                });
            }

            if (!mongoose.Types.ObjectId.isValid(teamId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid team ID"
                });
            }

            const members = await teamsService.getTeamMembers(teamId, workspaceId);
            return sendSuccess(res, members, 'Team members retrieved successfully');
        } catch (error) {
            return handleError(error, res);
        }
    },

    removeTeamMember: async (req, res) => {
        try {
            const { workspaceId, teamId, memberId } = req.params;

            if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid workspace ID"
                });
            }

            if (!mongoose.Types.ObjectId.isValid(teamId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid team ID"
                });
            }

            if (!mongoose.Types.ObjectId.isValid(memberId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid member ID"
                });
            }

            const result = await teamsService.removeTeamMember(teamId, workspaceId, memberId, req.user._id);
            return sendSuccess(res, result, 'Member removed from team successfully');
        } catch (error) {
            return handleError(error, res);
        }
    },

    updateTeamMemberRole: async (req, res) => {
        try {
            const { workspaceId, teamId, memberId } = req.params;

            if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid workspace ID"
                });
            }

            if (!mongoose.Types.ObjectId.isValid(teamId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid team ID"
                });
            }

            if (!mongoose.Types.ObjectId.isValid(memberId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid member ID"
                });
            }

            const { role } = updateTeamMemberRoleSchema.parse(req.body);
            const team = await teamsService.updateTeamMemberRole(
                teamId,
                workspaceId,
                memberId,
                role,
                req.user._id
            );

            return sendSuccess(res, team, 'Team member role updated successfully');
        } catch (error) {
            return handleError(error, res);
        }
    },
    leaveTeam: async (req, res) => {
        try {
            const { teamId } = req.params;
            const userId = req.user._id; // Logged in user

            if (!mongoose.Types.ObjectId.isValid(teamId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid team ID"
                });
            }

            const result = await teamsService.leaveTeam(teamId, userId);
            sendSuccess(res, null, result.message);
        } catch (error) {
            return handleError(error, res);
        }
    }
};

module.exports = teamController;
