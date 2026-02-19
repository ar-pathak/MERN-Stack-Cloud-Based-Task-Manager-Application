const mongoose = require('mongoose');
const isUserTaskAssignee = require('../../helpers/isUserTaskAssignee');
const { canCreateTask } = require('../../middleware/resolveTaskCreatePermission');
const Task = require('../../models/tasks');
const Team = require('../../models/team');
const User = require('../../models/user');
const Subtask = require('../../models/subtasks');
const Project = require('../../models/project');
const Workspace = require('../../models/workspace');
const WorkspaceMember = require('../../models/workspaceMember');
// Import Chat models
const Chat = require('../../models/chat');
const Message = require('../../models/message');

const { touchParents } = require('../utils/updateParent');
const { logActivity, getUserLabel, getUserLabels, formatUserList } = require('../utils/activityLogger');
const { toPaginationMeta } = require('../../helpers/paginationHelper');
const {
    getTeamMemberIds,
    syncTaskAndSubtaskChatMembers
} = require('../utils/chatMembershipSync');

const withSession = (query, session) => (session ? query.session(session) : query);

const loadTaskContext = async (task, session = null) => {
    let project = null;
    let workspace = null;

    if (task.project) {
        const projectQuery = Project.findById(task.project).select('name chatId workspace');
        project = await withSession(projectQuery, session).lean();
    }

    const workspaceId = task.workspace || project?.workspace;
    if (workspaceId) {
        const workspaceQuery = Workspace.findById(workspaceId).select('name chatId');
        workspace = await withSession(workspaceQuery, session).lean();
    }

    return { project, workspace };
};

const ensureProjectScope = async (projectId, workspaceId, session = null) => {
    if (!projectId) {
        return { project: null, workspaceId: workspaceId || null };
    }

    const projectQuery = Project.findById(projectId).select('workspace members owner teams name chatId');
    const project = await withSession(projectQuery, session);
    if (!project) {
        throw new Error("Project not found");
    }

    if (workspaceId && String(project.workspace) !== String(workspaceId)) {
        throw new Error("Project does not belong to workspace");
    }

    return { project, workspaceId: String(project.workspace) };
};

const getAllowedAssigneeIdsForScope = async ({ workspaceId = null, project = null, session = null }) => {
    if (!workspaceId && !project) {
        return new Set();
    }

    const allowed = new Set();

    if (project) {
        allowed.add(String(project.owner));
        for (const member of project.members || []) {
            allowed.add(String(member.user));
        }
    }

    if (workspaceId) {
        const wsMembersQuery = WorkspaceMember.find({ workspace: workspaceId }).select('user');
        const wsMembers = await withSession(wsMembersQuery, session).lean();
        wsMembers.forEach((member) => allowed.add(String(member.user)));
    }

    return allowed;
};

const normalizeUniqueIds = (ids = []) => {
    const unique = [];
    const seen = new Set();
    for (const id of ids) {
        const key = String(id);
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(id);
    }
    return unique;
};

const validateAssigneesForScope = (assigneeIds, allowedIds, contextLabel = "scope") => {
    if (!assigneeIds?.length) return;

    const invalidIds = assigneeIds.filter((id) => !allowedIds.has(String(id)));
    if (invalidIds.length > 0) {
        throw new Error(`Some assignees do not belong to the ${contextLabel}`);
    }
};

const ensureTeamsBelongToScope = async ({
    teamIds = [],
    workspaceId = null,
    project = null,
    session = null
}) => {
    const normalizedTeamIds = normalizeUniqueIds(teamIds || []);
    if (!normalizedTeamIds.length) return [];

    const teams = await withSession(
        Team.find({ _id: { $in: normalizedTeamIds } }).select("_id workspace"),
        session
    ).lean();

    if (teams.length !== normalizedTeamIds.length) {
        throw new Error("Some selected teams do not exist");
    }

    if (workspaceId) {
        const hasForeignWorkspaceTeam = teams.some(
            (team) => String(team.workspace) !== String(workspaceId)
        );

        if (hasForeignWorkspaceTeam) {
            throw new Error("Some selected teams do not belong to this workspace");
        }
    }

    if (project) {
        const projectTeamIds = new Set((project.teams || []).map((id) => String(id)));
        const invalidProjectTeams = normalizedTeamIds.filter(
            (teamId) => !projectTeamIds.has(String(teamId))
        );

        if (invalidProjectTeams.length > 0) {
            throw new Error("Some selected teams are not linked to this project");
        }
    }

    return normalizedTeamIds;
};

