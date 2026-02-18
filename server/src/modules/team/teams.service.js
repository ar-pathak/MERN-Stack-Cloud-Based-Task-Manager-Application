const mongoose = require('mongoose');
const Team = require('../../models/team');
const Workspace = require('../../models/workspace');
const WorkspaceMember = require('../../models/workspaceMember');
// Import Models to clean up references
const Project = require('../../models/project');
const Task = require('../../models/tasks');

const teamsService = {
    createTeam: async ({ name, description, workspaceId, userId }) => {
        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) {
            throw new Error('Workspace not found');
        }

        const member = await WorkspaceMember.findOne({
            workspace: workspaceId,
            user: userId
        });

        if (!member) {
            throw new Error('You must be a workspace member to create teams');
        }

        const team = await Team.create({
            name,
            description,
            workspace: workspaceId,
            createdBy: userId,
            members: [{ user: userId, role: 'lead' }] // Auto-add creator as lead
        });

        return team;
    },

    getTeamsByWorkspace: async (workspaceId) => {
        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) {
            throw new Error('Workspace not found');
        }

        const teams = await Team.find({ workspace: workspaceId })
            .populate('createdBy', 'name email')
            .populate('members.user', 'name email avatar isOnline')
            .sort({ createdAt: -1 });

        return teams;
    },

    getTeamById: async (teamId, workspaceId) => {
        const team = await Team.findOne({ _id: teamId, workspace: workspaceId })
            .populate('createdBy', 'name email')
            .populate('members.user', 'name email avatar isOnline');

        if (!team) {
            throw new Error('Team not found');
        }
        return team;
    },

    updateTeam: async (teamId, workspaceId, updateData) => {
        const team = await Team.findOneAndUpdate(
            { _id: teamId, workspace: workspaceId },
            updateData,
            { new: true, runValidators: true }
        );

        if (!team) {
            throw new Error('Team not found');
        }
        return team;
    },

    // IMPROVED: Delete Team with cleanup
    deleteTeam: async (teamId, workspaceId) => {
        const team = await Team.findOne({ _id: teamId, workspace: workspaceId });
        if (!team) {
            throw new Error('Team not found');
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // 1. Remove this team from all Projects
            await Project.updateMany(
                { teams: teamId },
                { $pull: { teams: teamId } },
                { session }
            );

            // 2. Remove this team from all Tasks
            await Task.updateMany(
                { assigneesTeams: teamId },
                { $pull: { assigneesTeams: teamId } },
                { session }
            );

            // 3. Delete the team itself
            await Team.findByIdAndDelete(teamId, { session });

            await session.commitTransaction();
            return { message: "Team and all its references deleted successfully" };

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    },

    addTeamMember: async (teamId, workspaceId, { memberId, role }) => {
        if (!mongoose.Types.ObjectId.isValid(memberId)) {
            throw new Error("Invalid member ID");
        }

        const team = await Team.findOne({
            _id: teamId,
            workspace: workspaceId
        });

        if (!team) {
            throw new Error('Team not found in this workspace');
        }

        // Verify user is a member of the workspace
        const workspaceMember = await WorkspaceMember.findOne({
            workspace: workspaceId,
            user: memberId
        });

        if (!workspaceMember) {
            throw new Error('User must be a workspace member before adding to team');
        }

        // Check if member already exists in team
        const existingMember = team.members.find(
            m => m.user.toString() === memberId
        );

        if (existingMember) {
            throw new Error('User is already a member of this team');
        }

        team.members.push({ user: memberId, role: role || 'member' });
        await team.save();

        // Populate the newly added member
        await team.populate('members.user', 'name email avatar isOnline');

        return team;
    },

    getTeamMembers: async (teamId, workspaceId) => {
        const team = await Team.findOne({ _id: teamId, workspace: workspaceId })
            .populate('members.user', 'name email avatar isOnline');

        if (!team) {
            throw new Error('Team not found');
        }

        return team.members;
    },

    removeTeamMember: async (teamId, workspaceId, memberId) => {
        const team = await Team.findOne({ _id: teamId, workspace: workspaceId });
        if (!team) {
            throw new Error('Team not found');
        }

        // Cannot remove the creator if they are the only lead (optional logic, but safer)
        if (team.createdBy.toString() === memberId) {
            // You might want to allow this only if there is another lead, 
            // but usually creator removal implies complex ownership transfer.
            // For now, we allow removal but keep the logic simple.
        }

        team.members = team.members.filter(
            m => m.user.toString() !== memberId
        );

        await team.save();
        return { message: "Member removed from team" };
    },

    updateTeamMemberRole: async (teamId, workspaceId, memberId, role) => {
        const team = await Team.findOne({ _id: teamId, workspace: workspaceId });
        if (!team) {
            throw new Error('Team not found');
        }

        const member = team.members.find(
            m => m.user.toString() === memberId
        );

        if (!member) {
            throw new Error('Member not found in this team');
        }

        member.role = role;
        await team.save();
        await team.populate('members.user', 'name email avatar isOnline');

        return team;
    },

    leaveTeam: async (teamId, userId) => {
        const team = await Team.findById(teamId);
        if (!team) {
            throw new Error("Team not found");
        }

        if (team.createdBy.toString() === userId.toString()) {
            throw new Error("Team creator cannot leave. Delete the team instead.");
        }

        const memberIndex = team.members.findIndex(
            m => m.user.toString() === userId.toString()
        );

        if (memberIndex === -1) {
            throw new Error("You are not a member of this team");
        }

        team.members.splice(memberIndex, 1);
        await team.save();

        return { message: "You have left the team successfully" };
    }
};

module.exports = teamsService;
