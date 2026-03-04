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
const { logActivity, getUserLabel } = require('../utils/activityLogger');
const notificationService = require('../notification/notification.service');
const { syncWorkspaceChats } = require('../utils/chatMembershipSync');
const { toPaginationMeta } = require('../../helpers/paginationHelper');

const createError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
const normalizeBaseUrl = (value = '') => String(value || '').trim().replace(/\/+$/, "");
const getFirstConfiguredValue = (value = '') => (
    String(value || '')
        .split(',')
        .map((entry) => entry.trim())
        .find(Boolean) || ''
);
const FRONTEND_BASE_URL = normalizeBaseUrl(getFirstConfiguredValue(process.env.FRONTEND_URL))
    || "http://localhost:5173";

const normalizeEmail = (value = '') => String(value || '').trim().toLowerCase();

const syncWorkspaceChatsSafely = async (workspaceId) => {
    try {
        await syncWorkspaceChats(workspaceId);
    } catch (syncError) {
        console.error("workspace chat membership sync failed", syncError);
    }
};

const sanitizeInvite = (inviteDoc) => {
    if (!inviteDoc) return null;
    const invite = inviteDoc.toObject ? inviteDoc.toObject() : inviteDoc;
    if (Object.prototype.hasOwnProperty.call(invite, "token")) {
        delete invite.token;
    }
    return invite;
};

const parseCsvRow = (line = "") => {
    const values = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                current += '"';
                i += 1;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }

        if (char === "," && !inQuotes) {
            values.push(current.trim());
            current = "";
            continue;
        }

        current += char;
    }

    values.push(current.trim());
    return values;
};

