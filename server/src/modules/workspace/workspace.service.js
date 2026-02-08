const Workspace = require('../../models/workspace');
const WorkspaceMember = require('../../models/workspaceMember.js');
const WorkspaceInvite = require('../../models/workspaceInvite');
const User = require('../../models/user');
// Import necessary models for cascading operations
const Project = require('../../models/project');
const Team = require('../../models/team');
const Task = require('../../models/tasks');
const Subtask = require('../../models/subtasks');
// Import Chat and Message models
const Chat = require('../../models/chat');
const Message = require('../../models/message');

const sendMail = require('../../helpers/sendEmail');
const crypto = require('crypto');

// Helper function to remove a user from all workspace resources
// This is used for both leaveWorkspace and removeMember
const cleanupUserResources = async (workspaceId, userId, session = null) => {
    const opts = session ? { session } : {};

    // 1. Remove from Project Members
    await Project.updateMany(
        { workspace: workspaceId },
        { $pull: { members: { user: userId } } },
        opts
    );

    // 2. Remove from Team Members
    await Team.updateMany(
        { workspace: workspaceId },
        { $pull: { members: { user: userId } } },
        opts
    );

    // 3. Remove from Task Assignees
    await Task.updateMany(
        { workspace: workspaceId },
        {
            $pull: {
                assignees: userId,
            }
        },
        opts
    );

    // 4. Remove from Subtask Assignments
    const tasks = await Task.find({ workspace: workspaceId }).select('_id').session(session || null);
    const taskIds = tasks.map(t => t._id);

    if (taskIds.length > 0) {
        await Subtask.updateMany(
            { task: { $in: taskIds } },
            { $pull: { assignedTo: userId } },
            opts
        );
    }

    // 5. Remove user from the Workspace Chat members list (UPDATED)
    const workspace = await Workspace.findById(workspaceId).session(session || null);
    if (workspace && workspace.chatId) {
        await Chat.findByIdAndUpdate(
            workspace.chatId,
            { $pull: { members: userId } },
            opts
        );
    }
};

