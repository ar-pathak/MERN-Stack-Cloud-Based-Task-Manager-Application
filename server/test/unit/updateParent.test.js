jest.mock("../../src/models/workspace", () => ({
    findByIdAndUpdate: jest.fn()
}));

jest.mock("../../src/models/project", () => ({
    findByIdAndUpdate: jest.fn()
}));

const Workspace = require("../../src/models/workspace");
const Project = require("../../src/models/project");
const { touchParents, touchWorkspace } = require("../../src/modules/utils/updateParent");

beforeEach(() => {
    jest.clearAllMocks();
});

test("touchParents updates project timestamp when task belongs to project", async () => {
    await touchParents({ project: "project-1", workspace: "workspace-1" });

    expect(Project.findByIdAndUpdate).toHaveBeenCalledTimes(1);
    expect(Project.findByIdAndUpdate).toHaveBeenCalledWith(
        "project-1",
        { $set: { updatedAt: expect.any(Date) } }
    );
    expect(Workspace.findByIdAndUpdate).not.toHaveBeenCalled();
});

test("touchParents updates workspace timestamp when task belongs directly to workspace", async () => {
    await touchParents({ workspace: "workspace-1" });

    expect(Workspace.findByIdAndUpdate).toHaveBeenCalledTimes(1);
    expect(Workspace.findByIdAndUpdate).toHaveBeenCalledWith(
        "workspace-1",
        { $set: { updatedAt: expect.any(Date) } }
    );
    expect(Project.findByIdAndUpdate).not.toHaveBeenCalled();
});

test("touchParents is a no-op when task has neither project nor workspace", async () => {
    await touchParents({});

    expect(Project.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(Workspace.findByIdAndUpdate).not.toHaveBeenCalled();
});

test("touchWorkspace updates workspace timestamp", async () => {
    await touchWorkspace("workspace-2");

    expect(Workspace.findByIdAndUpdate).toHaveBeenCalledWith(
        "workspace-2",
        { $set: { updatedAt: expect.any(Date) } }
    );
});
