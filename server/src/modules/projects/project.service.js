const mongoose = require('mongoose');
const Project = require('../../models/project');
const Workspace = require('../../models/workspace');
const WorkspaceMember = require('../../models/workspaceMember');
const Team = require('../../models/team');
const Task = require('../../models/tasks');
const Subtask = require('../../models/subtasks');
const Chat = require('../../models/chat');
const Message = require('../../models/message');
const ProjectStatusChangeRequest = require('../../models/projectStatusChangeRequest');
const notificationService = require('../notification/notification.service');

const { touchWorkspace } = require('../utils/updateParent');
const { logActivity, getUserLabel, getUserLabels, formatUserList } = require('../utils/activityLogger');

const withSession = (query, session) => (session ? query.session(session) : query);
const createError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const normalizeIds = (values = []) => {
    const unique = [];
    const seen = new Set();
    values.forEach((value) => {
        const id = String(value);
        if (seen.has(id)) return;
        seen.add(id);
        unique.push(value);
    });
    return unique;
};

const escapeRegExp = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getProjectMemberRole = (project, userId) => {
    const member = (project.members || []).find(
        (entry) => String(entry.user?._id || entry.user) === String(userId)
    );
    return member?.role || null;
};

const isProjectAdmin = (project, userId) => {
    if (String(project.owner) === String(userId)) return true;
    return getProjectMemberRole(project, userId) === "admin";
};

const getProjectAdminIds = (project) => {
    const adminIds = new Set();
    adminIds.add(String(project.owner));

    (project.members || []).forEach((member) => {
        if (member.role !== "admin") return;
        const memberId = String(member.user?._id || member.user || "");
        if (memberId) adminIds.add(memberId);
    });

    return Array.from(adminIds);
};

const ensureWorkspaceExists = async (workspaceId, session = null) => {
    const query = Workspace.findById(workspaceId).select('_id name chatId');
    const workspace = await withSession(query, session);
    if (!workspace) {
        throw new Error('Workspace not found');
    }
    return workspace;
};

const ensureWorkspaceMember = async (workspaceId, userId, session = null) => {
    const query = WorkspaceMember.findOne({ workspace: workspaceId, user: userId }).select('role');
    const member = await withSession(query, session);
    if (!member) {
        throw new Error('You do not have access to this workspace');
    }
    return member;
};

const ensureProjectAccess = async (projectId, userId, session = null) => {
    const query = Project.findById(projectId)
        .select('name workspace owner members teams chatId status color description dueDate isHighPriority settings createdAt updatedAt')
        .populate('members.user', 'name email isOnline')
        .populate('teams', 'name members');

    const project = await withSession(query, session);
    if (!project) {
        throw new Error('Project not found');
    }

    const isOwner = String(project.owner) === String(userId);
    const isProjectMember = project.members.some((member) => String(member.user?._id || member.user) === String(userId));
    if (isOwner || isProjectMember) {
        return project;
    }

    await ensureWorkspaceMember(project.workspace, userId, session);
    return project;
};

const ensureProjectEditor = async (project, userId, session = null) => {
    const workspaceMember = await ensureWorkspaceMember(project.workspace, userId, session);
    const isOwner = String(project.owner) === String(userId);
    const projectMember = project.members.find((member) => String(member.user?._id || member.user) === String(userId));

    const canEdit =
        isOwner ||
        ['owner', 'admin', 'member'].includes(workspaceMember.role) ||
        ['admin', 'member'].includes(projectMember?.role);

    if (!canEdit) {
        throw new Error('You are not allowed to update this project');
    }

    return workspaceMember;
};

const ensureProjectSettingsManager = async (project, userId, session = null) => {
    const workspaceMember = await ensureWorkspaceMember(project.workspace, userId, session);
    const canManageSettings =
        ["owner", "admin"].includes(workspaceMember.role)
        || isProjectAdmin(project, userId);

    if (!canManageSettings) {
        throw createError("Only workspace owners/admins or project admins can update project settings", 403);
    }

    return workspaceMember;
};

