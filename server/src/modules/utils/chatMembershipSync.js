const Chat = require("../../models/chat");
const Project = require("../../models/project");
const Subtask = require("../../models/subtasks");
const Task = require("../../models/tasks");
const Team = require("../../models/team");
const WorkspaceMember = require("../../models/workspaceMember");

const withSession = (query, session) => (session ? query.session(session) : query);

const toIdString = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    if (value?._id && value._id !== value) return toIdString(value._id);
    if (typeof value?.toHexString === "function") return value.toHexString();
    if (typeof value?.toString === "function") {
        const normalized = value.toString();
        return normalized && normalized !== "[object Object]" ? normalized : "";
    }
    return "";
};

const uniqueIdStrings = (values = []) => {
    const set = new Set();
    values.forEach((value) => {
        const id = toIdString(value);
        if (id) set.add(id);
    });
    return Array.from(set);
};

const getTeamMemberIds = async (teamIds = [], session = null) => {
    const scopedTeamIds = uniqueIdStrings(teamIds);
    if (!scopedTeamIds.length) return [];

    const teamsQuery = Team.find({
        _id: { $in: scopedTeamIds }
    }).select("members.user");

    const teams = await withSession(teamsQuery, session).lean();
    const memberIds = teams.flatMap((team) =>
        (team.members || []).map((member) => member.user)
    );

    return uniqueIdStrings(memberIds);
};

const getWorkspaceAdminIds = async (workspaceId, session = null) => {
    const scopedWorkspaceId = toIdString(workspaceId);
    if (!scopedWorkspaceId) return [];

    const adminsQuery = WorkspaceMember.find({
        workspace: scopedWorkspaceId,
        role: { $in: ["owner", "admin"] },
        status: { $ne: "archived" }
    }).select("user");

    const admins = await withSession(adminsQuery, session).lean();
    return uniqueIdStrings(admins.map((entry) => entry.user));
};

const getProjectAdminIds = async (projectOrId, session = null) => {
    let projectDoc = projectOrId;
    if (!projectDoc || !projectDoc.owner) {
        const projectId = toIdString(projectOrId);
        if (!projectId) return [];
        const projectQuery = Project.findById(projectId).select("owner members");
        projectDoc = await withSession(projectQuery, session).lean();
    }

    if (!projectDoc) return [];

    const adminMemberIds = (projectDoc.members || [])
        .filter((member) => String(member.role || "") === "admin")
        .map((member) => member.user);

    return uniqueIdStrings([projectDoc.owner, ...adminMemberIds]);
};

const buildProjectChatMemberIds = async (projectDoc, session = null) => {
    if (!projectDoc) return [];

    const directMemberIds = [
        projectDoc.owner,
        ...(projectDoc.members || []).map((member) => member.user)
    ];

    const [workspaceAdminIds, teamMemberIds] = await Promise.all([
        getWorkspaceAdminIds(projectDoc.workspace, session),
        getTeamMemberIds(projectDoc.teams || [], session)
    ]);

    return uniqueIdStrings([
        ...directMemberIds,
        ...workspaceAdminIds,
        ...teamMemberIds
    ]);
};

const syncProjectChatMembers = async (projectId, { session = null } = {}) => {
    const scopedProjectId = toIdString(projectId);
    if (!scopedProjectId) return null;

    const projectQuery = Project.findById(scopedProjectId)
        .select("workspace owner members teams chatId");
    const project = await withSession(projectQuery, session).lean();
    if (!project || !project.chatId) return null;

    const memberIds = await buildProjectChatMemberIds(project, session);
    await withSession(
        Chat.findByIdAndUpdate(project.chatId, { members: memberIds }),
        session
    );

    return {
        projectId: scopedProjectId,
        chatId: toIdString(project.chatId),
        memberIds
    };
};

