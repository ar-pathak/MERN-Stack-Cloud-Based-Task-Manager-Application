const mongoose = require('mongoose');
const Team = require('../../models/team');
const Workspace = require('../../models/workspace');
const WorkspaceMember = require('../../models/workspaceMember');
const User = require('../../models/user');
const Project = require('../../models/project');
const Task = require('../../models/tasks');
const notificationService = require('../notification/notification.service');
const { syncChatsForTeam } = require('../utils/chatMembershipSync');

const uniqueIdStrings = (values = []) => {
    const set = new Set();
    values.forEach((value) => {
        if (!value) return;
        const id = String(value);
        if (id) set.add(id);
    });
    return Array.from(set);
};

const getUserLabel = async (userId) => {
    if (!userId) return "A user";

    const user = await User.findById(userId)
        .select("name username email")
        .lean();

    if (!user) return "A user";
    return user.name || user.username || user.email || "A user";
};

const getWorkspaceAdminIds = async (workspaceId, excludeIds = []) => {
    const excluded = new Set(uniqueIdStrings(excludeIds));
    const admins = await WorkspaceMember.find({
        workspace: workspaceId,
        role: { $in: ["owner", "admin"] },
        status: { $ne: "archived" }
    })
        .select("user")
        .lean();

    return uniqueIdStrings(admins.map((entry) => entry.user)).filter(
        (id) => !excluded.has(id)
    );
};

const getTeamLeadIds = (team, excludeIds = []) => {
    const excluded = new Set(uniqueIdStrings(excludeIds));
    const leads = (team.members || [])
        .filter((member) => String(member.role || "") === "lead")
        .map((member) => member.user);

    return uniqueIdStrings(leads).filter((id) => !excluded.has(id));
};

const ensureTeamHasLead = (members = []) => {
    const hasLead = members.some((member) => String(member.role || "") === "lead");
    if (!hasLead) {
        throw new Error("A team must have at least one lead");
    }
};

