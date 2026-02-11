const mongoose = require('mongoose');
const Project = require('../../models/project');
const Workspace = require('../../models/workspace');
const Task = require('../../models/tasks');
const Subtask = require('../../models/subtasks');
// Import Chat models
const Chat = require('../../models/chat');
const Message = require('../../models/message');

const { touchWorkspace } = require('../utils/updateParent');
const { logActivity, getUserLabel, getUserLabels, formatUserList } = require('../utils/activityLogger');

// Helper function to remove users from task and subtask assignments within the project
// AND remove them from the Project Chat (UPDATED)
const cleanupProjectResources = async (projectId, userIds, session) => {
    // 1. Remove users from Task Assignees in this project
    await Task.updateMany(
        { project: projectId },
        { $pull: { assignees: { $in: userIds } } },
        { session }
    );

    // 2. Remove users from Subtask Assignments
    const tasks = await Task.find({ project: projectId }).select('_id').session(session);
    const taskIds = tasks.map(t => t._id);

    if (taskIds.length > 0) {
        await Subtask.updateMany(
            { task: { $in: taskIds } },
            { $pull: { assignedTo: { $in: userIds } } },
            { session }
        );
    }

    // 3. Remove users from Project Chat (UPDATED)
    const project = await Project.findById(projectId).session(session);
    if (project && project.chatId) {
        await Chat.findByIdAndUpdate(
            project.chatId,
            { $pull: { members: { $in: userIds } } },
            { session }
        );
    }
};

