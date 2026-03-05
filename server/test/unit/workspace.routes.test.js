const authMiddleware = jest.fn((req, res, next) => (next ? next() : undefined));
const checkWorkspaceMemberRole = jest.fn(() => (req, res, next) => (next ? next() : undefined));

const workspaceController = {
    createWorkspace: jest.fn(),
    getAllWorkspaces: jest.fn(),
    getWorkspaceById: jest.fn(),
    updateWorkspace: jest.fn(),
    deleteWorkspace: jest.fn(),
    addMember: jest.fn(),
    getMembers: jest.fn(),
    removeMember: jest.fn(),
    updateMemberRole: jest.fn(),
    sendInvite: jest.fn(),
    acceptInvite: jest.fn(),
    respondInvite: jest.fn(),
    leaveWorkspace: jest.fn(),
    transferOwnership: jest.fn(),
    getQuickStatus: jest.fn(),
    toggleStar: jest.fn(),
    toggleMute: jest.fn(),
    toggleArchive: jest.fn()
};

test("workspace routes register expected paths and CSV upload filter behavior", () => {
    let capturedMulterOptions;
    const singleUploadMiddleware = jest.fn((req, res, next) => (next ? next() : undefined));

    jest.isolateModules(() => {
        jest.doMock("multer", () => {
            const multer = jest.fn((options) => {
                capturedMulterOptions = options;
                return {
                    single: jest.fn(() => singleUploadMiddleware)
                };
            });
            multer.memoryStorage = jest.fn(() => "memory");
            return multer;
        });
        jest.doMock("../../src/middleware/authMiddleware", () => authMiddleware);
        jest.doMock("../../src/middleware/checkRoleMiddleware", () => ({
            checkWorkspaceMemberRole
        }));
        jest.doMock("../../src/modules/workspace/workspace.controller", () => workspaceController);

        const router = require("../../src/modules/workspace/workspace.routes");
        const paths = router.stack
            .filter((layer) => layer.route)
            .map((layer) => layer.route.path);

        expect(paths).toEqual(expect.arrayContaining([
            "/createWorkspaces",
            "/getAllWorkspaces",
            "/getWorkspaces/:id",
            "/updateWorkspace/:id",
            "/deleteWorkspace/:id",
            "/:workspaceId/invites",
            "/invites/accept/:token",
            "/invites/:inviteId/respond",
            "/:workspaceId/quick-status"
        ]));
    });

    expect(capturedMulterOptions.limits).toEqual({ fileSize: 2 * 1024 * 1024 });

    const rejectCallback = jest.fn();
    capturedMulterOptions.fileFilter(
        {},
        { originalname: "members.txt", mimetype: "text/plain" },
        rejectCallback
    );
    const rejectError = rejectCallback.mock.calls[0][0];
    expect(rejectError).toBeInstanceOf(Error);
    expect(rejectError.message).toBe("Only CSV files are allowed");
    expect(rejectError.statusCode).toBe(400);

    const missingFileRejectCallback = jest.fn();
    capturedMulterOptions.fileFilter({}, null, missingFileRejectCallback);
    const missingFileError = missingFileRejectCallback.mock.calls[0][0];
    expect(missingFileError).toBeInstanceOf(Error);
    expect(missingFileError.message).toBe("Only CSV files are allowed");

    const csvCallback = jest.fn();
    capturedMulterOptions.fileFilter(
        {},
        { originalname: "members.csv", mimetype: "text/csv" },
        csvCallback
    );
    expect(csvCallback).toHaveBeenCalledWith(null, true);

    const excelCallback = jest.fn();
    capturedMulterOptions.fileFilter(
        {},
        { originalname: "members", mimetype: "application/vnd.ms-excel" },
        excelCallback
    );
    expect(excelCallback).toHaveBeenCalledWith(null, true);
});
