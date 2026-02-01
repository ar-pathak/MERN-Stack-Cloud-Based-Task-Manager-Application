const mongoose = require('mongoose');
const Project = require('../../models/project');
const Task = require('../../models/tasks');
const Subtask = require('../../models/subtasks');
const { touchWorkspace } = require('../utils/updateParent');

// Helper function to remove users from task and subtask assignments within the project
const cleanupProjectResources = async (projectId, userIds, session) => {
    // 1. Remove users from Task Assignees in this project
    await Task.updateMany(
        { project: projectId },
        { $pull: { assignees: { $in: userIds } } },
        { session }
    );

    // 2. Remove users from Subtask Assignments
    // Subtasks are linked to tasks, so we first find tasks in this project
    const tasks = await Task.find({ project: projectId }).select('_id').session(session);
    const taskIds = tasks.map(t => t._id);

    if (taskIds.length > 0) {
        await Subtask.updateMany(
            { task: { $in: taskIds } },
            { $pull: { assignedTo: { $in: userIds } } },
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

        const project = await Project.create({
            ...data,
            workspace: workspaceId,
            owner: userId,
            members: data.members?.length
                ? data.members
                : [{ user: userId, role: "admin" }]
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

    updateProject: async (projectId, updateData) => {
        const project = await Project.findByIdAndUpdate(projectId, updateData, { new: true })
        if (!project) {
            throw new Error('Project not found')
        }
        await touchWorkspace(project.workspace);
        return project;
    },

    deleteProject: async (projectId) => {
        // Start a transaction for cascading delete
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // 1. Find all Tasks in the project to identify Subtasks
            const tasks = await Task.find({ project: projectId }).select('_id').session(session);
            const taskIds = tasks.map(t => t._id);

            // 2. Delete Subtasks associated with these tasks
            if (taskIds.length > 0) {
                await Subtask.deleteMany({ task: { $in: taskIds } }, { session });
            }

            // 3. Delete Tasks in the project
            await Task.deleteMany({ project: projectId }, { session });

            // 4. Delete the Project itself
            const project = await Project.findByIdAndDelete(projectId).session(session);

            if (!project) {
                throw new Error('Project not found');
            }

            await session.commitTransaction();

            // Update parent workspace timestamp
            await touchWorkspace(project.workspace);

            return project;
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
    addProjectTeams: async (projectId, { teams }) => {
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

        return { message: "Teams added to project" };
    },
    removeProjectTeams: async (projectId, { teams }) => {
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
    addProjectMembers: async (projectId, { members }) => {
        const project = await Project.findById(projectId).select('members');

        if (!project) {
            throw new Error("Project not found");
        }

        const existingUserIds = new Set(project.members.map(m => m.user.toString()));

        const newMembers = members.filter(m => !existingUserIds.has(m.user.toString()));

        if (newMembers.length === 0) {
            return { message: "All selected members are already in the project" };
        }

        const updatedProject = await Project.findByIdAndUpdate(
            projectId,
            {
                $push: {
                    members: { $each: newMembers }
                }
            },
            { new: true }
        );

        return { message: `${newMembers.length} new members added successfully` };
    },

    removeProjectMembers: async (projectId, { users }) => {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // 1. Clean up user assignments in tasks/subtasks
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
            return { message: "Members removed from project and unassigned from tasks" };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    },

    updateProjectMemberRole: async (projectId, memberId, role) => {
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

        if (!project) {
            throw new Error("Project not found or user is not a member of this project");
        }

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

            // 3. Clean up user assignments in tasks/subtasks
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