const ensureUsersBelongToWorkspace = async (workspaceId, userIds = [], session = null) => {
    if (!userIds.length) return;

    const query = WorkspaceMember.find({
        workspace: workspaceId,
        user: { $in: userIds }
    }).select('user');
    const members = await withSession(query, session).lean();
    const memberSet = new Set(members.map((member) => String(member.user)));

    const missing = userIds.filter((id) => !memberSet.has(String(id)));
    if (missing.length > 0) {
        throw new Error('All project members must already belong to the workspace');
    }
};

const ensureTeamsBelongToWorkspace = async (workspaceId, teamIds = [], session = null) => {
    if (!teamIds.length) return;

    const query = Team.find({
        _id: { $in: teamIds },
        workspace: workspaceId
    }).select('_id');
    const teams = await withSession(query, session).lean();

    if (teams.length !== teamIds.length) {
        throw new Error('Some selected teams do not belong to this workspace');
    }
};

const cleanupProjectResources = async (projectId, userIds, session) => {
    await Task.updateMany(
        { project: projectId },
        { $pull: { assignees: { $in: userIds } } },
        { session }
    );

    const tasks = await Task.find({ project: projectId }).select('_id').session(session);
    const taskIds = tasks.map((task) => task._id);

    if (taskIds.length > 0) {
        await Subtask.updateMany(
            { task: { $in: taskIds } },
            { $pull: { assignedTo: { $in: userIds } } },
            { session }
        );
    }

    const project = await Project.findById(projectId).session(session).select('chatId');
    if (project?.chatId) {
        await Chat.findByIdAndUpdate(
            project.chatId,
            { $pull: { members: { $in: userIds } } },
            { session }
        );
    }
};

