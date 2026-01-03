
const Workspace = require('../../models/workspace');
const WorkspaceMember = require('../../models/workspaceMember');
const WorkspaceInvite = require('../../models/workspaceInvite');
const sendMail = require('../../helpers/sendEmail')

const workspaceService = {
    createWorkspace: async ({ name, description, ownerId }) => {
        const workspace = await Workspace.create({
            name,
            description,
            createdBy: ownerId
        });

        // Auto-add creator as OWNER
        await WorkspaceMember.create({
            workspace: workspace._id,
            user: ownerId,
            role: "owner"
        });

        return workspace;
    }
    ,
    getAllWorkspaces: async (userId) => {
        const members = await WorkspaceMember
            .find({ user: userId })
            .populate({
                path: 'workspace',
                select: '_id name createdAt'
            });

        const workspaces = members
            .map(m => m.workspace)
            .filter(Boolean);

        return workspaces;
    },
    getWorkspaceById: async (id) => {
        //logic to get a workspace by id
        const workspace = await Workspace.findById(id);
        if (!workspace) {
            throw new Error('Workspace not found');
        }
        return workspace;
    },
    updateWorkspace: async (id, data) => {
        //logic to update a workspace
        const updatedWorkspace = await Workspace.findByIdAndUpdate(id, data, { new: true });
        if (!updatedWorkspace) {
            throw new Error('Workspace not found or update failed');
        }
        return updatedWorkspace;
    },
    deleteWorkspace: async (id) => {
        //logic to delete a workspace
        const deletedWorkspace = await Workspace.findByIdAndDelete(id);
        if (!deletedWorkspace) {
            throw new Error('Workspace not found or delete failed');
        }
    },
    addMember: async ({ workspaceId, userId }) => {
        const exists = await WorkspaceMember.findOne({
            workspace: workspaceId,
            user: userId
        });

        if (exists) {
            throw new Error("User already exists in workspace");
        }

        return await WorkspaceMember.create({
            workspace: workspaceId,
            user: userId,
            role: "member"
        });
    },
    getMembers: async (workspaceId) => {
        const members = await WorkspaceMember.find({ workspace: workspaceId }).populate('user', 'name email');
        if (!members) {
            throw new Error("No members found for this workspace");
        }
        return members;
    },
    removeMember: async ({ workspaceId, memberId }) => {
        const result = await WorkspaceMember.findOneAndDelete({
            workspace: workspaceId,
            user: memberId
        })
        if (!result) {
            throw new Error("Member not found in workspace");
        }
    },
    updateMemberRole: async ({ workspaceId, memberId, role }) => {
        const result = await WorkspaceMember.findOneAndUpdate({
            workspace: workspaceId,
            user: memberId
        },
            { role: role },
            { new: true }
        )
        if (!result) {
            throw new Error("Member not found in workspace or update failed")
        }
        return result;
    },
    sendInvite: async ({ workspaceId, email, role, invitedBy }) => {
        // logic to send invite 
        const token = require('crypto').randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
        const isExistingInvite = await WorkspaceInvite.findOne({ workspace: workspaceId, email: email, status: "pending" });
        if (isExistingInvite) {
            throw new Error("An invite has already been sent to this email for the workspace");
        }
        const existingMember = await WorkspaceMember.findOne({ workspace: workspaceId, email: email });
        if (existingMember) {
            throw new Error("User is already a member of the workspace");
        }

        const invite = await WorkspaceInvite.create({
            workspace: workspaceId,
            email,
            role,
            invitedBy,
            token,
            expiresAt
        })
        // Here we would normally send an email with the invite link containing the token
        sendMail({
            to: email,
            subject: "Workspace Invite",
            token
        })

        return invite;
    },
    acceptInvite: async (token, userId) => {
        const invite = await WorkspaceInvite.findOne({ token: token, status: "pending" });
        if (!invite) {
            throw new Error('Invalid or expired invite token');
        }
        const member = await WorkspaceMember.findOne({ email: invite.email, workspace: invite.workspace });
        if (member) {
            throw new Error('User is already a member of the workspace');
        }
        await WorkspaceMember.create({
            workspace: invite.workspace,
            user: userId,
            role: invite.role
        })
        invite.status = "accepted";
        await invite.save();
        return invite.status;
    }

}

module.exports = workspaceService