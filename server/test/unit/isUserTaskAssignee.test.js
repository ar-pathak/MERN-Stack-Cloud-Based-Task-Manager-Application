jest.mock("../../src/models/team", () => ({
    exists: jest.fn()
}));

const Team = require("../../src/models/team");
const isUserTaskAssignee = require("../../src/helpers/isUserTaskAssignee");

const USER_ID = "507f1f77bcf86cd799439011";

beforeEach(() => {
    jest.clearAllMocks();
});

test("returns true when user is task owner", async () => {
    const task = {
        createdBy: USER_ID,
        assignees: [],
        assigneesTeams: []
    };

    const result = await isUserTaskAssignee(task, USER_ID);

    expect(result).toBe(true);
    expect(Team.exists).not.toHaveBeenCalled();
});

test("returns true when user is directly assigned", async () => {
    const task = {
        createdBy: "507f1f77bcf86cd799439012",
        assignees: [USER_ID],
        assigneesTeams: []
    };

    const result = await isUserTaskAssignee(task, USER_ID);

    expect(result).toBe(true);
    expect(Team.exists).not.toHaveBeenCalled();
});

test("returns true when user belongs to assigned team", async () => {
    Team.exists.mockResolvedValue({ _id: "507f1f77bcf86cd799439099" });
    const task = {
        createdBy: "507f1f77bcf86cd799439012",
        assignees: [],
        assigneesTeams: ["507f1f77bcf86cd799439055"]
    };

    const result = await isUserTaskAssignee(task, USER_ID);

    expect(Team.exists).toHaveBeenCalledWith({
        _id: { $in: ["507f1f77bcf86cd799439055"] },
        "members.user": USER_ID
    });
    expect(result).toBe(true);
});

test("returns false when user is neither owner, assignee, nor team member", async () => {
    Team.exists.mockResolvedValue(null);
    const task = {
        createdBy: "507f1f77bcf86cd799439012",
        assignees: ["507f1f77bcf86cd799439013"],
        assigneesTeams: ["507f1f77bcf86cd799439055"]
    };

    const result = await isUserTaskAssignee(task, USER_ID);

    expect(result).toBe(false);
});