const projectService = {
    createProject: async ({ data, workspaceId, userId }) => {
        const workspace = await ensureWorkspaceExists(workspaceId);
        const requesterMembership = await ensureWorkspaceMember(workspaceId, userId);

        if (!['owner', 'admin'].includes(requesterMembership.role)) {
            throw new Error('Only workspace owners and admins can create projects');
        }

        const normalizedName = String(data.name || '').trim();
        const existingProject = await Project.findOne({
            workspace: workspaceId,
            name: { $regex: `^${escapeRegExp(normalizedName)}$`, $options: 'i' },
            status: { $ne: 'deleted' }
        }).select('_id');

        if (existingProject) {
            throw new Error('Project with the same name already exists in this workspace');
        }

        const memberMap = new Map();
        (data.members || []).forEach((member) => {
            if (!member?.user) return;
            memberMap.set(String(member.user), {
                user: member.user,
                role: member.role || 'viewer'
            });
        });
        memberMap.set(String(userId), { user: userId, role: 'admin' });

        const members = Array.from(memberMap.values());
        const memberIds = normalizeIds(members.map((member) => member.user));
        await ensureUsersBelongToWorkspace(workspaceId, memberIds);

        const teamIds = normalizeIds(data.teams || []);
        await ensureTeamsBelongToWorkspace(workspaceId, teamIds);

        const chat = await Chat.create({
            type: 'group',
            name: normalizedName,
            members: memberIds,
            admin: userId
        });

        const project = await Project.create({
            ...data,
            name: normalizedName,
            workspace: workspaceId,
            owner: userId,
            members,
            teams: teamIds,
            chatId: chat._id
        });

        const actorLabel = await getUserLabel(userId);
        await logActivity({
            actorId: userId,
            action: 'project.created',
            level: 'project',
            workspaceId,
            projectId: project._id,
            chatId: project.chatId,
            mirrorChatIds: [workspace?.chatId],
            message: `${actorLabel} created project "${project.name}" in workspace "${workspace?.name || 'workspace'}".`,
            meta: {
                projectName: project.name
            }
        });

        await touchWorkspace(workspaceId);

        return await Project.findById(project._id)
            .populate('members.user', 'name email isOnline')
            .populate('teams', 'name members');
    },

    getProjectsByWorkspace: async (workspaceId, userId) => {
        await ensureWorkspaceExists(workspaceId);
        await ensureWorkspaceMember(workspaceId, userId);

        return await Project.find({
            workspace: workspaceId,
            status: { $ne: 'deleted' }
        })
            .populate('members.user', 'name email isOnline')
            .populate('teams', 'name')
            .sort({ updatedAt: -1 });
    },

    getProjectById: async (projectId, userId) => {
        return await ensureProjectAccess(projectId, userId);
    },

    updateProject: async ({ projectId, workspaceId = null, updateData, userId }) => {
        const existingProject = await ensureProjectAccess(projectId, userId);
        await ensureProjectEditor(existingProject, userId);

        if (workspaceId && String(existingProject.workspace) !== String(workspaceId)) {
            throw createError('Project does not belong to this workspace', 400);
        }

        const updatePayload = { ...updateData };
        const currentStatus = String(existingProject.status || "active");
        const nextStatus = updatePayload.status ? String(updatePayload.status) : null;
        const settingsUpdateRequested = Object.prototype.hasOwnProperty.call(updatePayload, "settings");
        const statusApprovalEnabled = Boolean(existingProject.settings?.statusChangeAdminApprovalEnabled);
        const userIsProjectAdmin = isProjectAdmin(existingProject, userId);

        if (settingsUpdateRequested) {
            await ensureProjectSettingsManager(existingProject, userId);
            const currentSettings = existingProject.settings?.toObject
                ? existingProject.settings.toObject()
                : (existingProject.settings || {});
            updatePayload.settings = {
                ...currentSettings,
                ...(updatePayload.settings || {})
            };
        }

        if (nextStatus && nextStatus !== currentStatus && statusApprovalEnabled && !userIsProjectAdmin) {
            throw createError(
                'Project status changes require project admin approval. Submit a status change request.',
                403
            );
        }

        if (updatePayload.name) {
            updatePayload.name = String(updatePayload.name).trim();

            const duplicate = await Project.findOne({
                _id: { $ne: projectId },
                workspace: existingProject.workspace,
                name: { $regex: `^${escapeRegExp(updatePayload.name)}$`, $options: 'i' },
                status: { $ne: 'deleted' }
            }).select('_id');

            if (duplicate) {
                throw createError('Project with the same name already exists in this workspace', 409);
            }
        }

        if (updatePayload.members) {
            const memberMap = new Map();
            updatePayload.members.forEach((member) => {
                if (!member?.user) return;
                memberMap.set(String(member.user), {
                    user: member.user,
                    role: member.role || 'viewer'
                });
            });
            memberMap.set(String(existingProject.owner), { user: existingProject.owner, role: 'admin' });
            updatePayload.members = Array.from(memberMap.values());

            const memberIds = normalizeIds(updatePayload.members.map((member) => member.user));
            await ensureUsersBelongToWorkspace(existingProject.workspace, memberIds);
        }

        if (updatePayload.teams) {
            updatePayload.teams = normalizeIds(updatePayload.teams);
            await ensureTeamsBelongToWorkspace(existingProject.workspace, updatePayload.teams);
        }

        const project = await Project.findByIdAndUpdate(projectId, updatePayload, {
            new: true,
            runValidators: true
        })
            .populate('members.user', 'name email isOnline')
            .populate('teams', 'name members');

        if (!project) {
            throw createError('Project not found', 404);
        }

        if (updatePayload.name && project.chatId) {
            await Chat.findByIdAndUpdate(project.chatId, { name: updatePayload.name });
        }

        if (updatePayload.members && project.chatId) {
            const memberIds = updatePayload.members.map((member) => member.user);
            await Chat.findByIdAndUpdate(project.chatId, {
                $addToSet: { members: { $each: memberIds } }
            });
        }

        const workspace = await Workspace.findById(project.workspace).select('name chatId');
        const actorLabel = await getUserLabel(userId);
        const oldName = existingProject.name || project.name;
        const renamed = updatePayload.name && updatePayload.name !== oldName;
        const statusChanged = Boolean(nextStatus && nextStatus !== currentStatus);

        let action = 'project.updated';
        let message = `${actorLabel} updated project "${project.name}".`;
        if (renamed) {
            action = 'project.renamed';
            message = `${actorLabel} renamed project from "${oldName}" to "${project.name}".`;
        } else if (statusChanged) {
            action = 'project.status_changed';
            message = `${actorLabel} changed project "${project.name}" status from "${currentStatus}" to "${nextStatus}".`;
        }

        await logActivity({
            actorId: userId,
            action,
            level: 'project',
            workspaceId: project.workspace,
            projectId: project._id,
            chatId: project.chatId,
            mirrorChatIds: [workspace?.chatId],
            message,
            meta: {
                oldName,
                newName: project.name,
                oldStatus: currentStatus,
                newStatus: nextStatus || currentStatus
            }
        });

        await touchWorkspace(project.workspace);
        return project;
    },

    requestProjectStatusChange: async ({ workspaceId, projectId, requestedStatus, note = "", userId }) => {
        const project = await ensureProjectAccess(projectId, userId);

        if (workspaceId && String(project.workspace) !== String(workspaceId)) {
            throw createError('Project does not belong to this workspace', 400);
        }

        const workspaceMembership = await ensureWorkspaceMember(project.workspace, userId);
        const memberRole = getProjectMemberRole(project, userId);
        const userIsProjectAdmin = isProjectAdmin(project, userId);
        const approvalEnabled = Boolean(project.settings?.statusChangeAdminApprovalEnabled);

        if (!approvalEnabled) {
            throw createError('Status approval workflow is disabled for this project', 400);
        }

        if (!memberRole && !userIsProjectAdmin) {
            throw createError('Only project members can request project status changes', 403);
        }

        if (String(workspaceMembership.role || "").toLowerCase() === "viewer") {
            throw createError('Workspace viewers cannot request project status changes', 403);
        }

        if (String(memberRole || "").toLowerCase() === "viewer") {
            throw createError('Project viewers cannot request status changes', 403);
        }

        if (userIsProjectAdmin) {
            throw createError('Project admins can change project status directly', 400);
        }

        if (!['owner', 'admin', 'member', 'viewer'].includes(workspaceMembership.role)) {
            throw createError('You are not allowed to request project status changes', 403);
        }

        const currentStatus = String(project.status || 'active');
        if (requestedStatus === currentStatus) {
            throw createError('Project already has this status', 400);
        }

        const existingPending = await ProjectStatusChangeRequest.findOne({
            project: project._id,
            requestedBy: userId,
            requestedStatus,
            status: 'pending'
        }).select('_id');

        if (existingPending) {
            throw createError('You already have a pending request for this status', 409);
        }

        const request = await ProjectStatusChangeRequest.create({
            workspace: project.workspace,
            project: project._id,
            requestedBy: userId,
            requestedStatus,
            previousStatus: currentStatus,
            note: String(note || '').trim()
        });

        const adminIds = getProjectAdminIds(project).filter((id) => id !== String(userId));
        const actorLabel = await getUserLabel(userId);

        await notificationService.createNotifications({
            recipientIds: adminIds,
            actorId: userId,
            title: 'Project status change request',
            message: `${actorLabel} requested to change "${project.name}" status from "${currentStatus}" to "${requestedStatus}".`,
            type: 'activity',
            category: 'project',
            priority: 'normal',
            entityType: 'project',
            entityId: project._id,
            workspaceId: project.workspace,
            projectId: project._id,
            link: '/main/notifications',
            metadata: {
                kind: 'project_status_change_request',
                requestId: String(request._id),
                projectId: String(project._id),
                workspaceId: String(project.workspace),
                requestedStatus,
                previousStatus: currentStatus,
                note: request.note || '',
                requestState: null
            },
            dedupeKey: `project:status_request:${String(project._id)}:${String(request._id)}`
        });

        const workspace = await Workspace.findById(project.workspace).select('chatId');
        await logActivity({
            actorId: userId,
            action: 'project.status_change_requested',
            level: 'project',
            workspaceId: project.workspace,
            projectId: project._id,
            chatId: project.chatId,
            mirrorChatIds: [workspace?.chatId],
            message: `${actorLabel} requested project "${project.name}" status change to "${requestedStatus}".`,
            meta: {
                requestedStatus,
                previousStatus: currentStatus,
                requestId: request._id
            }
        });

        return request;
    },

    respondProjectStatusChangeRequest: async ({
        workspaceId,
        projectId,
        requestId,
        action,
        userId
    }) => {
        const project = await ensureProjectAccess(projectId, userId);

        if (workspaceId && String(project.workspace) !== String(workspaceId)) {
            throw createError('Project does not belong to this workspace', 400);
        }

        const userIsProjectAdmin = isProjectAdmin(project, userId);
        if (!userIsProjectAdmin) {
            throw createError('Only project admins can review status change requests', 403);
        }

        const request = await ProjectStatusChangeRequest.findOne({
            _id: requestId,
            project: project._id,
            status: 'pending'
        });

        if (!request) {
            throw createError('Project status change request not found or already processed', 404);
        }

        const now = new Date();
        request.status = action === 'approve' ? 'approved' : 'rejected';
        request.reviewedBy = userId;
        request.reviewedAt = now;
        await request.save();

        if (action === 'approve' && String(project.status) !== String(request.requestedStatus)) {
            project.status = request.requestedStatus;
            await project.save();
        }

        const actorLabel = await getUserLabel(userId);
        const requesterLabel = await getUserLabel(request.requestedBy);
        const workspace = await Workspace.findById(project.workspace).select('chatId');
        const finalStatus = action === 'approve'
            ? request.requestedStatus
            : project.status;

        await logActivity({
            actorId: userId,
            action: action === 'approve'
                ? 'project.status_change_request_approved'
                : 'project.status_change_request_rejected',
            level: 'project',
            workspaceId: project.workspace,
            projectId: project._id,
            chatId: project.chatId,
            mirrorChatIds: [workspace?.chatId],
            message: action === 'approve'
                ? `${actorLabel} approved ${requesterLabel}'s status change request for project "${project.name}" to "${request.requestedStatus}".`
                : `${actorLabel} rejected ${requesterLabel}'s status change request for project "${project.name}".`,
            meta: {
                requestId: request._id,
                requestedStatus: request.requestedStatus,
                finalStatus
            }
        });

        const adminIds = getProjectAdminIds(project);
        await notificationService.setProjectStatusRequestNotificationState({
            requestId: request._id,
            requestState: request.status,
            recipientUserIds: adminIds,
            read: true
        });

        await notificationService.createNotifications({
            recipientIds: [request.requestedBy],
            actorId: userId,
            title: action === 'approve'
                ? 'Project status request approved'
                : 'Project status request rejected',
            message: action === 'approve'
                ? `${actorLabel} approved your request. "${project.name}" is now "${request.requestedStatus}".`
                : `${actorLabel} rejected your status change request for "${project.name}".`,
            type: 'activity',
            category: 'project',
            priority: action === 'approve' ? 'normal' : 'low',
            entityType: 'project',
            entityId: project._id,
            workspaceId: project.workspace,
            projectId: project._id,
            link: '/main/notifications',
            metadata: {
                kind: 'project_status_change_request_result',
                requestId: String(request._id),
                requestState: request.status,
                requestedStatus: request.requestedStatus,
                finalStatus
            },
            dedupeKey: `project:status_request_result:${String(request._id)}:${request.status}`
        });

        await touchWorkspace(project.workspace);

        return {
            request,
            projectStatus: project.status
        };
    },

    deleteProject: async (projectId, userId) => {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const projectToDelete = await Project.findById(projectId)
                .session(session)
                .select('name workspace chatId owner members');

            if (!projectToDelete) {
                throw new Error('Project not found');
            }

            const workspaceMember = await WorkspaceMember.findOne({
                workspace: projectToDelete.workspace,
                user: userId
            }).session(session).select('role');

            const canDelete =
                String(projectToDelete.owner) === String(userId) ||
                ['owner', 'admin'].includes(workspaceMember?.role);

            if (!canDelete) {
                throw new Error('Only workspace owners/admins or project owner can delete this project');
            }

            const workspace = await Workspace.findById(projectToDelete.workspace)
                .session(session)
                .select('name chatId');

            const actorLabel = await getUserLabel(userId, session);
            await logActivity({
                actorId: userId,
                action: 'project.deleted',
                level: 'project',
                workspaceId: projectToDelete.workspace,
                projectId: projectToDelete._id,
                chatId: workspace?.chatId || null,
                message: `${actorLabel} deleted project "${projectToDelete.name}" from workspace "${workspace?.name || 'workspace'}".`,
                meta: {
                    projectName: projectToDelete.name
                },
                session
            });

            const tasks = await Task.find({ project: projectId }).select('_id').session(session);
            const taskIds = tasks.map((task) => task._id);

            if (taskIds.length > 0) {
                await Subtask.deleteMany({ task: { $in: taskIds } }, { session });
            }

            await Task.deleteMany({ project: projectId }, { session });
            await ProjectStatusChangeRequest.deleteMany({ project: projectId }, { session });

            if (projectToDelete.chatId) {
                await Message.deleteMany({ chatId: projectToDelete.chatId }, { session });
                await Chat.findByIdAndDelete(projectToDelete.chatId, { session });
            }

            await Project.findByIdAndDelete(projectId, { session });

            await session.commitTransaction();
            await touchWorkspace(projectToDelete.workspace);

            return { message: 'Project deleted successfully', projectId: projectToDelete._id };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    },

    getProjectTeams: async (projectId, userId) => {
        const project = await ensureProjectAccess(projectId, userId);
        return project.teams || [];
    },

    addProjectTeams: async (projectId, { teams }, userId) => {
        const project = await ensureProjectAccess(projectId, userId);
        await ensureProjectEditor(project, userId);

        const teamIds = normalizeIds(teams || []);
        await ensureTeamsBelongToWorkspace(project.workspace, teamIds);

        await Project.findByIdAndUpdate(
            projectId,
            { $addToSet: { teams: { $each: teamIds } } },
            { new: true }
        );

        const actorLabel = await getUserLabel(userId || project.owner);
        const workspace = await Workspace.findById(project.workspace).select('chatId');
        await logActivity({
            actorId: userId || project.owner,
            action: 'project.teams_added',
            level: 'project',
            workspaceId: project.workspace,
            projectId: project._id,
            chatId: project.chatId,
            mirrorChatIds: [workspace?.chatId],
            message: `${actorLabel} added ${teamIds.length} team(s) to project "${project.name}".`,
            meta: {
                teamIds
            }
        });

        return { message: 'Teams added to project' };
    },

    removeProjectTeams: async (projectId, { teams }, userId) => {
        const project = await ensureProjectAccess(projectId, userId);
        await ensureProjectEditor(project, userId);

        const teamIds = normalizeIds(teams || []);
        await Project.findByIdAndUpdate(
            projectId,
            { $pull: { teams: { $in: teamIds } } },
            { new: true }
        );

        const actorLabel = await getUserLabel(userId || project.owner);
        const workspace = await Workspace.findById(project.workspace).select('chatId');
        await logActivity({
            actorId: userId || project.owner,
            action: 'project.teams_removed',
            level: 'project',
            workspaceId: project.workspace,
            projectId: project._id,
            chatId: project.chatId,
            mirrorChatIds: [workspace?.chatId],
            message: `${actorLabel} removed ${teamIds.length} team(s) from project "${project.name}".`,
            meta: {
                teamIds
            }
        });

        return { message: 'Teams removed from project' };
    },

    getProjectMembers: async (projectId, userId) => {
        const project = await ensureProjectAccess(projectId, userId);
        return project.members || [];
    },

    addProjectMembers: async (projectId, { members }, userId) => {
        const project = await ensureProjectAccess(projectId, userId);
        await ensureProjectEditor(project, userId);

        const existingUserIds = new Set(project.members.map((member) => String(member.user?._id || member.user)));
        const newMembers = [];
        (members || []).forEach((member) => {
            const memberId = String(member.user);
            if (existingUserIds.has(memberId)) return;
            existingUserIds.add(memberId);
            newMembers.push(member);
        });

        if (newMembers.length === 0) {
            return { message: 'All selected members are already in the project' };
        }

        const newMemberUserIds = normalizeIds(newMembers.map((member) => member.user));
        await ensureUsersBelongToWorkspace(project.workspace, newMemberUserIds);

        await Project.findByIdAndUpdate(
            projectId,
            { $push: { members: { $each: newMembers } } },
            { new: true }
        );

        if (project.chatId) {
            await Chat.findByIdAndUpdate(project.chatId, {
                $addToSet: { members: { $each: newMemberUserIds } }
            });
        }

        const workspace = await Workspace.findById(project.workspace).select('chatId');
        const actorLabel = await getUserLabel(userId);
        const addedLabels = await getUserLabels(newMemberUserIds);
        await logActivity({
            actorId: userId,
            action: 'project.members_added',
            level: 'project',
            workspaceId: project.workspace,
            projectId: project._id,
            chatId: project.chatId,
            mirrorChatIds: [workspace?.chatId],
            message: `${actorLabel} added ${formatUserList(addedLabels)} to project "${project.name}".`,
            meta: {
                memberIds: newMemberUserIds
            }
        });

        return { message: `${newMembers.length} new member(s) added successfully` };
    },

    removeProjectMembers: async (projectId, { users }, userId) => {
        const projectInfo = await ensureProjectAccess(projectId, userId);
        await ensureProjectEditor(projectInfo, userId);

        const userIds = normalizeIds(users || []);
        if (userIds.some((id) => String(id) === String(projectInfo.owner))) {
            throw new Error('Project owner cannot be removed from members');
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            await cleanupProjectResources(projectId, userIds, session);

            const project = await Project.findByIdAndUpdate(
                projectId,
                { $pull: { members: { user: { $in: userIds } } } },
                { new: true, session }
            );

            if (!project) {
                throw new Error('Project not found');
            }

            await session.commitTransaction();

            const workspace = await Workspace.findById(projectInfo.workspace).select('chatId');
            const actorLabel = await getUserLabel(userId);
            const removedLabels = await getUserLabels(userIds);
            await logActivity({
                actorId: userId,
                action: 'project.members_removed',
                level: 'project',
                workspaceId: projectInfo.workspace,
                projectId: projectInfo._id,
                chatId: projectInfo.chatId,
                mirrorChatIds: [workspace?.chatId],
                message: `${actorLabel} removed ${formatUserList(removedLabels)} from project "${projectInfo.name}".`,
                meta: {
                    memberIds: userIds
                }
            });

            return { message: 'Members removed from project and unassigned from tasks' };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    },

    updateProjectMemberRole: async (projectId, memberId, role, userId) => {
        const projectAccess = await ensureProjectAccess(projectId, userId);
        await ensureProjectEditor(projectAccess, userId);

        if (String(projectAccess.owner) === String(memberId)) {
            throw new Error('Project owner role cannot be changed');
        }

        const project = await Project.findOneAndUpdate(
            {
                _id: projectId,
                'members.user': memberId
            },
            {
                $set: { 'members.$.role': role }
            },
            { new: true }
        );

        if (!project) {
            throw new Error('Project not found or user is not a member of this project');
        }

        const workspace = await Workspace.findById(project.workspace).select('chatId');
        const actorLabel = await getUserLabel(userId);
        const memberLabel = await getUserLabel(memberId);
        await logActivity({
            actorId: userId,
            action: 'project.member_role_updated',
            level: 'project',
            workspaceId: project.workspace,
            projectId: project._id,
            chatId: project.chatId,
            mirrorChatIds: [workspace?.chatId],
            message: `${actorLabel} changed ${memberLabel}'s role to ${role} in project "${project.name}".`,
            meta: {
                memberId,
                role
            }
        });

        return { message: 'Member role updated successfully' };
    },

    leaveProject: async (projectId, userId) => {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const project = await Project.findById(projectId).session(session);

            if (!project) {
                throw new Error('Project not found');
            }

            if (project.owner.toString() === userId.toString()) {
                throw new Error('Project owner cannot leave the project. Transfer ownership or delete the project first.');
            }

            const isMember = project.members.some((member) => member.user.toString() === userId.toString());
            if (!isMember) {
                throw new Error('You are not a member of this project');
            }

            const workspace = await Workspace.findById(project.workspace).session(session).select('name chatId');
            const actorLabel = await getUserLabel(userId, session);
            await logActivity({
                actorId: userId,
                action: 'project.member_left',
                level: 'project',
                workspaceId: project.workspace,
                projectId: project._id,
                chatId: project.chatId,
                mirrorChatIds: [workspace?.chatId],
                message: `${actorLabel} left project "${project.name}".`,
                meta: {},
                session
            });

            await cleanupProjectResources(projectId, [userId], session);

            await Project.findByIdAndUpdate(
                projectId,
                { $pull: { members: { user: userId } } },
                { new: true, session }
            );

            await session.commitTransaction();
            return { message: 'You have left the project successfully' };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
};

module.exports = projectService;
