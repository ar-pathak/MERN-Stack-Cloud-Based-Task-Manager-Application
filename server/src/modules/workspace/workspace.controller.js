const mongoose = require('mongoose');
const workspaceService = require('./workspace.service')
const { createWorkspaceSchema, updateWorkspaceSchema, updateMemberRoleSchema, sendInviteSchema } = require('./workspace.validation');
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
            const id = req.params.id;
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Invalid workspace ID' 
                });
            }
            const workspace = await workspaceService.getWorkspaceById(id);
            return sendSuccess(res, workspace, 'Workspace retrieved successfully');
        } catch (error) {
            return handleError(error, res);
        }
    },
    updateWorkspace: async (req, res) => {
        try {
            const id = req.params.id;
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Invalid workspace ID' 
                });
            }

            const data = updateWorkspaceSchema.parse(req.body);
            const updatedWorkspace = await workspaceService.updateWorkspace(id, data);
            return sendSuccess(res, updatedWorkspace, 'Workspace updated successfully');
        } catch (error) {
            return handleError(error, res);
        }
    },
    deleteWorkspace: async (req, res) => {
        try {
            const id = req.params.id;
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Invalid workspace ID' 
                });
            }
            await workspaceService.deleteWorkspace(id);
            return sendSuccess(res, null, 'Workspace deleted successfully');
        } catch (error) {
            return handleError(error, res);
        }
    },
    addMember: async (req, res) => {
        try {
            const { workspaceId } = req.params;
            const { userId } = req.body;

            if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
                return res.status(400).json({ 
                    success: false,
                    message: "Invalid workspace ID" 
                });
            }

            const member = await workspaceService.addMember({ workspaceId, userId });
            return sendSuccess(res, member, 'Member added successfully', 201);
        } catch (error) {
            return handleError(error, res);
        }
    },
    removeMember: async (req, res) => {
        try {
            const { workspaceId, memberId } = req.params;
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

            await workspaceService.removeMember({ workspaceId, memberId });
            return sendSuccess(res, null, "Member removed successfully");
        } catch (error) {
            return handleError(error, res);
        }
    },
    updateMemberRole: async (req, res) => {
        try {
            const { workspaceId, memberId } = req.params;
            const role = updateMemberRoleSchema.parse(req.body).role;

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

            await workspaceService.updateMemberRole({ workspaceId, memberId, role });
            return sendSuccess(res, null, "Member role updated successfully");
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
            const invite = await workspaceService.sendInvite({ workspaceId, email, role, invitedBy: req.user._id });
            return sendSuccess(res, invite, 'Invite sent successfully', 201);
        } catch (error) {
            return handleError(error, res);
        }
    },
    acceptInvite: async (req, res) => {
        try {
            const { token } = req.params;
            await workspaceService.acceptInvite(token, req.user._id);
            return sendSuccess(res, null, "Invite accepted successfully");
        } catch (error) {
            return handleError(error, res);
        }
    }
}

module.exports = workspaceController;