const projectService = {
    createProject: async ({ data, workspaceId, userId }) => {
        const existingProject = await Project.findOne({
            name: data.name,
            workspace: workspaceId
        });

        if (existingProject) {
            throw new Error(
                "Project with the same name already exists in this workspace"
            );
        }

        // Prepare initial members list (Owner + added members)
        const initialMembers = data.members?.length
            ? data.members
            : [{ user: userId, role: "admin" }];

        // Extract just User IDs for the Chat
        const chatMemberIds = initialMembers.map(m => m.user);
        // Ensure owner is definitely in the chat members list
        if (!chatMemberIds.includes(userId)) {
            chatMemberIds.push(userId);
        }

        // 1. Create Project Chat (UPDATED)
        const chat = await Chat.create({
            type: "group",
            name: data.name, // Chat name matches Project name
            members: chatMemberIds,
            admin: userId,
            // You can mark this as a 'project' chat via metadata if needed, or rely on naming convention
        });

        // 2. Create Project with chatId (UPDATED)
        const project = await Project.create({
            ...data,
            workspace: workspaceId,
            owner: userId,
            members: initialMembers,
            chatId: chat._id // Store the chat ID
        });

        const workspace = await Workspace.findById(workspaceId).select('name chatId');
        const actorLabel = await getUserLabel(userId);
        await logActivity({
            actorId: userId,
            action: "project.created",
            level: "project",
            workspaceId,
            projectId: project._id,
            chatId: project.chatId,
            mirrorChatIds: [workspace?.chatId],
            message: `${actorLabel} created project "${project.name}" in workspace "${workspace?.name || "workspace"}".`,
            meta: {
                projectName: project.name
            }
        });

        await touchWorkspace(workspaceId);
        return project;
    },

    getProjectsByWorkspace: async (workspaceId) => {
        const project = await Project.find({ workspace: workspaceId });
        if (!project) {
            throw new Error('Project not found in this workspace')
        }
        return project;
    },

    getProjectById: async (projectId) => {
        const project = await Project.findById(projectId);
        if (!project) {
            throw new Error('Project not found')
        }
        return project;
    },

    updateProject: async (projectId, updateData, userId) => {
        const existingProject = await Project.findById(projectId).select('name workspace chatId');
        const project = await Project.findByIdAndUpdate(projectId, updateData, { new: true })
        if (!project) {
            throw new Error('Project not found')
        }

        // Sync Project Name with Chat Name (UPDATED)
        if (updateData.name && project.chatId) {
            await Chat.findByIdAndUpdate(project.chatId, {
                name: updateData.name
            });
        }

        const workspace = await Workspace.findById(project.workspace).select('name chatId');
        const actorLabel = await getUserLabel(userId);
        const oldName = existingProject?.name || project.name;
        const renamed = updateData.name && updateData.name !== oldName;
        const message = renamed
            ? `${actorLabel} renamed project from "${oldName}" to "${project.name}".`
            : `${actorLabel} updated project "${project.name}".`;

        await logActivity({
            actorId: userId,
            action: renamed ? "project.renamed" : "project.updated",
            level: "project",
            workspaceId: project.workspace,
            projectId: project._id,
            chatId: project.chatId,
            mirrorChatIds: [workspace?.chatId],
            message,
            meta: {
                oldName,
                newName: project.name
            }
        });

        await touchWorkspace(project.workspace);
        return project;
    },

    deleteProject: async (projectId, userId) => {
        // Start a transaction for cascading delete
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // 1. Find the project first to get data (like chatId)
            const projectToDelete = await Project.findById(projectId).session(session);

            if (!projectToDelete) {
                throw new Error('Project not found');
            }

            const workspace = await Workspace.findById(projectToDelete.workspace)
                .session(session)
                .select('name chatId');
            const actorLabel = await getUserLabel(userId, session);
            await logActivity({
                actorId: userId,
                action: "project.deleted",
                level: "project",
                workspaceId: projectToDelete.workspace,
                projectId: projectToDelete._id,
                chatId: workspace?.chatId || null,
                message: `${actorLabel} deleted project "${projectToDelete.name}" from workspace "${workspace?.name || "workspace"}".`,
                meta: {
                    projectName: projectToDelete.name
                },
                session
            });

            // 2. Find all Tasks in the project to identify Subtasks
            const tasks = await Task.find({ project: projectId }).select('_id').session(session);
            const taskIds = tasks.map(t => t._id);

            // 3. Delete Subtasks associated with these tasks
            if (taskIds.length > 0) {
                await Subtask.deleteMany({ task: { $in: taskIds } }, { session });
            }

            // 4. Delete Tasks in the project
            await Task.deleteMany({ project: projectId }, { session });

            // 5. Delete Project Chat and Messages (UPDATED)
            if (projectToDelete.chatId) {
                await Message.deleteMany({ chatId: projectToDelete.chatId }, { session });
                await Chat.findByIdAndDelete(projectToDelete.chatId, { session });
            }

            // 6. Delete the Project itself
            await Project.findByIdAndDelete(projectId, { session });

            await session.commitTransaction();

            // Update parent workspace timestamp
            await touchWorkspace(projectToDelete.workspace);

            return projectToDelete;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    },

    getProjectTeams: async (projectId) => {
        const project = await Project.findById(projectId).populate('teams');
        if (!project) {
            throw new Error('Project not found')
        }
        return project.teams;
    },

    addProjectTeams: async (projectId, { teams }, userId) => {
        // NOTE: If you want team members to be auto-added to chat, logic would be complex 
        // because teams are dynamic. Usually, we rely on `getProjectMembers` or explicit member addition.
        // For now, keeping this strictly for the Project model structure.

        const project = await Project.findByIdAndUpdate(
            projectId,
            {
                $addToSet: {
                    teams: { $each: teams }
                }
            },
            { new: true }
        );

        if (!project) {
            throw new Error("Project not found");
        }

        const actorLabel = await getUserLabel(userId || project.owner);
        const workspace = await Workspace.findById(project.workspace).select('chatId');
        await logActivity({
            actorId: userId || project.owner,
            action: "project.teams_added",
            level: "project",
            workspaceId: project.workspace,
            projectId: project._id,
            chatId: project.chatId,
            mirrorChatIds: [workspace?.chatId],
            message: `${actorLabel} added ${teams.length} team(s) to project "${project.name}".`,
            meta: {
                teamIds: teams
            }
        });

        return { message: "Teams added to project" };
    },

    removeProjectTeams: async (projectId, { teams }, userId) => {
        const project = await Project.findByIdAndUpdate(
            projectId,
            {
                $pull: {
                    teams: { $in: teams }
                }
            },
            { new: true }
        );

        if (!project) {
            throw new Error("Project not found");
        }

        const actorLabel = await getUserLabel(userId || project.owner);
        const workspace = await Workspace.findById(project.workspace).select('chatId');
        await logActivity({
            actorId: userId || project.owner,
            action: "project.teams_removed",
            level: "project",
            workspaceId: project.workspace,
            projectId: project._id,
            chatId: project.chatId,
            mirrorChatIds: [workspace?.chatId],
            message: `${actorLabel} removed ${teams.length} team(s) from project "${project.name}".`,
            meta: {
                teamIds: teams
            }
        });

        return { message: "Teams removed from project" };
    },

    getProjectMembers: async (projectId) => {
        const project = await Project.findById(projectId)
            .populate('members.user', 'name email');

        if (!project) {
            throw new Error('Project not found');
        }

        return project.members;
    },

    addProjectMembers: async (projectId, { members }, userId) => {
        const project = await Project.findById(projectId).select('members chatId workspace name');

        if (!project) {
            throw new Error("Project not found");
        }

        const existingUserIds = new Set(project.members.map(m => m.user.toString()));
        const newMembers = members.filter(m => !existingUserIds.has(m.user.toString()));

        if (newMembers.length === 0) {
            return { message: "All selected members are already in the project" };
        }

        // Add to Project model
        const updatedProject = await Project.findByIdAndUpdate(
            projectId,
            {
                $push: {
                    members: { $each: newMembers }
                }
            },
            { new: true }
        );

        // Add to Project Chat (UPDATED)
        if (project.chatId) {
            const newUserIds = newMembers.map(m => m.user);
            await Chat.findByIdAndUpdate(project.chatId, {
                $addToSet: { members: { $each: newUserIds } }
            });
        }

        const workspace = await Workspace.findById(project.workspace).select('chatId');
        const actorLabel = await getUserLabel(userId);
        const addedLabels = await getUserLabels(newMembers.map((m) => m.user));
        await logActivity({
            actorId: userId,
            action: "project.members_added",
            level: "project",
            workspaceId: project.workspace,
            projectId: project._id,
            chatId: project.chatId,
            mirrorChatIds: [workspace?.chatId],
            message: `${actorLabel} added ${formatUserList(addedLabels)} to project "${project.name}".`,
            meta: {
                memberIds: newMembers.map((m) => m.user)
            }
        });

        return { message: `${newMembers.length} new members added successfully` };
    },

    removeProjectMembers: async (projectId, { users }, userId) => {
        const projectInfo = await Project.findById(projectId).select('name workspace chatId');
        if (!projectInfo) {
            throw new Error("Project not found");
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // 1. Clean up user assignments in tasks/subtasks AND Chat (UPDATED inside helper)
            await cleanupProjectResources(projectId, users, session);

            // 2. Remove users from project members list
            const project = await Project.findByIdAndUpdate(
                projectId,
                {
                    $pull: {
                        members: { user: { $in: users } }
                    }
                },
                { new: true, session }
            );

            if (!project) {
                throw new Error("Project not found");
            }

            await session.commitTransaction();

            const workspace = await Workspace.findById(projectInfo.workspace).select('chatId');
            const actorLabel = await getUserLabel(userId);
            const removedLabels = await getUserLabels(users);
            await logActivity({
                actorId: userId,
                action: "project.members_removed",
                level: "project",
                workspaceId: projectInfo.workspace,
                projectId: projectInfo._id,
                chatId: projectInfo.chatId,
                mirrorChatIds: [workspace?.chatId],
                message: `${actorLabel} removed ${formatUserList(removedLabels)} from project "${projectInfo.name}".`,
                meta: {
                    memberIds: users
                }
            });

            return { message: "Members removed from project and unassigned from tasks" };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    },

    updateProjectMemberRole: async (projectId, memberId, role, userId) => {
        const project = await Project.findOneAndUpdate(
            {
                _id: projectId,
                "members.user": memberId
            },
            {
                $set: { "members.$.role": role }
            },
            { new: true }
        );

        // Optional: If role is 'admin', you might want to update Chat admin, 
        // but typically projects have one owner and multiple admins. 
        // Keeping it simple for now (Project Owner = Chat Admin).

        if (!project) {
            throw new Error("Project not found or user is not a member of this project");
        }

        const workspace = await Workspace.findById(project.workspace).select('chatId');
        const actorLabel = await getUserLabel(userId);
        const memberLabel = await getUserLabel(memberId);
        await logActivity({
            actorId: userId,
            action: "project.member_role_updated",
            level: "project",
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

        return { message: "Member role updated successfully" };
    },

    leaveProject: async (projectId, userId) => {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const project = await Project.findById(projectId).session(session);

            if (!project) {
                throw new Error("Project not found");
            }

            // 1. Check if user is the owner
            if (project.owner.toString() === userId.toString()) {
                throw new Error("Project owner cannot leave the project. You must transfer ownership or delete the project.");
            }

            // 2. Check if user is actually a member
            const isMember = project.members.some(m => m.user.toString() === userId.toString());
            if (!isMember) {
                throw new Error("You are not a member of this project");
            }

            const workspace = await Workspace.findById(project.workspace).session(session).select('name chatId');
            const actorLabel = await getUserLabel(userId, session);
            await logActivity({
                actorId: userId,
                action: "project.member_left",
                level: "project",
                workspaceId: project.workspace,
                projectId: project._id,
                chatId: project.chatId,
                mirrorChatIds: [workspace?.chatId],
                message: `${actorLabel} left project "${project.name}".`,
                meta: {},
                session
            });

            // 3. Clean up user assignments in tasks/subtasks AND Chat (UPDATED inside helper)
            await cleanupProjectResources(projectId, [userId], session);

            // 4. Remove user from members array
            await Project.findByIdAndUpdate(
                projectId,
                {
                    $pull: {
                        members: { user: userId }
                    }
                },
                { new: true, session }
            );

            await session.commitTransaction();
            return { message: "You have left the project successfully" };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    },
}

module.exports = projectService;
