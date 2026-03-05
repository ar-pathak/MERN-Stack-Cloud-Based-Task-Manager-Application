jest.mock("../../src/models/workspaceMember.js", () => ({
    findOne: jest.fn()
}));

jest.mock("../../src/models/workspace", () => ({}));
jest.mock("../../src/models/workspaceInvite", () => ({}));
jest.mock("../../src/models/user", () => ({}));
jest.mock("../../src/models/project", () => ({}));
jest.mock("../../src/models/team", () => ({}));
jest.mock("../../src/models/tasks", () => ({}));
jest.mock("../../src/models/subtasks", () => ({}));
jest.mock("../../src/models/chat", () => ({}));
jest.mock("../../src/models/message", () => ({}));

jest.mock("../../src/helpers/sendEmail", () => jest.fn());
jest.mock("../../src/modules/notification/notification.service", () => ({
    createNotifications: jest.fn(),
    setWorkspaceInviteNotificationState: jest.fn()
}));
jest.mock("../../src/modules/utils/chatMembershipSync", () => ({
    syncWorkspaceChats: jest.fn()
}));
jest.mock("../../src/modules/utils/activityLogger", () => ({
    logActivity: jest.fn(),
    getUserLabel: jest.fn()
}));
jest.mock("../../src/helpers/paginationHelper", () => ({
    toPaginationMeta: jest.fn()
}));

const WorkspaceMember = require("../../src/models/workspaceMember.js");
const workspaceService = require("../../src/modules/workspace/workspace.service");

const mockSelect = (value) => ({
    select: jest.fn().mockResolvedValue(value)
});

beforeEach(() => {
    jest.clearAllMocks();
});

test("getQuickStatus throws when user is not a workspace member", async () => {
    WorkspaceMember.findOne.mockReturnValue(mockSelect(null));

    await expect(
        workspaceService.getQuickStatus("workspace-1", "user-1")
    ).rejects.toThrow("You are not a member of this workspace");
});

test("getQuickStatus returns mapped quick status flags", async () => {
    WorkspaceMember.findOne.mockReturnValue(mockSelect({
        isStarred: true,
        isMuted: false,
        status: "archived"
    }));

    const status = await workspaceService.getQuickStatus("workspace-1", "user-1");

    expect(status).toEqual({
        isStarred: true,
        isMuted: false,
        isArchived: true
    });
});

test("getQuickStatus defaults missing quick flags to false", async () => {
    WorkspaceMember.findOne.mockReturnValue(mockSelect({
        status: "active"
    }));

    const status = await workspaceService.getQuickStatus("workspace-1", "user-1");

    expect(status).toEqual({
        isStarred: false,
        isMuted: false,
        isArchived: false
    });
});

test("toggleStar flips star state and persists member", async () => {
    const member = {
        isStarred: false,
        save: jest.fn().mockResolvedValue()
    };
    WorkspaceMember.findOne.mockResolvedValue(member);

    const result = await workspaceService.toggleStar("workspace-1", "user-1");

    expect(member.isStarred).toBe(true);
    expect(member.save).toHaveBeenCalledTimes(1);
    expect(result).toBe(member);
});

test("toggleMute flips mute state and persists member", async () => {
    const member = {
        isMuted: false,
        save: jest.fn().mockResolvedValue()
    };
    WorkspaceMember.findOne.mockResolvedValue(member);

    const result = await workspaceService.toggleMute("workspace-1", "user-1");

    expect(member.isMuted).toBe(true);
    expect(member.save).toHaveBeenCalledTimes(1);
    expect(result).toBe(member);
});

test("toggleArchive flips active status and persists member", async () => {
    const member = {
        status: "active",
        save: jest.fn().mockResolvedValue()
    };
    WorkspaceMember.findOne.mockResolvedValue(member);

    await workspaceService.toggleArchive("workspace-1", "user-1");
    expect(member.status).toBe("archived");

    await workspaceService.toggleArchive("workspace-1", "user-1");
    expect(member.status).toBe("active");
    expect(member.save).toHaveBeenCalledTimes(2);
});

test("toggleStar throws when user is not a workspace member", async () => {
    WorkspaceMember.findOne.mockResolvedValue(null);

    await expect(
        workspaceService.toggleStar("workspace-1", "user-1")
    ).rejects.toThrow("You are not a member of this workspace");
});

test("toggleMute throws when user is not a workspace member", async () => {
    WorkspaceMember.findOne.mockResolvedValue(null);

    await expect(
        workspaceService.toggleMute("workspace-1", "user-1")
    ).rejects.toThrow("You are not a member of this workspace");
});

test("toggleArchive throws when user is not a workspace member", async () => {
    WorkspaceMember.findOne.mockResolvedValue(null);

    await expect(
        workspaceService.toggleArchive("workspace-1", "user-1")
    ).rejects.toThrow("You are not a member of this workspace");
});
