const Workspace = require('../../models/workspace');
const WorkspaceMember = require('../../models/workspaceMember.js');
const WorkspaceInvite = require('../../models/workspaceInvite');
const User = require('../../models/user');
const sendMail = require('../../helpers/sendEmail');
const crypto = require('crypto');

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
    },

    getAllWorkspaces: async (userId) => {
        const members = await WorkspaceMember
            .find({ user: userId })
            .populate({
                path: 'workspace',
                select: '_id name description createdAt'
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

        // Check if user has access to this workspace
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
        // Check if user is owner or admin
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

        if (!updatedWorkspace) {
            throw new Error('Workspace not found or update failed');
        }

        return updatedWorkspace;
    },

    deleteWorkspace: async (id, userId) => {
        // Only owner can delete workspace
        const member = await WorkspaceMember.findOne({
            workspace: id,
            user: userId,
            role: 'owner'
        });

        if (!member) {
            throw new Error('Only workspace owner can delete the workspace');
        }

        // Delete all related data in a transaction
        const session = await WorkspaceMember.startSession();
        session.startTransaction();

        try {
            await WorkspaceMember.deleteMany({ workspace: id }, { session });
            await WorkspaceInvite.deleteMany({ workspace: id }, { session });
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

    addMember: async ({ workspaceId, userId }) => {
        // Validate user exists
        const user = await User.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }

        // Check if user is already a member
        const exists = await WorkspaceMember.findOne({
            workspace: workspaceId,
            user: userId
        });

        if (exists) {
            throw new Error("User is already a member of this workspace");
        }

        const member = await WorkspaceMember.create({
            workspace: workspaceId,
            user: userId,
            role: "member"
        });

        return await member.populate('user', 'name email');
    },

    getMembers: async (workspaceId) => {
        const members = await WorkspaceMember
            .find({ workspace: workspaceId })
            .populate('user', 'name email')
            .sort({ role: 1, joinedAt: 1 });

        return members;
    },

    removeMember: async ({ workspaceId, memberId, requesterId }) => {
        // Check if trying to remove the owner
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

        // Prevent self-removal by non-owners
        const requester = await WorkspaceMember.findOne({
            workspace: workspaceId,
            user: requesterId
        });

        if (memberId === requesterId.toString() && requester.role !== 'owner') {
            throw new Error("You cannot remove yourself. Please leave the workspace instead.");
        }

        await WorkspaceMember.findOneAndDelete({
            workspace: workspaceId,
            user: memberId
        });
    },

    updateMemberRole: async ({ workspaceId, memberId, role, requesterId }) => {
        // Cannot change owner role
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

        // If promoting to owner, transfer ownership
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
            // Verify current owner
            const currentOwner = await WorkspaceMember.findOne({
                workspace: workspaceId,
                user: currentOwnerId,
                role: 'owner'
            }).session(session);

            if (!currentOwner) {
                throw new Error("Only current owner can transfer ownership");
            }

            // Verify new owner is a member
            const newOwner = await WorkspaceMember.findOne({
                workspace: workspaceId,
                user: newOwnerId
            }).session(session);

            if (!newOwner) {
                throw new Error("New owner must be an existing workspace member");
            }

            // Demote current owner to admin
            await WorkspaceMember.findOneAndUpdate(
                { workspace: workspaceId, user: currentOwnerId },
                { role: 'admin' },
                { session }
            );

            // Promote new owner
            await WorkspaceMember.findOneAndUpdate(
                { workspace: workspaceId, user: newOwnerId },
                { role: 'owner' },
                { session }
            );

            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    },

    sendInvite: async ({ workspaceId, email, role, invitedBy }) => {
        // Check if email is already registered and is a member
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

        // Check for pending invites
        const existingInvite = await WorkspaceInvite.findOne({
            workspace: workspaceId,
            email: email.toLowerCase(),
            status: "pending",
            expiresAt: { $gt: new Date() }
        });

        if (existingInvite) {
            throw new Error("A pending invite has already been sent to this email");
        }

        // Generate secure token
        const token = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        const invite = await WorkspaceInvite.create({
            workspace: workspaceId,
            email: email.toLowerCase(),
            role: role || 'member',
            invitedBy,
            token: hashedToken, // Store hashed token
            expiresAt
        });

        // Get workspace name for email
        const workspace = await Workspace.findById(workspaceId);
        const inviter = await User.findById(invitedBy);

        // Send email with original token (not hashed)
        await sendMail({
            to: email,
            subject: `Invitation to join ${workspace.name}`,
            html: `
                <p>${inviter.name} has invited you to join ${workspace.name}.</p>
                <p>Click the link below to accept:</p>
                <a href="${process.env.FRONTEND_URL}/invites/accept/${token}">Accept Invitation</a>
                <p>This invitation expires in 7 days.</p>
            `,
            token // Pass unhashed token for email link
        });

        return {
            ...invite.toObject(),
            token: undefined // Don't return token in response
        };
    },

    acceptInvite: async (token, userId) => {
        // Hash the token to compare with stored hash
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const invite = await WorkspaceInvite.findOne({
            token: hashedToken,
            status: "pending"
        });

        if (!invite) {
            throw new Error('Invalid or already used invite token');
        }

        // Check expiration
        if (invite.expiresAt < new Date()) {
            invite.status = "expired";
            await invite.save();
            throw new Error('Invite has expired');
        }

        // Verify user email matches invite email
        const user = await User.findById(userId);
        if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
            throw new Error('This invite was sent to a different email address');
        }

        // Check if already a member
        const existingMember = await WorkspaceMember.findOne({
            user: userId,
            workspace: invite.workspace
        });

        if (existingMember) {
            throw new Error('You are already a member of this workspace');
        }

        // Add user to workspace
        await WorkspaceMember.create({
            workspace: invite.workspace,
            user: userId,
            role: invite.role
        });

        // Update invite status
        invite.status = "accepted";
        await invite.save();

        return invite.workspace;
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

        await WorkspaceMember.findOneAndDelete({
            workspace: workspaceId,
            user: userId
        });
    },
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

        // Toggle between 'active' and 'archived'
        member.status = member.status === 'active' ? 'archived' : 'active';
        await member.save();
        return member;
    },
};

module.exports = workspaceService;