const parseEmailsFromCsvBuffer = (buffer) => {
    if (!buffer) return [];

    const raw = String(buffer.toString("utf-8") || "").replace(/^\uFEFF/, "");
    const lines = raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    if (!lines.length) return [];

    const rows = lines.map((line) => parseCsvRow(line));
    const firstRow = rows[0] || [];
    const hasHeader = firstRow.some((value) => /^email$/i.test(String(value || "").trim()));

    const startIndex = hasHeader ? 1 : 0;
    const emails = new Set();

    for (let rowIndex = startIndex; rowIndex < rows.length; rowIndex += 1) {
        const row = rows[rowIndex] || [];
        row.forEach((value) => {
            const candidate = normalizeEmail(String(value || "").replace(/^['"]|['"]$/g, ""));
            if (EMAIL_REGEX.test(candidate)) {
                emails.add(candidate);
            }
        });
    }

    return Array.from(emails);
};

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

const createWorkspaceMembership = async ({ workspaceId, userId, role = "member", session = null }) => {
    const createOptions = session ? { session } : undefined;
    let member;

    if (createOptions) {
        const created = await WorkspaceMember.create([{
            workspace: workspaceId,
            user: userId,
            role
        }], createOptions);
        member = created[0];
    } else {
        member = await WorkspaceMember.create({
            workspace: workspaceId,
            user: userId,
            role
        });
    }

    const updateOptions = session ? { session } : undefined;
    const workspace = await Workspace.findById(workspaceId).select("name chatId");
    if (workspace?.chatId) {
        await Chat.findByIdAndUpdate(
            workspace.chatId,
            { $addToSet: { members: userId } },
            updateOptions
        );
    }

    return { member, workspace };
};

const createDirectInviteRequest = async ({
    workspaceId,
    role,
    invitedBy,
    invitee,
    workspace
}) => {
    const pendingInvite = await WorkspaceInvite.findOne({
        workspace: workspaceId,
        invitedUser: invitee._id,
        status: "pending",
        expiresAt: { $gt: new Date() }
    });

    if (pendingInvite) {
        throw createError("A pending workspace invite request already exists for this user", 409);
    }

    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_MS);
    const invite = await WorkspaceInvite.create({
        workspace: workspaceId,
        email: normalizeEmail(invitee.email),
        role: role || "member",
        invitedBy,
        invitedUser: invitee._id,
        inviteType: "direct_request",
        expiresAt
    });

    const inviterLabel = await getUserLabel(invitedBy);
    await notificationService.createNotifications({
        recipientIds: [invitee._id],
        actorId: invitedBy,
        title: "Workspace invite request",
        message: `${inviterLabel} invited you to join "${workspace?.name || "workspace"}" as ${role || "member"}.`,
        type: "member",
        category: "workspace",
        priority: "high",
        entityType: "workspace",
        entityId: workspaceId,
        workspaceId,
        link: "/main/notifications",
        metadata: {
            kind: "workspace_invite_request",
            inviteId: String(invite._id),
            workspaceId: String(workspaceId),
            workspaceName: workspace?.name || "",
            role: role || "member"
        },
        dedupeKey: `workspace:invite_request:${String(workspaceId)}:${String(invitee._id)}`
    });

    return invite;
};

const createEmailInvite = async ({
    workspaceId,
    email,
    role,
    invitedBy,
    workspace,
    inviter
}) => {
    const normalizedEmail = normalizeEmail(email);
    if (!EMAIL_REGEX.test(normalizedEmail)) {
        throw createError(`Invalid email address: ${email}`, 400);
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
        const existingMember = await WorkspaceMember.findOne({
            workspace: workspaceId,
            user: existingUser._id
        });
        if (existingMember) {
            throw createError(`${normalizedEmail} is already a workspace member`, 409);
        }
    }

    const existingInvite = await WorkspaceInvite.findOne({
        workspace: workspaceId,
        email: normalizedEmail,
        status: "pending",
        $or: [
            { inviteType: "email" },
            { inviteType: { $exists: false } }
        ],
        expiresAt: { $gt: new Date() }
    });

    if (existingInvite) {
        throw createError(`A pending invite already exists for ${normalizedEmail}`, 409);
    }

    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_MS);

    const invite = await WorkspaceInvite.create({
        workspace: workspaceId,
        email: normalizedEmail,
        role: role || 'member',
        invitedBy,
        inviteType: "email",
        token: hashedToken,
        expiresAt
    });

    await sendMail({
        to: normalizedEmail,
        subject: `Invitation to join ${workspace?.name || "a workspace"}`,
        html: `
            <p>${inviter?.name || inviter?.username || "A teammate"} has invited you to join ${workspace?.name || "their workspace"}.</p>
            <p>Click the link below to accept:</p>
            <a href="${FRONTEND_BASE_URL}/invites/accept/${token}">Accept Invitation</a>
            <p>This invitation expires in 7 days.</p>
        `,
        token
    });

    return sanitizeInvite(invite);
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

        const ownerLabel = await getUserLabel(ownerId);
        await logActivity({
            actorId: ownerId,
            action: "workspace.created",
            level: "workspace",
            workspaceId: workspace._id,
            chatId: workspace.chatId,
            message: `${ownerLabel} created workspace "${workspace.name}".`,
            meta: {
                workspaceName: workspace.name
            }
        });

        return workspace;
    },

    getAllWorkspaces: async (userId, pagination = {}) => {
        const filters = { user: userId };
        const query = WorkspaceMember
            .find({ user: userId })
            .select("workspace role joinedAt isStarred isMuted status")
            .populate({
                path: 'workspace',
                select: '_id name description createdAt updatedAt chatId'
            })
            .sort({ joinedAt: -1 })
            .lean();

        let members = [];
        let paginationMeta = null;

        if (pagination.enabled) {
            const [pagedMembers, total] = await Promise.all([
                query.clone()
                    .skip(pagination.skip)
                    .limit(pagination.limit)
                    .exec(),
                WorkspaceMember.countDocuments(filters)
            ]);
            members = pagedMembers;
            paginationMeta = toPaginationMeta({
                page: pagination.page,
                limit: pagination.limit,
                total
            });
        } else {
            members = await query.exec();
        }

        const workspaces = members
            .map((member) => ({
                ...(member.workspace || {}),
                userRole: member.role,
                joinedAt: member.joinedAt,
                isStarred: Boolean(member.isStarred),
                isMuted: Boolean(member.isMuted),
                membershipStatus: member.status || "active"
            }))
            .filter((workspace) => Boolean(workspace?._id));

        if (paginationMeta) {
            return {
                items: workspaces,
                pagination: paginationMeta
            };
        }

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

        const existingWorkspace = await Workspace.findById(id).select('name chatId');
        const updatedWorkspace = await Workspace.findByIdAndUpdate(
            id,
            data,
            { new: true, runValidators: true }
        );

        if (!updatedWorkspace) {
            throw new Error('Workspace not found or update failed');
        }

        // If name is updated, update the Chat name as well (UPDATED)
        if (data.name && updatedWorkspace.chatId) {
            await Chat.findByIdAndUpdate(updatedWorkspace.chatId, {
                name: data.name
            });
        }

        const actorLabel = await getUserLabel(userId);
        const oldName = existingWorkspace?.name || updatedWorkspace.name;
        const renamed = data.name && data.name !== oldName;
        const message = renamed
            ? `${actorLabel} renamed workspace from "${oldName}" to "${updatedWorkspace.name}".`
            : `${actorLabel} updated workspace "${updatedWorkspace.name}".`;

        await logActivity({
            actorId: userId,
            action: renamed ? "workspace.renamed" : "workspace.updated",
            level: "workspace",
            workspaceId: updatedWorkspace._id,
            chatId: updatedWorkspace.chatId,
            message,
            meta: {
                oldName,
                newName: updatedWorkspace.name
            }
        });

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

    addMember: async ({ workspaceId, userId, username, email, role = 'member', requesterId }) => {
        let user = null;

        if (userId) {
            user = await User.findById(userId).select("name username email preferences.workspace.autoApproveWorkspaceInvites");
        } else if (email) {
            user = await User.findOne({ email: normalizeEmail(email) }).select("name username email preferences.workspace.autoApproveWorkspaceInvites");
        } else if (username) {
            user = await User.findOne({ username: String(username || "").trim().toLowerCase() }).select("name username email preferences.workspace.autoApproveWorkspaceInvites");
        }

        if (!user) {
            throw createError("User not found", 404);
        }

        const workspace = await Workspace.findById(workspaceId).select("name chatId");
        if (!workspace) {
            throw createError("Workspace not found", 404);
        }

        const exists = await WorkspaceMember.findOne({
            workspace: workspaceId,
            user: user._id
        });

        if (exists) {
            throw createError("User is already a member of this workspace", 409);
        }

        const autoApprove = user?.preferences?.workspace?.autoApproveWorkspaceInvites !== false;
        if (!autoApprove) {
            const invite = await createDirectInviteRequest({
                workspaceId,
                role,
                invitedBy: requesterId,
                invitee: user,
                workspace
            });

            return {
                mode: "invite_request",
                requiresApproval: true,
                invite: sanitizeInvite(invite)
            };
        }

        const { member } = await createWorkspaceMembership({
            workspaceId,
            userId: user._id,
            role
        });

        const actorLabel = await getUserLabel(requesterId || user._id);
        const targetLabel = await getUserLabel(user._id);
        await logActivity({
            actorId: requesterId || user._id,
            action: "workspace.member_added",
            level: "workspace",
            workspaceId: workspaceId,
            chatId: workspace?.chatId,
            message: `${actorLabel} added ${targetLabel} to workspace "${workspace?.name || "workspace"}" as ${role}.`,
            meta: {
                addedUserId: user._id,
                role
            }
        });

        await syncWorkspaceChatsSafely(workspaceId);

        return {
            mode: "member_added",
            member: await member.populate('user', 'name email')
        };
    },

    getMembers: async (workspaceId, pagination = {}) => {
        const filters = { workspace: workspaceId };
        const query = WorkspaceMember
            .find({ workspace: workspaceId })
            .select("workspace user role isStarred isMuted status joinedAt")
            .populate('user', 'name email isOnline')
            .sort({ role: 1, joinedAt: 1 })
            .lean();

        if (pagination.enabled) {
            const [items, total] = await Promise.all([
                query.clone()
                    .skip(pagination.skip)
                    .limit(pagination.limit)
                    .exec(),
                WorkspaceMember.countDocuments(filters)
            ]);

            return {
                items,
                pagination: toPaginationMeta({
                    page: pagination.page,
                    limit: pagination.limit,
                    total
                })
            };
        }

        return query.exec();
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

        const workspace = await Workspace.findById(workspaceId).select('name chatId');
        const requesterLabel = await getUserLabel(requesterId);
        const memberLabel = await getUserLabel(memberId);

        const session = await WorkspaceMember.startSession();
        session.startTransaction();

        try {
            await logActivity({
                actorId: requesterId,
                action: "workspace.member_removed",
                level: "workspace",
                workspaceId,
                chatId: workspace?.chatId,
                message: `${requesterLabel} removed ${memberLabel} from workspace "${workspace?.name || "workspace"}".`,
                meta: {
                    removedUserId: memberId
                },
                session
            });

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

        await syncWorkspaceChatsSafely(workspaceId);
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

        const workspace = await Workspace.findById(workspaceId).select('name chatId');
        const requesterLabel = await getUserLabel(requesterId);
        const memberLabel = await getUserLabel(memberId);
        await logActivity({
            actorId: requesterId,
            action: "workspace.member_role_updated",
            level: "workspace",
            workspaceId,
            chatId: workspace?.chatId,
            message: `${requesterLabel} changed ${memberLabel}'s role to ${role} in workspace "${workspace?.name || "workspace"}".`,
            meta: {
                userId: memberId,
                role
            }
        });

        await syncWorkspaceChatsSafely(workspaceId);

        return result;
    },

    transferOwnership: async ({ workspaceId, newOwnerId, currentOwnerId }) => {
        const session = await WorkspaceMember.startSession();
        session.startTransaction();

        try {
            const workspace = await Workspace.findById(workspaceId).session(session).select('name chatId');
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
            if (workspace && workspace.chatId) {
                await Chat.findByIdAndUpdate(
                    workspace.chatId,
                    { admin: newOwnerId },
                    { session }
                );
            }

            const oldOwnerLabel = await getUserLabel(currentOwnerId, session);
            const newOwnerLabel = await getUserLabel(newOwnerId, session);
            await logActivity({
                actorId: currentOwnerId,
                action: "workspace.ownership_transferred",
                level: "workspace",
                workspaceId,
                chatId: workspace?.chatId,
                message: `${oldOwnerLabel} transferred workspace "${workspace?.name || "workspace"}" ownership to ${newOwnerLabel}.`,
                meta: {
                    from: currentOwnerId,
                    to: newOwnerId
                },
                session
            });

            await session.commitTransaction();
            await syncWorkspaceChatsSafely(workspaceId);
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    },

    sendInvite: async ({ workspaceId, email, role, invitedBy, csvBuffer }) => {
        const workspace = await Workspace.findById(workspaceId).select("name");
        if (!workspace) {
            throw createError("Workspace not found", 404);
        }

        const inviter = await User.findById(invitedBy).select("name username");
        if (!inviter) {
            throw createError("Inviter not found", 404);
        }

        const emailsFromCsv = parseEmailsFromCsvBuffer(csvBuffer);
        const singleEmail = email ? [normalizeEmail(email)] : [];
        const emailSet = Array.from(new Set([...singleEmail, ...emailsFromCsv].filter(Boolean)));

        if (!emailSet.length) {
            throw createError("No valid email addresses found", 400);
        }

        const invites = [];
        const errors = [];

        for (const targetEmail of emailSet) {
            try {
                const invite = await createEmailInvite({
                    workspaceId,
                    email: targetEmail,
                    role,
                    invitedBy,
                    workspace,
                    inviter
                });
                invites.push(invite);
            } catch (error) {
                errors.push({
                    email: targetEmail,
                    reason: error?.message || "Failed to send invite"
                });
            }
        }

        if (!invites.length) {
            const firstError = errors[0]?.reason || "No invites were sent";
            throw createError(firstError, 400);
        }

        if (csvBuffer) {
            return {
                mode: "bulk_csv",
                sent: invites.length,
                failed: errors.length,
                invites,
                errors
            };
        }

        return invites[0];
    },

    acceptInvite: async (token, userId) => {
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const invite = await WorkspaceInvite.findOne({
            token: hashedToken,
            $or: [
                { inviteType: "email" },
                { inviteType: { $exists: false } }
            ],
            status: "pending"
        });

        if (!invite) {
            throw createError('Invalid or already used invite token', 404);
        }

        if (invite.expiresAt < new Date()) {
            invite.status = "expired";
            await invite.save();
            throw createError('Invite has expired', 400);
        }

        const user = await User.findById(userId);
        if (!user) {
            throw createError("User not found", 404);
        }

        if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
            throw createError('This invite was sent to a different email address', 403);
        }

        const existingMember = await WorkspaceMember.findOne({
            user: userId,
            workspace: invite.workspace
        });

        if (existingMember) {
            throw createError('You are already a member of this workspace', 409);
        }

        const { workspace } = await createWorkspaceMembership({
            workspaceId: invite.workspace,
            userId,
            role: invite.role
        });

        invite.status = "accepted";
        invite.respondedAt = new Date();
        invite.invitedUser = userId;
        await invite.save();

        const userLabel = await getUserLabel(userId);
        await logActivity({
            actorId: userId,
            action: "workspace.member_joined",
            level: "workspace",
            workspaceId: workspace?._id || invite.workspace,
            chatId: workspace?.chatId,
            message: `${userLabel} joined workspace "${workspace?.name || "workspace"}".`,
            meta: {
                viaInvite: true
            }
        });

        return workspace;
    },

    respondInvite: async ({ inviteId, userId, action }) => {
        const invite = await WorkspaceInvite.findById(inviteId);
        if (!invite) {
            throw createError("Invite not found", 404);
        }

        if (invite.status !== "pending") {
            throw createError("This invite has already been processed", 400);
        }

        if (invite.inviteType !== "direct_request") {
            throw createError("Only in-app invite requests can be responded to here", 400);
        }

        if (String(invite.invitedUser || "") !== String(userId || "")) {
            throw createError("You are not allowed to respond to this invite", 403);
        }

        if (invite.expiresAt < new Date()) {
            invite.status = "expired";
            invite.respondedAt = new Date();
            await invite.save();
            try {
                await notificationService.setWorkspaceInviteNotificationState({
                    recipientUserId: userId,
                    inviteId: invite._id,
                    requestState: "expired",
                    read: true
                });
            } catch (error) {
                console.error("workspace invite notification expiry sync failed", error);
            }
            throw createError("Invite has expired", 400);
        }

        const workspace = await Workspace.findById(invite.workspace).select("name chatId");
        if (!workspace) {
            throw createError("Workspace not found", 404);
        }

        if (action === "reject") {
            invite.status = "rejected";
            invite.respondedAt = new Date();
            await invite.save();

            try {
                await notificationService.setWorkspaceInviteNotificationState({
                    recipientUserId: userId,
                    inviteId: invite._id,
                    requestState: "rejected",
                    read: true
                });
            } catch (error) {
                console.error("workspace invite notification reject sync failed", error);
            }

            return {
                inviteId: invite._id,
                status: invite.status,
                workspaceId: invite.workspace
            };
        }

        const existingMember = await WorkspaceMember.findOne({
            workspace: invite.workspace,
            user: userId
        });

        if (!existingMember) {
            await createWorkspaceMembership({
                workspaceId: invite.workspace,
                userId,
                role: invite.role
            });
        }

        invite.status = "accepted";
        invite.respondedAt = new Date();
        await invite.save();

        try {
            await notificationService.setWorkspaceInviteNotificationState({
                recipientUserId: userId,
                inviteId: invite._id,
                requestState: "accepted",
                read: true
            });
        } catch (error) {
            console.error("workspace invite notification accept sync failed", error);
        }

        const userLabel = await getUserLabel(userId);
        await logActivity({
            actorId: userId,
            action: "workspace.member_joined",
            level: "workspace",
            workspaceId: workspace._id,
            chatId: workspace.chatId,
            message: `${userLabel} joined workspace "${workspace.name}" via invite request.`,
            meta: {
                viaInvite: true,
                inviteId: invite._id
            }
        });

        return {
            inviteId: invite._id,
            status: invite.status,
            workspaceId: workspace._id,
            workspace
        };
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

        const workspace = await Workspace.findById(workspaceId).select('name chatId');
        const userLabel = await getUserLabel(userId);

        const session = await WorkspaceMember.startSession();
        session.startTransaction();

        try {
            await logActivity({
                actorId: userId,
                action: "workspace.member_left",
                level: "workspace",
                workspaceId,
                chatId: workspace?.chatId,
                message: `${userLabel} left workspace "${workspace?.name || "workspace"}".`,
                meta: {},
                session
            });

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

        await syncWorkspaceChatsSafely(workspaceId);
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
