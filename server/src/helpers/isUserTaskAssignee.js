const Team = require('../models/team')

const isUserTaskAssignee = async (task, userId) => {
    const userIdStr = userId.toString();

    // owner
    const isOwner = task.createdBy.toString() == userIdStr
    if (isOwner) return true;

    // Direct assignment
    const isDirectAssignee = task.assignees.some(
        id => id.toString() === userIdStr
    );

    if (isDirectAssignee) return true;

    // Team-based assignment
    const teamMatch = await Team.exists({
        _id: { $in: task.assigneesTeams },
        "members.user": userId
    });

    return Boolean(teamMatch);
};
module.exports = isUserTaskAssignee;