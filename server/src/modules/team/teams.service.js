const mongoose = require('mongoose');
const Team = require('../../models/team');
const Workspace = require('../../models/workspace');
const WorkspaceMember = require('../../models/workspaceMember');

const teamsService = {
    createTeam: async ({ name, description, workspaceId, userId }) => {
        // Verify workspace exists
        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) {
            throw new Error('Workspace not found');
        }

        // Verify user is a member of the workspace
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
            createdBy: userId
        });

        return team;
    },

    getTeamsByWorkspace: async (workspaceId) => {
        // Verify workspace exists
        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) {
            throw new Error('Workspace not found');
        }

        const teams = await Team.find({ workspace: workspaceId })
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });

        return teams;
    },

    getTeamById: async (teamId, workspaceId) => {
        const team = await Team.findOne({
            _id: teamId,
            workspace: workspaceId
        })
            .populate('createdBy', 'name email')
            .populate('members.user', 'name email');

        if (!team) {
            throw new Error('Team not found in this workspace');
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
            throw new Error('Team not found in this workspace');
        }

        return team;
    },

    deleteTeam: async (teamId, workspaceId) => {
        const team = await Team.findOneAndDelete({
            _id: teamId,
            workspace: workspaceId
        });

        if (!team) {
            throw new Error('Team not found in this workspace');
        }

        return team;
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
        await team.populate('members.user', 'name email');

        return team;
    },

    getTeamMembers: async (teamId, workspaceId) => {
        const team = await Team.findOne({
            _id: teamId,
            workspace: workspaceId
        }).populate('members.user', 'name email');

        if (!team) {
            throw new Error('Team not found in this workspace');
        }

        return team.members;
    },

    removeTeamMember: async (teamId, workspaceId, memberId) => {
        const team = await Team.findOne({
            _id: teamId,
            workspace: workspaceId
        });

        if (!team) {
            throw new Error('Team not found in this workspace');
        }

        const memberIndex = team.members.findIndex(
            m => m.user.toString() === memberId
        );

        if (memberIndex === -1) {
            throw new Error('Member not found in this team');
        }

        team.members.splice(memberIndex, 1);
        await team.save();

        return { message: 'Member removed successfully' };
    },

    updateTeamMemberRole: async (teamId, workspaceId, memberId, role) => {
        const team = await Team.findOne({
            _id: teamId,
            workspace: workspaceId
        });

        if (!team) {
            throw new Error('Team not found in this workspace');
        }

        const member = team.members.find(
            m => m.user.toString() === memberId
        );

        if (!member) {
            throw new Error('Member not found in this team');
        }

        if (member.role === role) {
            throw new Error('Member already has the specified role');
        }

        member.role = role;
        await team.save();

        // Populate members for response
        await team.populate('members.user', 'name email');

        return team;
    },
    leaveTeam: async (teamId, userId) => {
        const team = await Team.findById(teamId);

        if (!team) {
            throw new Error("Team not found");
        }

        // 1. Check if user is the creator
        // Creator cannot leave, they must delete the team
        if (team.createdBy.toString() === userId.toString()) {
            throw new Error("Team creator cannot leave the team. You must delete the team instead.");
        }

        // 2. Check if user is actually a member
        const memberIndex = team.members.findIndex(
            m => m.user.toString() === userId.toString()
        );

        if (memberIndex === -1) {
            throw new Error("You are not a member of this team");
        }

        // 3. Remove user from members array
        team.members.splice(memberIndex, 1);
        await team.save();

        return { message: "You have left the team successfully" };
    },
};

module.exports = teamsService;