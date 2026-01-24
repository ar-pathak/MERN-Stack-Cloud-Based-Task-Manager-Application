const mongoose = require('mongoose');
const workspaceService = require('./workspace.service');
const {
    createWorkspaceSchema,
    updateWorkspaceSchema,
    updateMemberRoleSchema,
    sendInviteSchema,
    addMemberSchema
} = require('./workspace.validation');
const { sendSuccess, handleError } = require('../../helpers/responseHelper');

const workspaceController = {
    createWorkspace: async (req, res) => {
        try {
            const userId = req.user._id;
            const data = createWorkspaceSchema.parse(req.body);

            const workspace = await workspaceService.createWorkspace({
                ...data,
                ownerId: userId
            });

            return sendSuccess(res, workspace, 'Workspace created successfully', 201);
        } catch (error) {
            return handleError(error, res);
        }
    },

    getAllWorkspaces: async (req, res) => {
        try {
            const userId = req.user._id;
            const workspaces = await workspaceService.getAllWorkspaces(userId);
            return sendSuccess(res, workspaces, 'Workspaces retrieved successfully');
        } catch (error) {
            return handleError(error, res);
        }
    },

    getWorkspaceById: async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.user._id;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid workspace ID'
                });
            }

            const workspace = await workspaceService.getWorkspaceById(id, userId);
            return sendSuccess(res, workspace, 'Workspace retrieved successfully');
        } catch (error) {
            return handleError(error, res);
        }
    },

    updateWorkspace: async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.user._id;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid workspace ID'
                });
            }

            const data = updateWorkspaceSchema.parse(req.body);
            const updatedWorkspace = await workspaceService.updateWorkspace(id, data, userId);
            return sendSuccess(res, updatedWorkspace, 'Workspace updated successfully');
        } catch (error) {
            return handleError(error, res);
        }
    },

    deleteWorkspace: async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.user._id;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid workspace ID'
                });
            }

            await workspaceService.deleteWorkspace(id, userId);
            return sendSuccess(res, null, 'Workspace deleted successfully');
        } catch (error) {
            return handleError(error, res);
        }
    },

    addMember: async (req, res) => {
        try {
            const { workspaceId } = req.params;
            const data = addMemberSchema.parse(req.body);

            if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid workspace ID"
                });
            }

            if (!mongoose.Types.ObjectId.isValid(data.userId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid user ID"
                });
            }

            const member = await workspaceService.addMember({
                workspaceId,
                userId: data.userId
            });
            return sendSuccess(res, member, 'Member added successfully', 201);
        } catch (error) {
            return handleError(error, res);
        }
    },

    removeMember: async (req, res) => {
        try {
            const { workspaceId, memberId } = req.params;
            const requesterId = req.user._id;

            if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid workspace ID"
                });
            }

            if (!mongoose.Types.ObjectId.isValid(memberId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid member ID"
                });
            }

            await workspaceService.removeMember({ workspaceId, memberId, requesterId });
            return sendSuccess(res, null, "Member removed successfully");
        } catch (error) {
            return handleError(error, res);
        }
    },

    updateMemberRole: async (req, res) => {
        try {
            const { workspaceId, memberId } = req.params;
            const requesterId = req.user._id;
            const { role } = updateMemberRoleSchema.parse(req.body);

            if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid workspace ID"
                });
            }

            if (!mongoose.Types.ObjectId.isValid(memberId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid member ID"
                });
            }

            const result = await workspaceService.updateMemberRole({
                workspaceId,
                memberId,
                role,
                requesterId
            });
            return sendSuccess(res, result, "Member role updated successfully");
        } catch (error) {
            return handleError(error, res);
        }
    },

    getMembers: async (req, res) => {
        try {
            const { workspaceId } = req.params;

            if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid workspace ID"
                });
            }

            const members = await workspaceService.getMembers(workspaceId);
            return sendSuccess(res, members, 'Members retrieved successfully');
        } catch (error) {
            return handleError(error, res);
        }
    },

    sendInvite: async (req, res) => {
        try {
            const { workspaceId } = req.params;
            const { email, role } = sendInviteSchema.parse(req.body);

            if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid workspace ID"
                });
            }

            const invite = await workspaceService.sendInvite({
                workspaceId,
                email,
                role,
                invitedBy: req.user._id
            });
            return sendSuccess(res, invite, 'Invite sent successfully', 201);
        } catch (error) {
            return handleError(error, res);
        }
    },

    acceptInvite: async (req, res) => {
        try {
            const { token } = req.params;

            if (!token || token.length !== 64) { // Token should be 64 hex characters
                return res.status(400).json({
                    success: false,
                    message: "Invalid invite token"
                });
            }

            const workspaceId = await workspaceService.acceptInvite(token, req.user._id);
            return sendSuccess(res, { workspaceId }, "Invite accepted successfully");
        } catch (error) {
            return handleError(error, res);
        }
    },

    leaveWorkspace: async (req, res) => {
        try {
            const { workspaceId } = req.params;
            const userId = req.user._id;

            if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid workspace ID"
                });
            }

            await workspaceService.leaveWorkspace({ workspaceId, userId });
            return sendSuccess(res, null, "Successfully left workspace");
        } catch (error) {
            return handleError(error, res);
        }
    },

    transferOwnership: async (req, res) => {
        try {
            const { workspaceId } = req.params;
            const { newOwnerId } = req.body;
            const currentOwnerId = req.user._id;

            if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid workspace ID"
                });
            }

            if (!mongoose.Types.ObjectId.isValid(newOwnerId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid user ID"
                });
            }

            await workspaceService.transferOwnership({
                workspaceId,
                newOwnerId,
                currentOwnerId
            });
            return sendSuccess(res, null, "Ownership transferred successfully");
        } catch (error) {
            return handleError(error, res);
        }
    }
};

module.exports = workspaceController;