const syncTaskChatsSafely = async (taskId) => {
    try {
        await syncTaskAndSubtaskChatMembers(taskId);
    } catch (syncError) {
        console.error("task chat membership sync failed", syncError);
    }
};

const taskService = {
    createTask: async (userId, taskData, scope = {}) => {
        const { project, workspaceId: scopedWorkspaceId } = await ensureProjectScope(
            scope.projectId || null,
            scope.workspaceId || null
        );

        const workspaceId = scopedWorkspaceId || null;

        if (workspaceId) {
            const workspace = await Workspace.findById(workspaceId).select('_id');
            if (!workspace) {
                throw new Error("Workspace not found");
            }
        }

        const normalizedAssignees = normalizeUniqueIds(taskData.assignees || []);
        const normalizedTeamIds = normalizeUniqueIds(taskData.assigneesTeams || []);

        if (workspaceId || scope.projectId) {
            const allowed = await canCreateTask({
                userId,
                workspaceId,
                projectId: scope.projectId || null,
                teamIds: normalizedTeamIds,
                enforceWorkspaceAdminOnly: !scope.projectId,
                requireProjectAdminOrWorkspaceOwner: Boolean(scope.projectId)
            });

            if (!allowed) {
                throw new Error(
                    scope.projectId
                        ? "Only workspace owners/admins, project admins, or assigned team leads can create tasks in this project"
                        : "Only workspace owners and admins can create tasks"
                );
            }
        }

        const existingTask = await Task.findOne({
            createdBy: userId,
            title: taskData.title,
            workspace: workspaceId,
            project: scope.projectId || null,
            status: { $ne: "deleted" }
        });

        if (existingTask) {
            throw new Error("Task with this name already exists in this scope");
        }

        let scopedTeamIds = [];
        if (!workspaceId && !scope.projectId && normalizedTeamIds.length > 0) {
            throw new Error("Global tasks cannot include team assignees");
        }

        if (normalizedTeamIds.length > 0) {
            scopedTeamIds = await ensureTeamsBelongToScope({
                teamIds: normalizedTeamIds,
                workspaceId,
                project
            });
        }

        const allowedAssignees = await getAllowedAssigneeIdsForScope({
            workspaceId,
            project
        });

        if (!workspaceId && !scope.projectId) {
            const invalidGlobalAssignees = normalizedAssignees.filter((id) => String(id) !== String(userId));
            if (invalidGlobalAssignees.length > 0) {
                throw new Error("Global tasks can only be assigned to yourself");
            }
        } else {
            validateAssigneesForScope(
                normalizedAssignees,
                allowedAssignees,
                scope.projectId ? "project workspace" : "workspace"
            );
        }

        // Prepare initial Chat members (Creator + assigned users + assigned team members)
        const initialMembers = new Set([String(userId)]);
        normalizedAssignees.forEach((id) => initialMembers.add(String(id)));
        if (scopedTeamIds.length > 0) {
            const teamMembers = await getTeamMemberIds(scopedTeamIds);
            teamMembers.forEach((id) => initialMembers.add(String(id)));
        }

        const chat = await Chat.create({
            type: "group",
            name: taskData.title,
            members: Array.from(initialMembers),
            admin: userId,
        });

        const task = await Task.create({
            ...taskData,
            assignees: normalizedAssignees,
            assigneesTeams: scopedTeamIds,
            createdBy: userId,
            workspace: workspaceId,
            project: scope.projectId || null,
            chatId: chat._id
        });

        await syncTaskAndSubtaskChatMembers(task._id);

        const workspace = workspaceId
            ? await Workspace.findById(workspaceId).select('name chatId').lean()
            : null;

        const actorLabel = await getUserLabel(userId);
        const parentLabel = project
            ? `project "${project.name}"`
            : workspace
                ? `workspace "${workspace.name}"`
                : "personal space";

        await logActivity({
            actorId: userId,
            action: "task.created",
            level: "task",
            workspaceId,
            projectId: project?._id || null,
            taskId: task._id,
            chatId: task.chatId,
            mirrorChatIds: [project?.chatId, workspace?.chatId],
            message: `${actorLabel} created task "${task.title}" in ${parentLabel}.`,
            meta: {
                taskTitle: task.title
            }
        });

        await touchParents(task);

        return await Task.findById(task._id)
            .populate('createdBy', 'name email')
            .populate('assignees', 'name email isOnline')
            .populate('assigneesTeams')
            .populate('project', 'name workspace')
            .populate('workspace', 'name');
    },

    updateTask: async (userId, taskId, data) => {
        const task = await Task.findById(taskId);

        if (!task) {
            throw new Error("Task not found");
        }

        const isCreator = task.createdBy.toString() === userId.toString();

        if (!isCreator) {
            throw new Error("You are not allowed to update this task");
        }

        const oldTitle = task.title;

        if (data.title && data.title !== task.title) {
            const duplicateTask = await Task.findOne({
                _id: { $ne: task._id },
                createdBy: task.createdBy,
                title: data.title,
                workspace: task.workspace || null,
                project: task.project || null,
                status: { $ne: "deleted" }
            }).lean();

            if (duplicateTask) {
                throw new Error("Task with this name already exists in this scope");
            }
        }

        await Task.updateOne(
            { _id: taskId },
            { $set: data }
        );

        // Sync Task Title with Chat Name (UPDATED)
        if (data.title && task.chatId) {
            await Chat.findByIdAndUpdate(task.chatId, {
                name: data.title
            });
        }

        const { project, workspace } = await loadTaskContext(task);
        const actorLabel = await getUserLabel(userId);
        const newTitle = data.title || task.title;
        const renamed = data.title && data.title !== oldTitle;
        const message = renamed
            ? `${actorLabel} renamed task from "${oldTitle}" to "${newTitle}".`
            : `${actorLabel} updated task "${task.title}".`;

        await logActivity({
            actorId: userId,
            action: renamed ? "task.renamed" : "task.updated",
            level: "task",
            workspaceId: task.workspace || workspace?._id || null,
            projectId: task.project || project?._id || null,
            taskId: task._id,
            chatId: task.chatId,
            mirrorChatIds: [project?.chatId, workspace?.chatId],
            message,
            meta: {
                oldTitle,
                newTitle
            }
        });

        await touchParents(task);

        const updatedTask = await Task.findById(taskId)
            .populate('createdBy', 'name email')
            .populate('assignees', 'name email isOnline')
            .populate('assigneesTeams')
            .populate('project', 'name workspace')
            .populate('workspace', 'name');

        return { message: "Task updated successfully", task: updatedTask };
    },

    addTaskAssignees: async (userId, taskId, assigneesData) => {
        const task = await Task.findById(taskId);

        if (!task) {
            throw new Error("Task not found");
        }

        const isCreator = String(task.createdBy) === String(userId);
        const isUserValid = isCreator || await canCreateTask({
            userId,
            workspaceId: task.workspace || null,
            projectId: task.project || null,
            teamIds: task.assigneesTeams || []
        });

        if (!isUserValid) {
            throw new Error("Permission denied");
        }

        const updateQuery = {};
        let targetAssigneeIds = [];
        let validatedTeamIds = [];
        let scopedProject = null;
        let scopedWorkspaceId = task.workspace || null;

        // 1. Collect Direct IDs
        if (assigneesData.assignees?.length) {
            targetAssigneeIds = [...assigneesData.assignees];
        }

        // 2. Resolve Usernames to IDs
        if (assigneesData.usernames?.length) {
            const usersFound = await User.find({
                username: { $in: assigneesData.usernames }
            }).select('_id');

            if (usersFound.length === 0 && !targetAssigneeIds.length && !assigneesData.assigneesTeams?.length) {
                throw new Error("No valid users found with provided usernames");
            }

            const userIdsFromNames = usersFound.map(u => u._id);
            targetAssigneeIds = [...targetAssigneeIds, ...userIdsFromNames];
        }

        targetAssigneeIds = normalizeUniqueIds(targetAssigneeIds);

        if (task.workspace || task.project) {
            const scoped = await ensureProjectScope(task.project || null, task.workspace || null);
            scopedProject = scoped.project;
            scopedWorkspaceId = scoped.workspaceId || task.workspace || null;
        }

        if (targetAssigneeIds.length > 0) {
            if (!task.workspace && !task.project) {
                const invalidGlobalAssignees = targetAssigneeIds.filter((id) => String(id) !== String(userId));
                if (invalidGlobalAssignees.length > 0) {
                    throw new Error("Global tasks can only be assigned to yourself");
                }
            } else {
                const allowedAssignees = await getAllowedAssigneeIdsForScope({
                    workspaceId: scopedWorkspaceId,
                    project: scopedProject
                });
                validateAssigneesForScope(targetAssigneeIds, allowedAssignees, task.project ? "project workspace" : "workspace");
            }
        }

        if (!task.workspace && !task.project && assigneesData.assigneesTeams?.length) {
            throw new Error("Global tasks cannot include team assignees");
        }

        if (assigneesData.assigneesTeams?.length) {
            validatedTeamIds = await ensureTeamsBelongToScope({
                teamIds: assigneesData.assigneesTeams,
                workspaceId: scopedWorkspaceId,
                project: scopedProject
            });
        }

        // 3. Prepare Update Query
        if (targetAssigneeIds.length > 0) {
            updateQuery.assignees = {
                $each: targetAssigneeIds
            };
        }

        if (validatedTeamIds.length > 0) {
            updateQuery.assigneesTeams = {
                $each: validatedTeamIds
            };
        }

        if (Object.keys(updateQuery).length === 0) {
            throw new Error("No valid assignees or teams provided");
        }

        await Task.updateOne(
            { _id: taskId },
            {
                $addToSet: updateQuery
            }
        );

        await syncTaskChatsSafely(taskId);

        if (targetAssigneeIds.length > 0 || validatedTeamIds.length > 0) {
            const { project, workspace } = await loadTaskContext(task);
            const actorLabel = await getUserLabel(userId);
            const assigneeLabels = targetAssigneeIds.length
                ? await getUserLabels(targetAssigneeIds)
                : [];
            const parts = [];

            if (assigneeLabels.length) {
                parts.push(formatUserList(assigneeLabels));
            }
            if (validatedTeamIds.length) {
                parts.push(`${validatedTeamIds.length} team assignment(s)`);
            }

            await logActivity({
                actorId: userId,
                action: "task.assignees_added",
                level: "task",
                workspaceId: task.workspace || workspace?._id || null,
                projectId: task.project || project?._id || null,
                taskId: task._id,
                chatId: task.chatId,
                mirrorChatIds: [project?.chatId, workspace?.chatId],
                message: `${actorLabel} assigned ${parts.join(" and ")} to task "${task.title}".`,
                meta: {
                    assigneeIds: targetAssigneeIds,
                    teamIds: validatedTeamIds
                }
            });
        }

        await touchParents(task);

        const updatedTask = await Task.findById(taskId)
            .populate('createdBy', 'name email')
            .populate('assignees', 'name email isOnline')
            .populate('assigneesTeams')
            .populate('project', 'name workspace')
            .populate('workspace', 'name');

        return { message: "Added assignees to task", task: updatedTask };
    },

    removeTaskAssignees: async (userId, taskId, data) => {
        const task = await Task.findById(taskId);

        if (!task) {
            throw new Error("Task not found");
        }

        const isCreator = String(task.createdBy) === String(userId);
        const isUserValid = isCreator || await canCreateTask({
            userId,
            workspaceId: task.workspace || null,
            projectId: task.project || null,
            teamIds: task.assigneesTeams || []
        });

        if (!isUserValid) {
            throw new Error("Permission denied");
        }

        if (data.assignees?.includes(task.createdBy.toString())) {
            throw new Error("Task owner cannot be removed");
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const pullQuery = {};

            // 1. If removing specific users
            if (data.assignees?.length) {
                pullQuery.assignees = { $in: data.assignees };

                // Remove from Subtasks
                await Subtask.updateMany(
                    { task: taskId },
                    { $pull: { assignedTo: { $in: data.assignees } } },
                    { session }
                );

                // Remove from Task Chat (UPDATED)
                if (task.chatId) {
                    await Chat.findByIdAndUpdate(
                        task.chatId,
                        { $pull: { members: { $in: data.assignees } } },
                        { session }
                    );
                }
            }

            if (data.assigneesTeams?.length) {
                pullQuery.assigneesTeams = { $in: data.assigneesTeams };
            }

            // 2. Remove from Parent Task
            await Task.updateOne(
                { _id: taskId },
                { $pull: pullQuery },
                { session }
            );

            await session.commitTransaction();
            await syncTaskChatsSafely(taskId);

            const { project, workspace } = await loadTaskContext(task);
            const actorLabel = await getUserLabel(userId);
            const removedAssigneeLabels = data.assignees?.length
                ? await getUserLabels(data.assignees)
                : [];
            const removedTeamsText = data.assigneesTeams?.length
                ? `${data.assigneesTeams.length} team assignment(s)`
                : "";

            const parts = [];
            if (removedAssigneeLabels.length) parts.push(formatUserList(removedAssigneeLabels));
            if (removedTeamsText) parts.push(removedTeamsText);

            if (parts.length) {
                await logActivity({
                    actorId: userId,
                    action: "task.assignees_removed",
                    level: "task",
                    workspaceId: task.workspace || workspace?._id || null,
                    projectId: task.project || project?._id || null,
                    taskId: task._id,
                    chatId: task.chatId,
                    mirrorChatIds: [project?.chatId, workspace?.chatId],
                    message: `${actorLabel} removed ${parts.join(" and ")} from task "${task.title}".`,
                    meta: {
                        assigneeIds: data.assignees || [],
                        teamIds: data.assigneesTeams || []
                    }
                });
            }

            await touchParents(task);

            const updatedTask = await Task.findById(taskId)
                .populate('createdBy', 'name email')
                .populate('assignees', 'name email isOnline')
                .populate('assigneesTeams')
                .populate('project', 'name workspace')
                .populate('workspace', 'name');

            return { message: "Removed assignees from task and its subtasks", task: updatedTask };

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    },

    changeTaskStatus: async (userId, taskId, newStatus) => {
        const task = await Task.findById(taskId);

        if (!task) {
            throw new Error("Task not found");
        }

        const isAuthorized = await isUserTaskAssignee(task, userId);

        if (!isAuthorized) {
            throw new Error("Only task assignees can change task status");
        }

        if (task.status === newStatus) {
            throw new Error("Task already has this status");
        }

        const oldStatus = task.status;

        await Task.updateOne(
            { _id: taskId },
            {
                $set: { status: newStatus }
            }
        );

        const { project, workspace } = await loadTaskContext(task);
        const actorLabel = await getUserLabel(userId);
        await logActivity({
            actorId: userId,
            action: "task.status_changed",
            level: "task",
            workspaceId: task.workspace || workspace?._id || null,
            projectId: task.project || project?._id || null,
            taskId: task._id,
            chatId: task.chatId,
            mirrorChatIds: [project?.chatId, workspace?.chatId],
            message: `${actorLabel} changed task "${task.title}" status from "${oldStatus}" to "${newStatus}".`,
            meta: {
                oldStatus,
                newStatus
            }
        });

        await touchParents(task);

        const updatedTask = await Task.findById(taskId)
            .populate('createdBy', 'name email')
            .populate('assignees', 'name email isOnline')
            .populate('assigneesTeams')
            .populate('project', 'name workspace')
            .populate('workspace', 'name');

        return { message: "Task status updated successfully", task: updatedTask };
    },

    toggleTaskCompletion: async (userId, taskId) => {
        const task = await Task.findById(taskId);

        if (!task) {
            throw new Error("Task not found");
        }

        const nextStatus = task.status === "completed" ? "active" : "completed";
        return await taskService.changeTaskStatus(userId, taskId, nextStatus);
    },

    deleteTask: async (userId, taskId) => {
        // Soft Delete
        const task = await Task.findById(taskId);

        if (!task) {
            throw new Error("Task not found");
        }

        if (task.status === "deleted") {
            throw new Error("Task already deleted");
        }

        const isCreator = task.createdBy.toString() === userId.toString();

        if (!isCreator) {
            throw new Error("You are not allowed to delete this task");
        }

        await Task.updateOne(
            { _id: taskId },
            {
                $set: { status: "deleted" }
            }
        );

        const { project, workspace } = await loadTaskContext(task);
        const actorLabel = await getUserLabel(userId);
        await logActivity({
            actorId: userId,
            action: "task.soft_deleted",
            level: "task",
            workspaceId: task.workspace || workspace?._id || null,
            projectId: task.project || project?._id || null,
            taskId: task._id,
            chatId: task.chatId,
            mirrorChatIds: [project?.chatId, workspace?.chatId],
            message: `${actorLabel} deleted task "${task.title}".`,
            meta: {}
        });

        await touchParents(task);

        return { message: "Task deleted successfully" };
    },

    restoreTask: async (userId, taskId) => {
        const task = await Task.findById(taskId);

        if (!task) {
            throw new Error("Task not found");
        }

        if (task.status !== "deleted") {
            throw new Error("Only deleted tasks can be restored");
        }

        const isCreator = task.createdBy.toString() === userId.toString();

        const isTeamLead = await Team.exists({
            _id: { $in: task.assigneesTeams },
            members: {
                $elemMatch: {
                    user: userId,
                    role: "lead"
                }
            }
        });

        if (!isCreator && !isTeamLead) {
            throw new Error("You are not allowed to restore this task");
        }

        await Task.updateOne(
            { _id: taskId },
            {
                $set: { status: "active" }
            }
        );

        const { project, workspace } = await loadTaskContext(task);
        const actorLabel = await getUserLabel(userId);
        await logActivity({
            actorId: userId,
            action: "task.restored",
            level: "task",
            workspaceId: task.workspace || workspace?._id || null,
            projectId: task.project || project?._id || null,
            taskId: task._id,
            chatId: task.chatId,
            mirrorChatIds: [project?.chatId, workspace?.chatId],
            message: `${actorLabel} restored task "${task.title}".`,
            meta: {}
        });

        await touchParents(task);

        const restoredTask = await Task.findById(taskId)
            .populate('createdBy', 'name email')
            .populate('assignees', 'name email isOnline')
            .populate('assigneesTeams')
            .populate('project', 'name workspace')
            .populate('workspace', 'name');

        return { message: "Task restored successfully", task: restoredTask };
    },

    permanentDeleteTask: async (userId, taskId) => {
        const task = await Task.findById(taskId);

        if (!task) {
            throw new Error("Task not found");
        }

        const isCreator = task.createdBy.toString() === userId.toString();

        if (!isCreator) {
            throw new Error("You are not allowed to permanently delete this task");
        }

        // Start Transaction for Cascading Delete
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const { project, workspace } = await loadTaskContext(task, session);
            const actorLabel = await getUserLabel(userId, session);
            await logActivity({
                actorId: userId,
                action: "task.permanently_deleted",
                level: "task",
                workspaceId: task.workspace || workspace?._id || null,
                projectId: task.project || project?._id || null,
                taskId: task._id,
                chatId: project?.chatId || workspace?.chatId || null,
                mirrorChatIds: [workspace?.chatId],
                message: `${actorLabel} permanently deleted task "${task.title}".`,
                meta: {},
                session
            });

            // 1. Delete all Subtasks associated with this task
            await Subtask.deleteMany({ task: taskId }, { session });

            // 2. Delete Task Chat and Messages (UPDATED)
            if (task.chatId) {
                await Message.deleteMany({ chatId: task.chatId }, { session });
                await Chat.findByIdAndDelete(task.chatId, { session });
            }

            // 3. Delete the Task itself
            await Task.deleteOne({ _id: taskId }, { session });

            await session.commitTransaction();

            try {
                await touchParents(task);
            } catch (err) {
                console.log("Could not update parent timestamps after task deletion");
            }

            return { message: "Task and its subtasks permanently deleted" };

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    },

    getAllGlobalLevelTasks: async (userId, pagination = {}) => {
        const filters = {
            createdBy: userId,
            workspace: null,
            project: null,
            status: { $ne: "deleted" }
        };
        const query = Task.find(filters).sort({ createdAt: -1 });

        if (pagination.enabled) {
            const [items, total] = await Promise.all([
                query.clone()
                    .skip(pagination.skip)
                    .limit(pagination.limit)
                    .lean()
                    .exec(),
                Task.countDocuments(filters)
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

        return query.lean().exec();
    },

    getTaskById: async (taskId) => {
        const task = await Task.findById(taskId)
            .populate('createdBy', 'name email')
            .populate('assignees', 'name email isOnline')
            .populate('assigneesTeams')
            .populate({
                path: 'project',
                populate: {
                    path: 'members.user',
                    select: 'name email'
                }
            })
            .populate('workspace')
            .lean()
            .exec();

        if (!task) {
            throw new Error('Task not found')
        }
        return task;
    },

    getTasksByWorkspace: async (workspaceId, pagination = {}) => {
        const filters = { workspace: workspaceId, status: { $ne: "deleted" } };
        const query = Task.find(filters)
            .populate('createdBy', 'name email')
            .populate('assignees', 'name email')
            .populate('project', 'name')
            .sort({ createdAt: -1 })
            .lean();

        if (pagination.enabled) {
            const [items, total] = await Promise.all([
                query.clone()
                    .skip(pagination.skip)
                    .limit(pagination.limit)
                    .exec(),
                Task.countDocuments(filters)
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

    getTasksByProject: async (projectId, pagination = {}) => {
        const filters = { project: projectId, status: { $ne: "deleted" } };
        const query = Task.find(filters)
            .populate('createdBy', 'name email')
            .populate('assignees', 'name email')
            .populate('workspace', 'name')
            .sort({ createdAt: -1 })
            .lean();

        if (pagination.enabled) {
            const [items, total] = await Promise.all([
                query.clone()
                    .skip(pagination.skip)
                    .limit(pagination.limit)
                    .exec(),
                Task.countDocuments(filters)
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

    leaveTask: async (taskId, userId) => {
        const task = await Task.findById(taskId);

        if (!task) {
            throw new Error("Task not found");
        }

        // 1. Check if user is actually assigned directly
        const isAssigned = task.assignees.some(id => id.toString() === userId.toString());

        if (!isAssigned) {
            throw new Error("You are not directly assigned to this task.");
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const { project, workspace } = await loadTaskContext(task, session);
            const actorLabel = await getUserLabel(userId, session);
            await logActivity({
                actorId: userId,
                action: "task.member_left",
                level: "task",
                workspaceId: task.workspace || workspace?._id || null,
                projectId: task.project || project?._id || null,
                taskId: task._id,
                chatId: task.chatId,
                mirrorChatIds: [project?.chatId, workspace?.chatId],
                message: `${actorLabel} left task "${task.title}".`,
                meta: {},
                session
            });

            // 2. Remove user from Task assignees
            await Task.findByIdAndUpdate(
                taskId,
                { $pull: { assignees: userId } },
                { new: true, session }
            );

            // 3. Remove user from Subtasks
            await Subtask.updateMany(
                { task: taskId },
                { $pull: { assignedTo: userId } },
                { session }
            );

            await session.commitTransaction();
            await syncTaskChatsSafely(taskId);
            return { message: "You have left the task and its subtasks successfully" };

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    },
};

module.exports = taskService;