const buildTaskChatMembers = async (taskDoc, session = null) => {
    if (!taskDoc) return { taskMembers: [], teamMemberIds: [] };

    const [teamMemberIds, workspaceAdminIds, projectAdminIds] = await Promise.all([
        getTeamMemberIds(taskDoc.assigneesTeams || [], session),
        getWorkspaceAdminIds(taskDoc.workspace, session),
        taskDoc.project ? getProjectAdminIds(taskDoc.project, session) : []
    ]);

    const taskMembers = uniqueIdStrings([
        taskDoc.createdBy,
        ...(taskDoc.assignees || []),
        ...teamMemberIds,
        ...workspaceAdminIds,
        ...projectAdminIds
    ]);

    return { taskMembers, teamMemberIds };
};

const syncTaskAndSubtaskChatMembers = async (taskId, { session = null } = {}) => {
    const scopedTaskId = toIdString(taskId);
    if (!scopedTaskId) return null;

    const taskQuery = Task.findById(scopedTaskId)
        .select("chatId createdBy assignees assigneesTeams workspace project");
    const task = await withSession(taskQuery, session).lean();
    if (!task) return null;

    const { taskMembers, teamMemberIds } = await buildTaskChatMembers(task, session);

    if (task.chatId) {
        await withSession(
            Chat.findByIdAndUpdate(task.chatId, { members: taskMembers }),
            session
        );
    }

    const subtasksQuery = Subtask.find({ task: scopedTaskId })
        .select("chatId createdBy assignedTo");
    const subtasks = await withSession(subtasksQuery, session).lean();

    const bulkOps = subtasks
        .filter((subtask) => subtask.chatId)
        .map((subtask) => {
            const subtaskMembers = uniqueIdStrings([
                subtask.createdBy,
                ...(subtask.assignedTo || []),
                ...teamMemberIds
            ]);

            return {
                updateOne: {
                    filter: { _id: subtask.chatId },
                    update: { $set: { members: subtaskMembers } }
                }
            };
        });

    if (bulkOps.length > 0) {
        if (session) {
            await Chat.bulkWrite(bulkOps, { session });
        } else {
            await Chat.bulkWrite(bulkOps);
        }
    }

    return {
        taskId: scopedTaskId,
        chatId: toIdString(task.chatId),
        memberIds: taskMembers,
        subtasksSynced: bulkOps.length
    };
};

const syncChatsForTeam = async (teamId, { session = null } = {}) => {
    const scopedTeamId = toIdString(teamId);
    if (!scopedTeamId) return { projectsSynced: 0, tasksSynced: 0 };

    const [projects, tasks] = await Promise.all([
        withSession(
            Project.find({ teams: scopedTeamId }).select("_id"),
            session
        ).lean(),
        withSession(
            Task.find({ assigneesTeams: scopedTeamId }).select("_id"),
            session
        ).lean()
    ]);

    for (const project of projects) {
        await syncProjectChatMembers(project._id, { session });
    }

    for (const task of tasks) {
        await syncTaskAndSubtaskChatMembers(task._id, { session });
    }

    return {
        projectsSynced: projects.length,
        tasksSynced: tasks.length
    };
};

const syncWorkspaceChats = async (workspaceId, { session = null } = {}) => {
    const scopedWorkspaceId = toIdString(workspaceId);
    if (!scopedWorkspaceId) return { projectsSynced: 0, tasksSynced: 0 };

    const projects = await withSession(
        Project.find({ workspace: scopedWorkspaceId }).select("_id"),
        session
    ).lean();

    const projectIds = projects.map((project) => project._id);
    const taskFilters = [{ workspace: scopedWorkspaceId }];
    if (projectIds.length > 0) {
        taskFilters.push({ project: { $in: projectIds } });
    }

    const tasks = await withSession(
        Task.find({ $or: taskFilters }).select("_id"),
        session
    ).lean();

    for (const project of projects) {
        await syncProjectChatMembers(project._id, { session });
    }

    for (const task of tasks) {
        await syncTaskAndSubtaskChatMembers(task._id, { session });
    }

    return {
        projectsSynced: projects.length,
        tasksSynced: tasks.length
    };
};

module.exports = {
    getProjectAdminIds,
    getTeamMemberIds,
    getWorkspaceAdminIds,
    syncProjectChatMembers,
    syncTaskAndSubtaskChatMembers,
    syncChatsForTeam,
    syncWorkspaceChats
};