const notifyTeamMembershipEvent = async ({
    recipientIds = [],
    actorId = null,
    title,
    message,
    workspaceId,
    team,
    kind,
    priority = "normal",
    metadata = {}
}) => {
    const recipients = uniqueIdStrings(recipientIds);
    if (!recipients.length || !team) return;

    await notificationService.createNotifications({
        recipientIds: recipients,
        actorId,
        title,
        message,
        type: "member",
        category: "workspace",
        priority,
        entityType: "workspace",
        entityId: workspaceId,
        workspaceId,
        link: "/main/notifications",
        metadata: {
            kind,
            teamId: String(team._id),
            teamName: team.name,
            ...metadata
        }
    });
};

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
            members: [{ user: userId, role: 'lead' }]
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

    deleteTeam: async (teamId, workspaceId) => {
        const team = await Team.findOne({ _id: teamId, workspace: workspaceId });
        if (!team) {
            throw new Error('Team not found');
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            await Project.updateMany(
                { teams: teamId },
                { $pull: { teams: teamId } },
                { session }
            );

            await Task.updateMany(
                { assigneesTeams: teamId },
                { $pull: { assigneesTeams: teamId } },
                { session }
            );

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

    addTeamMember: async (teamId, workspaceId, { memberId, role }, actorId = null) => {
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

        const workspaceMember = await WorkspaceMember.findOne({
            workspace: workspaceId,
            user: memberId
        });

        if (!workspaceMember) {
            throw new Error('User must be a workspace member before adding to team');
        }

        const existingMember = team.members.find(
            (member) => String(member.user) === String(memberId)
        );

        if (existingMember) {
            throw new Error('User is already a member of this team');
        }

        const nextRole = role || 'member';
        team.members.push({ user: memberId, role: nextRole });
        await team.save();
        await syncChatsForTeam(teamId);

        const actionUserId = actorId || team.createdBy;
        const actorLabel = await getUserLabel(actionUserId);
        await notifyTeamMembershipEvent({
            recipientIds: [memberId],
            actorId: actionUserId,
            title: "Added to team",
            message: `${actorLabel} added you to team "${team.name}" as ${nextRole}.`,
            workspaceId,
            team,
            kind: "team_member_added",
            metadata: {
                role: nextRole
            }
        });

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

    removeTeamMember: async (teamId, workspaceId, memberId, actorId = null) => {
        const team = await Team.findOne({ _id: teamId, workspace: workspaceId });
        if (!team) {
            throw new Error('Team not found');
        }

        const targetMember = team.members.find(
            (member) => String(member.user) === String(memberId)
        );
        if (!targetMember) {
            throw new Error("Member not found in this team");
        }

        const nextMembers = team.members.filter(
            (member) => String(member.user) !== String(memberId)
        );
        ensureTeamHasLead(nextMembers);

        team.members = nextMembers;
        await team.save();
        await syncChatsForTeam(teamId);

        const actionUserId = actorId || team.createdBy;
        const actorLabel = await getUserLabel(actionUserId);
        await notifyTeamMembershipEvent({
            recipientIds: [memberId],
            actorId: actionUserId,
            title: "Removed from team",
            message: `${actorLabel} removed you from team "${team.name}".`,
            workspaceId,
            team,
            kind: "team_member_removed",
            priority: "high"
        });

        return { message: "Member removed from team" };
    },

    updateTeamMemberRole: async (teamId, workspaceId, memberId, role, actorId = null) => {
        const team = await Team.findOne({ _id: teamId, workspace: workspaceId });
        if (!team) {
            throw new Error('Team not found');
        }

        const member = team.members.find(
            (entry) => String(entry.user) === String(memberId)
        );

        if (!member) {
            throw new Error('Member not found in this team');
        }

        if (String(member.role) === "lead" && role !== "lead") {
            const leadCount = team.members.filter((entry) => String(entry.role) === "lead").length;
            if (leadCount <= 1) {
                throw new Error("A team must have at least one lead");
            }
        }

        member.role = role;
        await team.save();

        const actionUserId = actorId || team.createdBy;
        const actorLabel = await getUserLabel(actionUserId);
        await notifyTeamMembershipEvent({
            recipientIds: [memberId],
            actorId: actionUserId,
            title: "Team role updated",
            message: `${actorLabel} changed your role to ${role} in team "${team.name}".`,
            workspaceId,
            team,
            kind: "team_member_role_updated",
            metadata: { role }
        });

        await team.populate('members.user', 'name email avatar isOnline');
        return team;
    },

    leaveTeam: async (teamId, userId) => {
        const team = await Team.findById(teamId);
        if (!team) {
            throw new Error("Team not found");
        }

        if (String(team.createdBy) === String(userId)) {
            throw new Error("Team creator cannot leave. Delete the team instead.");
        }

        const memberIndex = team.members.findIndex(
            (member) => String(member.user) === String(userId)
        );

        if (memberIndex === -1) {
            throw new Error("You are not a member of this team");
        }

        const nextMembers = team.members.filter(
            (member) => String(member.user) !== String(userId)
        );
        ensureTeamHasLead(nextMembers);

        team.members = nextMembers;
        await team.save();
        await syncChatsForTeam(teamId);

        const actorLabel = await getUserLabel(userId);
        const recipients = uniqueIdStrings([
            ...getTeamLeadIds(team, [userId]),
            ...(await getWorkspaceAdminIds(team.workspace, [userId]))
        ]);

        await notifyTeamMembershipEvent({
            recipientIds: recipients,
            actorId: userId,
            title: "Team member left",
            message: `${actorLabel} left team "${team.name}".`,
            workspaceId: team.workspace,
            team,
            kind: "team_member_left",
            metadata: { leftUserId: String(userId) }
        });

        return { message: "You have left the team successfully" };
    }
};

module.exports = teamsService;