const workspaceService = {
    createWorkspace: async ({ name, description, ownerId }) => {
        // 1. Create a Group Chat for the Workspace first (UPDATED)
        const chat = await Chat.create({
            type: "group",
            name: name, // Chat name same as Workspace name
            members: [ownerId],
            admin: ownerId,
            // You can add a default avatar or system message here if needed
        });

        // 2. Create Workspace with chatId (UPDATED)
        const workspace = await Workspace.create({
            name,
            description,
            createdBy: ownerId,
            chatId: chat._id
        });

        // Auto-add creator as OWNER
        await WorkspaceMember.create({
            workspace: workspace._id,
            user: ownerId,
            role: "owner"
        });

        return workspace;
    },

    getAllWorkspaces: async (userId) => {
        const members = await WorkspaceMember
            .find({ user: userId })
            .populate({
                path: 'workspace',
                select: '_id name description createdAt chatId' // Added chatId to select
            })
            .populate({
                path: 'user',
                select: 'name email'
            });

        const workspaces = members
            .map(m => ({
                ...m.workspace.toObject(),
                userRole: m.role,
                joinedAt: m.joinedAt
            }))
            .filter(Boolean);

        return workspaces;
    },

    getWorkspaceById: async (id, userId) => {
        const workspace = await Workspace.findById(id);
        if (!workspace) {
            throw new Error('Workspace not found');
        }

        const member = await WorkspaceMember.findOne({
            workspace: id,
            user: userId
        });

        if (!member) {
            throw new Error('You do not have access to this workspace');
        }

        return {
            ...workspace.toObject(),
            userRole: member.role
        };
    },

    updateWorkspace: async (id, data, userId) => {
        const member = await WorkspaceMember.findOne({
            workspace: id,
            user: userId,
            role: { $in: ['owner', 'admin'] }
        });

        if (!member) {
            throw new Error('Only workspace owners and admins can update workspace details');
        }

        const updatedWorkspace = await Workspace.findByIdAndUpdate(
            id,
            data,
            { new: true, runValidators: true }
        );

        // If name is updated, update the Chat name as well (UPDATED)
        if (data.name && updatedWorkspace.chatId) {
            await Chat.findByIdAndUpdate(updatedWorkspace.chatId, {
                name: data.name
            });
        }

        if (!updatedWorkspace) {
            throw new Error('Workspace not found or update failed');
        }

        return updatedWorkspace;
    },

    deleteWorkspace: async (id, userId) => {
        const member = await WorkspaceMember.findOne({
            workspace: id,
            user: userId,
            role: 'owner'
        });

        if (!member) {
            throw new Error('Only workspace owner can delete the workspace');
        }

        const workspace = await Workspace.findById(id); // Fetch workspace to get chatId

        const session = await WorkspaceMember.startSession();
        session.startTransaction();

        try {
            const tasks = await Task.find({ workspace: id }).select('_id').session(session);
            const taskIds = tasks.map(t => t._id);

            if (taskIds.length > 0) {
                await Subtask.deleteMany({ task: { $in: taskIds } }, { session });
            }

            await Task.deleteMany({ workspace: id }, { session });
            await Project.deleteMany({ workspace: id }, { session });
            await Team.deleteMany({ workspace: id }, { session });
            await WorkspaceMember.deleteMany({ workspace: id }, { session });
            await WorkspaceInvite.deleteMany({ workspace: id }, { session });

            // 7. Delete the Workspace Chat and its Messages (UPDATED)
            if (workspace.chatId) {
                // Delete all messages in this chat
                await Message.deleteMany({ chatId: workspace.chatId }, { session });
                // Delete the chat itself
                await Chat.findByIdAndDelete(workspace.chatId, { session });
            }

            const deletedWorkspace = await Workspace.findByIdAndDelete(id, { session });

            if (!deletedWorkspace) {
                throw new Error('Workspace not found');
            }

            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    },

    addMember: async ({ workspaceId, userId, username, email, role = 'member' }) => {
        let user = null;

        if (userId) {
            user = await User.findById(userId);
        } else if (email) {
            user = await User.findOne({ email: email.toLowerCase() });
        } else if (username) {
            user = await User.findOne({ username });
        }

        if (!user) {
            throw new Error("User not found");
        }

        const exists = await WorkspaceMember.findOne({
            workspace: workspaceId,
            user: user._id
        });

        if (exists) {
            throw new Error("User is already a member of this workspace");
        }

        const member = await WorkspaceMember.create({
            workspace: workspaceId,
            user: user._id,
            role: role
        });

        // Add user to Workspace Chat (UPDATED)
        const workspace = await Workspace.findById(workspaceId);
        if (workspace && workspace.chatId) {
            await Chat.findByIdAndUpdate(workspace.chatId, {
                $addToSet: { members: user._id }
            });
        }

        return await member.populate('user', 'name email');
    },

    getMembers: async (workspaceId) => {
        const members = await WorkspaceMember
            .find({ workspace: workspaceId })
            .populate('user', 'name email isOnline')
            .sort({ role: 1, joinedAt: 1 });

        return members;
    },

    removeMember: async ({ workspaceId, memberId, requesterId }) => {
        const memberToRemove = await WorkspaceMember.findOne({
            workspace: workspaceId,
            user: memberId
        });

        if (!memberToRemove) {
            throw new Error("Member not found in workspace");
        }

        if (memberToRemove.role === 'owner') {
            throw new Error("Cannot remove workspace owner. Transfer ownership first.");
        }

        const requester = await WorkspaceMember.findOne({
            workspace: workspaceId,
            user: requesterId
        });

        if (memberId === requesterId.toString() && requester.role !== 'owner') {
            throw new Error("You cannot remove yourself. Please leave the workspace instead.");
        }

        const session = await WorkspaceMember.startSession();
        session.startTransaction();

        try {
            await WorkspaceMember.findOneAndDelete({
                workspace: workspaceId,
                user: memberId
            }, { session });

            // Calls cleanupUserResources which now includes Chat member removal (UPDATED)
            await cleanupUserResources(workspaceId, memberId, session);

            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    },

    updateMemberRole: async ({ workspaceId, memberId, role, requesterId }) => {
        const memberToUpdate = await WorkspaceMember.findOne({
            workspace: workspaceId,
            user: memberId
        });

        if (!memberToUpdate) {
            throw new Error("Member not found in workspace");
        }

        if (memberToUpdate.role === 'owner') {
            throw new Error("Cannot change owner role. Use transfer ownership instead.");
        }

        if (role === 'owner') {
            return await workspaceService.transferOwnership({
                workspaceId,
                newOwnerId: memberId,
                currentOwnerId: requesterId
            });
        }

        const result = await WorkspaceMember.findOneAndUpdate(
            {
                workspace: workspaceId,
                user: memberId
            },
            { role: role },
            { new: true }
        ).populate('user', 'name email');

        return result;
    },

    transferOwnership: async ({ workspaceId, newOwnerId, currentOwnerId }) => {
        const session = await WorkspaceMember.startSession();
        session.startTransaction();

        try {
            const currentOwner = await WorkspaceMember.findOne({
                workspace: workspaceId,
                user: currentOwnerId,
                role: 'owner'
            }).session(session);

            if (!currentOwner) {
                throw new Error("Only current owner can transfer ownership");
            }

            const newOwner = await WorkspaceMember.findOne({
                workspace: workspaceId,
                user: newOwnerId
            }).session(session);

            if (!newOwner) {
                throw new Error("New owner must be an existing workspace member");
            }

            await WorkspaceMember.findOneAndUpdate(
                { workspace: workspaceId, user: currentOwnerId },
                { role: 'admin' },
                { session }
            );

            await WorkspaceMember.findOneAndUpdate(
                { workspace: workspaceId, user: newOwnerId },
                { role: 'owner' },
                { session }
            );

            // Update Chat Admin (UPDATED)
            const workspace = await Workspace.findById(workspaceId).session(session);
            if (workspace && workspace.chatId) {
                await Chat.findByIdAndUpdate(
                    workspace.chatId,
                    { admin: newOwnerId },
                    { session }
                );
            }

            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    },

    sendInvite: async ({ workspaceId, email, role, invitedBy }) => {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            const existingMember = await WorkspaceMember.findOne({
                workspace: workspaceId,
                user: existingUser._id
            });
            if (existingMember) {
                throw new Error("User is already a member of this workspace");
            }
        }

        const existingInvite = await WorkspaceInvite.findOne({
            workspace: workspaceId,
            email: email.toLowerCase(),
            status: "pending",
            expiresAt: { $gt: new Date() }
        });

        if (existingInvite) {
            throw new Error("A pending invite has already been sent to this email");
        }

        const token = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const invite = await WorkspaceInvite.create({
            workspace: workspaceId,
            email: email.toLowerCase(),
            role: role || 'member',
            invitedBy,
            token: hashedToken,
            expiresAt
        });

        const workspace = await Workspace.findById(workspaceId);
        const inviter = await User.findById(invitedBy);

        await sendMail({
            to: email,
            subject: `Invitation to join ${workspace.name}`,
            html: `
                <p>${inviter.name} has invited you to join ${workspace.name}.</p>
                <p>Click the link below to accept:</p>
                <a href="${process.env.FRONTEND_URL}/invites/accept/${token}">Accept Invitation</a>
                <p>This invitation expires in 7 days.</p>
            `,
            token
        });

        return {
            ...invite.toObject(),
            token: undefined
        };
    },

    acceptInvite: async (token, userId) => {
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const invite = await WorkspaceInvite.findOne({
            token: hashedToken,
            status: "pending"
        });

        if (!invite) {
            throw new Error('Invalid or already used invite token');
        }

        if (invite.expiresAt < new Date()) {
            invite.status = "expired";
            await invite.save();
            throw new Error('Invite has expired');
        }

        const user = await User.findById(userId);
        if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
            throw new Error('This invite was sent to a different email address');
        }

        const existingMember = await WorkspaceMember.findOne({
            user: userId,
            workspace: invite.workspace
        });

        if (existingMember) {
            throw new Error('You are already a member of this workspace');
        }

        await WorkspaceMember.create({
            workspace: invite.workspace,
            user: userId,
            role: invite.role
        });

        // Add user to Workspace Chat (UPDATED)
        const workspace = await Workspace.findById(invite.workspace);
        if (workspace && workspace.chatId) {
            await Chat.findByIdAndUpdate(workspace.chatId, {
                $addToSet: { members: userId }
            });
        }

        invite.status = "accepted";
        await invite.save();

        return workspace;
    },

    leaveWorkspace: async ({ workspaceId, userId }) => {
        const member = await WorkspaceMember.findOne({
            workspace: workspaceId,
            user: userId
        });

        if (!member) {
            throw new Error("You are not a member of this workspace");
        }

        if (member.role === 'owner') {
            const memberCount = await WorkspaceMember.countDocuments({
                workspace: workspaceId
            });

            if (memberCount > 1) {
                throw new Error("Owner must transfer ownership before leaving. Use deleteWorkspace to remove the workspace.");
            }
        }

        const session = await WorkspaceMember.startSession();
        session.startTransaction();

        try {
            await WorkspaceMember.findOneAndDelete({
                workspace: workspaceId,
                user: userId
            }, { session });

            // Calls cleanupUserResources which now includes Chat member removal (UPDATED)
            await cleanupUserResources(workspaceId, userId, session);

            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    },

    // ... (baaki ke functions: getQuickStatus, toggleStar, toggleMute, toggleArchive - Inme changes ki zaroorat nahi hai)
    getQuickStatus: async (workspaceId, userId) => {
        const member = await WorkspaceMember.findOne({
            workspace: workspaceId,
            user: userId
        }).select('isStarred isMuted status');

        if (!member) {
            throw new Error("You are not a member of this workspace");
        }

        return {
            isStarred: member.isStarred || false,
            isMuted: member.isMuted || false,
            isArchived: member.status === 'archived'
        };
    },

    toggleStar: async (workspaceId, userId) => {
        const member = await WorkspaceMember.findOne({
            workspace: workspaceId,
            user: userId
        });

        if (!member) {
            throw new Error("You are not a member of this workspace");
        }

        member.isStarred = !member.isStarred;
        await member.save();
        return member;
    },

    toggleMute: async (workspaceId, userId) => {
        const member = await WorkspaceMember.findOne({
            workspace: workspaceId,
            user: userId
        });

        if (!member) {
            throw new Error("You are not a member of this workspace");
        }

        member.isMuted = !member.isMuted;
        await member.save();
        return member;
    },

    toggleArchive: async (workspaceId, userId) => {
        const member = await WorkspaceMember.findOne({
            workspace: workspaceId,
            user: userId
        });

        if (!member) {
            throw new Error("You are not a member of this workspace");
        }

        member.status = member.status === 'active' ? 'archived' : 'active';
        await member.save();
        return member;
    },
};

module.exports = workspaceService;